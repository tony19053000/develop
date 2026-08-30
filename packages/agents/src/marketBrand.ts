import { randomUUID } from "node:crypto";
import type { SerpApiClient } from "@launchforge/integrations";
import { marketResearchSchema, type MarketResearch, type ResearchResult } from "@launchforge/shared";

export interface MarketBrandAgent {
  research(input: { projectId: string; idea: string }): Promise<MarketResearch>;
}

export function createMarketBrandAgent(serpApi: SerpApiClient): MarketBrandAgent {
  return {
    async research(input) {
      const queries = buildResearchQueries(input.idea);
      const [competitors, marketSignals, namingConflicts] = await Promise.all([
        serpApi.search({ query: queries[0], limit: 6 }),
        serpApi.search({ query: queries[1], limit: 6 }),
        serpApi.search({ query: queries[2], limit: 6 })
      ]);

      return marketResearchSchema.parse({
        id: randomUUID(),
        projectId: input.projectId,
        idea: input.idea,
        queries,
        competitors,
        marketSignals,
        namingConflicts,
        brand: createBrandDirection(input.idea, competitors, namingConflicts),
        evidenceSummary: summarizeEvidence(competitors, marketSignals, namingConflicts),
        generatedAt: new Date().toISOString()
      });
    }
  };
}

export function buildResearchQueries(idea: string): [string, string, string] {
  return [
    `${idea} competitors startup`,
    `${idea} market trends target users`,
    `${extractBrandSeed(idea)} startup name app`
  ];
}

function createBrandDirection(
  idea: string,
  competitors: ResearchResult[],
  namingConflicts: ResearchResult[]
): MarketResearch["brand"] {
  const seed = extractBrandSeed(idea);
  const suffix = namingConflicts.length > 3 ? "Pilot" : "Forge";
  const name = `${seed}${suffix}`;

  return {
    name,
    tagline: `Launch ${seed.toLowerCase()} faster with AI.`,
    description: `An AI-assisted product concept for ${idea.toLowerCase()}`,
    targetUsers: inferTargetUsers(idea),
    positioning:
      competitors.length > 0
        ? `Differentiate from ${competitors[0]?.title ?? "existing competitors"} with faster launch execution and stronger founder workflow automation.`
        : "Position around fast AI-assisted launch execution with clear human approval boundaries."
  };
}

function summarizeEvidence(
  competitors: ResearchResult[],
  marketSignals: ResearchResult[],
  namingConflicts: ResearchResult[]
): string {
  return [
    `Found ${competitors.length} competitor or adjacent product results.`,
    `Found ${marketSignals.length} market signal results.`,
    `Found ${namingConflicts.length} naming conflict results.`
  ].join(" ");
}

function inferTargetUsers(idea: string): string[] {
  const lowerIdea = idea.toLowerCase();

  if (lowerIdea.includes("student") || lowerIdea.includes("university")) {
    return ["University students", "Career services teams", "Early-career candidates"];
  }

  if (lowerIdea.includes("freelancer")) {
    return ["Freelancers", "Independent consultants", "Small business owners"];
  }

  if (lowerIdea.includes("law") || lowerIdea.includes("legal")) {
    return ["Small law firms", "Legal operators", "Founders handling contracts"];
  }

  return ["Startup founders", "Operators", "Early adopters"];
}

function extractBrandSeed(idea: string): string {
  const ignoredWords = new Set(["launch", "with", "that", "for", "the", "and", "platform", "startup", "product"]);
  const word =
    idea
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .split(/\s+/)
      .find((candidate) => candidate.length > 3 && !ignoredWords.has(candidate.toLowerCase())) ?? "Launch";

  return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
}

