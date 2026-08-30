import { z } from "zod";

export const agentModelConfigSchema = z.object({
  provider: z.literal("langgraph").default("langgraph"),
  model: z.string().min(1).default("deterministic-local")
});

export type AgentModelConfig = z.infer<typeof agentModelConfigSchema>;

export function loadAgentModelConfig(env: NodeJS.ProcessEnv = process.env): AgentModelConfig {
  return agentModelConfigSchema.parse({
    provider: env.AGENT_MODEL_PROVIDER,
    model: env.AGENT_MODEL
  });
}
