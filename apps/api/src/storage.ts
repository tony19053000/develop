import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  calculateProjectProgress,
  createInitialAgentTasks,
  launchProjectListSchema,
  type CreateLaunchProjectInput,
  type LaunchProject
} from "@launchforge/shared";

export interface ProjectRepository {
  list(): Promise<LaunchProject[]>;
  findById(id: string): Promise<LaunchProject | undefined>;
  create(input: CreateLaunchProjectInput): Promise<LaunchProject>;
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

