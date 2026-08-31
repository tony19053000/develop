import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import {
  createProtectedToolExecutor,
  hashPayload,
  ProtectedToolExecutionError,
  type AgentLatchPolicyEngine,
  type AgentLatchPolicyResult,
  type ToolActionRequest
} from "@launchforge/agentlatch";

export const secureExecutorModeSchema = z.enum(["development", "google_confidential_space"]);

export const teeProviderSchema = z.enum(["google_confidential_space"]);

const googleConfidentialSpaceIssuer = "https://confidentialcomputing.googleapis.com";
const googleConfidentialSpaceJwksUrl =
  "https://www.googleapis.com/service_accounts/v1/metadata/jwk/signer@confidentialspace-sign.iam.gserviceaccount.com";

export const secureExecutionEvidenceSchema = z.object({
  provider: teeProviderSchema,
  attestationToken: z.string().min(24),
  workloadIdentity: z.string().min(1),
  imageDigest: z.string().min(12),
  imageReference: z.string().min(1).optional(),
  verifiedAt: z.string().datetime().default(() => new Date().toISOString())
});

export const googleConfidentialSpacePolicySchema = z.object({
  audience: z.string().min(1).default("launchforge-secure-executor"),
  expectedWorkloadIdentity: z.string().min(1).optional(),
  expectedImageDigest: z.string().min(12).optional(),
  expectedImageReference: z.string().min(1).optional(),
  expectedProjectId: z.string().min(1).optional(),
  expectedZone: z.string().min(1).optional(),
  issuer: z.string().url().default(googleConfidentialSpaceIssuer),
  jwksUrl: z.string().url().default(googleConfidentialSpaceJwksUrl),
  requireProductionImage: z.boolean().default(true),
  requireStableImage: z.boolean().default(true),
  requireSecureBoot: z.boolean().default(true)
});

export const secureExecutionReceiptSchema = z.object({
  id: z.string().default(() => randomUUID()),
  requestId: z.string(),
  actionType: z.string(),
  payloadHash: z.string(),
  mode: secureExecutorModeSchema,
  teeProvider: teeProviderSchema.optional(),
  evidenceVerified: z.boolean(),
  result: z.record(z.unknown()),
  executedAt: z.string().datetime().default(() => new Date().toISOString())
});

export type SecureExecutionEvidence = z.infer<typeof secureExecutionEvidenceSchema>;
export type SecureExecutionReceipt = z.infer<typeof secureExecutionReceiptSchema>;
export type SecureExecutorMode = z.infer<typeof secureExecutorModeSchema>;
type ResolvedGoogleConfidentialSpacePolicy = z.output<typeof googleConfidentialSpacePolicySchema>;

export interface GoogleConfidentialSpacePolicy {
  audience?: string;
  expectedWorkloadIdentity?: string | undefined;
  expectedImageDigest?: string | undefined;
  expectedImageReference?: string | undefined;
  expectedProjectId?: string | undefined;
  expectedZone?: string | undefined;
  issuer?: string;
  jwksUrl?: string;
  requireProductionImage?: boolean;
  requireStableImage?: boolean;
  requireSecureBoot?: boolean;
}

export interface SecretHandle {
  name: string;
  value: string;
}

export interface SecretProvider {
  resolve(name: string): Promise<SecretHandle>;
}

export interface SecureExecutorConfig {
  mode: SecureExecutorMode;
  allowedSecretNames: string[];
  evidence?: SecureExecutionEvidence;
  attestationPolicy?: GoogleConfidentialSpacePolicy;
  attestationVerifier?: AttestationVerifier;
}

export interface SecureExecutionInput<T> {
  request: ToolActionRequest;
  approval: AgentLatchPolicyResult;
  operation: (context: SecureOperationContext) => Promise<T>;
}

export interface SecureOperationContext {
  getSecret(name: string): Promise<string>;
}

export interface SecureExecutor {
  execute<T extends Record<string, unknown>>(input: SecureExecutionInput<T>): Promise<SecureExecutionReceipt>;
}

export type AttestationVerifier = (
  evidence: SecureExecutionEvidence,
  policy: ResolvedGoogleConfidentialSpacePolicy
) => Promise<JWTPayload>;

export class SecureExecutionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EnvironmentSecretProvider implements SecretProvider {
  async resolve(name: string): Promise<SecretHandle> {
    const value = process.env[name];

    if (!value) {
      throw new SecureExecutionError(`Secret ${name} is not configured.`);
    }

    return { name, value };
  }
}

export function createSecureExecutor(
  config: SecureExecutorConfig,
  agentLatch: AgentLatchPolicyEngine,
  secrets: SecretProvider = new EnvironmentSecretProvider()
): SecureExecutor {
  const parsedConfig = {
    ...config,
    ...(config.evidence ? { evidence: secureExecutionEvidenceSchema.parse(config.evidence) } : {}),
    ...(config.attestationPolicy
      ? { attestationPolicy: googleConfidentialSpacePolicySchema.parse(config.attestationPolicy) }
      : {})
  };
  const executeProtectedTool = createProtectedToolExecutor(agentLatch);

  return {
    async execute(input) {
      validateApproval(input.request, input.approval);
      const evidenceVerified = await verifySecureExecutionEvidence(parsedConfig);
      const result = await executeProtectedTool(
        input.request,
        () => input.operation(createSecureOperationContext(parsedConfig.allowedSecretNames, secrets)),
        input.approval
      );

      return secureExecutionReceiptSchema.parse({
        requestId: input.request.id,
        actionType: input.request.actionType,
        payloadHash: hashPayload(input.request.payload),
        mode: parsedConfig.mode,
        ...(parsedConfig.evidence ? { teeProvider: parsedConfig.evidence.provider } : {}),
        evidenceVerified,
        result
      });
    }
  };
}

