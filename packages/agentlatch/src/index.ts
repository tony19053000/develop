import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { agentRoleSchema } from "@launchforge/shared";

export const agentLatchDecisionSchema = z.enum([
  "AUTO_ALLOW",
  "APPROVAL_REQUIRED",
  "HIGH_RISK_APPROVAL",
  "HUMAN_ONLY",
  "DENY"
]);

export const toolActionTypeSchema = z.enum([
  "serpapi.search",
  "namecom.checkAvailability",
  "namecom.registerDomain",
  "namecom.updateDns",
  "xano.provisionBackend",
  "foxit.generateDocument",
  "foxit.sendForSignature",
  "system.read",
  "system.write"
]);

export const toolActionRequestSchema = z.object({
  id: z.string().default(() => randomUUID()),
  projectId: z.string(),
  requestedBy: agentRoleSchema,
  actionType: toolActionTypeSchema,
  resource: z.string(),
  payload: z.record(z.unknown()),
  reason: z.string().min(1),
  createdAt: z.string().datetime().default(() => new Date().toISOString())
});

export const agentLatchPolicyResultSchema = z.object({
  id: z.string().default(() => randomUUID()),
  requestId: z.string(),
  decision: agentLatchDecisionSchema,
  category: z.string(),
  explanation: z.string(),
  payloadHash: z.string(),
  requiresHumanApproval: z.boolean(),
  executable: z.boolean(),
  evaluatedAt: z.string().datetime().default(() => new Date().toISOString())
});

export type AgentLatchDecision = z.infer<typeof agentLatchDecisionSchema>;
export type AgentLatchPolicyResult = z.infer<typeof agentLatchPolicyResultSchema>;
export type ToolActionRequest = z.infer<typeof toolActionRequestSchema>;
export type ToolActionType = z.infer<typeof toolActionTypeSchema>;

export interface AgentLatchPolicyEngine {
  evaluate(request: ToolActionRequest): AgentLatchPolicyResult;
}

export class ProtectedToolExecutionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function createAgentLatchPolicyEngine(): AgentLatchPolicyEngine {
  return {
    evaluate(request) {
      const parsedRequest = toolActionRequestSchema.parse(request);
      return agentLatchPolicyResultSchema.parse({
        requestId: parsedRequest.id,
        ...classifyRequest(parsedRequest),
        payloadHash: hashPayload(parsedRequest.payload)
      });
    }
  };
}

export function createProtectedToolExecutor(engine: AgentLatchPolicyEngine) {
  return async function executeProtectedTool<T>(
    request: ToolActionRequest,
    operation: () => Promise<T>,
    approvedResult?: AgentLatchPolicyResult
  ): Promise<T> {
    const result = approvedResult ?? engine.evaluate(request);

    if (result.requestId !== request.id) {
      throw new ProtectedToolExecutionError("AgentLatch decision does not match the action request.");
    }

    if (result.payloadHash !== hashPayload(request.payload)) {
      throw new ProtectedToolExecutionError("AgentLatch decision payload hash does not match the action request.");
    }

    if (!result.executable) {
      throw new ProtectedToolExecutionError(`AgentLatch blocked execution: ${result.decision}.`);
    }

    return operation();
  };
}

export function hashPayload(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(sortValue(payload))).digest("hex");
}

function classifyRequest(request: ToolActionRequest): Omit<
  AgentLatchPolicyResult,
  "id" | "requestId" | "payloadHash" | "evaluatedAt"
> {
  if (request.actionType === "foxit.sendForSignature") {
    return {
      decision: "HUMAN_ONLY",
      category: "human-only-signature",
      explanation: "Agents cannot sign or initiate signature execution as the user.",
      requiresHumanApproval: true,
      executable: false
    };
  }

  if (request.actionType === "namecom.registerDomain") {
    return {
      decision: "HIGH_RISK_APPROVAL",
      category: "paid-domain-registration",
      explanation: "Domain registration is a paid ownership action and requires high-risk approval.",
      requiresHumanApproval: true,
      executable: false
    };
  }

  if (request.actionType === "namecom.updateDns" || request.actionType === "xano.provisionBackend") {
    return {
      decision: "APPROVAL_REQUIRED",
      category: "external-infrastructure-change",
      explanation: "Infrastructure-changing sponsor actions require explicit approval.",
      requiresHumanApproval: true,
      executable: false
    };
  }

  if (request.actionType === "system.write") {
    return {
      decision: "DENY",
      category: "local-system-write",
      explanation: "Direct system writes are outside the sponsor action boundary.",
      requiresHumanApproval: false,
      executable: false
    };
  }

  return {
    decision: "AUTO_ALLOW",
    category: "read-only-or-generated-artifact",
    explanation: "Read-only research and generated non-sensitive artifacts may execute without approval.",
    requiresHumanApproval: false,
    executable: true
  };
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortValue(nestedValue)])
    );
  }

  return value;
}
