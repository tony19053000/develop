import { z } from "zod";
import JSZip from "jszip";

const foxitDocumentResponseSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    documentId: z.union([z.string(), z.number()]).optional(),
    fileId: z.union([z.string(), z.number()]).optional(),
    downloadUrl: z.string().url().optional(),
    url: z.string().url().optional(),
    size: z.number().int().nonnegative().optional(),
    base64FileString: z.string().optional(),
    fileExtension: z.string().optional(),
    message: z.string().optional()
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
  base64FileString?: string;
  fileExtension?: string;
  message?: string;
}

export interface FoxitClient {
  generateDocument(input: GenerateFoxitDocumentInput): Promise<FoxitDocument>;
}

export class FoxitConfigurationError extends Error {
  constructor() {
    super("FOXIT_CLIENT_ID plus FOXIT_CLIENT_SECRET is required for real Foxit document generation.");
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
    this.baseUrl = (config.baseUrl ?? "https://na1.fusion.foxit.com").replace(/\/+$/g, "");
    this.documentGenerationPath = config.documentGenerationPath ?? "/document-generation/api/GenerateDocumentBase64";
  }

  async generateDocument(input: GenerateFoxitDocumentInput): Promise<FoxitDocument> {
    if (!this.clientId || !this.clientSecret) {
      throw new FoxitConfigurationError();
    }

    const base64FileString = await createDocxTemplateBase64();
    const response = await fetch(new URL(this.documentGenerationPath, this.baseUrl), {
      method: "POST",
      headers: {
        ...this.authHeader(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        base64FileString,
        documentValues: {
          title: input.title,
          body: input.markdown,
          generated_date: new Date().toISOString().slice(0, 10),
          ...input.data
        },
        outputFormat: "pdf",
        templateKey: input.templateKey,
        fileName: input.fileName
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
      ...(parsed.size !== undefined ? { size: parsed.size } : {}),
      ...(parsed.base64FileString ? { base64FileString: parsed.base64FileString } : {}),
      ...(parsed.fileExtension ? { fileExtension: parsed.fileExtension } : {}),
      ...(parsed.message ? { message: parsed.message } : {})
    };
  }

  private authHeader(): Record<string, string> {
    if (this.apiKey) {
      return { Authorization: `Bearer ${this.apiKey}` };
    }

    return {
      client_id: this.clientId ?? "",
      client_secret: this.clientSecret ?? ""
    };
  }
}

async function createDocxTemplateBase64(): Promise<string> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.folder("word")?.file(
    "document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
        <w:t>{{title}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>{{body}}</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:t>Generated {{generated_date}} by LaunchForge.</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`
  );

  return zip.generateAsync({ type: "base64", compression: "DEFLATE" });
}
