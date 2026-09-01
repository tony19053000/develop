import cors from "cors";
import express from "express";
import { z } from "zod";
import type { AgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { toolActionRequestSchema } from "@launchforge/agentlatch";
import type { BackendAgent, DomainAgent, MarketBrandAgent, OrchestratorRuntime, WebsiteProductAgent } from "@launchforge/agents";
import {
  HttpNameComClient,
  NameComConfigurationError,
  SerpApiConfigurationError,
  XanoConfigurationError,
  type XanoClient
} from "@launchforge/integrations";
import type { SecureExecutor } from "@launchforge/secure-executor";
import { backendArtifactSchema, createLaunchProjectSchema } from "@launchforge/shared";
import type { ApiConfig } from "./config.js";
import { DeploymentError, type DeploymentService } from "./deployments.js";
import { ApiError, errorHandler, notFound } from "./errors.js";
import { EventBus } from "./events.js";
import { ApprovalRepositoryError, type ApprovalRepository } from "./approvals.js";
import type { ProjectRepository } from "./storage.js";

const registerDomainPayloadSchema = z.object({
  domainName: z.string().min(1),
  years: z.number().int().min(1).max(10),
  price: z.number().nullable().optional()
});

export interface AppDependencies {
  config: ApiConfig;
  projects: ProjectRepository;
  events: EventBus;
  orchestrator: OrchestratorRuntime;
  marketBrand: MarketBrandAgent;
  domain: DomainAgent;
  websiteProduct: WebsiteProductAgent;
  backend: BackendAgent;
  createXanoClient: (apiKey: string) => XanoClient;
  agentLatch: AgentLatchPolicyEngine;
  approvals: ApprovalRepository;
  secureExecutor: SecureExecutor;
  deployments: DeploymentService;
}

export function createApp({
  config,
  projects,
  events,
  orchestrator,
  marketBrand,
  domain,
  websiteProduct,
  backend,
  createXanoClient,
  agentLatch,
  approvals,
  secureExecutor,
  deployments
}: AppDependencies) {
  const app = express();

  app.use(cors({ origin: config.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/deployments", express.static(deployments.publicRoot, { extensions: ["html"], index: "index.html" }));

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

  app.post("/api/projects/:projectId/website", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "website",
        level: "info",
        message: "Website/Product Agent started product site generation."
      });

      const artifact = await websiteProduct.generate({
        projectId: existingProject.id,
        idea: existingProject.idea,
        ...(existingProject.marketResearch ? { marketResearch: existingProject.marketResearch } : {}),
        ...(existingProject.domainResearch ? { domainResearch: existingProject.domainResearch } : {})
      });
      const project = await projects.saveWebsiteArtifact(existingProject.id, artifact);

      events.publish({
        projectId: project.id,
        agent: "website",
        level: artifact.validation.passed ? "success" : "warning",
        message: artifact.validation.passed
          ? `Website artifact generated and validated for ${artifact.productName}.`
          : `Website artifact generated for ${artifact.productName}, but validation needs review.`
      });

      response.json({ project, artifact });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/backend/plan", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "backend",
        level: "info",
        message: "Backend Agent started Xano backend planning."
      });

      const artifact = await backend.plan({
        projectId: existingProject.id,
        idea: existingProject.idea,
        ...(existingProject.marketResearch ? { marketResearch: existingProject.marketResearch } : {}),
        ...(existingProject.websiteArtifact ? { websiteArtifact: existingProject.websiteArtifact } : {})
      });
      const project = await projects.saveBackendArtifact(existingProject.id, artifact);

      events.publish({
        projectId: project.id,
        agent: "backend",
        level: "success",
        message: `Backend plan created for ${artifact.productName}. Xano provisioning requires approval.`
      });

      response.json({ project, artifact });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/deployments", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.websiteArtifact) {
        throw new ApiError(409, "Website artifact is required before deployment.");
      }

      events.publish({
        projectId: existingProject.id,
        agent: "deployment",
        level: "info",
        message: "Deployment System started local static deployment."
      });

      const deployment = await deployments.deployWebsite({
        projectId: existingProject.id,
        artifact: existingProject.websiteArtifact,
        baseUrl: `http://localhost:${config.API_PORT}`
      });
      const project = await projects.saveDeploymentRecord(existingProject.id, deployment);

      events.publish({
        projectId: project.id,
        agent: "deployment",
        level: deployment.status === "healthy" ? "success" : "error",
        message:
          deployment.status === "healthy"
            ? `Deployment healthy at ${deployment.url}.`
            : "Deployment completed with failing health checks."
      });

      response.json({ project, deployment });
    } catch (error) {
      if (error instanceof DeploymentError) {
        next(new ApiError(409, error.message));
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

  app.get("/api/approvals", async (_request, response, next) => {
    try {
      response.json({ approvals: await approvals.list() });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/approvals", async (request, response, next) => {
    try {
      const actionRequest = toolActionRequestSchema.parse(request.body);
      const decision = agentLatch.evaluate(actionRequest);

      if (!decision.requiresHumanApproval || decision.decision === "HUMAN_ONLY") {
        throw new ApiError(409, `AgentLatch decision ${decision.decision} cannot create a normal approval request.`);
      }

      const { approval, token } = await approvals.create({
        actionRequest,
        decision,
        webOrigin: config.WEB_ORIGIN,
        tokenSecret: config.APPROVAL_TOKEN_SECRET
      });
      const project = await projects.markApprovalPending(actionRequest.projectId);

      events.publish({
        projectId: actionRequest.projectId,
        agent: "agentlatch",
        level: "warning",
        message: `Approval required for ${actionRequest.actionType}. Workflow paused.`
      });

      response.status(201).json({ approval, token, project });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/approvals/:approvalId/approve", async (request, response, next) => {
    try {
      const token = parseApprovalToken(request.body);
      const approval = await approvals.approve(
        request.params.approvalId,
        token,
        config.APPROVAL_TOKEN_SECRET,
        parseDecidedBy(request.body)
      );
      const project = await projects.markApprovalResolved(approval.projectId, true);

      events.publish({
        projectId: approval.projectId,
        agent: "agentlatch",
        level: "success",
        message: `Approval granted for ${approval.actionRequest.actionType}. Workflow can resume.`
      });

      response.json({ approval, project });
    } catch (error) {
      next(mapApprovalError(error));
    }
  });

  app.post("/api/approvals/:approvalId/reject", async (request, response, next) => {
    try {
      const token = parseApprovalToken(request.body);
      const approval = await approvals.reject(
        request.params.approvalId,
        token,
        config.APPROVAL_TOKEN_SECRET,
        parseDecidedBy(request.body),
        typeof request.body?.reason === "string" ? request.body.reason : undefined
      );
      const project = await projects.markApprovalResolved(approval.projectId, false);

      events.publish({
        projectId: approval.projectId,
        agent: "agentlatch",
        level: "error",
        message: `Approval rejected for ${approval.actionRequest.actionType}. Workflow stopped.`
      });

      response.json({ approval, project });
    } catch (error) {
      next(mapApprovalError(error));
    }
  });

  app.post("/api/secure-executions/dry-run", async (request, response, next) => {
    try {
      const approvalId = parseApprovalId(request.body);
      const approval = await approvals.findById(approvalId);

      if (!approval) {
        throw new ApiError(404, "Approval not found.");
      }

      const receipt = await secureExecutor.execute({
        request: approval.actionRequest,
        approval: approval.decision,
        operation: async () => ({
          dryRun: true,
          protectedAction: approval.actionRequest.actionType,
          resource: approval.actionRequest.resource
        })
      });

      events.publish({
        projectId: approval.projectId,
        agent: "agentlatch",
        level: "success",
        message: `SecureExecutor dry-run completed for ${approval.actionRequest.actionType}.`
      });

      response.json({ receipt });
    } catch (error) {
      next(mapApprovalError(error));
    }
  });

  app.post("/api/secure-executions/namecom/register-domain", async (request, response, next) => {
    try {
      const approvalId = parseApprovalId(request.body);
      const approval = await approvals.findById(approvalId);

      if (!approval) {
        throw new ApiError(404, "Approval not found.");
      }

      if (approval.status !== "approved") {
        throw new ApiError(409, "Domain registration requires an approved action.");
      }

      if (approval.actionRequest.actionType !== "namecom.registerDomain") {
        throw new ApiError(409, "Approval is not for domain registration.");
      }

      const payload = registerDomainPayloadSchema.parse(approval.actionRequest.payload);
      const receipt = await secureExecutor.execute({
        request: approval.actionRequest,
        approval: approval.decision,
        operation: async (context) => {
          const nameCom = new HttpNameComClient({
            username: await context.getSecret("NAMECOM_USERNAME"),
            apiToken: await context.getSecret("NAMECOM_API_TOKEN"),
            baseUrl: config.NAMECOM_API_BASE_URL
          });
          const [availability] = await nameCom.checkAvailability({ domainNames: [payload.domainName] });

          if (!availability?.purchasable) {
            throw new ApiError(409, `Domain is no longer purchasable: ${payload.domainName}.`);
          }

          if (availability.premium || availability.purchaseType !== "registration") {
            throw new ApiError(409, "Phase 8 only permits standard non-premium registrations.");
          }

          const registeredDomain = await nameCom.registerDomain({
            domainName: payload.domainName,
            years: payload.years,
            idempotencyKey: approval.id
          });

          return {
            registered: true,
            domainName: registeredDomain.domainName,
            expireDate: registeredDomain.expireDate,
            autorenewEnabled: registeredDomain.autorenewEnabled,
            locked: registeredDomain.locked,
            privacyEnabled: registeredDomain.privacyEnabled,
            order: registeredDomain.order,
            totalPaid: registeredDomain.totalPaid
          };
        }
      });

      events.publish({
        projectId: approval.projectId,
        agent: "agentlatch",
        level: "success",
        message: `SecureExecutor registered ${payload.domainName} through name.com.`
      });

      response.json({ receipt });
    } catch (error) {
      next(mapApprovalError(error));
    }
  });

  app.post("/api/secure-executions/xano/provision-backend", async (request, response, next) => {
    try {
      const approvalId = parseApprovalId(request.body);
      const approval = await approvals.findById(approvalId);

      if (!approval) {
        throw new ApiError(404, "Approval not found.");
      }

      if (approval.status !== "approved") {
        throw new ApiError(409, "Xano provisioning requires an approved action.");
      }

      if (approval.actionRequest.actionType !== "xano.provisionBackend") {
        throw new ApiError(409, "Approval is not for Xano backend provisioning.");
      }

      const plannedArtifact = backendArtifactSchema.parse(approval.actionRequest.payload);
      const receipt = await secureExecutor.execute({
        request: approval.actionRequest,
        approval: approval.decision,
        operation: async (context) => {
          const xano = createXanoClient(await context.getSecret("XANO_API_KEY"));
          const provisioning = await xano.provisionBackend({
            productName: plannedArtifact.productName,
            apiGroupName: `${plannedArtifact.productName} API`,
            tables: plannedArtifact.tables,
            endpoints: plannedArtifact.endpoints
          });
          const provisionedArtifact = backendArtifactSchema.parse({
            ...plannedArtifact,
            mode: "provisioned",
            provisioning,
            updatedAt: new Date().toISOString()
          });

          await projects.saveBackendArtifact(approval.projectId, provisionedArtifact);

          return {
            provisioned: true,
            productName: provisionedArtifact.productName,
            workspaceId: provisioning.workspaceId,
            apiGroup: provisioning.apiGroup,
            tables: provisioning.tables,
            endpoints: provisioning.endpoints
          };
        }
      });

      events.publish({
        projectId: approval.projectId,
        agent: "backend",
        level: "success",
        message: `SecureExecutor provisioned Xano backend for ${plannedArtifact.productName}.`
      });

      response.json({ receipt });
    } catch (error) {
      if (error instanceof XanoConfigurationError) {
        next(new ApiError(424, error.message));
        return;
      }

      next(mapApprovalError(error));
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

function parseApprovalToken(body: unknown): string {
  if (typeof body === "object" && body !== null && "token" in body && typeof body.token === "string") {
    return body.token;
  }

  throw new ApiError(400, "Approval token is required.");
}

function parseDecidedBy(body: unknown): string {
  if (typeof body === "object" && body !== null && "decidedBy" in body && typeof body.decidedBy === "string") {
    return body.decidedBy;
  }

  return "founder";
}

function parseApprovalId(body: unknown): string {
  if (typeof body === "object" && body !== null && "approvalId" in body && typeof body.approvalId === "string") {
    return body.approvalId;
  }

  throw new ApiError(400, "Approval id is required.");
}

function mapApprovalError(error: unknown): unknown {
  if (error instanceof ApprovalRepositoryError) {
    return new ApiError(error.statusCode, error.message);
  }

  if (error instanceof Error && error.message.includes("Approval token")) {
    return new ApiError(403, error.message);
  }

  return error;
}
