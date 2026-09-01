import { describe, expect, it } from "vitest";
import { createDocumentAgent } from "./document.js";

describe("Document Agent", () => {
  it("prepares founder documents without sponsor credentials", async () => {
    const agent = createDocumentAgent();
    const artifact = await agent.prepare({
      projectId: "project-1",
      idea: "Launch an AI contract review assistant for small law firms.",
      marketResearch: {
        id: "market-1",
        projectId: "project-1",
        idea: "Launch an AI contract review assistant for small law firms.",
        queries: ["contract review ai"],
        competitors: [
          {
            title: "Contract review competitor",
            link: "https://example.com/competitor",
            snippet: "Contract review tools are growing.",
            source: "SerpApi"
          }
        ],
        marketSignals: [
          {
            title: "Legal AI demand",
            link: "https://example.com/signal",
            snippet: "Small law firms need faster review.",
            source: "SerpApi"
          }
        ],
        namingConflicts: [],
        brand: {
          name: "EvidenceForge",
          tagline: "Review contracts faster with AI.",
          description: "AI contract review for small law firms.",
          targetUsers: ["Small law firms"],
          positioning: "Focused legal document review."
        },
        evidenceSummary: "Demand exists for faster contract review.",
        generatedAt: "2026-09-01T00:00:00.000Z"
      }
    });

    expect(artifact).toMatchObject({
      projectId: "project-1",
      productName: "EvidenceForge",
      provider: "foxit",
      status: "prepared",
      validation: { passed: true }
    });
    expect(artifact.documents.map((document) => document.type)).toEqual([
      "founder_launch_brief",
      "investor_one_pager",
      "technical_delivery_summary"
    ]);
    expect(artifact.documents[0]?.markdown).toContain("EvidenceForge Founder Launch Brief");
    expect(artifact.documents.map((document) => document.markdown).join(" ")).not.toMatch(
      /api[_ -]?key|client[_ -]?secret|token/i
    );
  });
});
