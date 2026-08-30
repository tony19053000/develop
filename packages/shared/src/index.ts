import { z } from "zod";

export const launchProjectStatusSchema = z.enum([
  "draft",
  "planning",
  "active",
  "waiting_for_approval",
  "completed",
  "failed"
]);

export const agentTaskStatusSchema = z.enum([
  "waiting",
  "running",
  "blocked",
  "complete",
  "failed"
]);

export const agentRoleSchema = z.enum([
  "orchestrator",
  "market_brand",
  "domain",
  "agentlatch",
  "website",
  "backend",
  "document"
]);

export const agentEventLevelSchema = z.enum(["info", "success", "warning", "error"]);

export const createLaunchProjectSchema = z.object({
  idea: z.string().trim().min(10, "Describe the startup idea in at least 10 characters.").max(1000)
});

export const agentTaskSchema = z.object({
  id: z.string(),
  agent: agentRoleSchema,
  title: z.string(),
  status: agentTaskStatusSchema,
  updatedAt: z.string().datetime()
});

export const agentEventSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  agent: agentRoleSchema,
  level: agentEventLevelSchema,
  message: z.string(),
  createdAt: z.string().datetime()
});

export const launchProjectSchema = z.object({
  id: z.string(),
  idea: z.string(),
  name: z.string(),
  status: launchProjectStatusSchema,
  progress: z.number().min(0).max(100),
  tasks: z.array(agentTaskSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const launchProjectListSchema = z.array(launchProjectSchema);

export type AgentEvent = z.infer<typeof agentEventSchema>;
export type AgentEventLevel = z.infer<typeof agentEventLevelSchema>;
export type AgentRole = z.infer<typeof agentRoleSchema>;
export type AgentTask = z.infer<typeof agentTaskSchema>;
export type AgentTaskStatus = z.infer<typeof agentTaskStatusSchema>;
export type CreateLaunchProjectInput = z.infer<typeof createLaunchProjectSchema>;
export type LaunchProject = z.infer<typeof launchProjectSchema>;
export type LaunchProjectStatus = z.infer<typeof launchProjectStatusSchema>;

export function calculateProjectProgress(tasks: AgentTask[]): number {
  if (tasks.length === 0) {
    return 0;
  }

  const completeTasks = tasks.filter((task) => task.status === "complete").length;
  return Math.round((completeTasks / tasks.length) * 100);
}

export function createInitialAgentTasks(now: string): AgentTask[] {
  return [
    {
      id: "orchestrator-plan",
      agent: "orchestrator",
      title: "Create launch plan",
      status: "running",
      updatedAt: now
    },
    {
      id: "market-research",
      agent: "market_brand",
      title: "Research market and competitors",
      status: "waiting",
      updatedAt: now
    },
    {
      id: "domain-research",
      agent: "domain",
      title: "Find available domains",
      status: "waiting",
      updatedAt: now
    },
    {
      id: "approval-boundary",
      agent: "agentlatch",
      title: "Evaluate protected actions",
      status: "waiting",
      updatedAt: now
    },
    {
      id: "website-foundation",
      agent: "website",
      title: "Generate product frontend",
      status: "waiting",
      updatedAt: now
    },
    {
      id: "backend-foundation",
      agent: "backend",
      title: "Provision backend",
      status: "waiting",
      updatedAt: now
    },
    {
      id: "document-foundation",
      agent: "document",
      title: "Prepare founder documents",
      status: "waiting",
      updatedAt: now
    }
  ];
}

