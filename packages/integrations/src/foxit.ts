import { z } from "zod";

const foxitDocumentResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    documentId: z.union([z.string(), z.number()]).optional(),
    fileId: z.union([z.string(), z.number()]).optional(),
    downloadUrl: z.string().url().optional(),
    url: z.string().url().optional(),
    size: z.number().int().nonnegative().optional()
  })
  .passthrough();

export interface FoxitConfig {
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string;
  documentGenerationPath?: string;
}

export interface GenerateFoxitDocumentInput {
  title: string;
  fileName: string;
  markdown: string;
  templateKey: string;
  data: Record<string, unknown>;
}

export interface FoxitDocument {
  id: string;
  downloadUrl?: string;
  size?: number;
}

export interface FoxitClient {
  generateDocument(input: GenerateFoxitDocumentInput): Promise<FoxitDocument>;
}

export class FoxitConfigurationError extends Error {
  constructor() {
    super("FOXIT_API_KEY or FOXIT_CLIENT_ID plus FOXIT_CLIENT_SECRET is required for real Foxit document generation.");
  }
}

export class HttpFoxitClient implements FoxitClient {
  private readonly apiKey: string | undefined;
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly documentGenerationPath: string;

  constructor(config: FoxitConfig) {
    this.apiKey = config.apiKey;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.baseUrl = (config.baseUrl ?? "https://api.developer-api.foxit.com").replace(/\/+$/g, "");
    this.documentGenerationPath = config.documentGenerationPath ?? "/document-generation/api/v1/documents/generate";
  }

  async generateDocument(input: GenerateFoxitDocumentInput): Promise<FoxitDocument> {
    if (!this.apiKey && (!this.clientId || !this.clientSecret)) {
      throw new FoxitConfigurationError();
    }

    const response = await fetch(new URL(this.documentGenerationPath, this.baseUrl), {
      method: "POST",
      headers: {
        ...this.authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        outputFormat: "pdf",
        templateKey: input.templateKey,
        fileName: input.fileName,
        data: {
          title: input.title,
          markdown: input.markdown,
          ...input.data
        }
      })
    });
    const text = await response.text();
    const parsedBody = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message =
        typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
          ? String(parsedBody.message)
          : "Unknown error";
      throw new Error(`Foxit document generation failed with status ${response.status}: ${message}.`);
    }

    const parsed = foxitDocumentResponseSchema.parse(parsedBody);
    const id = parsed.id ?? parsed.documentId ?? parsed.fileId ?? `${input.templateKey}:${input.fileName}`;
    const downloadUrl = parsed.downloadUrl ?? parsed.url;

    return {
      id: String(id),
      ...(downloadUrl ? { downloadUrl } : {}),
      ...(parsed.size !== undefined ? { size: parsed.size } : {})
    };
  }

  private authHeader(): Record<string, string> {
    if (this.apiKey) {
      return { Authorization: `Bearer ${this.apiKey}` };
    }

    const encoded = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    return { Authorization: `Basic ${encoded}` };
  }
}
