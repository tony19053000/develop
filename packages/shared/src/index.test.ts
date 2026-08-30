import { describe, expect, it } from "vitest";
import {
  calculateProjectProgress,
  createInitialAgentTasks,
  createLaunchProjectSchema,
  launchWorkflowPlanSchema,
  marketResearchSchema,
  tasksFromWorkflowPlan
} from "./index.js";

describe("shared launch contracts", () => {
  it("validates useful launch ideas", () => {
    const parsed = createLaunchProjectSchema.parse({
      idea: "Launch an AI interview-preparation platform for university students."
    });

    expect(parsed.idea).toContain("interview");
  });

  it("creates initial agent tasks for the command center", () => {
    const tasks = createInitialAgentTasks("2026-08-31T00:00:00.000Z");

    expect(tasks).toHaveLength(7);
    expect(tasks[0]?.status).toBe("running");
    expect(tasks.map((task) => task.agent)).toContain("agentlatch");
  });

  it("calculates progress from completed tasks", () => {
    const tasks = createInitialAgentTasks("2026-08-31T00:00:00.000Z").map((task, index) => ({
      ...task,
      status: index < 2 ? "complete" as const : task.status
    }));

    expect(calculateProjectProgress(tasks)).toBe(29);
  });

  it("maps workflow plans into agent tasks", () => {
    const plan = launchWorkflowPlanSchema.parse({
      projectId: "project-1",
      objective: "Launch a product",
      summary: "A structured launch plan.",
      createdAt: "2026-08-31T00:00:00.000Z",
      steps: [
        {
          id: "orchestrator-plan",
          agent: "orchestrator",
          title: "Create launch plan",
          dependsOn: [],
          status: "complete"
        }
      ]
    });

    expect(tasksFromWorkflowPlan(plan, "2026-08-31T00:01:00.000Z")).toEqual([
      {
        id: "orchestrator-plan",
        agent: "orchestrator",
        title: "Create launch plan",
        status: "complete",
        updatedAt: "2026-08-31T00:01:00.000Z"
      }
    ]);
  });

  it("validates market research output with evidence", () => {
    const research = {
      id: "research-1",
      projectId: "project-1",
      idea: "Launch an AI interview-preparation platform for university students.",
      queries: ["AI interview preparation university students competitors"],
      competitors: [
        {
          title: "Interview Prep Example",
          link: "https://example.com",
          snippet: "Practice interviews for students.",
          source: "SerpApi"
        }
      ],
      marketSignals: [],
      namingConflicts: [],
      brand: {
        name: "PrepOrbit",
        tagline: "Ace your next interview with AI.",
        description: "AI interview practice for university students.",
        targetUsers: ["University students"],
        positioning: "Focused interview readiness for early-career candidates."
      },
      evidenceSummary: "Found student-focused interview preparation competitors.",
      generatedAt: "2026-08-31T00:00:00.000Z"
    };

    expect(() => marketResearchSchema.parse(research)).not.toThrow();
  });
});
