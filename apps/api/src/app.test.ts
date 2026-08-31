import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentLatchPolicyEngine, toolActionRequestSchema } from "@launchforge/agentlatch";
import type { SecureExecutor } from "@launchforge/secure-executor";
import {
  createDeterministicWorkflowPlan,
  type DomainAgent,
  type MarketBrandAgent,
  type OrchestratorRuntime
} from "@launchforge/agents";
import { createApp } from "./app.js";
import { FileApprovalRepository } from "./approvals.js";
import type { ApiConfig } from "./config.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

let dataDir: string;
let app: ReturnType<typeof createApp>;

const config: ApiConfig = {
  NODE_ENV: "test",
  API_PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  DATA_DIR: "",
  APPROVAL_TOKEN_SECRET: "test-approval-secret"
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-api-"));
  app = createApp({
    config: { ...config, DATA_DIR: dataDir },
    projects: new FileProjectRepository(dataDir),
    events: new EventBus(),
    orchestrator: createFakeOrchestrator(),
    marketBrand: createFakeMarketBrand(),
    domain: createFakeDomainAgent(),
    agentLatch: createAgentLatchPolicyEngine(),
    approvals: new FileApprovalRepository(dataDir),
    secureExecutor: createFakeSecureExecutor()
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

  it("evaluates protected action requests through AgentLatch", async () => {
    const response = await request(app)
      .post("/api/agentlatch/evaluate")
      .send({
        projectId: "project-1",
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "evidenceforge.com",
        payload: { domainName: "evidenceforge.com", years: 1, price: 12.99 },
        reason: "Register the recommended domain."
      })
      .expect(200);

    expect(response.body.decision).toMatchObject({
      decision: "HIGH_RISK_APPROVAL",
      requiresHumanApproval: true,
      executable: false
    });
  });

  it("creates and approves a protected action request once", async () => {
    const createProjectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId: createProjectResponse.body.project.id,
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "evidenceforge.com",
        payload: { domainName: "evidenceforge.com", years: 1, price: 12.99 },
        reason: "Register the recommended domain."
      })
      .expect(201);

    expect(approvalResponse.body.approval.status).toBe("pending");
    expect(approvalResponse.body.project.status).toBe("waiting_for_approval");

    const approveResponse = await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/approve`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com" })
      .expect(200);

    expect(approveResponse.body.approval.status).toBe("approved");
    expect(approveResponse.body.approval.decision.executable).toBe(true);
    expect(approveResponse.body.project.status).toBe("active");

    await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/approve`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com" })
      .expect(409);
  });

  it("rejects expired approval authorization before execution can become executable", async () => {
    const approvals = new FileApprovalRepository(dataDir);
    const agentLatch = createAgentLatchPolicyEngine();
    const actionRequest = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.updateDns",
      resource: "evidenceforge.com",
      payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
      reason: "Point the launch website at hosting."
    });
    const decision = agentLatch.evaluate(actionRequest);
    const { approval, token } = await approvals.create({
      actionRequest,
      decision,
      webOrigin: config.WEB_ORIGIN,
      tokenSecret: config.APPROVAL_TOKEN_SECRET,
      ttlMinutes: -1
    });

    await expect(approvals.approve(approval.id, token, config.APPROVAL_TOKEN_SECRET, "founder@example.com")).rejects.toThrow(
      "expired"
    );
  });

  it("dry-runs secure execution for an approved action", async () => {
    const createProjectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId: createProjectResponse.body.project.id,
        requestedBy: "domain",
        actionType: "namecom.updateDns",
        resource: "evidenceforge.com",
        payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
        reason: "Point the launch website at hosting."
      })
      .expect(201);

    await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/approve`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com" })
      .expect(200);

    const response = await request(app)
      .post("/api/secure-executions/dry-run")
      .send({ approvalId: approvalResponse.body.approval.id })
      .expect(200);

    expect(response.body.receipt).toMatchObject({
      requestId: approvalResponse.body.approval.actionRequest.id,
      actionType: "namecom.updateDns",
      evidenceVerified: false,
      result: {
        dryRun: true
      }
    });
  });

  it("rejects a protected action request and stops the project", async () => {
    const createProjectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId: createProjectResponse.body.project.id,
        requestedBy: "domain",
        actionType: "namecom.updateDns",
        resource: "evidenceforge.com",
        payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
        reason: "Point the launch website at hosting."
      })
      .expect(201);

    const rejectResponse = await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/reject`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com", reason: "Not ready." })
      .expect(200);

    expect(rejectResponse.body.approval.status).toBe("rejected");
    expect(rejectResponse.body.project.status).toBe("failed");
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

function createFakeSecureExecutor(): SecureExecutor {
  return {
    async execute(input) {
      return {
        id: "receipt-1",
        requestId: input.request.id,
        actionType: input.request.actionType,
        payloadHash: input.approval.payloadHash,
        mode: "development",
        evidenceVerified: false,
        result: await input.operation({
          async getSecret() {
            return "test-secret";
          }
        }),
        executedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}
