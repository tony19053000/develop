import type { NameComClient } from "@launchforge/integrations";
import { describe, expect, it } from "vitest";
import { buildDomainCandidates, createDomainAgent } from "./domain.js";

describe("Domain Agent", () => {
  it("builds domain candidates from brand and idea inputs", () => {
    const candidates = buildDomainCandidates("PrepOrbit", "Launch an AI interview-preparation platform.");

    expect(candidates).toContain("preporbit.com");
    expect(candidates).toContain("preporbit.ai");
    expect(candidates).toContain("preporbitapp.com");
  });

  it("ranks standard purchasable domains above premium and unavailable domains", async () => {
    const fakeNameCom: NameComClient = {
      async checkAvailability() {
        return [
          {
            domainName: "preporbit.ai",
            sld: "preporbit",
            tld: "ai",
            purchasable: true,
            premium: true,
            purchaseType: "registration",
            purchasePrice: 399,
            renewalPrice: 399,
            reason: ""
          },
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
          },
          {
            domainName: "preporbit.io",
            sld: "preporbit",
            tld: "io",
            purchasable: false,
            premium: false,
            purchaseType: "registration",
            purchasePrice: null,
            renewalPrice: null,
            reason: "Already registered"
          }
        ];
      }
    };

    const agent = createDomainAgent(fakeNameCom);
    const research = await agent.research({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform.",
      marketResearch: {
        id: "market-1",
        projectId: "project-1",
        idea: "Launch an AI interview-preparation platform.",
        queries: ["interview competitors"],
        competitors: [],
        marketSignals: [],
        namingConflicts: [],
        brand: {
          name: "PrepOrbit",
          tagline: "Practice better interviews.",
          description: "AI interview preparation.",
          targetUsers: ["University students"],
          positioning: "Focused interview practice."
        },
        evidenceSummary: "Evidence.",
        generatedAt: "2026-08-31T00:00:00.000Z"
      }
    });

    expect(research.recommendedDomain?.domainName).toBe("preporbit.com");
    expect(research.candidates[0]?.score).toBeGreaterThan(research.candidates[1]?.score ?? 0);
  });
});
