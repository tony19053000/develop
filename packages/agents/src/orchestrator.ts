import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
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

const OrchestratorState = Annotation.Root({
  projectId: Annotation<string>(),
  idea: Annotation<string>(),
  modelProvider: Annotation<string>(),
  model: Annotation<string>(),
  plan: Annotation<LaunchWorkflowPlan | undefined>()
});

type OrchestratorStateValue = typeof OrchestratorState.State;
type OrchestratorGraphBuilder = ReturnType<typeof createGraphBuilder>;

export interface OrchestratorRuntime {
  graph: ReturnType<OrchestratorGraphBuilder["compile"]>;
  planLaunch(input: z.infer<typeof planLaunchInputSchema>): Promise<LaunchWorkflowPlan>;
}

export function createOrchestratorRuntime(modelConfig: AgentModelConfig): OrchestratorRuntime {
  const graph = createGraphBuilder(modelConfig).compile();

  return {
    graph,
    async planLaunch(input) {
      const parsed = planLaunchInputSchema.parse(input);
      const result = await graph.invoke({
        projectId: parsed.projectId,
        idea: parsed.idea,
        modelProvider: modelConfig.provider,
        model: modelConfig.model,
        plan: undefined
      });

      return launchWorkflowPlanSchema.parse(result.plan);
    }
  };
}

function createGraphBuilder(modelConfig: AgentModelConfig) {
  return new StateGraph(OrchestratorState)
    .addNode("plan_launch", (state: OrchestratorStateValue) => ({
      plan: createDeterministicWorkflowPlan(state.projectId, state.idea, modelConfig)
    }))
    .addEdge(START, "plan_launch")
    .addEdge("plan_launch", END);
}

export function createDeterministicWorkflowPlan(
  projectId: string,
  idea: string,
  modelConfig: AgentModelConfig = { provider: "langgraph", model: "deterministic-local" }
): LaunchWorkflowPlan {
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
    summary: `LangGraph ${modelConfig.model} workflow created for: ${idea}`,
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
