import cors from "cors";
import express from "express";
import type { AgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { toolActionRequestSchema } from "@launchforge/agentlatch";
import type { DomainAgent, MarketBrandAgent, OrchestratorRuntime } from "@launchforge/agents";
import { NameComConfigurationError, SerpApiConfigurationError } from "@launchforge/integrations";
import { createLaunchProjectSchema } from "@launchforge/shared";
import type { ApiConfig } from "./config.js";
import { ApiError, errorHandler, notFound } from "./errors.js";
import { EventBus } from "./events.js";
import type { ProjectRepository } from "./storage.js";

export interface AppDependencies {
  config: ApiConfig;
  projects: ProjectRepository;
  events: EventBus;
  orchestrator: OrchestratorRuntime;
  marketBrand: MarketBrandAgent;
  domain: DomainAgent;
  agentLatch: AgentLatchPolicyEngine;
}

export function createApp({ config, projects, events, orchestrator, marketBrand, domain, agentLatch }: AppDependencies) {
  const app = express();

  app.use(cors({ origin: config.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "launchforge-api",
      environment: config.NODE_ENV
    });
  });

  app.get("/api/projects", async (_request, response, next) => {
    try {
      response.json({ projects: await projects.list() });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects", async (request, response, next) => {
    try {
      const input = createLaunchProjectSchema.parse(request.body);
      const createdProject = await projects.create(input);
      events.publish({
        projectId: createdProject.id,
        agent: "orchestrator",
        level: "info",
        message: "Launch project created. Orchestrator is creating the initial workflow."
      });

      const plan = await orchestrator.planLaunch({
        projectId: createdProject.id,
        idea: createdProject.idea
      });
      const project = await projects.applyWorkflowPlan(createdProject.id, plan);

      events.publish({
        projectId: project.id,
        agent: "orchestrator",
        level: "success",
        message: "Initial launch workflow created with LangGraph orchestration."
      });
      response.status(201).json({ project });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/projects/:projectId", async (request, response, next) => {
    try {
      const project = await projects.findById(request.params.projectId);

      if (!project) {
        throw new ApiError(404, "Project not found.");
      }

      response.json({ project });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/orchestrate", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "orchestrator",
        level: "info",
        message: "Orchestrator refresh requested."
      });

      const plan = await orchestrator.planLaunch({
        projectId: existingProject.id,
        idea: existingProject.idea
      });
      const project = await projects.applyWorkflowPlan(existingProject.id, plan);

      events.publish({
        projectId: project.id,
        agent: "orchestrator",
        level: "success",
        message: "Launch workflow refreshed."
      });

      response.json({ project, plan });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/research/market", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "market_brand",
        level: "info",
        message: "Market & Brand Agent started SerpApi research."
      });

      const research = await marketBrand.research({
        projectId: existingProject.id,
        idea: existingProject.idea
      });
      const project = await projects.saveMarketResearch(existingProject.id, research);

      events.publish({
        projectId: project.id,
        agent: "market_brand",
        level: "success",
        message: `Market research complete. Brand direction created: ${research.brand.name}.`
      });

      response.json({ project, research });
    } catch (error) {
      if (error instanceof SerpApiConfigurationError) {
        next(new ApiError(424, error.message));
        return;
      }

      next(error);
    }
  });

  app.post("/api/projects/:projectId/research/domains", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "domain",
        level: "info",
        message: "Domain Agent started name.com availability search."
      });

      const research = await domain.research({
        projectId: existingProject.id,
        idea: existingProject.idea,
        ...(existingProject.marketResearch ? { marketResearch: existingProject.marketResearch } : {})
      });
      const project = await projects.saveDomainResearch(existingProject.id, research);

      events.publish({
        projectId: project.id,
        agent: "domain",
        level: "success",
        message: research.recommendedDomain
          ? `Domain research complete. Recommended ${research.recommendedDomain.domainName}.`
          : "Domain research complete. No purchasable recommendation found."
      });

      response.json({ project, research });
    } catch (error) {
      if (error instanceof NameComConfigurationError) {
        next(new ApiError(424, error.message));
        return;
      }

      next(error);
    }
  });

  app.post("/api/agentlatch/evaluate", async (request, response, next) => {
    try {
      const actionRequest = toolActionRequestSchema.parse(request.body);
      const decision = agentLatch.evaluate(actionRequest);

      events.publish({
        projectId: actionRequest.projectId,
        agent: "agentlatch",
        level: decision.executable ? "success" : "warning",
        message: `AgentLatch classified ${actionRequest.actionType} as ${decision.decision}.`
      });

      response.json({ decision });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/projects/:projectId/events", async (request, response, next) => {
    try {
      const project = await projects.findById(request.params.projectId);

      if (!project) {
        throw new ApiError(404, "Project not found.");
      }

      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Connection", "keep-alive");
      response.flushHeaders();

      for (const event of events.list(project.id)) {
        response.write(`event: agent-event\ndata: ${JSON.stringify(event)}\n\n`);
      }

      const unsubscribe = events.subscribe(project.id, (event) => {
        response.write(`event: agent-event\ndata: ${JSON.stringify(event)}\n\n`);
      });

      const heartbeat = setInterval(() => {
        response.write(": heartbeat\n\n");
      }, 30000);

      request.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
        response.end();
      });
    } catch (error) {
      next(error);
    }
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
