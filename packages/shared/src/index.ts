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

export const workflowStepSchema = z.object({
  id: z.string(),
  agent: agentRoleSchema,
  title: z.string(),
  dependsOn: z.array(z.string()),
  status: agentTaskStatusSchema
});

export const launchWorkflowPlanSchema = z.object({
  projectId: z.string(),
  objective: z.string(),
  summary: z.string(),
  steps: z.array(workflowStepSchema).min(1),
  createdAt: z.string().datetime()
});

export const researchResultSchema = z.object({
  title: z.string(),
  link: z.string().url(),
  snippet: z.string().default(""),
  source: z.string().default("SerpApi")
});

export const marketResearchSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  idea: z.string(),
  queries: z.array(z.string()).min(1),
  competitors: z.array(researchResultSchema),
  marketSignals: z.array(researchResultSchema),
  namingConflicts: z.array(researchResultSchema),
  brand: z.object({
    name: z.string(),
    tagline: z.string(),
    description: z.string(),
    targetUsers: z.array(z.string()),
    positioning: z.string()
  }),
  evidenceSummary: z.string(),
  generatedAt: z.string().datetime()
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
  marketResearch: marketResearchSchema.optional(),
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
export type LaunchWorkflowPlan = z.infer<typeof launchWorkflowPlanSchema>;
export type MarketResearch = z.infer<typeof marketResearchSchema>;
export type ResearchResult = z.infer<typeof researchResultSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;

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

export function tasksFromWorkflowPlan(plan: LaunchWorkflowPlan, now: string): AgentTask[] {
  return plan.steps.map((step) => ({
    id: step.id,
    agent: step.agent,
    title: step.title,
    status: step.status,
    updatedAt: now
  }));
}
