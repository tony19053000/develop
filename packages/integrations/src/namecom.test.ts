import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpNameComClient, NameComConfigurationError } from "./namecom.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpNameComClient", () => {
  it("requires name.com credentials", async () => {
    const client = new HttpNameComClient({});

    await expect(client.checkAvailability({ domainNames: ["preporbit.com"] })).rejects.toBeInstanceOf(
      NameComConfigurationError
    );
  });

  it("maps availability results into domain candidates", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            domainName: "preporbit.com",
            purchasable: true,
            sld: "preporbit",
            tld: "com",
            premium: false,
            purchasePrice: 12.99,
            purchaseType: "registration",
            renewalPrice: 14.99,
            reason: ""
          }
        ]
      })
    } as Response);

    const client = new HttpNameComClient({ username: "founder-test", apiToken: "test-token" });
    const results = await client.checkAvailability({ domainNames: ["preporbit.com"] });

    expect(results).toEqual([
      {
        domainName: "preporbit.com",
        sld: "preporbit",
        tld: "com",
        purchasable: true,
        premium: false,
        purchaseType: "registration",
        purchasePrice: 12.99,
        renewalPrice: 14.99,
        reason: ""
      }
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.dev.name.com/core/v1/domains:checkAvailability"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
