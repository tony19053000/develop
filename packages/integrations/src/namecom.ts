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

const nameComCreateDomainResponseSchema = z.object({
  domain: z
    .object({
      domainName: z.string(),
      createDate: z.string().optional(),
      expireDate: z.string().optional(),
      autorenewEnabled: z.boolean().optional(),
      locked: z.boolean().optional(),
      privacyEnabled: z.boolean().optional(),
      renewalPrice: z.number().optional()
    })
    .passthrough(),
  order: z.number().optional(),
  totalPaid: z.number().optional(),
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

export interface RegisterDomainInput {
  domainName: string;
  years: number;
  idempotencyKey: string;
  purchaseType?: string;
  purchasePrice?: number;
  autorenewEnabled?: boolean;
  locked?: boolean;
  privacyEnabled?: boolean;
}

export interface RegisteredDomain {
  domainName: string;
  createDate?: string;
  expireDate?: string;
  autorenewEnabled?: boolean;
  locked?: boolean;
  privacyEnabled?: boolean;
  renewalPrice?: number;
  order?: number;
  totalPaid?: number;
}

export interface NameComClient {
  checkAvailability(input: CheckDomainAvailabilityInput): Promise<Omit<DomainCandidate, "score" | "recommendation">[]>;
  registerDomain(input: RegisterDomainInput): Promise<RegisteredDomain>;
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

  async registerDomain(input: RegisterDomainInput): Promise<RegisteredDomain> {
    if (!this.username || !this.apiToken) {
      throw new NameComConfigurationError();
    }

    const url = new URL("/core/v1/domains", this.baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.username}:${this.apiToken}`).toString("base64")}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": input.idempotencyKey
      },
      body: JSON.stringify({
        domain: {
          domainName: input.domainName,
          years: input.years,
          purchaseType: input.purchaseType ?? "registration",
          autorenewEnabled: input.autorenewEnabled ?? true,
          locked: input.locked ?? true,
          privacyEnabled: input.privacyEnabled ?? true,
          ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {})
        }
      })
    });

    const body = nameComCreateDomainResponseSchema.parse(await response.json());

    if (!response.ok) {
      throw new Error(`name.com registration failed with status ${response.status}: ${body.message ?? "Unknown error"}.`);
    }

    return {
      domainName: body.domain.domainName,
      ...(body.domain.createDate ? { createDate: body.domain.createDate } : {}),
      ...(body.domain.expireDate ? { expireDate: body.domain.expireDate } : {}),
      ...(body.domain.autorenewEnabled !== undefined ? { autorenewEnabled: body.domain.autorenewEnabled } : {}),
      ...(body.domain.locked !== undefined ? { locked: body.domain.locked } : {}),
      ...(body.domain.privacyEnabled !== undefined ? { privacyEnabled: body.domain.privacyEnabled } : {}),
      ...(body.domain.renewalPrice !== undefined ? { renewalPrice: body.domain.renewalPrice } : {}),
      ...(body.order !== undefined ? { order: body.order } : {}),
      ...(body.totalPaid !== undefined ? { totalPaid: body.totalPaid } : {})
    };
  }
}
