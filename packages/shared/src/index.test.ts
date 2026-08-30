import { describe, expect, it } from "vitest";
import { calculateProjectProgress, createInitialAgentTasks, createLaunchProjectSchema } from "./index.js";

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
});

