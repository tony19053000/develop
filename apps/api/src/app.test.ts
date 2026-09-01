import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentLatchPolicyEngine, toolActionRequestSchema } from "@launchforge/agentlatch";
import type { SecureExecutor } from "@launchforge/secure-executor";
import {
  createDeterministicWorkflowPlan,
  type BackendAgent,
  type DocumentAgent,
  type DomainAgent,
  type MarketBrandAgent,
  type OrchestratorRuntime,
  type WebsiteProductAgent
} from "@launchforge/agents";
import type { FoxitClient, FoxitESignClient, XanoClient } from "@launchforge/integrations";
import { createApp } from "./app.js";
import { FileApprovalRepository } from "./approvals.js";
import { LocalStaticDeploymentService } from "./deployments.js";
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
  APPROVAL_TOKEN_SECRET: "test-approval-secret",
  XANO_WORKSPACE_ID: "workspace-1",
  XANO_INSTANCE_BASE_URL: "https://example.xano.io",
  FOXIT_API_KEY: "configured",
  FOXIT_API_BASE_URL: "https://example.foxit.com",
  FOXIT_DOCUMENT_GENERATION_PATH: "/generate",
  FOXIT_ESIGN_CLIENT_ID: "configured",
  FOXIT_ESIGN_BASE_URL: "https://example.foxitesign.com"
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
    websiteProduct: createFakeWebsiteProductAgent(),
    backend: createFakeBackendAgent(),
    document: createFakeDocumentAgent(),
    createXanoClient: createFakeXanoClient,
    createFoxitClient: createFakeFoxitClient,
    createFoxitESignClient: createFakeFoxitESignClient,
    agentLatch: createAgentLatchPolicyEngine(),
    approvals: new FileApprovalRepository(dataDir),
    secureExecutor: createFakeSecureExecutor(),
    deployments: new LocalStaticDeploymentService(dataDir)
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
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
    expect(createResponse.body.project.tasks).toHaveLength(9);
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

    expect(response.body.plan.steps).toHaveLength(9);
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

  it("generates and persists a website product artifact", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/research/market`).expect(200);
    await request(app).post(`/api/projects/${createResponse.body.project.id}/research/domains`).expect(200);

    const response = await request(app).post(`/api/projects/${createResponse.body.project.id}/website`).expect(200);

    expect(response.body.artifact).toMatchObject({
      productName: "EvidenceForge",
      tagline: "Review contracts faster with AI.",
      domainName: "evidenceforge.com",
      previewPath: "index.html",
      validation: {
        passed: true
      }
    });
    expect(response.body.artifact.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "index.html", contentType: "text/html" }),
        expect.objectContaining({ path: "styles.css", contentType: "text/css" }),
        expect.objectContaining({ path: "app.js", contentType: "text/javascript" })
      ])
    );
    expect(response.body.project.websiteArtifact.productName).toBe("EvidenceForge");
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "website-foundation", status: "complete" })])
    );
  });

  it("plans a Xano backend for an existing project", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const response = await request(app).post(`/api/projects/${createResponse.body.project.id}/backend/plan`).expect(200);

    expect(response.body.artifact).toMatchObject({
      productName: "EvidenceForge",
      mode: "planned",
      frontendConnection: {
        environmentVariable: "VITE_PRODUCT_API_URL"
      }
    });
    expect(response.body.project.backendArtifact.tables[0].name).toBe("evidenceforge_waitlist_leads");
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "backend-foundation", status: "running" })])
    );
  });

  it("deploys and serves a generated website artifact", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/website`).expect(200);

    const response = await request(app).post(`/api/projects/${createResponse.body.project.id}/deployments`).expect(200);

    expect(response.body.deployment).toMatchObject({
      projectId: createResponse.body.project.id,
      environment: "local_static",
      status: "healthy",
      files: expect.arrayContaining([expect.objectContaining({ path: "index.html", contentType: "text/html" })])
    });
    expect(response.body.project.deploymentRecord.url).toContain("/deployments/");
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "deployment-system", status: "complete" })])
    );

    const served = await request(app).get(new URL(response.body.deployment.url).pathname).expect(200);
    expect(served.text).toContain("<h1>EvidenceForge</h1>");
  });

  it("generates and persists founder documents through SecureExecutor and Foxit", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/research/market`).expect(200);
    await request(app).post(`/api/projects/${createResponse.body.project.id}/website`).expect(200);
    await request(app).post(`/api/projects/${createResponse.body.project.id}/deployments`).expect(200);

    const response = await request(app).post(`/api/projects/${createResponse.body.project.id}/documents`).expect(200);

    expect(response.body.artifact).toMatchObject({
      productName: "EvidenceForge",
      provider: "foxit",
      status: "generated",
      receiptId: "receipt-1"
    });
    expect(response.body.artifact.documents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "founder_launch_brief",
          foxitDocumentId: "foxit-evidenceforge-founder-launch-brief.pdf"
        })
      ])
    );
    expect(response.body.receipt).toMatchObject({
      actionType: "foxit.generateDocument",
      evidenceVerified: false,
      result: {
        generated: true,
        productName: "EvidenceForge"
      }
    });
    expect(response.body.project.tasks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "document-foundation", status: "complete" })])
    );
  });

  it("prepares Foxit eSign materials but blocks AI sending as human-only", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/documents`).expect(200);

    const prepareResponse = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/esign/prepare`)
      .expect(200);

    expect(prepareResponse.body.esignPackage).toMatchObject({
      productName: "EvidenceForge",
      status: "human_action_required",
      humanOnly: true,
      signer: {
        role: "Founder",
        permission: "FILL_FIELDS_AND_SIGN"
      }
    });
    expect(prepareResponse.body.esignPackage.documents).toHaveLength(3);

    const sendAttemptResponse = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/esign/send-attempt`)
      .expect(409);

    expect(sendAttemptResponse.body).toMatchObject({
      error: "Foxit eSign send is human-only and cannot be executed by the AI agent.",
      decision: {
        decision: "HUMAN_ONLY",
        executable: false,
        requiresHumanApproval: true
      }
    });
  });

  it("records human-updated Foxit eSign completion state", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/documents`).expect(200);
    await request(app).post(`/api/projects/${createResponse.body.project.id}/esign/prepare`).expect(200);

    const response = await request(app)
      .patch(`/api/projects/${createResponse.body.project.id}/esign/status`)
      .send({ foxitEnvelopeId: "folder-123", status: "executed" })
      .expect(200);

    expect(response.body.esignPackage).toMatchObject({
      foxitEnvelopeId: "folder-123",
      status: "executed",
      humanOnly: true
    });
    expect(response.body.project.foxitESignPackage.status).toBe("executed");
  });

  it("refreshes read-only Foxit eSign status through SecureExecutor", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    await request(app).post(`/api/projects/${createResponse.body.project.id}/documents`).expect(200);
    await request(app).post(`/api/projects/${createResponse.body.project.id}/esign/prepare`).expect(200);

    const response = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/esign/status/refresh`)
      .send({ foxitEnvelopeId: "folder-123" })
      .expect(200);

    expect(response.body.receipt).toMatchObject({
      actionType: "foxit.getEnvelopeStatus",
      evidenceVerified: false,
      result: {
        refreshed: true,
        foxitEnvelopeId: "folder-123",
        status: "completed"
      }
    });
    expect(response.body.esignPackage.status).toBe("completed");
  });

  it("rejects deployment without a website artifact", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const response = await request(app).post(`/api/projects/${createResponse.body.project.id}/deployments`).expect(409);

    expect(response.body.error).toBe("Website artifact is required before deployment.");
  });

  it("executes approved Xano backend provisioning through SecureExecutor", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);
    const planResponse = await request(app).post(`/api/projects/${createResponse.body.project.id}/backend/plan`).expect(200);
    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId: createResponse.body.project.id,
        requestedBy: "backend",
        actionType: "xano.provisionBackend",
        resource: "EvidenceForge API",
        payload: planResponse.body.artifact,
        reason: "Provision the Xano backend for the generated product."
      })
      .expect(201);

    await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/approve`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com" })
      .expect(200);

    const response = await request(app)
      .post("/api/secure-executions/xano/provision-backend")
      .send({ approvalId: approvalResponse.body.approval.id })
      .expect(200);

    expect(response.body.receipt).toMatchObject({
      actionType: "xano.provisionBackend",
      evidenceVerified: false,
      result: {
        provisioned: true,
        workspaceId: "workspace-1",
        apiGroup: {
          id: 100,
          name: "EvidenceForge API"
        }
      }
    });
    expect(JSON.stringify(response.body)).not.toContain("test-secret");
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

  it("executes approved standard domain registration through SecureExecutor", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    globalThis.fetch = fetchMock;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              domainName: "evidenceforge.com",
              purchasable: true,
              sld: "evidenceforge",
              tld: "com",
              premium: false,
              purchasePrice: 12.99,
              purchaseType: "registration",
              renewalPrice: 14.99,
              reason: ""
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          domain: {
            domainName: "evidenceforge.com",
            expireDate: "2027-08-31T00:00:00Z",
            autorenewEnabled: true,
            locked: true,
            privacyEnabled: true
          },
          order: 123,
          totalPaid: 12.99
        })
      } as Response);
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

    await request(app)
      .post(`/api/approvals/${approvalResponse.body.approval.id}/approve`)
      .send({ token: approvalResponse.body.token, decidedBy: "founder@example.com" })
      .expect(200);

    const response = await request(app)
      .post("/api/secure-executions/namecom/register-domain")
      .send({ approvalId: approvalResponse.body.approval.id })
      .expect(200);

    expect(response.body.receipt).toMatchObject({
      actionType: "namecom.registerDomain",
      evidenceVerified: false,
      result: {
        registered: true,
        domainName: "evidenceforge.com",
        order: 123,
        totalPaid: 12.99
      }
    });
    expect(JSON.stringify(response.body)).not.toContain("test-secret");
    expect(fetchMock).toHaveBeenLastCalledWith(
      new URL("https://api.dev.name.com/core/v1/domains"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Idempotency-Key": approvalResponse.body.approval.id
        })
      })
    );
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

function createFakeWebsiteProductAgent(): WebsiteProductAgent {
  return {
    async generate(input) {
      return {
        id: "website-artifact-1",
        projectId: input.projectId,
        productName: input.marketResearch?.brand.name ?? "EvidenceForge",
        tagline: input.marketResearch?.brand.tagline ?? "Review contracts faster with AI.",
        domainName: input.domainResearch?.recommendedDomain?.domainName,
        previewPath: "index.html",
        files: [
          {
            path: "index.html",
            contentType: "text/html",
            contents: "<!doctype html><html><body><h1>EvidenceForge</h1></body></html>"
          },
          {
            path: "styles.css",
            contentType: "text/css",
            contents: "body { color: #17201c; }"
          },
          {
            path: "app.js",
            contentType: "text/javascript",
            contents: "document.querySelector('form')?.addEventListener('submit', () => {});"
          }
        ],
        validation: {
          passed: true,
          checks: [{ name: "HTML document", passed: true, message: "Complete HTML document." }]
        },
        deployment: {
          buildCommand: "No build step required for the generated static site.",
          outputDirectory: ".",
          requiredEnvironment: []
        },
        generatedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}

function createFakeBackendAgent(): BackendAgent {
  return {
    async plan(input) {
      return {
        id: "backend-artifact-1",
        projectId: input.projectId,
        productName: "EvidenceForge",
        mode: "planned",
        tables: [
          {
            name: "evidenceforge_waitlist_leads",
            description: "Stores waitlist leads.",
            fields: [
              { name: "id", type: "int", required: true, description: "Primary key." },
              { name: "email", type: "email", required: true, description: "Lead email." }
            ]
          }
        ],
        endpoints: [
          {
            name: "create_evidenceforge_waitlist_lead",
            verb: "POST",
            path: "/waitlist",
            tableName: "evidenceforge_waitlist_leads",
            description: "Create waitlist lead.",
            xanoScript: "query create_evidenceforge_waitlist_lead verb=POST {\n  response = true\n}"
          }
        ],
        frontendConnection: {
          environmentVariable: "VITE_PRODUCT_API_URL",
          clientFilePath: "src/productApi.ts",
          usage: "POST /waitlist with { email }."
        },
        generatedAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}

function createFakeDocumentAgent(): DocumentAgent {
  return {
    async prepare(input) {
      return {
        id: "document-artifact-1",
        projectId: input.projectId,
        productName: "EvidenceForge",
        provider: "foxit",
        status: "prepared",
        documents: [
          {
            id: "document-1",
            type: "founder_launch_brief",
            title: "EvidenceForge Founder Launch Brief",
            fileName: "evidenceforge-founder-launch-brief.pdf",
            contentType: "application/pdf",
            markdown: "# EvidenceForge Founder Launch Brief",
            generatedAt: "2026-08-31T00:00:00.000Z"
          },
          {
            id: "document-2",
            type: "investor_one_pager",
            title: "EvidenceForge Investor One-Pager",
            fileName: "evidenceforge-investor-one-pager.pdf",
            contentType: "application/pdf",
            markdown: "# EvidenceForge Investor One-Pager",
            generatedAt: "2026-08-31T00:00:00.000Z"
          },
          {
            id: "document-3",
            type: "technical_delivery_summary",
            title: "EvidenceForge Technical Delivery Summary",
            fileName: "evidenceforge-technical-delivery-summary.pdf",
            contentType: "application/pdf",
            markdown: "# EvidenceForge Technical Delivery Summary",
            generatedAt: "2026-08-31T00:00:00.000Z"
          }
        ],
        validation: {
          passed: true,
          checks: [{ name: "Founder documents", passed: true, message: "Documents are ready for Foxit generation." }]
        },
        generatedAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}

function createFakeXanoClient(): XanoClient {
  return {
    async provisionBackend(input) {
      return {
        id: "workspace-1:100",
        workspaceId: "workspace-1",
        apiGroup: {
          id: 100,
          name: input.apiGroupName,
          canonical: "evidenceforge_api"
        },
        tables: input.tables.map((table, index) => ({ id: 200 + index, name: table.name, guid: `table-${index}` })),
        endpoints: input.endpoints.map((endpoint, index) => ({
          id: 300 + index,
          name: endpoint.name,
          verb: endpoint.verb,
          path: endpoint.path,
          guid: `endpoint-${index}`
        })),
        provisionedAt: "2026-08-31T00:00:00.000Z"
      };
    }
  };
}

function createFakeFoxitClient(): FoxitClient {
  return {
    async generateDocument(input) {
      return {
        id: `foxit-${input.fileName}`,
        downloadUrl: `https://example.foxit.com/${input.fileName}`,
        size: input.markdown.length
      };
    }
  };
}

function createFakeFoxitESignClient(): FoxitESignClient {
  return {
    async getEnvelopeStatus(envelopeId) {
      return {
        envelopeId,
        status: "completed"
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
