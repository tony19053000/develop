import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDeterministicWorkflowPlan,
  type DomainAgent,
  type MarketBrandAgent,
  type OrchestratorRuntime
} from "@launchforge/agents";
import { createApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

let dataDir: string;
let app: ReturnType<typeof createApp>;

const config: ApiConfig = {
  NODE_ENV: "test",
  API_PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  DATA_DIR: ""
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-api-"));
  app = createApp({
    config: { ...config, DATA_DIR: dataDir },
    projects: new FileProjectRepository(dataDir),
    events: new EventBus(),
    orchestrator: createFakeOrchestrator(),
    marketBrand: createFakeMarketBrand(),
    domain: createFakeDomainAgent()
  });
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("LaunchForge API foundation", () => {
  it("reports health", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      service: "launchforge-api",
      environment: "test"
    });
  });

  it("creates and lists launch projects", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI interview-preparation platform for university students." })
      .expect(201);

    expect(createResponse.body.project.status).toBe("active");
    expect(createResponse.body.project.tasks).toHaveLength(8);
    expect(createResponse.body.project.tasks[0].status).toBe("complete");

    const listResponse = await request(app).get("/api/projects").expect(200);

    expect(listResponse.body.projects).toHaveLength(1);
    expect(listResponse.body.projects[0].idea).toContain("interview");
  });

  it("rejects underspecified launch ideas", async () => {
    const response = await request(app).post("/api/projects").send({ idea: "AI" }).expect(400);

    expect(response.body.error).toBe("Validation failed.");
  });

  it("returns 404 for unknown projects", async () => {
    const response = await request(app).get("/api/projects/missing").expect(404);

    expect(response.body.error).toBe("Project not found.");
  });

  it("refreshes orchestration for an existing project", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/orchestrate`)
      .expect(200);

    expect(response.body.plan.steps).toHaveLength(8);
    expect(response.body.project.status).toBe("active");
  });

  it("runs market and brand research for an existing project", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/research/market`)
      .expect(200);

    expect(response.body.research.brand.name).toBe("EvidenceForge");
    expect(response.body.project.marketResearch.competitors).toHaveLength(1);
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "market-research", status: "complete" }),
        expect.objectContaining({ id: "brand-positioning", status: "complete" })
      ])
    );
  });

  it("runs domain research for an existing project", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/research/market`).expect(200);

    const response = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/research/domains`)
      .expect(200);

    expect(response.body.research.recommendedDomain.domainName).toBe("evidenceforge.com");
    expect(response.body.project.domainResearch.candidates).toHaveLength(2);
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "domain-research", status: "complete" })])
    );
  });
});

function createFakeOrchestrator(): OrchestratorRuntime {
  return {
    graph: {} as OrchestratorRuntime["graph"],
    async planLaunch(input) {
      return createDeterministicWorkflowPlan(input.projectId, input.idea);
    }
  };
}

function createFakeMarketBrand(): MarketBrandAgent {
  return {
    async research(input) {
      return {
        id: "research-1",
        projectId: input.projectId,
        idea: input.idea,
        queries: ["contract review competitors"],
        competitors: [
          {
            title: "Contract AI Example",
            link: "https://example.com",
            snippet: "AI contract review for small firms.",
            source: "SerpApi"
          }
        ],
        marketSignals: [],
        namingConflicts: [],
        brand: {
          name: "EvidenceForge",
          tagline: "Review contracts faster with AI.",
          description: "AI contract review for small law firms.",
          targetUsers: ["Small law firms"],
          positioning: "Fast launch execution for legal operators."
        },
        evidenceSummary: "Found 1 competitor result.",
        generatedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}

function createFakeDomainAgent(): DomainAgent {
  return {
    async research(input) {
      return {
        id: "domain-research-1",
        projectId: input.projectId,
        brandName: input.marketResearch?.brand.name ?? "EvidenceForge",
        checkedDomains: ["evidenceforge.com", "evidenceforge.ai"],
        candidates: [
          {
            domainName: "evidenceforge.com",
            sld: "evidenceforge",
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
          {
            domainName: "evidenceforge.ai",
            sld: "evidenceforge",
            tld: "ai",
            purchasable: false,
            premium: false,
            purchaseType: "registration",
            purchasePrice: null,
            renewalPrice: null,
            reason: "Already registered",
            score: 51,
            recommendation: "Already registered"
          }
        ],
        recommendedDomain: {
          domainName: "evidenceforge.com",
          sld: "evidenceforge",
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
      };
    }
  };
}