export async function verifySecureExecutionEvidence(config: SecureExecutorConfig): Promise<boolean> {
  if (config.mode === "development") {
    return false;
  }

  if (!config.evidence) {
    throw new SecureExecutionError("Google Confidential Space mode requires attestation evidence.");
  }

  const evidence = secureExecutionEvidenceSchema.parse(config.evidence);

  if (evidence.provider !== "google_confidential_space") {
    throw new SecureExecutionError("Unsupported TEE evidence provider.");
  }

  const policy = googleConfidentialSpacePolicySchema.parse({
    ...config.attestationPolicy,
    expectedWorkloadIdentity: config.attestationPolicy?.expectedWorkloadIdentity ?? evidence.workloadIdentity,
    expectedImageDigest: config.attestationPolicy?.expectedImageDigest ?? evidence.imageDigest,
    expectedImageReference: config.attestationPolicy?.expectedImageReference ?? evidence.imageReference
  });
  const verifier = config.attestationVerifier ?? verifyGoogleConfidentialSpaceAttestation;
  await verifier(evidence, policy);

  return true;
}

export async function verifyGoogleConfidentialSpaceAttestation(
  evidence: SecureExecutionEvidence,
  policy: ResolvedGoogleConfidentialSpacePolicy
): Promise<JWTPayload> {
  const jwks = createRemoteJWKSet(new URL(policy.jwksUrl));
  const { payload } = await jwtVerify(evidence.attestationToken, jwks, {
    issuer: policy.issuer,
    audience: policy.audience
  });

  assertGoogleConfidentialSpaceClaims(payload, policy);
  return payload;
}

function validateApproval(request: ToolActionRequest, approval: AgentLatchPolicyResult): void {
  if (!approval.executable) {
    throw new ProtectedToolExecutionError("SecureExecutor requires an executable AgentLatch approval decision.");
  }

  if (approval.requestId !== request.id) {
    throw new ProtectedToolExecutionError("SecureExecutor approval does not match the action request.");
  }

  if (approval.payloadHash !== hashPayload(request.payload)) {
    throw new ProtectedToolExecutionError("SecureExecutor approval payload hash does not match the action request.");
  }
}

export function assertGoogleConfidentialSpaceClaims(
  payload: JWTPayload,
  policy: ResolvedGoogleConfidentialSpacePolicy
): void {
  if (payload.swname !== "CONFIDENTIAL_SPACE") {
    throw new SecureExecutionError("Attestation token is not for Google Confidential Space.");
  }

  if (policy.requireProductionImage && payload.dbgstat !== "disabled-since-boot") {
    throw new SecureExecutionError("Attestation token is not from a production Confidential Space image.");
  }

  if (policy.requireSecureBoot && payload.secboot !== true) {
    throw new SecureExecutionError("Attestation token does not prove Secure Boot.");
  }

  const serviceAccounts = getStringArrayClaim(payload, ["google_service_accounts"]);
  if (!serviceAccounts.includes(policy.expectedWorkloadIdentity ?? "")) {
    throw new SecureExecutionError("Attestation token workload service account does not match policy.");
  }

  const imageDigest = getStringClaim(payload, ["submods", "container", "image_digest"]);
  if (imageDigest !== policy.expectedImageDigest) {
    throw new SecureExecutionError("Attestation token image digest does not match policy.");
  }

  if (policy.expectedImageReference) {
    const imageReference = getStringClaim(payload, ["submods", "container", "image_reference"]);
    if (imageReference !== policy.expectedImageReference) {
      throw new SecureExecutionError("Attestation token image reference does not match policy.");
    }
  }

  if (policy.expectedProjectId) {
    const projectId = getStringClaim(payload, ["submods", "gce", "project_id"]);
    if (projectId !== policy.expectedProjectId) {
      throw new SecureExecutionError("Attestation token project does not match policy.");
    }
  }

  if (policy.expectedZone) {
    const zone = getStringClaim(payload, ["submods", "gce", "zone"]);
    if (zone !== policy.expectedZone) {
      throw new SecureExecutionError("Attestation token zone does not match policy.");
    }
  }

  if (policy.requireStableImage) {
    const supportAttributes = getStringArrayClaim(payload, ["submods", "confidential_space", "support_attributes"]);
    if (!supportAttributes.includes("STABLE")) {
      throw new SecureExecutionError("Attestation token is not from a stable Confidential Space image.");
    }
  }
}

function getStringClaim(payload: JWTPayload, path: string[]): string | undefined {
  const value = getClaim(payload, path);
  return typeof value === "string" ? value : undefined;
}

function getStringArrayClaim(payload: JWTPayload, path: string[]): string[] {
  const value = getClaim(payload, path);
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string") ? value : [];
}

function getClaim(payload: JWTPayload, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => {
    if (typeof value !== "object" || value === null || !(key in value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[key];
  }, payload);
}

function createSecureOperationContext(allowedSecretNames: string[], secrets: SecretProvider): SecureOperationContext {
  const allowedSecrets = new Set(allowedSecretNames);

  return {
    async getSecret(name) {
      if (!allowedSecrets.has(name)) {
        throw new SecureExecutionError(`Secret ${name} is not allowed for this secure execution.`);
      }

      const secret = await secrets.resolve(name);
      return secret.value;
    }
  };
}
