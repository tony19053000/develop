import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  calculateProjectProgress,
  createInitialAgentTasks,
  backendArtifactSchema,
  deploymentRecordSchema,
  launchProjectListSchema,
  tasksFromWorkflowPlan,
  type BackendArtifact,
  type CreateLaunchProjectInput,
  type DeploymentRecord,
  type DomainResearch,
  type LaunchProject,
  type LaunchWorkflowPlan,
  type MarketResearch,
  type WebsiteArtifact
} from "@launchforge/shared";

export interface ProjectRepository {
  list(): Promise<LaunchProject[]>;
  findById(id: string): Promise<LaunchProject | undefined>;
  create(input: CreateLaunchProjectInput): Promise<LaunchProject>;
  applyWorkflowPlan(projectId: string, plan: LaunchWorkflowPlan): Promise<LaunchProject>;
  saveMarketResearch(projectId: string, research: MarketResearch): Promise<LaunchProject>;
  saveDomainResearch(projectId: string, research: DomainResearch): Promise<LaunchProject>;
  saveWebsiteArtifact(projectId: string, artifact: WebsiteArtifact): Promise<LaunchProject>;
  saveBackendArtifact(projectId: string, artifact: BackendArtifact): Promise<LaunchProject>;
  saveDeploymentRecord(projectId: string, deployment: DeploymentRecord): Promise<LaunchProject>;
  markApprovalPending(projectId: string): Promise<LaunchProject>;
  markApprovalResolved(projectId: string, approved: boolean): Promise<LaunchProject>;
}

export class FileProjectRepository implements ProjectRepository {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "projects.json");
  }

  async list(): Promise<LaunchProject[]> {
    return this.readProjects();
  }

  async findById(id: string): Promise<LaunchProject | undefined> {
    const projects = await this.readProjects();
    return projects.find((project) => project.id === id);
  }

  async create(input: CreateLaunchProjectInput): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const now = new Date().toISOString();
    const tasks = createInitialAgentTasks(now);
    const project: LaunchProject = {
      id: randomUUID(),
      idea: input.idea,
      name: deriveWorkingName(input.idea),
      status: "planning",
      progress: calculateProjectProgress(tasks),
      tasks,
      createdAt: now,
      updatedAt: now
    };

    projects.unshift(project);
    await this.writeProjects(projects);
    return project;
  }

  async applyWorkflowPlan(projectId: string, plan: LaunchWorkflowPlan): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const tasks = tasksFromWorkflowPlan(plan, now);
    const updatedProject: LaunchProject = {
      ...project,
      status: "active",
      progress: calculateProjectProgress(tasks),
      tasks,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async saveMarketResearch(projectId: string, research: MarketResearch): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const tasks = project.tasks.map((task) =>
      task.id === "market-research" || task.id === "brand-positioning"
        ? { ...task, status: "complete" as const, updatedAt: now }
        : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status: "active",
      progress: calculateProjectProgress(tasks),
      tasks,
      marketResearch: research,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async saveDomainResearch(projectId: string, research: DomainResearch): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const tasks = project.tasks.map((task) =>
      task.id === "domain-research" ? { ...task, status: "complete" as const, updatedAt: now } : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status: "active",
      progress: calculateProjectProgress(tasks),
      tasks,
      domainResearch: research,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async saveWebsiteArtifact(projectId: string, artifact: WebsiteArtifact): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const tasks = project.tasks.map((task) =>
      task.id === "website-foundation" ? { ...task, status: "complete" as const, updatedAt: now } : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status: "active",
      progress: calculateProjectProgress(tasks),
      tasks,
      websiteArtifact: artifact,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async saveBackendArtifact(projectId: string, artifact: BackendArtifact): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const tasks = project.tasks.map((task) =>
      task.id === "backend-foundation"
        ? { ...task, status: artifact.mode === "provisioned" ? ("complete" as const) : ("running" as const), updatedAt: now }
        : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status: "active",
      progress: calculateProjectProgress(tasks),
      tasks,
      backendArtifact: backendArtifactSchema.parse({
        ...artifact,
        updatedAt: now
      }),
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async saveDeploymentRecord(projectId: string, deployment: DeploymentRecord): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const parsedDeployment = deploymentRecordSchema.parse({
      ...deployment,
      updatedAt: now
    });
    const tasks = project.tasks.map((task) =>
      task.id === "deployment-system"
        ? { ...task, status: parsedDeployment.status === "healthy" ? ("complete" as const) : ("failed" as const), updatedAt: now }
        : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status: parsedDeployment.status === "healthy" ? "active" : "failed",
      progress: calculateProjectProgress(tasks),
      tasks,
      deploymentRecord: parsedDeployment,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  async markApprovalPending(projectId: string): Promise<LaunchProject> {
    return this.updateApprovalTask(projectId, "waiting_for_approval", "running");
  }

  async markApprovalResolved(projectId: string, approved: boolean): Promise<LaunchProject> {
    return this.updateApprovalTask(projectId, approved ? "active" : "failed", approved ? "complete" : "failed");
  }

  private async updateApprovalTask(
    projectId: string,
    status: LaunchProject["status"],
    taskStatus: "running" | "complete" | "failed"
  ): Promise<LaunchProject> {
    const projects = await this.readProjects();
    const projectIndex = projects.findIndex((project) => project.id === projectId);

    if (projectIndex === -1) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const project = projects[projectIndex];

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const now = new Date().toISOString();
    const tasks = project.tasks.map((task) =>
      task.id === "approval-boundary" ? { ...task, status: taskStatus, updatedAt: now } : task
    );
    const updatedProject: LaunchProject = {
      ...project,
      status,
      progress: calculateProjectProgress(tasks),
      tasks,
      updatedAt: now
    };

    projects[projectIndex] = updatedProject;
    await this.writeProjects(projects);
    return updatedProject;
  }

  private async readProjects(): Promise<LaunchProject[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return launchProjectListSchema.parse(JSON.parse(content));
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async writeProjects(projects: LaunchProject[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(projects, null, 2)}\n`, "utf8");
  }
}

function deriveWorkingName(idea: string): string {
  const words = idea
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 3);

  if (words.length === 0) {
    return "Untitled Launch";
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(" ");
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
