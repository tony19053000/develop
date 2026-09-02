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

export interface CreateFoxitEnvelopeDocument {
  fileName: string;
  pdfBase64: string;
}

export interface CreateFoxitEnvelopeInput {
  folderName: string;
  signer: {
    firstName: string;
    lastName: string;
    emailId: string;
    permission: "FILL_FIELDS_AND_SIGN";
  };
  documents: CreateFoxitEnvelopeDocument[];
  sendNow?: boolean;
  createEmbeddedSendingSession?: boolean;
}

export interface FoxitEnvelopeCreation {
  envelopeId: string;
  status: string;
  embeddedSessionUrl?: string;
}

export interface FoxitESignClient {
  createEnvelope(input: CreateFoxitEnvelopeInput): Promise<FoxitEnvelopeCreation>;
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

  async createEnvelope(input: CreateFoxitEnvelopeInput): Promise<FoxitEnvelopeCreation> {
    if (!this.clientId || !this.clientSecret) {
      throw new FoxitESignConfigurationError();
    }

    const url = new URL("/esign/api/v1/folders/createfolder", this.baseUrl);
    const payload = {
      folderName: input.folderName,
      inputType: "base64",
      fileNames: input.documents.map((document) => document.fileName),
      base64FileString: input.documents.map((document) => document.pdfBase64),
      processTextTags: false,
      processAcroFields: false,
      parties: [
        {
          firstName: input.signer.firstName,
          lastName: input.signer.lastName,
          emailId: input.signer.emailId,
          permission: input.signer.permission,
          sequence: 1,
          allowNameChange: "false"
        }
      ],
      fields: [
        {
          type: "signature",
          x: 108,
          y: 560,
          width: 120,
          height: 24,
          documentNumber: 1,
          pageNumber: 1,
          tabOrder: 1,
          party: 1,
          required: true
        },
        {
          type: "date",
          name: "Date Signed",
          x: 336,
          y: 560,
          width: 170,
          height: 24,
          documentNumber: 1,
          pageNumber: 1,
          tabOrder: 2,
          party: 1,
          required: true,
          fontSize: 12,
          dateFormat: "MM-DD-YYYY",
          readOnly: true,
          systemField: true
        }
      ],
      sendNow: input.sendNow ?? false,
      createEmbeddedSendingSession: input.createEmbeddedSendingSession ?? true,
      hideSendButton: false,
      fixRecipientParties: true,
      fixDocuments: true
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    const parsedBody = parseResponseBody(text);

    if (!response.ok) {
      throw new FoxitESignRequestError(response.status, extractErrorMessage(parsedBody));
    }

    const parsed = envelopeResponseSchema.parse(parsedBody);
    return parseEnvelopeCreation(parsed);
  }

  async getEnvelopeStatus(envelopeId: string): Promise<FoxitEnvelopeStatus> {
    if (!this.clientId || !this.clientSecret) {
      throw new FoxitESignConfigurationError();
    }

    const url = new URL("/esign/api/v1/folders/myfolder", this.baseUrl);
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
    if (parsed.result === "error") {
      throw new FoxitESignRequestError(response.status, extractErrorMessage(parsed));
    }

    const folder = getRecord(parsed.folder);
    const details = getRecord(parsed.details);
    return {
      envelopeId: String(
        folder?.folderId ?? details?.folderId ?? parsed.folderId ?? parsed.envelopeId ?? parsed.id ?? envelopeId
      ),
      status: String(
        folder?.folderStatus ??
          folder?.status ??
          details?.status ??
          parsed.folderStatus ??
          parsed.envelopeStatus ??
          parsed.status ??
          "unknown"
      )
    };
  }
}

function parseEnvelopeCreation(parsed: Record<string, unknown>): FoxitEnvelopeCreation {
  const folder = getRecord(parsed.folder);
  const envelopeId = folder?.folderId ?? parsed.folderId ?? parsed.envelopeId ?? parsed.id;

  if (!envelopeId) {
    throw new FoxitESignRequestError(200, "missing envelope id in Foxit Fusion eSign response");
  }

  const embeddedSessionUrl = folder?.embeddedSessionURL ?? parsed.embeddedSessionURL ?? parsed.embeddedSessionUrl;

  return {
    envelopeId: String(envelopeId),
    status: String(folder?.folderStatus ?? folder?.status ?? parsed.folderStatus ?? parsed.status ?? "prepared"),
    ...(typeof embeddedSessionUrl === "string" && embeddedSessionUrl.length > 0
      ? { embeddedSessionUrl }
      : {})
  };
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
