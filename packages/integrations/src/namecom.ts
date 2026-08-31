import { z } from "zod";
import type { DomainCandidate } from "@launchforge/shared";

const nameComResultSchema = z.object({
  domainName: z.string(),
  purchasable: z.boolean().default(false),
  sld: z.string().default(""),
  tld: z.string().default(""),
  premium: z.boolean().default(false),
  purchasePrice: z.number().nullable().optional(),
  purchaseType: z.string().default("unknown"),
  renewalPrice: z.number().nullable().optional(),
  reason: z.string().default("")
});

const nameComResponseSchema = z.object({
  results: z.array(nameComResultSchema).default([]),
  message: z.string().optional(),
  details: z.string().optional()
});

export interface NameComConfig {
  username?: string;
  apiToken?: string;
  baseUrl?: string;
}

export interface CheckDomainAvailabilityInput {
  domainNames: string[];
}

export interface NameComClient {
  checkAvailability(input: CheckDomainAvailabilityInput): Promise<Omit<DomainCandidate, "score" | "recommendation">[]>;
}

export class NameComConfigurationError extends Error {
  constructor() {
    super("NAMECOM_USERNAME and NAMECOM_API_TOKEN are required for real domain availability search.");
  }
}

export class HttpNameComClient implements NameComClient {
  private readonly username: string | undefined;
  private readonly apiToken: string | undefined;
  private readonly baseUrl: string;

  constructor(config: NameComConfig) {
    this.username = config.username;
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl ?? "https://api.dev.name.com";
  }

  async checkAvailability(
    input: CheckDomainAvailabilityInput
  ): Promise<Omit<DomainCandidate, "score" | "recommendation">[]> {
    if (!this.username || !this.apiToken) {
      throw new NameComConfigurationError();
    }

    const url = new URL("/core/v1/domains:checkAvailability", this.baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.username}:${this.apiToken}`).toString("base64")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        domainNames: input.domainNames.slice(0, 50),
        purchaseType: "registration"
      })
    });

    const body = nameComResponseSchema.parse(await response.json());

    if (!response.ok) {
      throw new Error(`name.com request failed with status ${response.status}: ${body.message ?? "Unknown error"}.`);
    }

    return body.results.map((result) => ({
      domainName: result.domainName,
      sld: result.sld,
      tld: result.tld,
      purchasable: result.purchasable,
      premium: result.premium,
      purchaseType: result.purchaseType,
      purchasePrice: result.purchasePrice ?? null,
      renewalPrice: result.renewalPrice ?? null,
      reason: result.reason
    }));
  }
}
