#!/usr/bin/env node
import http from "node:http";
import https from "node:https";

const launcherSocketPath = process.env.CONFIDENTIAL_SPACE_TOKEN_SOCKET ?? "/run/container_launcher/teeserver.sock";
const tokenEndpointPath = process.env.CONFIDENTIAL_SPACE_TOKEN_ENDPOINT ?? "/v1/token";
const audience = process.env.TEE_ATTESTATION_AUDIENCE ?? "launchforge-secure-executor";
const evidenceBucket = process.env.LAUNCHFORGE_EVIDENCE_BUCKET ?? "launchforge-tee-phase7-evidence";
const evidenceObject = process.env.LAUNCHFORGE_EVIDENCE_OBJECT ?? "confidential-space-evidence.json";

interface AttestationEvidenceLog {
  provider: "google_confidential_space";
  attestationToken: string;
  workloadIdentity?: string;
  imageDigest?: string;
  imageReference?: string;
  projectId?: string;
  zone?: string;
  verifiedAt: string;
}

async function main(): Promise<void> {
  const token = await requestAttestationToken(audience);
  const claims = decodeJwtPayload(token);
  const evidence: AttestationEvidenceLog = {
    provider: "google_confidential_space",
    attestationToken: token,
    verifiedAt: new Date().toISOString()
  };
  const workloadIdentity = getFirstString(claims.google_service_accounts);
  const imageDigest = getNestedString(claims, ["submods", "container", "image_digest"]);
  const imageReference = getNestedString(claims, ["submods", "container", "image_reference"]);
  const projectId = getNestedString(claims, ["submods", "gce", "project_id"]);
  const zone = getNestedString(claims, ["submods", "gce", "zone"]);

  if (workloadIdentity) evidence.workloadIdentity = workloadIdentity;
  if (imageDigest) evidence.imageDigest = imageDigest;
  if (imageReference) evidence.imageReference = imageReference;
  if (projectId) evidence.projectId = projectId;
  if (zone) evidence.zone = zone;

  console.log(
    "LAUNCHFORGE_CONFIDENTIAL_SPACE_SUMMARY=" +
      JSON.stringify({
        provider: evidence.provider,
        workloadIdentity: evidence.workloadIdentity,
        imageDigest: evidence.imageDigest,
        imageReference: evidence.imageReference,
        projectId: evidence.projectId,
        zone: evidence.zone,
        tokenLength: token.length,
        verifiedAt: evidence.verifiedAt
      })
  );

  await writeEvidenceToGcs(evidenceBucket, evidenceObject, evidence);
}

function requestAttestationToken(tokenAudience: string): Promise<string> {
  const body = JSON.stringify({
    audience: tokenAudience,
    token_type: "OIDC"
  });

  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath: launcherSocketPath,
        path: tokenEndpointPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body)
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const responseBody = Buffer.concat(chunks).toString("utf8");

          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Confidential Space token request failed with ${response.statusCode}: ${responseBody}`));
            return;
          }

          resolve(responseBody.trim());
        });
      }
    );

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function writeEvidenceToGcs(bucket: string, objectName: string, evidence: AttestationEvidenceLog): Promise<void> {
  const accessToken = await requestMetadata("/computeMetadata/v1/instance/service-accounts/default/token");
  const parsedToken = JSON.parse(accessToken) as { access_token?: string };

  if (!parsedToken.access_token) {
    throw new Error("Metadata server did not return an access token.");
  }

  const body = JSON.stringify(evidence, null, 2);
  const path = `/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;

  await requestHttps({
    hostname: "storage.googleapis.com",
    path,
    method: "POST",
    token: parsedToken.access_token,
    body,
    contentType: "application/json"
  });
}

function requestMetadata(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "metadata.google.internal",
        path,
        method: "GET",
        headers: {
          "Metadata-Flavor": "Google"
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");

          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`Metadata request failed with ${response.statusCode}: ${body}`));
            return;
          }

          resolve(body);
        });
      }
    );

    request.on("error", reject);
    request.end();
  });
}

function requestHttps(input: {
  hostname: string;
  path: string;
  method: string;
  token: string;
  body: string;
  contentType: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: input.hostname,
        path: input.path,
        method: input.method,
        headers: {
          Authorization: `Bearer ${input.token}`,
          "Content-Type": input.contentType,
          "Content-Length": Buffer.byteLength(input.body)
        }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");

          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GCS upload failed with ${response.statusCode}: ${body}`));
            return;
          }

          resolve();
        });
      }
    );

    request.on("error", reject);
    request.write(input.body);
    request.end();
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, encodedPayload] = token.split(".");

  if (!encodedPayload) {
    throw new Error("Confidential Space attestation token is malformed.");
  }

  return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>;
}

function getNestedString(value: Record<string, unknown>, path: string[]): string | undefined {
  const result = path.reduce<unknown>((current, key) => {
    if (typeof current !== "object" || current === null || !(key in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);

  return typeof result === "string" ? result : undefined;
}

function getFirstString(value: unknown): string | undefined {
  return Array.isArray(value) && typeof value[0] === "string" ? value[0] : undefined;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
