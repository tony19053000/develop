import type { SerpApiClient } from "@launchforge/integrations";
import { describe, expect, it } from "vitest";
import { buildResearchQueries, createMarketBrandAgent } from "./marketBrand.js";

describe("Market & Brand Agent", () => {
  it("builds distinct SerpApi queries from the startup idea", () => {
    const queries = buildResearchQueries("Launch an AI interview-preparation platform for university students.");

    expect(queries).toHaveLength(3);
    expect(queries[0]).toContain("competitors");
    expect(queries[1]).toContain("market trends");
    expect(queries[2]).toContain("Interview");
  });

  it("creates evidence-backed market research from SerpApi results", async () => {
    const fakeSerpApi: SerpApiClient = {
      async search(input) {
        return [
          {
            title: `${input.query} result`,
            link: "https://example.com",
            snippet: "Evidence snippet.",
            source: "SerpApi"
          }
        ];
      }
    };

    const agent = createMarketBrandAgent(fakeSerpApi);
    const research = await agent.research({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students."
    });

    expect(research.competitors).toHaveLength(1);
    expect(research.brand.targetUsers).toContain("University students");
    expect(research.evidenceSummary).toContain("competitor");
  });
});

