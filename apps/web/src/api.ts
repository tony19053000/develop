import type { CreateLaunchProjectInput, LaunchProject } from "@launchforge/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface ProjectListResponse {
  projects: LaunchProject[];
}

interface ProjectResponse {
  project: LaunchProject;
}

export async function listProjects(): Promise<LaunchProject[]> {
  const response = await fetch(`${API_BASE_URL}/api/projects`);
  const body = await readJson<ProjectListResponse>(response);
  return body.projects;
}

export async function createProject(input: CreateLaunchProjectInput): Promise<LaunchProject> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await readJson<ProjectResponse>(response);
  return body.project;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

