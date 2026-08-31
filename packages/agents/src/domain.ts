import { randomUUID } from "node:crypto";
import type { NameComClient } from "@launchforge/integrations";
import { domainResearchSchema, type DomainCandidate, type DomainResearch, type MarketResearch } from "@launchforge/shared";

export interface DomainAgentInput {
  projectId: string;
  idea: string;
  marketResearch?: MarketResearch;
}

export interface DomainAgent {
  research(input: DomainAgentInput): Promise<DomainResearch>;
}

export function createDomainAgent(nameCom: NameComClient): DomainAgent {
  return {
    async research(input) {
      const brandName = input.marketResearch?.brand.name ?? deriveBrandSeed(input.idea);
      const checkedDomains = buildDomainCandidates(brandName, input.idea);
      const availability = await nameCom.checkAvailability({ domainNames: checkedDomains });
      const candidates = availability.map((candidate) => scoreDomain(candidate, brandName));
      const sortedCandidates = [...candidates].sort((left, right) => right.score - left.score);
      const recommendedDomain = sortedCandidates.find((candidate) => candidate.purchasable);

      return domainResearchSchema.parse({
        id: randomUUID(),
        projectId: input.projectId,
        brandName,
        checkedDomains,
        candidates: sortedCandidates,
        recommendedDomain,
        generatedAt: new Date().toISOString()
      });
    }
  };
}

export function buildDomainCandidates(brandName: string, idea: string): string[] {
  const seed = normalizeDomainLabel(brandName) || normalizeDomainLabel(deriveBrandSeed(idea)) || "launch";
  const ideaSeed = normalizeDomainLabel(deriveBrandSeed(idea));
  const baseLabels = Array.from(
    new Set([seed, `${seed}app`, `${seed}hq`, `${seed}ai`, `${seed}labs`, ideaSeed && ideaSeed !== seed ? ideaSeed : ""])
  ).filter(Boolean);
  const tlds = ["com", "io", "ai", "app"];

  return baseLabels.flatMap((label) => tlds.map((tld) => `${label}.${tld}`)).slice(0, 24);
}

function scoreDomain(
  candidate: Omit<DomainCandidate, "score" | "recommendation">,
  brandName: string
): DomainCandidate {
  const normalizedBrand = normalizeDomainLabel(brandName);
  let score = 0;

  if (candidate.purchasable) {
    score += 45;
  }

  if (candidate.purchaseType === "registration") {
    score += 20;
  }

  if (!candidate.premium) {
    score += 15;
  }

  if (candidate.tld === "com") {
    score += 10;
  } else if (candidate.tld === "io" || candidate.tld === "ai" || candidate.tld === "app") {
    score += 6;
  }

  if (candidate.sld === normalizedBrand) {
    score += 10;
  } else if (candidate.sld.startsWith(normalizedBrand)) {
    score += 6;
  }

  if (candidate.purchasePrice !== null && candidate.purchasePrice <= 25) {
    score += 5;
  }

  return {
    ...candidate,
    score: Math.min(score, 100),
    recommendation: describeRecommendation(candidate)
  };
}

function describeRecommendation(candidate: Omit<DomainCandidate, "score" | "recommendation">): string {
  if (!candidate.purchasable) {
    return candidate.reason || "Unavailable for registration.";
  }

  if (candidate.premium) {
    return "Available, but premium pricing needs approval before registration.";
  }

  if (candidate.purchaseType !== "registration") {
    return "Available through a non-standard purchase type; re-check before any protected action.";
  }

  return "Available for standard registration.";
}

function deriveBrandSeed(idea: string): string {
  const ignoredWords = new Set(["launch", "with", "that", "for", "the", "and", "platform", "startup", "product"]);
  const word =
    idea
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .split(/\s+/)
      .find((candidate) => candidate.length > 3 && !ignoredWords.has(candidate.toLowerCase())) ?? "launch";

  return word;
}

function normalizeDomainLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}
