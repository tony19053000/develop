import { isLlmAgent } from "@google/adk";
import { describe, expect, it } from "vitest";
import { createDeterministicWorkflowPlan, createOrchestratorRuntime } from "./orchestrator.js";

describe("Google ADK orchestrator runtime", () => {
  it("creates a real ADK agent with a launch planning tool", () => {
    const runtime = createOrchestratorRuntime({
      provider: "google-adk",
      model: "gemini-test-model"
    });

    expect(isLlmAgent(runtime.adkAgent)).toBe(true);
    expect(runtime.adkAgent.name).toBe("launchforge_orchestrator");
    expect(runtime.adkAgent.tools).toHaveLength(1);
  });

  it("creates a structured launch workflow through the ADK tool wrapper", async () => {
    const runtime = createOrchestratorRuntime({
      provider: "google-adk",
      model: "gemini-test-model"
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

