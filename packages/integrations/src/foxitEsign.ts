import { z } from "zod";

const envelopeResponseSchema = z.record(z.string(), z.unknown());

export interface FoxitESignConfig {
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
}

export interface FoxitEnvelopeStatus {
  envelopeId: string;
  status: string;
}

export interface FoxitESignClient {
  getEnvelopeStatus(envelopeId: string): Promise<FoxitEnvelopeStatus>;
}

export class FoxitESignConfigurationError extends Error {
  constructor() {
    super("FOXIT_CLIENT_ID plus FOXIT_CLIENT_SECRET is required for current Foxit Fusion eSign API calls.");
  }
}

export class FoxitESignRequestError extends Error {
  constructor(status: number, message: string) {
    super(`Foxit Fusion eSign request failed with status ${status}: ${message}.`);
  }
}

export class HttpFoxitESignClient implements FoxitESignClient {
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;

  constructor(config: FoxitESignConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? "https://na1.fusion.foxit.com").replace(/\/+$/g, "");
  }

  async getEnvelopeStatus(envelopeId: string): Promise<FoxitEnvelopeStatus> {
    if (!this.clientId || !this.clientSecret) {
      throw new FoxitESignConfigurationError();
    }

    const url = new URL("/esign/api/v1/folders/viewActivityHistory", this.baseUrl);
    url.searchParams.set("folderId", envelopeId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        client_id: this.clientId,
        client_secret: this.clientSecret
      }
    });
    const text = await response.text();
    const parsedBody = parseResponseBody(text);

    if (!response.ok) {
      throw new FoxitESignRequestError(response.status, extractErrorMessage(parsedBody));
    }

    const parsed = envelopeResponseSchema.parse(parsedBody);
    const folder = getRecord(parsed.folder);
    return {
      envelopeId: String(
        folder?.folderId ?? parsed.folderId ?? parsed.envelopeId ?? parsed.id ?? envelopeId
      ),
      status: String(
        folder?.folderStatus ??
          folder?.status ??
          parsed.folderStatus ??
          parsed.envelopeStatus ??
          parsed.status ??
          "unknown"
      )
    };
  }
}

function parseResponseBody(text: string): unknown {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(body: unknown): string {
  if (typeof body === "string") {
    return body.trim().startsWith("<") ? "non-JSON response from Foxit Fusion eSign" : body.slice(0, 160);
  }

  if (typeof body === "object" && body !== null) {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "reason", "error", "error_description", "title", "detail"]) {
      if (typeof record[key] === "string") {
        return record[key];
      }
    }
  }

  return "unknown error";
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
