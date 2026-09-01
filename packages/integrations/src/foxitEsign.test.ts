import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoxitESignConfigurationError, FoxitESignRequestError, HttpFoxitESignClient } from "./foxitEsign.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpFoxitESignClient", () => {
  it("requires Foxit Fusion credentials", async () => {
    const client = new HttpFoxitESignClient({});

    await expect(client.getEnvelopeStatus("folder-1")).rejects.toBeInstanceOf(FoxitESignConfigurationError);
  });

  it("checks envelope status using current Fusion client headers", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify({ folder: { folderId: "folder-1", folderStatus: "EXECUTED" } })
    } as Response);

    const client = new HttpFoxitESignClient({
      clientId: "foxit-client",
      clientSecret: "foxit-secret",
      baseUrl: "https://example.fusion.foxit.com"
    });
    const status = await client.getEnvelopeStatus("folder-1");

    expect(status).toEqual({ envelopeId: "folder-1", status: "EXECUTED" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("https://example.fusion.foxit.com/esign/api/v1/folders/viewActivityHistory?folderId=folder-1"),
      expect.objectContaining({
        method: "GET",
        headers: { client_id: "foxit-client", client_secret: "foxit-secret" }
      })
    );
  });

  it("reports non-JSON Fusion eSign failures without leaking response HTML", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "<!DOCTYPE html><html><body>Bad gateway</body></html>"
    } as Response);

    const client = new HttpFoxitESignClient({
      clientId: "foxit-client",
      clientSecret: "foxit-secret",
      baseUrl: "https://example.fusion.foxit.com"
    });

    await expect(client.getEnvelopeStatus("folder-1")).rejects.toThrow(FoxitESignRequestError);
  });
});
