import { describe, expect, it } from "vitest";
import { createWebsiteProductAgent, validateWebsite } from "./websiteProduct.js";

describe("Website/Product Agent", () => {
  it("generates a validated static product artifact from brand and domain research", async () => {
    const agent = createWebsiteProductAgent();
    const artifact = await agent.generate({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students.",
      marketResearch: {
        id: "research-1",
        projectId: "project-1",
        idea: "Launch an AI interview-preparation platform for university students.",
        queries: ["query"],
        competitors: [],
        marketSignals: [],
        namingConflicts: [],
        brand: {
          name: "InterviewForge",
          tagline: "Practice interviews faster with AI.",
          description: "AI interview preparation.",
          targetUsers: ["University students", "Career services teams"],
          positioning: "Differentiated interview readiness for early-career candidates."
        },
        evidenceSummary: "Found evidence.",
        generatedAt: "2026-08-31T00:00:00.000Z"
      },
      domainResearch: {
        id: "domain-research-1",
        projectId: "project-1",
        brandName: "InterviewForge",
        checkedDomains: ["interviewforge.com"],
        candidates: [],
        recommendedDomain: {
          domainName: "interviewforge.com",
          sld: "interviewforge",
          tld: "com",
          purchasable: true,
          premium: false,
          purchaseType: "registration",
          purchasePrice: 12.99,
          renewalPrice: 14.99,
          reason: "",
          score: 100,
          recommendation: "Available for standard registration."
        },
        generatedAt: "2026-08-31T00:00:00.000Z"
      }
    });

    expect(artifact.productName).toBe("InterviewForge");
    expect(artifact.domainName).toBe("interviewforge.com");
    expect(artifact.files.map((file) => file.path)).toEqual(["index.html", "styles.css", "app.js"]);
    expect(artifact.validation.passed).toBe(true);
    expect(artifact.files[0]?.contents).toContain("Practice interviews faster with AI.");
  });

  it("fails validation when the generated document is incomplete", () => {
    const validation = validateWebsite({
      html: "<main>Missing shell</main>",
      css: "body { color: black; }",
      js: "console.log('static');",
      productName: "InterviewForge",
      tagline: "Practice interviews faster with AI."
    });

    expect(validation.passed).toBe(false);
    expect(validation.checks.filter((check) => !check.passed).map((check) => check.name)).toEqual([
      "HTML document",
      "Brand signal",
      "Responsive CSS",
      "Interactive script"
    ]);
  });
});
