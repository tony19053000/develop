import { z } from "zod";
import type { ResearchResult } from "@launchforge/shared";

const serpApiOrganicResultSchema = z.object({
  title: z.string().catch("Untitled result"),
  link: z.string().url(),
  snippet: z.string().optional()
});

const serpApiResponseSchema = z.object({
  organic_results: z.array(serpApiOrganicResultSchema).default([]),
  error: z.string().optional()
});

export interface SerpApiConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultLocation?: string;
}

export interface SearchMarketInput {
  query: string;
  location?: string;
  limit?: number;
}

export interface SerpApiClient {
  search(input: SearchMarketInput): Promise<ResearchResult[]>;
}

export class SerpApiConfigurationError extends Error {
  constructor() {
    super("SERPAPI_API_KEY is required for real market research.");
  }
}

export class HttpSerpApiClient implements SerpApiClient {
  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly defaultLocation: string;

  constructor(config: SerpApiConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? "https://serpapi.com/search.json";
    this.defaultLocation = config.defaultLocation ?? "United States";
  }

  async search(input: SearchMarketInput): Promise<ResearchResult[]> {
    if (!this.apiKey) {
      throw new SerpApiConfigurationError();
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("engine", "google");
    url.searchParams.set("q", input.query);
    url.searchParams.set("api_key", this.apiKey);
    url.searchParams.set("location", input.location ?? this.defaultLocation);
    url.searchParams.set("hl", "en");
    url.searchParams.set("gl", "us");
    url.searchParams.set("num", String(input.limit ?? 8));

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SerpApi request failed with status ${response.status}.`);
    }

    const body = serpApiResponseSchema.parse(await response.json());

    if (body.error) {
      throw new Error(`SerpApi error: ${body.error}`);
    }

    return body.organic_results.slice(0, input.limit ?? 8).map((result) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet ?? "",
      source: "SerpApi"
    }));
  }
}
