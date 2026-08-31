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

  it("registers a domain with an idempotency key", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        domain: {
          domainName: "preporbit.com",
          createDate: "2026-08-31T00:00:00Z",
          expireDate: "2027-08-31T00:00:00Z",
          autorenewEnabled: true,
          locked: true,
          privacyEnabled: true,
          renewalPrice: 14.99
        },
        order: 123,
        totalPaid: 12.99
      })
    } as Response);

    const client = new HttpNameComClient({ username: "founder-test", apiToken: "test-token" });
    const result = await client.registerDomain({
      domainName: "preporbit.com",
      years: 1,
      idempotencyKey: "approval-1"
    });

    expect(result).toMatchObject({
      domainName: "preporbit.com",
      order: 123,
      totalPaid: 12.99
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("https://api.dev.name.com/core/v1/domains"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "X-Idempotency-Key": "approval-1"
        }),
        body: JSON.stringify({
          domain: {
            domainName: "preporbit.com",
            years: 1,
            purchaseType: "registration",
            autorenewEnabled: true,
            locked: true,
            privacyEnabled: true
          }
        })
      })
    );
  });
});
