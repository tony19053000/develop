import { describe, expect, it, vi } from "vitest";
import {
  createAgentLatchPolicyEngine,
  createExecutableApprovalDecision,
  toolActionRequestSchema
} from "@launchforge/agentlatch";
import {
  createSecureExecutor,
  SecureExecutionError,
  verifySecureExecutionEvidence,
  type SecretProvider
} from "./index.js";

describe("SecureExecutor", () => {
  it("executes only with an executable AgentLatch decision", async () => {
    const agentLatch = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.registerDomain",
      resource: "preporbit.com",
      payload: { domainName: "preporbit.com", years: 1, price: 12.99 },
      reason: "Register the approved domain."
    });
    const approval = createExecutableApprovalDecision(agentLatch.evaluate(request));
    const executor = createSecureExecutor({ mode: "development", allowedSecretNames: [] }, agentLatch);

    const receipt = await executor.execute({
      request,
      approval,
      operation: async () => ({ registered: false, dryRun: true })
    });

    expect(receipt.evidenceVerified).toBe(false);
    expect(receipt.result).toEqual({ registered: false, dryRun: true });
  });

  it("rejects non-executable policy results", async () => {
    const agentLatch = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.registerDomain",
      resource: "preporbit.com",
      payload: { domainName: "preporbit.com", years: 1, price: 12.99 },
      reason: "Register the approved domain."
    });
    const executor = createSecureExecutor({ mode: "development", allowedSecretNames: [] }, agentLatch);

    await expect(
      executor.execute({
        request,
        approval: agentLatch.evaluate(request),
        operation: async () => ({ registered: true })
      })
    ).rejects.toThrow("executable");
  });

  it("rejects altered payloads after approval", async () => {
    const agentLatch = createAgentLatchPolicyEngine();
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.updateDns",
      resource: "preporbit.com",
      payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
      reason: "Point hosting."
    });
    const approval = createExecutableApprovalDecision(agentLatch.evaluate(request));
    const alteredRequest = toolActionRequestSchema.parse({
      ...request,
      payload: { type: "A", host: "www", answer: "203.0.113.10" }
    });
    const executor = createSecureExecutor({ mode: "development", allowedSecretNames: [] }, agentLatch);

    await expect(
      executor.execute({
        request: alteredRequest,
        approval,
        operation: async () => ({ updated: true })
      })
    ).rejects.toThrow("payload hash");
  });

  it("only exposes allowlisted secrets inside the operation context", async () => {
    const agentLatch = createAgentLatchPolicyEngine();
    const secretProvider: SecretProvider = {
      async resolve(name) {
        return { name, value: "secret-value" };
      }
    };
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.updateDns",
      resource: "preporbit.com",
      payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
      reason: "Point hosting."
    });
    const approval = createExecutableApprovalDecision(agentLatch.evaluate(request));
    const executor = createSecureExecutor(
      { mode: "development", allowedSecretNames: ["NAMECOM_API_TOKEN"] },
      agentLatch,
      secretProvider
    );

    await expect(
      executor.execute({
        request,
        approval,
        operation: async (context) => {
          const token = await context.getSecret("NAMECOM_API_TOKEN");
          await expect(context.getSecret("SERPAPI_API_KEY")).rejects.toBeInstanceOf(SecureExecutionError);
          return { tokenSeen: token === "secret-value" };
        }
      })
    ).resolves.toMatchObject({ result: { tokenSeen: true } });
  });

  it("requires attestation evidence in Google Confidential Space mode", () => {
    expect(() =>
      verifySecureExecutionEvidence({
        mode: "google_confidential_space",
        allowedSecretNames: []
      })
    ).toThrow(SecureExecutionError);
  });

  it("accepts structured Google Confidential Space evidence", () => {
    expect(
      verifySecureExecutionEvidence({
        mode: "google_confidential_space",
        allowedSecretNames: [],
        evidence: {
          provider: "google_confidential_space",
          attestationToken: "attestation-token-with-enough-length",
          workloadIdentity: "launchforge-secure-executor@project.iam.gserviceaccount.com",
          imageDigest: "sha256:1234567890abcdef",
          verifiedAt: "2026-08-31T00:00:00.000Z"
        }
      })
    ).toBe(true);
  });

  it("does not call protected operations when validation fails", async () => {
    const agentLatch = createAgentLatchPolicyEngine();
    const operation = vi.fn(async () => ({ updated: true }));
    const request = toolActionRequestSchema.parse({
      projectId: "project-1",
      requestedBy: "domain",
      actionType: "namecom.updateDns",
      resource: "preporbit.com",
      payload: { type: "CNAME", host: "www", answer: "launchforge.example" },
      reason: "Point hosting."
    });
    const executor = createSecureExecutor({ mode: "development", allowedSecretNames: [] }, agentLatch);

    await expect(
      executor.execute({
        request,
        approval: agentLatch.evaluate(request),
        operation
      })
    ).rejects.toThrow("executable");
    expect(operation).not.toHaveBeenCalled();
  });
});
