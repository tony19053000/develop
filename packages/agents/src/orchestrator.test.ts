import { describe, expect, it } from "vitest";
import { createDeterministicWorkflowPlan, createOrchestratorRuntime } from "./orchestrator.js";

describe("LangGraph orchestrator runtime", () => {
  it("creates a compiled LangGraph runtime", async () => {
    const runtime = createOrchestratorRuntime({
      provider: "langgraph",
      model: "deterministic-local"
    });

    const plan = await runtime.planLaunch({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students."
    });

    expect(runtime.graph).toBeDefined();
    expect(plan.projectId).toBe("project-1");
    expect(plan.summary).toContain("LangGraph");
  });

  it("creates a structured launch workflow through the graph", async () => {
    const runtime = createOrchestratorRuntime({
      provider: "langgraph",
      model: "deterministic-local"
    });

    const plan = await runtime.planLaunch({
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students."
    });

    expect(plan.projectId).toBe("project-1");
    expect(plan.steps[0]?.status).toBe("complete");
    expect(plan.steps.map((step) => step.agent)).toContain("agentlatch");
  });

  it("keeps the deterministic planner independent from a specific model", () => {
    const plan = createDeterministicWorkflowPlan(
      "project-2",
      "Launch an AI tax preparation assistant for freelancers."
    );

    expect(plan.summary).toContain("freelancers");
    expect(plan.steps.find((step) => step.id === "approval-boundary")?.dependsOn).toEqual(["domain-research"]);
  });
});
