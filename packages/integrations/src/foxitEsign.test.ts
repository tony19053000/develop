import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FoxitESignConfigurationError, HttpFoxitESignClient } from "./foxitEsign.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpFoxitESignClient", () => {
  it("requires separate Foxit eSign credentials", async () => {
    const client = new HttpFoxitESignClient({});

    await expect(client.getEnvelopeStatus("folder-1")).rejects.toBeInstanceOf(FoxitESignConfigurationError);
  });

  it("checks envelope status using OAuth bearer auth", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ access_token: "access-token" })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ folder: { folderId: "folder-1", folderStatus: "EXECUTED" } })
      } as Response);

    const client = new HttpFoxitESignClient({
      clientId: "esign-client",
      clientSecret: "esign-secret",
      baseUrl: "https://example.foxitesign.com"
    });
    const status = await client.getEnvelopeStatus("folder-1");

    expect(status).toEqual({ envelopeId: "folder-1", status: "EXECUTED" });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("https://example.foxitesign.com/api/oauth2/access_token"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("https://example.foxitesign.com/api/folders/myfolder?folderId=folder-1"),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer access-token" }
      })
    );
    expect(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body)).toContain("client_id=esign-client");
  });
});
