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

export const domainCandidateSchema = z.object({
  domainName: z.string(),
  sld: z.string(),
  tld: z.string(),
  purchasable: z.boolean(),
  premium: z.boolean(),
  purchaseType: z.string(),
  purchasePrice: z.number().nullable(),
  renewalPrice: z.number().nullable(),
  reason: z.string().default(""),
  score: z.number().min(0).max(100),
  recommendation: z.string()
});

export const domainResearchSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  brandName: z.string(),
  checkedDomains: z.array(z.string()).min(1),
  candidates: z.array(domainCandidateSchema),
  recommendedDomain: domainCandidateSchema.optional(),
  generatedAt: z.string().datetime()
});

export const websiteFileSchema = z.object({
  path: z.string().min(1),
  contentType: z.string().min(1),
  contents: z.string().min(1)
});

export const websiteValidationSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      message: z.string()
    })
  )
});

export const websiteArtifactSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  productName: z.string(),
  tagline: z.string(),
  domainName: z.string().optional(),
  previewPath: z.string(),
  files: z.array(websiteFileSchema).min(1),
  validation: websiteValidationSchema,
  deployment: z.object({
    buildCommand: z.string(),
    outputDirectory: z.string(),
    requiredEnvironment: z.array(z.string())
  }),
  generatedAt: z.string().datetime()
});

export const backendFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["int", "text", "email", "bool", "timestamp", "json"]),
  required: z.boolean(),
  description: z.string()
});

export const backendTableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  fields: z.array(backendFieldSchema).min(1)
});

export const backendEndpointSchema = z.object({
  name: z.string().min(1),
  verb: z.enum(["GET", "POST", "PUT", "DELETE"]),
  path: z.string().min(1),
  tableName: z.string().min(1),
  description: z.string(),
  xanoScript: z.string().min(1)
});

export const xanoProvisioningSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  apiGroup: z.object({
    id: z.number().optional(),
    name: z.string(),
    canonical: z.string().optional(),
    documentationUrl: z.string().url().optional()
  }),
  tables: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string(),
      guid: z.string().optional()
    })
  ),
  endpoints: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string(),
      verb: z.string(),
      path: z.string(),
      guid: z.string().optional()
    })
  ),
  provisionedAt: z.string().datetime()
});

export const backendArtifactSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  productName: z.string(),
  mode: z.enum(["planned", "provisioned"]),
  tables: z.array(backendTableSchema).min(1),
  endpoints: z.array(backendEndpointSchema).min(1),
  frontendConnection: z.object({
    environmentVariable: z.string(),
    clientFilePath: z.string(),
    usage: z.string()
  }),
  provisioning: xanoProvisioningSchema.optional(),
  generatedAt: z.string().datetime(),
  updatedAt: z.string().datetime()
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
  domainResearch: domainResearchSchema.optional(),
  websiteArtifact: websiteArtifactSchema.optional(),
  backendArtifact: backendArtifactSchema.optional(),
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
export type DomainCandidate = z.infer<typeof domainCandidateSchema>;
export type DomainResearch = z.infer<typeof domainResearchSchema>;
export type BackendArtifact = z.infer<typeof backendArtifactSchema>;
export type BackendEndpoint = z.infer<typeof backendEndpointSchema>;
export type BackendField = z.infer<typeof backendFieldSchema>;
export type BackendTable = z.infer<typeof backendTableSchema>;
export type LaunchProject = z.infer<typeof launchProjectSchema>;
export type LaunchProjectStatus = z.infer<typeof launchProjectStatusSchema>;
export type LaunchWorkflowPlan = z.infer<typeof launchWorkflowPlanSchema>;
export type MarketResearch = z.infer<typeof marketResearchSchema>;
export type ResearchResult = z.infer<typeof researchResultSchema>;
export type WebsiteArtifact = z.infer<typeof websiteArtifactSchema>;
export type WebsiteFile = z.infer<typeof websiteFileSchema>;
export type WebsiteValidation = z.infer<typeof websiteValidationSchema>;
export type WorkflowStep = z.infer<typeof workflowStepSchema>;
export type XanoProvisioning = z.infer<typeof xanoProvisioningSchema>;

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
