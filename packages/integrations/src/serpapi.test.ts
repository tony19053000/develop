import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpSerpApiClient, SerpApiConfigurationError } from "./serpapi.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpSerpApiClient", () => {
  it("requires a real API key", async () => {
    const client = new HttpSerpApiClient({});

    await expect(client.search({ query: "AI interview prep" })).rejects.toBeInstanceOf(SerpApiConfigurationError);
  });

  it("maps organic results into research evidence", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        organic_results: [
          {
            title: "Mock Competitor",
            link: "https://example.com",
            snippet: "AI interview practice."
          }
        ]
      })
    } as Response);

    const client = new HttpSerpApiClient({ apiKey: "test-key" });
    const results = await client.search({ query: "AI interview prep", limit: 1 });

    expect(results).toEqual([
      {
        title: "Mock Competitor",
        link: "https://example.com",
        snippet: "AI interview practice.",
        source: "SerpApi"
      }
    ]);
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

