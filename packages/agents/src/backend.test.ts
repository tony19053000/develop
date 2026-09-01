import { describe, expect, it } from "vitest";
import { buildWaitlistEndpointScript, createBackendAgent } from "./backend.js";

describe("Backend Agent", () => {
  it("plans a Xano-backed waitlist backend from a website artifact", async () => {
    const agent = createBackendAgent();
    const artifact = await agent.plan({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students.",
      websiteArtifact: {
        id: "website-1",
        projectId: "project-1",
        productName: "InterviewForge",
        tagline: "Practice interviews faster with AI.",
        domainName: "interviewforge.com",
        previewPath: "index.html",
        files: [{ path: "index.html", contentType: "text/html", contents: "<!doctype html>" }],
        validation: { passed: true, checks: [] },
        deployment: {
          buildCommand: "No build step required.",
          outputDirectory: ".",
          requiredEnvironment: []
        },
        generatedAt: "2026-09-01T00:00:00.000Z"
      }
    });

    expect(artifact).toMatchObject({
      projectId: "project-1",
      productName: "InterviewForge",
      mode: "planned",
      frontendConnection: {
        environmentVariable: "VITE_PRODUCT_API_URL"
      }
    });
    expect(artifact.tables[0]?.name).toBe("interviewforge_waitlist_leads");
    expect(artifact.endpoints[0]).toMatchObject({
      verb: "POST",
      path: "/waitlist",
      tableName: "interviewforge_waitlist_leads"
    });
    expect(artifact.endpoints[0]?.xanoScript).toContain("db.add interviewforge_waitlist_leads");
  });

  it("escapes product names inside endpoint XanoScript", () => {
    const script = buildWaitlistEndpointScript("create lead", "waitlist", 'A "quoted" product');

    expect(script).toContain('product_name: "A \\"quoted\\" product"');
  });
});
