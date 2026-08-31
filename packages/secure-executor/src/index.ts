import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  createProtectedToolExecutor,
  hashPayload,
  ProtectedToolExecutionError,
  type AgentLatchPolicyEngine,
  type AgentLatchPolicyResult,
  type ToolActionRequest
} from "@launchforge/agentlatch";

export const secureExecutorModeSchema = z.enum(["development", "google_confidential_space"]);

export const teeProviderSchema = z.enum(["google_confidential_space"]);

export const secureExecutionEvidenceSchema = z.object({
  provider: teeProviderSchema,
  attestationToken: z.string().min(24),
  workloadIdentity: z.string().min(1),
  imageDigest: z.string().min(12),
  verifiedAt: z.string().datetime().default(() => new Date().toISOString())
});

export const secureExecutionReceiptSchema = z.object({
  id: z.string().default(() => randomUUID()),
  requestId: z.string(),
  actionType: z.string(),
  payloadHash: z.string(),
  mode: secureExecutorModeSchema,
  teeProvider: teeProviderSchema.optional(),
  evidenceVerified: z.boolean(),
  result: z.record(z.unknown()),
  executedAt: z.string().datetime().default(() => new Date().toISOString())
});

export type SecureExecutionEvidence = z.infer<typeof secureExecutionEvidenceSchema>;
export type SecureExecutionReceipt = z.infer<typeof secureExecutionReceiptSchema>;
export type SecureExecutorMode = z.infer<typeof secureExecutorModeSchema>;

export interface SecretHandle {
  name: string;
  value: string;
}

export interface SecretProvider {
  resolve(name: string): Promise<SecretHandle>;
}

export interface SecureExecutorConfig {
  mode: SecureExecutorMode;
  allowedSecretNames: string[];
  evidence?: SecureExecutionEvidence;
}

export interface SecureExecutionInput<T> {
  request: ToolActionRequest;
  approval: AgentLatchPolicyResult;
  operation: (context: SecureOperationContext) => Promise<T>;
}

export interface SecureOperationContext {
  getSecret(name: string): Promise<string>;
}

export interface SecureExecutor {
  execute<T extends Record<string, unknown>>(input: SecureExecutionInput<T>): Promise<SecureExecutionReceipt>;
}

export class SecureExecutionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EnvironmentSecretProvider implements SecretProvider {
  async resolve(name: string): Promise<SecretHandle> {
    const value = process.env[name];

    if (!value) {
      throw new SecureExecutionError(`Secret ${name} is not configured.`);
    }

    return { name, value };
  }
}

export function createSecureExecutor(
  config: SecureExecutorConfig,
  agentLatch: AgentLatchPolicyEngine,
  secrets: SecretProvider = new EnvironmentSecretProvider()
): SecureExecutor {
  const parsedConfig = {
    ...config,
    ...(config.evidence ? { evidence: secureExecutionEvidenceSchema.parse(config.evidence) } : {})
  };
  const executeProtectedTool = createProtectedToolExecutor(agentLatch);

  return {
    async execute(input) {
      validateApproval(input.request, input.approval);
      const evidenceVerified = verifySecureExecutionEvidence(parsedConfig);
      const result = await executeProtectedTool(
        input.request,
        () => input.operation(createSecureOperationContext(parsedConfig.allowedSecretNames, secrets)),
        input.approval
      );

      return secureExecutionReceiptSchema.parse({
        requestId: input.request.id,
        actionType: input.request.actionType,
        payloadHash: hashPayload(input.request.payload),
        mode: parsedConfig.mode,
        ...(parsedConfig.evidence ? { teeProvider: parsedConfig.evidence.provider } : {}),
        evidenceVerified,
        result
      });
    }
  };
}

export function verifySecureExecutionEvidence(config: SecureExecutorConfig): boolean {
  if (config.mode === "development") {
    return false;
  }

  if (!config.evidence) {
    throw new SecureExecutionError("Google Confidential Space mode requires attestation evidence.");
  }

  const evidence = secureExecutionEvidenceSchema.parse(config.evidence);

  if (evidence.provider !== "google_confidential_space") {
    throw new SecureExecutionError("Unsupported TEE evidence provider.");
  }

  return true;
}

function validateApproval(request: ToolActionRequest, approval: AgentLatchPolicyResult): void {
  if (!approval.executable) {
    throw new ProtectedToolExecutionError("SecureExecutor requires an executable AgentLatch approval decision.");
  }

  if (approval.requestId !== request.id) {
    throw new ProtectedToolExecutionError("SecureExecutor approval does not match the action request.");
  }

  if (approval.payloadHash !== hashPayload(request.payload)) {
    throw new ProtectedToolExecutionError("SecureExecutor approval payload hash does not match the action request.");
  }
}

function createSecureOperationContext(allowedSecretNames: string[], secrets: SecretProvider): SecureOperationContext {
  const allowedSecrets = new Set(allowedSecretNames);

  return {
    async getSecret(name) {
      if (!allowedSecrets.has(name)) {
        throw new SecureExecutionError(`Secret ${name} is not allowed for this secure execution.`);
      }

      const secret = await secrets.resolve(name);
      return secret.value;
    }
  };
}
