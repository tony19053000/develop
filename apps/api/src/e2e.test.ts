import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { createSecureExecutor } from "@launchforge/secure-executor";
import { createApp } from "./app.js";
import { FileApprovalRepository } from "./approvals.js";
import { FileAuditRepository } from "./audit.js";
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
  APPROVAL_TOKEN_SECRET: "test-e2e-approval-secret-99999",
  XANO_WORKSPACE_ID: "168062",
  XANO_INSTANCE_BASE_URL: "https://x8ki-letl-twmt.n7.xano.io",
  FOXIT_CLIENT_SECRET: "e2e-foxit-client-secret",
  FOXIT_API_BASE_URL: "https://na1.fusion.foxit.com",
  FOXIT_DOCUMENT_GENERATION_PATH: "/document-generation/api/GenerateDocumentBase64",
  FOXIT_ESIGN_CLIENT_ID: "e2e-foxit-esign-client",
  FOXIT_ESIGN_BASE_URL: "https://na1.fusion.foxit.com"
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-e2e-"));
  app = createApp({
    config: { ...config, DATA_DIR: dataDir },
    projects: new FileProjectRepository(dataDir),
    events: new EventBus(),
    audits: new FileAuditRepository(dataDir),
    orchestrator: {
      planLaunch: vi.fn(async (input) => ({
        projectId: input.projectId,
        objective: "Launch an AI-powered automated code review platform for engineering teams.",
        summary: "E2E launch plan for CodeReviewAI.",
        steps: [
          { id: "orchestrator-plan", agent: "orchestrator" as const, title: "Create launch plan", dependsOn: [], status: "complete" as const }
        ],
        createdAt: new Date().toISOString()
      }))
    },
    marketBrand: {
      research: vi.fn(async (input) => ({
        id: "mkt-e2e-1",
        projectId: input.projectId,
        idea: input.idea,
        queries: ["AI code review software"],
        competitors: [{ title: "CodeClimate", link: "https://codeclimate.com", snippet: "Automated code review and quality metrics.", source: "SerpApi" }],
        marketSignals: [{ title: "AI Code Review Trends 2026", link: "https://techtrends.example.com", snippet: "High demand for automated pull request insights.", source: "SerpApi" }],
        namingConflicts: [{ title: "CodeReviewAI blog", link: "https://codereviewai.dev", snippet: "Developer blog", source: "SerpApi" }],
        brand: {
          name: "CodeReviewAI",
          tagline: "Automated PR reviews for high-velocity teams.",
          description: "Developer tools for engineering managers.",
          targetUsers: ["Engineering teams", "DevOps leads"],
          positioning: "Developer tools for engineering managers."
        },
        evidenceSummary: "Found 1 competitor and 1 market signal.",
        generatedAt: new Date().toISOString()
      }))
    },
    domain: {
      research: vi.fn(async (input) => ({
        id: "dom-e2e-1",
        projectId: input.projectId,
        brandName: "CodeReviewAI",
        recommendedDomain: {
          domainName: "getcodereview.ai",
          sld: "getcodereview",
          tld: "ai",
          purchasable: true,
          premium: false,
          purchaseType: "standard",
          purchasePrice: 29.99,
          renewalPrice: 29.99,
          reason: "Standard registration",
          score: 95,
          recommendation: "Recommended"
        },
        candidates: [
          {
            domainName: "getcodereview.ai",
            sld: "getcodereview",
            tld: "ai",
            purchasable: true,
            premium: false,
            purchaseType: "standard",
            purchasePrice: 29.99,
            renewalPrice: 29.99,
            reason: "Standard registration",
            score: 95,
            recommendation: "Recommended"
          }
        ],
        checkedDomains: ["getcodereview.ai"],
        generatedAt: new Date().toISOString()
      }))
    },
    websiteProduct: {
      generate: vi.fn(async (input) => ({
        id: "web-e2e-1",
        projectId: input.projectId,
        productName: input.marketResearch?.brand.name ?? "CodeReviewAI",
        tagline: input.marketResearch?.brand.tagline ?? "Automated PR reviews.",
        previewPath: "index.html",
        files: [
          { path: "index.html", contentType: "text/html", contents: "<!doctype html><html><body><h1>CodeReviewAI</h1><form id='waitlist-form'></form></body></html>" },
          { path: "styles.css", contentType: "text/css", contents: "body { font-family: Inter, sans-serif; background: #0f172a; }" },
          { path: "app.js", contentType: "text/javascript", contents: "console.log('CodeReviewAI loaded');" }
        ],
        validation: {
          passed: true,
          checks: [
            { name: "HTML structure", passed: true, message: "HTML includes essential tags." },
            { name: "CSS styling", passed: true, message: "Styles defined." }
          ]
        },
        deployment: {
          buildCommand: "none",
          outputDirectory: ".",
          requiredEnvironment: []
        },
        generatedAt: new Date().toISOString()
      }))
    },
    backend: {
      plan: vi.fn(async (input) => ({
        id: "backend-e2e-1",
        projectId: input.projectId,
        productName: "CodeReviewAI",
        mode: "planned" as const,
        tables: [
          {
            name: "waitlist_leads",
            description: "Stores waitlist signups",
            fields: [
              { name: "email", type: "email" as const, required: true, description: "Lead email address" }
            ]
          }
        ],
        endpoints: [
          {
            name: "Submit Waitlist Lead",
            verb: "POST" as const,
            path: "/waitlist",
            tableName: "waitlist_leads",
            description: "Accepts waitlist submissions",
            xanoScript: "db.add waitlist_leads"
          }
        ],
        frontendConnection: {
          environmentVariable: "VITE_API_URL",
          clientFilePath: "src/api.ts",
          usage: "POST /waitlist with email"
        },
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    },
    document: {
      prepare: vi.fn(async (input) => ({
        id: "doc-e2e-1",
        projectId: input.projectId,
        productName: "CodeReviewAI",
        provider: "foxit" as const,
        status: "prepared" as const,
        documents: [
          {
            id: "doc-1",
            type: "founder_launch_brief" as const,
            title: "CodeReviewAI Founder Launch Brief",
            fileName: "codereviewai-brief.pdf",
            contentType: "application/pdf",
            markdown: "# CodeReviewAI Launch Brief\n\nAutomated PR reviews for high-velocity teams.",
            generatedAt: new Date().toISOString()
          },
          {
            id: "doc-2",
            type: "investor_one_pager" as const,
            title: "CodeReviewAI Investor One-Pager",
            fileName: "codereviewai-investor.pdf",
            contentType: "application/pdf",
            markdown: "# CodeReviewAI One-Pager\n\nAI developer tools market.",
            generatedAt: new Date().toISOString()
          },
          {
            id: "doc-3",
            type: "technical_delivery_summary" as const,
            title: "CodeReviewAI Technical Delivery Summary",
            fileName: "codereviewai-tech.pdf",
            contentType: "application/pdf",
            markdown: "# Technical Delivery Summary\n\nFrontend deployed, Xano backend provisioned.",
            generatedAt: new Date().toISOString()
          }
        ],
        validation: {
          passed: true,
          checks: [{ name: "Document Completeness", passed: true, message: "All 3 founder documents prepared." }]
        },
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
    },
    createXanoClient: () => ({
      listWorkspaces: vi.fn(async () => [{ id: 168062, name: "LaunchForge Workspace" }]),
      getWorkspace: vi.fn(async () => ({ id: 168062, name: "LaunchForge Workspace" })),
      createApiGroup: vi.fn(async () => ({ id: 430999, name: "codereviewai_api", canonical: "KvwHVmHn" })),
      createTable: vi.fn(async () => ({ id: 885999, name: "waitlist_leads" })),
      createEndpoint: vi.fn(async () => ({ id: 4039999, name: "Submit Waitlist Lead", verb: "POST", path: "/waitlist" })),
      provisionBackend: vi.fn(async (input) => ({
        id: "168062:430999",
        workspaceId: "168062",
        apiGroup: { id: 430999, name: input.apiGroupName ?? "codereviewai_api", canonical: "KvwHVmHn" },
        tables: [{ id: 885999, name: "waitlist_leads" }],
        endpoints: [{ id: 4039999, name: "Submit Waitlist Lead", verb: "POST" as const, path: "/waitlist" }],
        provisionedAt: new Date().toISOString()
      }))
    }),
    createFoxitClient: () => ({
      generateDocument: vi.fn(async (input) => ({
        id: `foxit-doc-${input.templateKey}`,
        downloadUrl: `http://localhost:4000/documents/e2e/${input.fileName}`,
        base64FileString: Buffer.from("%PDF-1.4 CodeReviewAI Fake Document Content").toString("base64"),
        size: 8192
      }))
    }),
    createFoxitESignClient: () => ({
      createDraftEnvelope: vi.fn(async () => ({
        foxitEnvelopeId: "envelope-e2e-99999",
        foxitEmbeddedSessionUrl: "https://na1.fusion.foxit.com/esign/sign/envelope-e2e-99999"
      })),
      getEnvelopeStatus: vi.fn(async () => ({
        foxitEnvelopeId: "envelope-e2e-99999",
        status: "executed" as const
      }))
    }),
    agentLatch: createAgentLatchPolicyEngine(),
    approvals: new FileApprovalRepository(dataDir),
    secureExecutor: createSecureExecutor(
      { mode: "development", allowedSecretNames: ["NAMECOM_API_TOKEN", "XANO_API_KEY", "FOXIT_CLIENT_SECRET"] },
      createAgentLatchPolicyEngine(),
      { resolve: async (name: string) => ({ name, value: `e2e-secret-value-for-${name}` }) }
    ),
    deployments: new LocalStaticDeploymentService(dataDir)
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dataDir, { recursive: true, force: true });
});

describe("Phase 18 - End-to-End Final Integration Scenario", () => {
  it("executes the full launch workflow from idea submission to human eSign boundary", async () => {
    // Step 1: Create a new launch project
    const projectRes = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI-powered automated code review platform for engineering teams." })
      .expect(201);

    const projectId = projectRes.body.project.id;
    expect(projectId).toBeDefined();
    expect(projectRes.body.project.status).toBe("active");

    // Step 2: Trigger full orchestration (initial run pauses for Xano backend approval)
    const initialOrchestrateRes = await request(app)
      .post(`/api/projects/${projectId}/orchestrate/full`)
      .expect(202);

    expect(initialOrchestrateRes.body.status).toBe("paused_for_approval");
    expect(initialOrchestrateRes.body.approvals).toHaveLength(1);
    expect(initialOrchestrateRes.body.approvals[0].actionRequest.actionType).toBe("xano.provisionBackend");

    const approvalId = initialOrchestrateRes.body.approvals[0].id;

    // Step 3: Verify pending approval exists in API
    const approvalsRes = await request(app)
      .get(`/api/approvals?projectId=${projectId}`)
      .expect(200);

    expect(approvalsRes.body.approvals).toHaveLength(1);
    expect(approvalsRes.body.approvals[0].status).toBe("pending");
    const approval = approvalsRes.body.approvals[0];
    const approvalUrl = new URL(approval.approvalUrl);
    const approvalToken = approvalUrl.searchParams.get("token");
    expect(approvalToken).toBeTruthy();

    // Step 4: Approve the Xano backend provisioning approval
    const approveRes = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token: approvalToken, decidedBy: "founder@codereview.ai" })
      .expect(200);

    expect(approveRes.body.approval.status).toBe("approved");

    // Step 5: Resume full orchestration after approval
    const resumeOrchestrateRes = await request(app)
      .post(`/api/projects/${projectId}/orchestrate/full`)
      .expect(200);

    expect(resumeOrchestrateRes.body.status).toBe("human_action_required");
    expect(resumeOrchestrateRes.body.project.progress).toBe(100);

    // Step 6: Verify full project state after completion
    const finalProjectRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .expect(200);

    const project = finalProjectRes.body.project;
    expect(project.marketResearch).toBeDefined();
    expect(project.marketResearch.brand.name).toBe("CodeReviewAI");
    expect(project.domainResearch).toBeDefined();
    expect(project.domainResearch.recommendedDomain.domainName).toBe("getcodereview.ai");
    expect(project.websiteArtifact).toBeDefined();
    expect(project.websiteArtifact.validation.passed).toBe(true);
    expect(project.backendArtifact).toBeDefined();
    expect(project.backendArtifact.mode).toBe("provisioned");
    expect(project.deploymentRecord).toBeDefined();
    expect(project.deploymentRecord.status).toBe("healthy");
    expect(project.documentArtifact).toBeDefined();
    expect(project.documentArtifact.status).toBe("generated");
    expect(project.documentArtifact.documents).toHaveLength(3);
    expect(project.foxitESignPackage).toBeDefined();
    expect(project.foxitESignPackage.humanOnly).toBe(true);
    expect(project.foxitESignPackage.status).toBe("human_action_required");

    // Step 7: Verify AI signature attempt is strictly blocked (HUMAN_ONLY)
    const sendAttemptRes = await request(app)
      .post(`/api/projects/${projectId}/esign/send-attempt`)
      .expect(409);

    expect(sendAttemptRes.body.decision.decision).toBe("HUMAN_ONLY");
    expect(sendAttemptRes.body.decision.executable).toBe(false);

    // Step 8: Verify audit trail completeness and secret redaction
    const auditRes = await request(app)
      .get(`/api/audit-events?projectId=${projectId}`)
      .expect(200);

    const auditEvents = auditRes.body.auditEvents;
    expect(auditEvents.length).toBeGreaterThan(0);
    expect(auditEvents.every((e: { redacted: boolean }) => e.redacted === true)).toBe(true);

    const secureExecEvents = auditEvents.filter((e: { type: string }) => e.type === "secure_execution");
    expect(secureExecEvents.length).toBeGreaterThan(0);
    expect(secureExecEvents.every((e: { evidenceVerified: boolean }) => e.evidenceVerified === false)).toBe(true);
  });
});
