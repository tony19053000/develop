import { z } from "zod";
import type { BackendEndpoint, BackendTable, XanoProvisioning } from "@launchforge/shared";

const xanoApiGroupSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    canonical: z.string().optional(),
    guid: z.string().optional(),
    documentation: z
      .object({
        link: z.string().url().optional()
      })
      .optional()
  })
  .passthrough();

const xanoTableSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    guid: z.string().optional()
  })
  .passthrough();

const xanoEndpointSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    guid: z.string().optional(),
    verb: z.string().optional()
  })
  .passthrough();

export interface XanoConfig {
  apiKey?: string;
  workspaceId?: string;
  instanceBaseUrl?: string;
}

export interface ProvisionXanoBackendInput {
  productName: string;
  apiGroupName: string;
  tables: BackendTable[];
  endpoints: BackendEndpoint[];
}

export interface XanoClient {
  provisionBackend(input: ProvisionXanoBackendInput): Promise<XanoProvisioning>;
}

export class XanoConfigurationError extends Error {
  constructor() {
    super("XANO_API_KEY, XANO_WORKSPACE_ID, and XANO_INSTANCE_BASE_URL are required for real Xano provisioning.");
  }
}

export class HttpXanoClient implements XanoClient {
  private readonly apiKey: string | undefined;
  private readonly workspaceId: string | undefined;
  private readonly instanceBaseUrl: string | undefined;

  constructor(config: XanoConfig) {
    this.apiKey = config.apiKey;
    this.workspaceId = config.workspaceId;
    this.instanceBaseUrl = config.instanceBaseUrl?.replace(/\/+$/g, "");
  }

  async provisionBackend(input: ProvisionXanoBackendInput): Promise<XanoProvisioning> {
    if (!this.apiKey || !this.workspaceId || !this.instanceBaseUrl) {
      throw new XanoConfigurationError();
    }

    const apiGroup = await this.createApiGroup(input.apiGroupName);
    const tables = [];

    for (const table of input.tables) {
      tables.push(await this.createTable(table));
    }

    const endpoints = [];

    for (const endpoint of input.endpoints) {
      endpoints.push(await this.createEndpoint(apiGroup.id, endpoint));
    }

    return {
      id: `${this.workspaceId}:${apiGroup.id ?? apiGroup.name}`,
      workspaceId: this.workspaceId,
      apiGroup: {
        ...(apiGroup.id !== undefined ? { id: apiGroup.id } : {}),
        name: apiGroup.name,
        ...(apiGroup.canonical ? { canonical: apiGroup.canonical } : {}),
        ...(apiGroup.documentation?.link ? { documentationUrl: apiGroup.documentation.link } : {})
      },
      tables: tables.map((table) => ({
        ...(table.id !== undefined ? { id: table.id } : {}),
        name: table.name,
        ...(table.guid ? { guid: table.guid } : {})
      })),
      endpoints: endpoints.map((endpoint, index) => ({
        ...(endpoint.id !== undefined ? { id: endpoint.id } : {}),
        name: endpoint.name,
        verb: input.endpoints[index]?.verb ?? endpoint.verb ?? "GET",
        path: input.endpoints[index]?.path ?? `/${endpoint.name}`,
        ...(endpoint.guid ? { guid: endpoint.guid } : {})
      })),
      provisionedAt: new Date().toISOString()
    };
  }

  private async createApiGroup(name: string) {
    const response = await this.sendXanoScript(`/workspace/${this.workspaceId}/apigroup`, buildApiGroupScript(name));
    return xanoApiGroupSchema.parse(response);
  }

  private async createTable(table: BackendTable) {
    const response = await this.sendXanoScript(`/workspace/${this.workspaceId}/table`, buildTableScript(table));
    return xanoTableSchema.parse(response);
  }

  private async createEndpoint(apiGroupId: number | undefined, endpoint: BackendEndpoint) {
    if (apiGroupId === undefined) {
      throw new Error("Xano API group response did not include an id.");
    }

    const response = await this.sendXanoScript(
      `/workspace/${this.workspaceId}/apigroup/${apiGroupId}/api`,
      endpoint.xanoScript
    );
    return xanoEndpointSchema.parse(response);
  }

  private async sendXanoScript(path: string, body: string): Promise<unknown> {
    const response = await fetch(new URL(`/api:meta${path}`, this.instanceBaseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "text/x-xanoscript"
      },
      body
    });
    const text = await response.text();
    const parsedBody = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const message =
        typeof parsedBody === "object" && parsedBody !== null && "message" in parsedBody
          ? String(parsedBody.message)
          : "Unknown error";
      throw new Error(`Xano request failed with status ${response.status}: ${message}.`);
    }

    return parsedBody;
  }
}

export function buildApiGroupScript(name: string): string {
  const canonical = normalizeXanoIdentifier(name);

  return `api_group ${canonical} {
  canonical = "${canonical}"
  swagger = {active: true}
}`;
}

export function buildTableScript(table: BackendTable): string {
  const fields = table.fields
    .map((field) => `    ${field.type} ${normalizeXanoIdentifier(field.name)}`)
    .join("\n");

  return `table ${normalizeXanoIdentifier(table.name)} {
  schema {
${fields}
  }
  index = [
    {type: "primary", field: [{name: "id"}]}
  ]
}`;
}

function normalizeXanoIdentifier(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "launchforge";
}
