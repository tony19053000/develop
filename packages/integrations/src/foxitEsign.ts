import { z } from "zod";

const tokenResponseSchema = z.object({
  access_token: z.string().min(1)
});

const envelopeResponseSchema = z
  .object({
    folder: z
      .object({
        folderId: z.union([z.string(), z.number()]).optional(),
        folderStatus: z.string().optional()
      })
      .passthrough()
  })
  .passthrough();

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
    super("FOXIT_ESIGN_CLIENT_ID plus FOXIT_ESIGN_CLIENT_SECRET is required for Foxit eSign status checks.");
  }
}

export class HttpFoxitESignClient implements FoxitESignClient {
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;

  constructor(config: FoxitESignConfig) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? "https://na1.foxitesign.foxit.com").replace(/\/+$/g, "");
  }

  async getEnvelopeStatus(envelopeId: string): Promise<FoxitEnvelopeStatus> {
    const accessToken = await this.getAccessToken();
    const url = new URL("/api/folders/myfolder", this.baseUrl);
    url.searchParams.set("folderId", envelopeId);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const text = await response.text();
    const parsedBody = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(`Foxit eSign status request failed with status ${response.status}.`);
    }

    const parsed = envelopeResponseSchema.parse(parsedBody);
    return {
      envelopeId: String(parsed.folder.folderId ?? envelopeId),
      status: parsed.folder.folderStatus ?? "unknown"
    };
  }

  private async getAccessToken(): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new FoxitESignConfigurationError();
    }

    const response = await fetch(new URL("/api/oauth2/access_token", this.baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
        scope: "read-write"
      })
    });
    const text = await response.text();
    const parsedBody = text ? JSON.parse(text) : {};

    if (!response.ok || !("access_token" in Object(parsedBody))) {
      throw new Error("Foxit eSign OAuth token request failed.");
    }

    return tokenResponseSchema.parse(parsedBody).access_token;
  }
}
