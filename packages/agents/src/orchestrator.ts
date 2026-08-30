import { Agent, FunctionTool, isLlmAgent, type Context } from "@google/adk";
import { Type, type Schema } from "@google/genai";
import {
  launchWorkflowPlanSchema,
  type AgentRole,
  type LaunchWorkflowPlan,
  type WorkflowStep
} from "@launchforge/shared";
import { z } from "zod";
import type { AgentModelConfig } from "./modelConfig.js";

const planLaunchInputSchema = z.object({
  projectId: z.string().min(1),
  idea: z.string().min(10)
});

const planLaunchAdkSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectId: {
      type: Type.STRING,
      description: "LaunchForge project identifier."
    },
    idea: {
      type: Type.STRING,
      description: "Startup idea submitted by the user."
    }
  },
  required: ["projectId", "idea"]
};

export interface OrchestratorRuntime {
  adkAgent: Agent;
  planLaunch(input: z.infer<typeof planLaunchInputSchema>): Promise<LaunchWorkflowPlan>;
}

export function createOrchestratorRuntime(modelConfig: AgentModelConfig): OrchestratorRuntime {
  const planLaunchTool = createPlanLaunchTool();
  const adkAgent = new Agent({
    name: "launchforge_orchestrator",
    model: modelConfig.model,
    instruction:
      "Create structured startup launch workflows. Keep security boundaries explicit. Never authorize protected actions yourself.",
    tools: [planLaunchTool],
    outputKey: "launch_workflow_plan"
  });

  if (!isLlmAgent(adkAgent)) {
    throw new Error("Failed to initialize Google ADK Orchestrator Agent.");
  }

  return {
    adkAgent,
    async planLaunch(input) {
      const result = await planLaunchTool.runAsync({
        args: input,
        toolContext: {} as unknown as Context
      });

      return launchWorkflowPlanSchema.parse(result);
    }
  };
}

function createPlanLaunchTool() {
  return new FunctionTool({
    name: "create_launch_workflow",
    description:
      "Create a structured LaunchForge workflow plan with explicit agent responsibilities and dependencies.",
    parameters: planLaunchAdkSchema,
    execute: (input) => {
      const parsed = planLaunchInputSchema.parse(input);
      return createDeterministicWorkflowPlan(parsed.projectId, parsed.idea);
    }
  });
}

export function createDeterministicWorkflowPlan(projectId: string, idea: string): LaunchWorkflowPlan {
  const createdAt = new Date().toISOString();
  const steps: WorkflowStep[] = [
    step("orchestrator-plan", "orchestrator", "Create launch plan", [], "complete"),
    step("market-research", "market_brand", "Research market and competitors", ["orchestrator-plan"], "running"),
    step("brand-positioning", "market_brand", "Create brand positioning", ["market-research"], "waiting"),
    step("domain-research", "domain", "Find available domains", ["brand-positioning"], "waiting"),
    step("approval-boundary", "agentlatch", "Evaluate protected actions", ["domain-research"], "waiting"),
    step("website-foundation", "website", "Generate product frontend", ["brand-positioning"], "waiting"),
    step("backend-foundation", "backend", "Provision backend", ["website-foundation"], "waiting"),
    step("document-foundation", "document", "Prepare founder documents", ["brand-positioning"], "waiting")
  ];

  return launchWorkflowPlanSchema.parse({
    projectId,
    objective: idea,
    summary: `Launch workflow created for: ${idea}`,
    steps,
    createdAt
  });
}

function step(
  id: string,
  agent: AgentRole,
  title: string,
  dependsOn: string[],
  status: WorkflowStep["status"]
): WorkflowStep {
  return {
    id,
    agent,
    title,
    dependsOn,
    status
  };
}
