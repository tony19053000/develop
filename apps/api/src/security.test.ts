import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAgentLatchPolicyEngine, createApprovalToken, hashPayload } from "@launchforge/agentlatch";
import { createSecureExecutor } from "@launchforge/secure-executor";
import {
  NameComConfigurationError,
  SerpApiConfigurationError
} from "@launchforge/integrations";
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
  APPROVAL_TOKEN_SECRET: "test-approval-secret-key-12345",
  XANO_WORKSPACE_ID: "workspace-168062",
  XANO_INSTANCE_BASE_URL: "https://x8ki-letl-twmt.n7.xano.io",
  FOXIT_CLIENT_SECRET: "foxit-test-client-secret",
  FOXIT_API_BASE_URL: "https://na1.fusion.foxit.com",
  FOXIT_DOCUMENT_GENERATION_PATH: "/document-generation/api/GenerateDocumentBase64",
  FOXIT_ESIGN_CLIENT_ID: "foxit-esign-client",
  FOXIT_ESIGN_BASE_URL: "https://na1.fusion.foxit.com"
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-sec-"));
  app = createApp({
    config: { ...config, DATA_DIR: dataDir },
    projects: new FileProjectRepository(dataDir),
    events: new EventBus(),
    audits: new FileAuditRepository(dataDir),
    orchestrator: {
      planLaunch: vi.fn(async (input: { projectId: string; idea: string }) => ({
        projectId: input.projectId,
        objective: "Test objective",
        summary: "Test summary",
        steps: [
          { id: "orchestrator-plan", agent: "orchestrator" as const, title: "Create launch plan", dependsOn: [], status: "complete" as const }
        ],
        createdAt: "2026-08-31T00:00:00.000Z"
      }))
    },
    marketBrand: {
      research: vi.fn(async () => {
        throw new SerpApiConfigurationError("SERPAPI_API_KEY is required to run real market research.");
      })
    },
    domain: {
      research: vi.fn(async () => {
        throw new NameComConfigurationError("NAMECOM_USERNAME and NAMECOM_API_TOKEN are required to search domains.");
      })
    },
    websiteProduct: {
      generate: vi.fn(async (input) => ({
        id: "website-1",
        projectId: input.projectId,
        productName: input.productName,
        tagline: input.tagline,
        previewPath: "index.html",
        files: [{ path: "index.html", contentType: "text/html", contents: "<html><body>Website</body></html>" }],
        validation: { passed: true, checks: [] },
        deployment: { buildCommand: "none", outputDirectory: ".", requiredEnvironment: [] },
        generatedAt: "2026-08-31T00:00:00.000Z"
      }))
    },
    backend: {
      plan: vi.fn(async (input) => ({
        id: "backend-1",
        projectId: input.projectId,
        productName: input.productName,
        mode: "planned" as const,
        tables: [{ name: "waitlist", description: "Waitlist leads", fields: [{ name: "email", type: "email" as const, required: true, description: "Email" }] }],
        endpoints: [{ name: "Join Waitlist", verb: "POST" as const, path: "/waitlist", tableName: "waitlist", description: "Join waitlist", xanoScript: "script" }],
        frontendConnection: { environmentVariable: "VITE_API_URL", clientFilePath: "src/api.ts", usage: "API" },
        generatedAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z"
      }))
    },
    document: {
      prepare: vi.fn(async (input) => ({
        id: "doc-artifact-1",
        projectId: input.projectId,
        productName: "ContractAI",
        provider: "foxit" as const,
        status: "prepared" as const,
        documents: [
          { id: "doc-1", type: "founder_launch_brief" as const, title: "Brief", fileName: "brief.pdf", contentType: "application/pdf", markdown: "# Brief", generatedAt: "2026-08-31T00:00:00.000Z" }
        ],
        validation: { passed: true, checks: [] },
        generatedAt: "2026-08-31T00:00:00.000Z",
        updatedAt: "2026-08-31T00:00:00.000Z"
      }))
    },
    createXanoClient: () => ({
      listWorkspaces: vi.fn(async () => []),
      getWorkspace: vi.fn(async () => ({ id: 168062, name: "Workspace" })),
      createApiGroup: vi.fn(async () => ({ id: 430757, name: "API" })),
      createTable: vi.fn(async () => ({ id: 884783, name: "waitlist" })),
      createEndpoint: vi.fn(async () => ({ id: 4032650, name: "Join Waitlist", verb: "POST", path: "/waitlist" }))
    }),
    createFoxitClient: () => ({
      generateDocument: vi.fn(async () => ({
        id: "foxit-doc-123",
        downloadUrl: "http://localhost:4000/documents/proj/brief.pdf",
        base64FileString: Buffer.from("%PDF-1.4 Fake PDF Content").toString("base64")
      }))
    }),
    createFoxitESignClient: () => ({
      createDraftEnvelope: vi.fn(async () => ({
        foxitEnvelopeId: "envelope-123",
        foxitEmbeddedSessionUrl: "https://example.foxit.com/sign/123"
      })),
      getEnvelopeStatus: vi.fn(async () => ({
        foxitEnvelopeId: "envelope-123",
        status: "executed" as const
      }))
    }),
    agentLatch: createAgentLatchPolicyEngine(),
    approvals: new FileApprovalRepository(dataDir),
    secureExecutor: createSecureExecutor(
      { mode: "development", allowedSecretNames: ["NAMECOM_API_TOKEN", "XANO_API_KEY", "FOXIT_CLIENT_SECRET"] },
      createAgentLatchPolicyEngine(),
      { resolve: async (name: string) => ({ name, value: `test-secret-value-for-${name}` }) }
    ),
    deployments: new LocalStaticDeploymentService(dataDir)
  });
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dataDir, { recursive: true, force: true });
});

