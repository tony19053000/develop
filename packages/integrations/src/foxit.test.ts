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

  it("generates a PDF document with bearer auth", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () =>
        JSON.stringify({
          documentId: "foxit-doc-1",
          downloadUrl: "https://example.foxit.com/documents/foxit-doc-1.pdf",
          size: 4096
        })
    } as Response);

    const client = new HttpFoxitClient({
      apiKey: "foxit-api-key",
      baseUrl: "https://example.foxit.com",
      documentGenerationPath: "/generate"
    });
    const document = await client.generateDocument({
      title: "Founder Launch Brief",
      fileName: "founder-launch-brief.pdf",
      markdown: "# Launch",
      templateKey: "founder_launch_brief",
      data: { productName: "EvidenceForge" }
    });

    expect(document).toEqual({
      id: "foxit-doc-1",
      downloadUrl: "https://example.foxit.com/documents/foxit-doc-1.pdf",
      size: 4096
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://example.foxit.com/generate"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer foxit-api-key",
          "Content-Type": "application/json"
        }),
        body: expect.stringContaining('"templateKey":"founder_launch_brief"')
      })
    );
  });

  it("supports client id and secret auth without placing credentials in the body", async () => {
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
    expect(requestInit?.headers).toEqual(
      expect.objectContaining({
        Authorization: `Basic ${Buffer.from("foxit-client:foxit-secret").toString("base64")}`
      })
    );
    expect(String(requestInit?.body)).not.toContain("foxit-secret");
  });
});
