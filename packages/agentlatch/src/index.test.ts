import { describe, expect, it, vi } from "vitest";
import {
  createAgentLatchPolicyEngine,
  createApprovalToken,
  createExecutableApprovalDecision,
  createProtectedToolExecutor,
  hashPayload,
  ProtectedToolExecutionError,
  toolActionRequestSchema,
  verifyApprovalToken
} from "./index.js";

describe("AgentLatch Policy Engine", () => {
  it("auto-allows read-only sponsor research", () => {
    const engine = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.checkAvailability",
      resource: "name.com domains availability",
      payload: { domainNames: ["preporbit.com"] },
      reason: "Check candidate domain availability."
    });

    const result = engine.evaluate(request);

    expect(result.decision).toBe("AUTO_ALLOW");
    expect(result.executable).toBe(true);
    expect(result.requiresHumanApproval).toBe(false);
  });

  it("requires high-risk approval for paid domain registration", () => {
    const engine = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.registerDomain",
      resource: "preporbit.com",
      payload: { domainName: "preporbit.com", years: 1, price: 12.99 },
      reason: "Register the recommended domain."
    });

    const result = engine.evaluate(request);

    expect(result.decision).toBe("HIGH_RISK_APPROVAL");
    expect(result.executable).toBe(false);
    expect(result.requiresHumanApproval).toBe(true);
  });

  it("marks signature execution as human-only", () => {
    const engine = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "document",
      actionType: "foxit.sendForSignature",
      resource: "founder-agreement.pdf",
      payload: { signerEmail: "founder@example.com" },
      reason: "Send founder agreement for signature."
    });

    const result = engine.evaluate(request);

    expect(result.decision).toBe("HUMAN_ONLY");
    expect(result.executable).toBe(false);
  });

  it("blocks protected tool execution without a passable AgentLatch decision", async () => {
    const engine = createAgentLatchPolicyEngine();
    const executeProtectedTool = createProtectedToolExecutor(engine);
    const operation = vi.fn(async () => "registered");
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.registerDomain",
      resource: "preporbit.com",
      payload: { domainName: "preporbit.com", years: 1, price: 12.99 },
      reason: "Register the recommended domain."
    });

    await expect(executeProtectedTool(request, operation)).rejects.toBeInstanceOf(ProtectedToolExecutionError);
    expect(operation).not.toHaveBeenCalled();
  });

  it("rejects approval replay with an altered payload", async () => {
    const engine = createAgentLatchPolicyEngine();
    const executeProtectedTool = createProtectedToolExecutor(engine);
    const originalRequest = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "market_brand",
      actionType: "serpapi.search",
      resource: "market research",
      payload: { query: "student interview prep competitors" },
      reason: "Research competitors."
    });
    const result = engine.evaluate(originalRequest);
    const alteredRequest = {
      ...originalRequest,
      payload: { query: "different query" }
    };

    await expect(executeProtectedTool(alteredRequest, async () => "ok", result)).rejects.toBeInstanceOf(
      ProtectedToolExecutionError
    );
  });

  it("hashes payloads deterministically independent of object key order", () => {
    expect(hashPayload({ b: 2, a: { y: 2, x: 1 } })).toBe(hashPayload({ a: { x: 1, y: 2 }, b: 2 }));
  });

  it("creates and verifies signed approval tokens", () => {
    const token = createApprovalToken(
      {
        approvalId: "approval-1",
        requestId: "request-1",
        payloadHash: hashPayload({ domainName: "preporbit.com" }),
        expiresAt: "2026-08-31T01:00:00.000Z"
      },
      "test-secret"
    );

    expect(verifyApprovalToken(token, "test-secret", new Date("2026-08-31T00:00:00.000Z"))).toMatchObject({
      approvalId: "approval-1",
      requestId: "request-1"
    });
    expect(() => verifyApprovalToken(token, "wrong-secret", new Date("2026-08-31T00:00:00.000Z"))).toThrow(
      ProtectedToolExecutionError
    );
  });

  it("converts approval-required decisions into executable exact-action decisions", async () => {
    const engine = createAgentLatchPolicyEngine();
    const executeProtectedTool = createProtectedToolExecutor(engine);
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.updateDns",
      resource: "preporbit.com",
      payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
      reason: "Point the launch site to hosting."
    });
    const decision = createExecutableApprovalDecision(engine.evaluate(request));

    await expect(executeProtectedTool(request, async () => "updated", decision)).resolves.toBe("updated");
  });
});
