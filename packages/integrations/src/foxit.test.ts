import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoxitConfigurationError, HttpFoxitClient } from "./foxit.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpFoxitClient", () => {
  it("requires Foxit credentials", async () => {
    const client = new HttpFoxitClient({});

    await expect(
      client.generateDocument({
        title: "Founder Launch Brief",
        fileName: "founder-launch-brief.pdf",
        markdown: "# Launch",
        templateKey: "founder_launch_brief",
        data: {}
      })
    ).rejects.toBeInstanceOf(FoxitConfigurationError);
  });

  it("generates a PDF document with Foxit DocGen client headers", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          base64FileString: Buffer.from("%PDF-1.7 generated").toString("base64"),
          fileExtension: "pdf",
          message: "PDF Document Generated Successfully"
        })
    } as Response);

    const client = new HttpFoxitClient({
      clientId: "foxit-client",
      clientSecret: "foxit-secret",
      baseUrl: "https://example.foxit.com",
      documentGenerationPath: "/document-generation/api/GenerateDocumentBase64"
    });
    const document = await client.generateDocument({
      title: "Founder Launch Brief",
      fileName: "founder-launch-brief.pdf",
      markdown: "# Launch",
      templateKey: "founder_launch_brief",
      data: { productName: "EvidenceForge" }
    });

    expect(document).toEqual({
      id: "founder_launch_brief:founder-launch-brief.pdf",
      base64FileString: Buffer.from("%PDF-1.7 generated").toString("base64"),
      fileExtension: "pdf",
      message: "PDF Document Generated Successfully"
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.foxit.com/document-generation/api/GenerateDocumentBase64"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          client_id: "foxit-client",
          client_secret: "foxit-secret",
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining('"documentValues"')
      })
    );
  });

  it("does not place credentials in the request body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ id: "foxit-doc-2" })
    } as Response);

    const client = new HttpFoxitClient({
      clientId: "foxit-client",
      clientSecret: "foxit-secret",
      baseUrl: "https://example.foxit.com"
    });
    await client.generateDocument({
      title: "Investor One-Pager",
      fileName: "investor-one-pager.pdf",
      markdown: "# Investor",
      templateKey: "investor_one_pager",
      data: { productName: "EvidenceForge" }
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.headers).toEqual(expect.objectContaining({ client_id: "foxit-client", client_secret: "foxit-secret" }));
    expect(String(requestInit?.body)).not.toContain("foxit-secret");
  });
});