describe("Phase 17 - Full Security & Failure Testing", () => {
  it("1. Rejects un-approved protected registration or provisioning bypass attempts", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    // Missing approval ID
    const missingApprovalResponse = await request(app)
      .post("/api/secure-executions/namecom/register-domain")
      .send({ projectId })
      .expect(400);

    expect(missingApprovalResponse.body.error).toContain("Approval id is required");

    const missingXanoResponse = await request(app)
      .post("/api/secure-executions/xano/provision-backend")
      .send({ projectId })
      .expect(400);

    expect(missingXanoResponse.body.error).toContain("Approval id is required");

    // Pending approval (unapproved)
    const createApprovalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId,
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "contractai.com",
        payload: { domainName: "contractai.com", years: 1, price: 12.99 },
        reason: "Register domain"
      })
      .expect(201);

    const pendingApprovalId = createApprovalResponse.body.approval.id;

    const unapprovedExecResponse = await request(app)
      .post("/api/secure-executions/namecom/register-domain")
      .send({ projectId, approvalId: pendingApprovalId });

    expect(unapprovedExecResponse.status).toBeGreaterThanOrEqual(400);
    expect(unapprovedExecResponse.body.error).toContain("Domain registration requires an approved action.");
  });

  it("2. Rejects forged approval tokens and signature tampering", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId,
        requestedBy: "backend",
        actionType: "xano.provisionBackend",
        resource: "ContractAI Backend",
        payload: { workspaceId: "168062", productName: "ContractAI" },
        reason: "Provision Xano backend"
      })
      .expect(201);

    const approvalId = approvalResponse.body.approval.id;
    const validToken = approvalResponse.body.token;

    // Tampered token signature
    const tamperedToken = `${validToken}tampered`;

    const forgedApproveResponse = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token: tamperedToken, decidedBy: "attacker@example.com" })
      .expect(403);

    expect(forgedApproveResponse.body.error).toContain("Approval token signature is invalid");

    // Token signed with wrong secret
    const wrongSecretToken = createApprovalToken(
      {
        approvalId,
        requestId: approvalResponse.body.approval.actionRequest.id,
        payloadHash: approvalResponse.body.approval.decision.payloadHash,
        expiresAt: approvalResponse.body.approval.tokenExpiresAt
      },
      "wrong-secret-key-12345"
    );

    const wrongSecretResponse = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token: wrongSecretToken, decidedBy: "attacker@example.com" })
      .expect(403);

    expect(wrongSecretResponse.body.error).toContain("Approval token signature is invalid");
  });

  it("3. Enforces single-use approval token & replay protection", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId,
        requestedBy: "backend",
        actionType: "xano.provisionBackend",
        resource: "ContractAI Backend",
        payload: { workspaceId: "168062", productName: "ContractAI" },
        reason: "Provision Xano backend"
      })
      .expect(201);

    const approvalId = approvalResponse.body.approval.id;
    const token = approvalResponse.body.token;

    // First approve call succeeds
    await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token, decidedBy: "founder@example.com" })
      .expect(200);

    // Replay approve call returns 409 Conflict
    const replayApproveResponse = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token, decidedBy: "attacker@example.com" })
      .expect(409);

    expect(replayApproveResponse.body.error).toContain("already approved");

    // Replay reject call returns 409 Conflict
    const replayRejectResponse = await request(app)
      .post(`/api/approvals/${approvalId}/reject`)
      .send({ token, decidedBy: "attacker@example.com", reason: "Late reject" })
      .expect(409);

    expect(replayRejectResponse.body.error).toContain("already approved");
  });

  it("4. Rejects expired approval tokens", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId,
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "contractai.com",
        payload: { domainName: "contractai.com", years: 1, price: 12.99 },
        reason: "Register domain"
      })
      .expect(201);

    const approvalId = approvalResponse.body.approval.id;

    // Token with past expiration date
    const expiredToken = createApprovalToken(
      {
        approvalId,
        requestId: approvalResponse.body.approval.actionRequest.id,
        payloadHash: approvalResponse.body.approval.decision.payloadHash,
        expiresAt: "2020-01-01T00:00:00.000Z"
      },
      config.APPROVAL_TOKEN_SECRET
    );

    const expiredApproveResponse = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token: expiredToken, decidedBy: "founder@example.com" })
      .expect(403);

    expect(expiredApproveResponse.body.error).toContain("Approval token has expired");
  });

  it("5. Rejects execution attempts with altered payload hashes", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    const approvalResponse = await request(app)
      .post("/api/approvals")
      .send({
        projectId,
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "contractai.com",
        payload: { domainName: "contractai.com", years: 1, price: 12.99 },
        reason: "Register domain"
      })
      .expect(201);

    const approvalId = approvalResponse.body.approval.id;

    // Token generated for a different payload hash
    const alteredPayloadToken = createApprovalToken(
      {
        approvalId,
        requestId: approvalResponse.body.approval.actionRequest.id,
        payloadHash: hashPayload({ domainName: "contractai.com", years: 1, price: 999.99 }),
        expiresAt: approvalResponse.body.approval.tokenExpiresAt
      },
      config.APPROVAL_TOKEN_SECRET
    );

    const alteredPayloadResponse = await request(app)
      .post(`/api/approvals/${approvalId}/approve`)
      .send({ token: alteredPayloadToken, decidedBy: "founder@example.com" })
      .expect(403);

    expect(alteredPayloadResponse.body.error).toContain("Approval token does not match the pending request");
  });

  it("6. Verifies raw secrets are never exposed in audit logs or API output", async () => {
    const secretValue = "super-secret-key-that-must-never-leak-12345";

    const evalResponse = await request(app)
      .post("/api/agentlatch/evaluate")
      .send({
        projectId: "proj-sec-check",
        requestedBy: "backend",
        actionType: "xano.provisionBackend",
        resource: "Sensitive resource",
        payload: { apiKey: secretValue, clientSecret: secretValue, token: secretValue },
        reason: "Security check for secret leakage"
      })
      .expect(200);

    // Response must not contain the raw secret
    expect(JSON.stringify(evalResponse.body)).not.toContain(secretValue);

    // Audit events endpoint response must not contain raw secret
    const auditResponse = await request(app)
      .get("/api/audit-events?projectId=proj-sec-check")
      .expect(200);

    expect(JSON.stringify(auditResponse.body)).not.toContain(secretValue);
    expect(auditResponse.body.auditEvents[0].redacted).toBe(true);
  });

  it("7. Gracefully handles sponsor API configuration and HTTP errors", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    // Market research throws SerpApiConfigurationError -> 424 Dependency Failed
    const serpApiResponse = await request(app)
      .post(`/api/projects/${projectId}/research/market`)
      .expect(424);

    expect(serpApiResponse.body.error).toContain("SERPAPI_API_KEY is required");

    // Domain research throws NameComConfigurationError -> 424 Dependency Failed
    const nameComResponse = await request(app)
      .post(`/api/projects/${projectId}/research/domains`)
      .expect(424);

    expect(nameComResponse.body.error).toContain("NAMECOM_USERNAME and NAMECOM_API_TOKEN are required");
  });

  it("8. Preserves project state on task error without data corruption", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    // Run failing research route
    await request(app).post(`/api/projects/${projectId}/research/market`).expect(424);

    // Fetch project state; existing state and tasks are intact
    const fetchedProject = await request(app).get(`/api/projects/${projectId}`).expect(200);

    expect(fetchedProject.body.project.id).toBe(projectId);
    expect(fetchedProject.body.project.tasks).toBeDefined();
    expect(fetchedProject.body.project.tasks.length).toBeGreaterThan(0);
  });

  it("9. Enforces human-only signature boundary for AI send attempts", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    await request(app).post(`/api/projects/${projectId}/documents`).expect(200);
    await request(app).post(`/api/projects/${projectId}/esign/prepare`).expect(200);

    const sendAttemptResponse = await request(app)
      .post(`/api/projects/${projectId}/esign/send-attempt`)
      .expect(409);

    expect(sendAttemptResponse.body.decision.decision).toBe("HUMAN_ONLY");
    expect(sendAttemptResponse.body.decision.executable).toBe(false);
    expect(sendAttemptResponse.body.error).toContain("Foxit eSign send is human-only");
  });

  it("10. Enforces evidenceVerified: false for local development execution", async () => {
    const projectResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract-review service for early startups." })
      .expect(201);
    const projectId = projectResponse.body.project.id;

    // Generate Foxit documents
    const docResponse = await request(app)
      .post(`/api/projects/${projectId}/documents`)
      .expect(200);

    expect(docResponse.body.receipt.mode).toBe("development");
    expect(docResponse.body.receipt.evidenceVerified).toBe(false);

    // Verify audit event reflects evidenceVerified: false
    const auditResponse = await request(app)
      .get(`/api/audit-events?projectId=${projectId}&type=secure_execution`)
      .expect(200);

    expect(auditResponse.body.auditEvents[0].evidenceVerified).toBe(false);
  });
});
