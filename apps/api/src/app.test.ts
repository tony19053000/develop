import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDeterministicWorkflowPlan, type OrchestratorRuntime } from "@launchforge/agents";
import { createApp } from "./app.js";
import type { ApiConfig } from "./config.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

let dataDir: string;
let app: ReturnType<typeof createApp>;

const config: ApiConfig = {
  NODE_ENV: "test",
  API_PORT: 4000,
  WEB_ORIGIN: "http://localhost:5173",
  DATA_DIR: ""
};

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-api-"));
  app = createApp({
    config: { ...config, DATA_DIR: dataDir },
    projects: new FileProjectRepository(dataDir),
    events: new EventBus(),
    orchestrator: createFakeOrchestrator()
  });
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("LaunchForge API foundation", () => {
  it("reports health", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toMatchObject({
      ok: true,
      service: "launchforge-api",
      environment: "test"
    });
  });

  it("creates and lists launch projects", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI interview-preparation platform for university students." })
      .expect(201);

    expect(createResponse.body.project.status).toBe("active");
    expect(createResponse.body.project.tasks).toHaveLength(8);
    expect(createResponse.body.project.tasks[0].status).toBe("complete");

    const listResponse = await request(app).get("/api/projects").expect(200);

    expect(listResponse.body.projects).toHaveLength(1);
    expect(listResponse.body.projects[0].idea).toContain("interview");
  });

  it("rejects underspecified launch ideas", async () => {
    const response = await request(app).post("/api/projects").send({ idea: "AI" }).expect(400);

    expect(response.body.error).toBe("Validation failed.");
  });

  it("returns 404 for unknown projects", async () => {
    const response = await request(app).get("/api/projects/missing").expect(404);

    expect(response.body.error).toBe("Project not found.");
  });

  it("refreshes orchestration for an existing project", async () => {
    const createResponse = await request(app)
      .post("/api/projects")
      .send({ idea: "Launch an AI contract review assistant for small law firms." })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${createResponse.body.project.id}/orchestrate`)
      .expect(200);

    expect(response.body.plan.steps).toHaveLength(8);
    expect(response.body.project.status).toBe("active");
  });
});

function createFakeOrchestrator(): OrchestratorRuntime {
  return {
    adkAgent: {} as OrchestratorRuntime["adkAgent"],
    async planLaunch(input) {
      return createDeterministicWorkflowPlan(input.projectId, input.idea);
    }
  };
}
