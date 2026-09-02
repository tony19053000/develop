import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import { z } from "zod";
import type { AgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { toolActionRequestSchema } from "@launchforge/agentlatch";
import type { AgentLatchPolicyResult, ApprovalRequest, ToolActionRequest } from "@launchforge/agentlatch";
import type { SecureExecutionReceipt } from "@launchforge/secure-executor";
import type {
  BackendAgent,
  DocumentAgent,
  DomainAgent,
  MarketBrandAgent,
  OrchestratorRuntime,
  WebsiteProductAgent
} from "@launchforge/agents";
import {
  FoxitConfigurationError,
  HttpNameComClient,
  NameComConfigurationError,
  SerpApiConfigurationError,
  XanoConfigurationError,
  type FoxitClient,
  FoxitESignConfigurationError,
  FoxitESignRequestError,
  type FoxitESignClient,
  type XanoClient
} from "@launchforge/integrations";
import type { SecureExecutor } from "@launchforge/secure-executor";
import {
  backendArtifactSchema,
  auditEventTypeSchema,
  createLaunchProjectSchema,
  documentArtifactSchema,
  foxitESignPackageSchema,
  foxitESignStatusSchema
} from "@launchforge/shared";
import type { ApiConfig } from "./config.js";
import { DeploymentError, type DeploymentService } from "./deployments.js";
import { ApiError, errorHandler, notFound } from "./errors.js";
import { EventBus } from "./events.js";
import { ApprovalRepositoryError, type ApprovalRepository } from "./approvals.js";
import type { AuditRepository } from "./audit.js";
import type { ProjectRepository } from "./storage.js";

const registerDomainPayloadSchema = z.object({
  domainName: z.string().min(1),
  years: z.number().int().min(1).max(10),
  price: z.number().nullable().optional()
});

const foxitGeneratedDocumentsResultSchema = z.object({
  generated: z.literal(true),
  productName: z.string(),
  documents: z.array(
    z.object({
      sourceDocumentId: z.string(),
      foxitDocumentId: z.string(),
      downloadUrl: z.string().url().optional(),
      size: z.number().int().nonnegative().optional()
    })
  )
});

const updateESignStatusSchema = z.object({
  foxitEnvelopeId: z.string().min(1),
  status: foxitESignStatusSchema
});

const refreshESignStatusSchema = z.object({
  foxitEnvelopeId: z.string().min(1).optional()
});

type FullLaunchStatus = "completed" | "paused_for_approval" | "human_action_required";

interface FullLaunchStep {
  id: string;
  status: "complete" | "skipped" | "paused";
  message: string;
}

export interface AppDependencies {
  config: ApiConfig;
  projects: ProjectRepository;
  events: EventBus;
  audits: AuditRepository;
  orchestrator: OrchestratorRuntime;
  marketBrand: MarketBrandAgent;
  domain: DomainAgent;
  websiteProduct: WebsiteProductAgent;
  backend: BackendAgent;
  document: DocumentAgent;
  createXanoClient: (apiKey: string) => XanoClient;
  createFoxitClient: (credentials: { apiKey?: string; clientSecret?: string }) => FoxitClient;
  createFoxitESignClient: (clientSecret: string) => FoxitESignClient;
  agentLatch: AgentLatchPolicyEngine;
  approvals: ApprovalRepository;
  secureExecutor: SecureExecutor;
  deployments: DeploymentService;
}

export function createApp({
  config,
  projects,
  events,
  audits,
  orchestrator,
  marketBrand,
  domain,
  websiteProduct,
  backend,
  document,
  createXanoClient,
  createFoxitClient,
  createFoxitESignClient,
  agentLatch,
  approvals,
  secureExecutor,
  deployments
}: AppDependencies) {
  const app = express();
  const documentsRoot = path.join(config.DATA_DIR, "documents");
  const publishEvent = (input: Parameters<EventBus["publish"]>[0]) => {
    const event = events.publish(input);
    if (config.NODE_ENV !== "test") {
      void audits
        .record({
          projectId: input.projectId,
          type: "agent_event",
          severity: input.level,
          actor: input.agent,
          action: input.message,
          metadata: {
            eventId: event.id,
            level: event.level
          }
        })
        .catch(() => undefined);
    }

    return event;
  };
  const recordPolicyDecision = (request: ToolActionRequest, decision: AgentLatchPolicyResult) =>
    audits.record({
      projectId: request.projectId,
      type: "policy_decision",
      severity: decision.executable ? "success" : decision.decision === "DENY" ? "error" : "warning",
      actor: request.requestedBy,
      action: request.actionType,
      resource: request.resource,
      decision: decision.decision,
      metadata: {
        requestId: request.id,
        payloadHash: decision.payloadHash,
        category: decision.category,
        requiresHumanApproval: decision.requiresHumanApproval,
        executable: decision.executable
      }
    });
  const recordApprovalAudit = (approval: ApprovalRequest, action: string) =>
    audits.record({
      projectId: approval.projectId,
      type: action === "created" ? "approval_created" : "approval_decided",
      severity: approval.status === "rejected" ? "error" : approval.status === "approved" ? "success" : "warning",
      actor: approval.decidedBy ?? approval.actionRequest.requestedBy,
      action,
      resource: approval.actionRequest.resource,
      decision: approval.status,
      metadata: {
        approvalId: approval.id,
        actionType: approval.actionRequest.actionType,
        requestId: approval.actionRequest.id,
        payloadHash: approval.decision.payloadHash,
        tokenExpiresAt: approval.tokenExpiresAt
      }
    });
  const recordReceiptAudit = (receipt: SecureExecutionReceipt, projectId: string, resource?: string) =>
    audits.record({
      projectId,
      type: "secure_execution",
      severity: "success",
      actor: "secure-executor",
      action: receipt.actionType,
      ...(resource ? { resource } : {}),
      evidenceVerified: receipt.evidenceVerified,
      metadata: {
        receiptId: receipt.id,
        requestId: receipt.requestId,
        payloadHash: receipt.payloadHash,
        mode: receipt.mode,
        teeProvider: receipt.teeProvider,
        result: receipt.result
      }
    });

  app.use(cors({ origin: config.WEB_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/deployments", express.static(deployments.publicRoot, { extensions: ["html"], index: "index.html" }));
  app.use("/documents", express.static(documentsRoot));

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

  app.get("/api/audit-events", async (request, response, next) => {
    try {
      const projectId = typeof request.query.projectId === "string" ? request.query.projectId : undefined;
      const type = typeof request.query.type === "string" ? auditEventTypeSchema.parse(request.query.type) : undefined;
      const limit =
        typeof request.query.limit === "string" && request.query.limit.trim()
          ? Number.parseInt(request.query.limit, 10)
          : undefined;

      response.json({
        auditEvents: await audits.list({
          ...(projectId ? { projectId } : {}),
          ...(type ? { type } : {}),
          ...(limit ? { limit } : {})
        })
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects", async (request, response, next) => {
    try {
      const input = createLaunchProjectSchema.parse(request.body);
      const createdProject = await projects.create(input);
      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

  app.post("/api/projects/:projectId/orchestrate/full", async (request, response, next) => {
    const steps: FullLaunchStep[] = [];
    const createdApprovals: ApprovalRequest[] = [];
    const receipts: SecureExecutionReceipt[] = [];

    try {
      let project = await projects.findById(request.params.projectId);

      if (!project) {
        throw new ApiError(404, "Project not found.");
      }

      publishEvent({
        projectId: project.id,
        agent: "orchestrator",
        level: "info",
        message: "Full multi-agent orchestration started."
      });

      if (!project.marketResearch) {
        const research = await marketBrand.research({
          projectId: project.id,
          idea: project.idea
        });
        project = await projects.saveMarketResearch(project.id, research);
        steps.push({ id: "market-research", status: "complete", message: `Brand direction created: ${research.brand.name}.` });
        publishEvent({
          projectId: project.id,
          agent: "market_brand",
          level: "success",
          message: `Full orchestration completed Market & Brand for ${research.brand.name}.`
        });
      } else {
        steps.push({ id: "market-research", status: "skipped", message: "Existing market research reused." });
      }

      if (!project.domainResearch) {
        const research = await domain.research({
          projectId: project.id,
          idea: project.idea,
          ...(project.marketResearch ? { marketResearch: project.marketResearch } : {})
        });
        project = await projects.saveDomainResearch(project.id, research);
        steps.push({
          id: "domain-research",
          status: "complete",
          message: research.recommendedDomain
            ? `Recommended domain ${research.recommendedDomain.domainName}.`
            : "Domain research completed without a purchasable recommendation."
        });
        publishEvent({
          projectId: project.id,
          agent: "domain",
          level: "success",
          message: "Full orchestration completed domain research."
        });
      } else {
        steps.push({ id: "domain-research", status: "skipped", message: "Existing domain research reused." });
      }

      if (!project.websiteArtifact) {
        const artifact = await websiteProduct.generate({
          projectId: project.id,
          idea: project.idea,
          ...(project.marketResearch ? { marketResearch: project.marketResearch } : {}),
          ...(project.domainResearch ? { domainResearch: project.domainResearch } : {})
        });
        project = await projects.saveWebsiteArtifact(project.id, artifact);
        steps.push({ id: "website-foundation", status: "complete", message: `Website generated for ${artifact.productName}.` });
        publishEvent({
          projectId: project.id,
          agent: "website",
          level: "success",
          message: "Full orchestration generated the product website."
        });
      } else {
        steps.push({ id: "website-foundation", status: "skipped", message: "Existing website artifact reused." });
      }

      if (!project.backendArtifact) {
        const artifact = await backend.plan({
          projectId: project.id,
          idea: project.idea,
          ...(project.marketResearch ? { marketResearch: project.marketResearch } : {}),
          ...(project.websiteArtifact ? { websiteArtifact: project.websiteArtifact } : {})
        });
        project = await projects.saveBackendArtifact(project.id, artifact);
        steps.push({ id: "backend-foundation", status: "complete", message: `Backend plan created for ${artifact.productName}.` });
      } else {
        steps.push({ id: "backend-foundation", status: "skipped", message: "Existing backend artifact reused." });
      }

      const backendArtifact = project.backendArtifact;

      if (!backendArtifact) {
        throw new ApiError(409, "Backend artifact is required before Xano provisioning.");
      }

      if (backendArtifact.mode !== "provisioned") {
        const actionRequest = toolActionRequestSchema.parse({
          projectId: project.id,
          requestedBy: "backend",
          actionType: "xano.provisionBackend",
          resource: `${backendArtifact.productName} API`,
          payload: backendArtifact,
          reason: `Approve Xano backend provisioning for ${backendArtifact.productName}.`
        });
        const decision = agentLatch.evaluate(actionRequest);
        await recordPolicyDecision(actionRequest, decision);
        const projectId = project.id;
        const existingApproval = (await approvals.list(projectId)).find(
          (approval) =>
            approval.projectId === projectId &&
            approval.actionRequest.actionType === "xano.provisionBackend" &&
            approval.status !== "rejected"
        );

        if (!existingApproval) {
          const { approval } = await approvals.create({
            actionRequest,
            decision,
            webOrigin: config.WEB_ORIGIN,
            tokenSecret: config.APPROVAL_TOKEN_SECRET
          });
          createdApprovals.push(approval);
          await recordApprovalAudit(approval, "created");
          project = await projects.markApprovalPending(project.id);
          steps.push({
            id: "xano-provisioning",
            status: "paused",
            message: "Xano provisioning approval was created. Full orchestration will resume after approval."
          });
          publishEvent({
            projectId: project.id,
            agent: "agentlatch",
            level: "warning",
            message: "Full orchestration paused for Xano backend provisioning approval."
          });
          response.status(202).json({
            project,
            status: "paused_for_approval" satisfies FullLaunchStatus,
            steps,
            approvals: createdApprovals,
            receipts
          });
          return;
        }

        if (existingApproval.status === "pending") {
          project = await projects.markApprovalPending(project.id);
          steps.push({
            id: "xano-provisioning",
            status: "paused",
            message: "Waiting for existing Xano provisioning approval."
          });
          response.status(202).json({
            project,
            status: "paused_for_approval" satisfies FullLaunchStatus,
            steps,
            approvals: [existingApproval],
            receipts
          });
          return;
        }

        if (existingApproval.status !== "approved") {
          throw new ApiError(409, `Xano provisioning approval is ${existingApproval.status}.`);
        }

        const plannedArtifact = backendArtifactSchema.parse(existingApproval.actionRequest.payload);
        const receipt = await secureExecutor.execute({
          request: existingApproval.actionRequest,
          approval: existingApproval.decision,
          operation: async (context) => {
            const xano = createXanoClient(await context.getSecret("XANO_API_KEY"));
            const provisioning = await xano.provisionBackend({
              productName: plannedArtifact.productName,
              apiGroupName: `${plannedArtifact.productName}-${projectId.slice(0, 8)} API`,
              tables: plannedArtifact.tables.map((t) => ({
                ...t,
                name: `${t.name}_${projectId.slice(0, 8)}`
              })),
              endpoints: plannedArtifact.endpoints
            });
            const provisionedArtifact = backendArtifactSchema.parse({
              ...plannedArtifact,
              mode: "provisioned",
              provisioning,
              updatedAt: new Date().toISOString()
            });

            await projects.saveBackendArtifact(projectId, provisionedArtifact);

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
        receipts.push(receipt);
        await recordReceiptAudit(receipt, project.id, `${plannedArtifact.productName} API`);
        project = (await projects.findById(project.id)) ?? project;
        steps.push({ id: "xano-provisioning", status: "complete", message: "Approved Xano backend provisioning executed." });
      } else {
        steps.push({ id: "xano-provisioning", status: "skipped", message: "Existing provisioned backend reused." });
      }

      if (!project.deploymentRecord || project.deploymentRecord.status !== "healthy") {
        if (!project.websiteArtifact) {
          throw new ApiError(409, "Website artifact is required before deployment.");
        }

        const deployment = await deployments.deployWebsite({
          projectId: project.id,
          artifact: project.websiteArtifact,
          baseUrl: `http://localhost:${config.API_PORT}`
        });
        project = await projects.saveDeploymentRecord(project.id, deployment);
        steps.push({ id: "deployment-system", status: "complete", message: `Deployment healthy at ${deployment.url}.` });
      } else {
        steps.push({ id: "deployment-system", status: "skipped", message: "Existing healthy deployment reused." });
      }

      if (!project.documentArtifact || project.documentArtifact.status !== "generated") {
        const preparedArtifact = await document.prepare({
          projectId: project.id,
          idea: project.idea,
          ...(project.marketResearch ? { marketResearch: project.marketResearch } : {}),
          ...(project.domainResearch ? { domainResearch: project.domainResearch } : {}),
          ...(project.websiteArtifact ? { websiteArtifact: project.websiteArtifact } : {}),
          ...(project.backendArtifact ? { backendArtifact: project.backendArtifact } : {}),
          ...(project.deploymentRecord ? { deploymentRecord: project.deploymentRecord } : {})
        });

        if (!preparedArtifact.validation.passed) {
          throw new ApiError(409, "Prepared documents failed validation.");
        }

        const actionRequest = toolActionRequestSchema.parse({
          projectId: project.id,
          requestedBy: "document",
          actionType: "foxit.generateDocument",
          resource: `${preparedArtifact.productName} founder documents`,
          payload: preparedArtifact,
          reason: `Generate founder business PDF documents for ${preparedArtifact.productName}.`
        });
        const decision = agentLatch.evaluate(actionRequest);
        await recordPolicyDecision(actionRequest, decision);
        const receipt = await secureExecutor.execute({
          request: actionRequest,
          approval: decision,
          operation: async (context) => {
            const foxit = createFoxitClient({
              ...(config.FOXIT_API_KEY ? { apiKey: await context.getSecret("FOXIT_API_KEY") } : {}),
              ...(config.FOXIT_CLIENT_SECRET ? { clientSecret: await context.getSecret("FOXIT_CLIENT_SECRET") } : {})
            });
            const generatedDocuments = [];

            for (const sourceDocument of preparedArtifact.documents) {
              const generated = await foxit.generateDocument({
                title: sourceDocument.title,
                fileName: sourceDocument.fileName,
                markdown: sourceDocument.markdown,
                templateKey: sourceDocument.type,
                data: {
                  projectId: preparedArtifact.projectId,
                  productName: preparedArtifact.productName,
                  documentType: sourceDocument.type
                }
              });
              const storedDownloadUrl = generated.base64FileString
                ? await storeGeneratedPdf({
                    documentsRoot,
                    projectId: preparedArtifact.projectId,
                    fileName: sourceDocument.fileName,
                    base64FileString: generated.base64FileString,
                    baseUrl: `http://localhost:${config.API_PORT}`
                  })
                : generated.downloadUrl;
              generatedDocuments.push({
                sourceDocumentId: sourceDocument.id,
                foxitDocumentId: generated.id,
                ...(storedDownloadUrl ? { downloadUrl: storedDownloadUrl } : {}),
                size: generated.size ?? Buffer.byteLength(generated.base64FileString ?? "", "base64")
              });
            }

            return {
              generated: true,
              productName: preparedArtifact.productName,
              documents: generatedDocuments
            };
          }
        });
        receipts.push(receipt);
        await recordReceiptAudit(receipt, project.id, `${preparedArtifact.productName} founder documents`);
        const generationResult = foxitGeneratedDocumentsResultSchema.parse(receipt.result);
        const generatedArtifact = documentArtifactSchema.parse({
          ...preparedArtifact,
          status: "generated",
          receiptId: receipt.id,
          documents: preparedArtifact.documents.map((sourceDocument) => {
            const generated = generationResult.documents.find((item) => item.sourceDocumentId === sourceDocument.id);
            return {
              ...sourceDocument,
              ...(generated ? { foxitDocumentId: generated.foxitDocumentId } : {}),
              ...(generated?.downloadUrl ? { downloadUrl: generated.downloadUrl } : {}),
              ...(generated?.size !== undefined ? { size: generated.size } : {})
            };
          }),
          updatedAt: new Date().toISOString()
        });
        project = await projects.saveDocumentArtifact(project.id, generatedArtifact);
        steps.push({ id: "document-foundation", status: "complete", message: "Founder documents generated through Foxit." });
      } else {
        steps.push({ id: "document-foundation", status: "skipped", message: "Existing generated documents reused." });
      }

      if (!project.foxitESignPackage) {
        const generatedDocuments = project.documentArtifact?.documents.filter((sourceDocument) => sourceDocument.downloadUrl) ?? [];

        if (generatedDocuments.length === 0 || !project.documentArtifact) {
          throw new ApiError(409, "Generated PDF download URLs are required before eSign preparation.");
        }

        const now = new Date().toISOString();
        const esignPackage = foxitESignPackageSchema.parse({
          id: randomUUID(),
          projectId: project.id,
          productName: project.documentArtifact.productName,
          status: "human_action_required",
          humanOnly: true,
          documents: generatedDocuments.map((sourceDocument) => ({
            documentId: sourceDocument.id,
            title: sourceDocument.title,
            fileName: sourceDocument.fileName,
            downloadUrl: sourceDocument.downloadUrl
          })),
          signer: {
            role: "Founder",
            permission: "FILL_FIELDS_AND_SIGN"
          },
          auditNote:
            "AI prepared Foxit eSign materials only. Sending, signing, and signer identity confirmation remain human-only.",
          preparedAt: now,
          updatedAt: now
        });
        project = await projects.saveFoxitESignPackage(project.id, esignPackage);
        steps.push({ id: "esign-preparation", status: "complete", message: "Foxit eSign package prepared for human action." });
      } else {
        steps.push({ id: "esign-preparation", status: "skipped", message: "Existing eSign package reused." });
      }

      publishEvent({
        projectId: project.id,
        agent: "orchestrator",
        level: "success",
        message: "Full multi-agent orchestration reached the human eSign boundary."
      });

      response.json({
        project,
        status: "human_action_required" satisfies FullLaunchStatus,
        steps,
        approvals: createdApprovals,
        receipts
      });
    } catch (error) {
      if (
        error instanceof SerpApiConfigurationError ||
        error instanceof NameComConfigurationError ||
        error instanceof XanoConfigurationError ||
        error instanceof FoxitConfigurationError ||
        (error instanceof Error && error.message.includes("FOXIT_"))
      ) {
        next(new ApiError(424, error.message));
        return;
      }

      next(mapApprovalError(error));
    }
  });

  app.post("/api/projects/:projectId/research/market", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

      publishEvent({
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

  app.post("/api/projects/:projectId/documents", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      publishEvent({
        projectId: existingProject.id,
        agent: "document",
        level: "info",
        message: "Document Agent prepared founder documents for Foxit generation."
      });

      const preparedArtifact = await document.prepare({
        projectId: existingProject.id,
        idea: existingProject.idea,
        ...(existingProject.marketResearch ? { marketResearch: existingProject.marketResearch } : {}),
        ...(existingProject.domainResearch ? { domainResearch: existingProject.domainResearch } : {}),
        ...(existingProject.websiteArtifact ? { websiteArtifact: existingProject.websiteArtifact } : {}),
        ...(existingProject.backendArtifact ? { backendArtifact: existingProject.backendArtifact } : {}),
        ...(existingProject.deploymentRecord ? { deploymentRecord: existingProject.deploymentRecord } : {})
      });

      if (!preparedArtifact.validation.passed) {
        throw new ApiError(409, "Prepared documents failed validation.");
      }

      const actionRequest = toolActionRequestSchema.parse({
        projectId: existingProject.id,
        requestedBy: "document",
        actionType: "foxit.generateDocument",
        resource: `${preparedArtifact.productName} founder documents`,
        payload: preparedArtifact,
        reason: `Generate founder business PDF documents for ${preparedArtifact.productName}.`
      });
      const decision = agentLatch.evaluate(actionRequest);
      await recordPolicyDecision(actionRequest, decision);
      const receipt = await secureExecutor.execute({
        request: actionRequest,
        approval: decision,
        operation: async (context) => {
          const foxit = createFoxitClient({
            ...(config.FOXIT_API_KEY ? { apiKey: await context.getSecret("FOXIT_API_KEY") } : {}),
            ...(config.FOXIT_CLIENT_SECRET ? { clientSecret: await context.getSecret("FOXIT_CLIENT_SECRET") } : {})
          });
          const generatedDocuments = [];

          for (const sourceDocument of preparedArtifact.documents) {
            const generated = await foxit.generateDocument({
              title: sourceDocument.title,
              fileName: sourceDocument.fileName,
              markdown: sourceDocument.markdown,
              templateKey: sourceDocument.type,
              data: {
                projectId: preparedArtifact.projectId,
                productName: preparedArtifact.productName,
                documentType: sourceDocument.type
              }
            });
            const storedDownloadUrl = generated.base64FileString
              ? await storeGeneratedPdf({
                  documentsRoot,
                  projectId: preparedArtifact.projectId,
                  fileName: sourceDocument.fileName,
                  base64FileString: generated.base64FileString,
                  baseUrl: `http://localhost:${config.API_PORT}`
                })
              : generated.downloadUrl;
            generatedDocuments.push({
              sourceDocumentId: sourceDocument.id,
              foxitDocumentId: generated.id,
              ...(storedDownloadUrl ? { downloadUrl: storedDownloadUrl } : {}),
              size: generated.size ?? Buffer.byteLength(generated.base64FileString ?? "", "base64")
            });
          }

          return {
            generated: true,
            productName: preparedArtifact.productName,
            documents: generatedDocuments
          };
        }
      });
      await recordReceiptAudit(receipt, existingProject.id, `${preparedArtifact.productName} founder documents`);
      const generationResult = foxitGeneratedDocumentsResultSchema.parse(receipt.result);
      const generatedArtifact = documentArtifactSchema.parse({
        ...preparedArtifact,
        status: "generated",
        receiptId: receipt.id,
        documents: preparedArtifact.documents.map((sourceDocument) => {
          const generated = generationResult.documents.find((item) => item.sourceDocumentId === sourceDocument.id);
          return {
            ...sourceDocument,
            ...(generated ? { foxitDocumentId: generated.foxitDocumentId } : {}),
            ...(generated?.downloadUrl ? { downloadUrl: generated.downloadUrl } : {}),
            ...(generated?.size !== undefined ? { size: generated.size } : {})
          };
        }),
        updatedAt: new Date().toISOString()
      });
      const project = await projects.saveDocumentArtifact(existingProject.id, generatedArtifact);

      publishEvent({
        projectId: project.id,
        agent: "document",
        level: "success",
        message: `Foxit generated ${generatedArtifact.documents.length} founder documents for ${generatedArtifact.productName}.`
      });

      response.json({ project, artifact: generatedArtifact, receipt });
    } catch (error) {
      if (error instanceof FoxitConfigurationError || (error instanceof Error && error.message.includes("FOXIT_"))) {
        next(new ApiError(424, error.message));
        return;
      }

      next(mapApprovalError(error));
    }
  });

  app.post("/api/projects/:projectId/esign/prepare", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.documentArtifact || existingProject.documentArtifact.status !== "generated") {
        throw new ApiError(409, "Generated Foxit documents are required before eSign preparation.");
      }

      const generatedDocuments = existingProject.documentArtifact.documents.filter((document) => document.downloadUrl);

      if (generatedDocuments.length === 0) {
        throw new ApiError(409, "At least one generated PDF download URL is required for eSign preparation.");
      }

      const now = new Date().toISOString();
      const esignPackage = foxitESignPackageSchema.parse({
        id: randomUUID(),
        projectId: existingProject.id,
        productName: existingProject.documentArtifact.productName,
        status: "human_action_required",
        humanOnly: true,
        documents: generatedDocuments.map((document) => ({
          documentId: document.id,
          title: document.title,
          fileName: document.fileName,
          downloadUrl: document.downloadUrl
        })),
        signer: {
          role: "Founder",
          permission: "FILL_FIELDS_AND_SIGN"
        },
        auditNote:
          "AI prepared Foxit eSign materials only. Sending, signing, and signer identity confirmation remain human-only.",
        preparedAt: now,
        updatedAt: now
      });
      const project = await projects.saveFoxitESignPackage(existingProject.id, esignPackage);

      publishEvent({
        projectId: project.id,
        agent: "document",
        level: "warning",
        message: "Foxit eSign package prepared. Human action is required before any envelope can be sent."
      });

      response.json({ project, esignPackage });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/esign/send-attempt", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.foxitESignPackage) {
        throw new ApiError(409, "Foxit eSign package is required before send evaluation.");
      }

      const actionRequest = toolActionRequestSchema.parse({
        projectId: existingProject.id,
        requestedBy: "document",
        actionType: "foxit.sendForSignature",
        resource: `${existingProject.foxitESignPackage.productName} eSign envelope`,
        payload: existingProject.foxitESignPackage,
        reason: "Attempt to send a Foxit eSign envelope for signature."
      });
      const decision = agentLatch.evaluate(actionRequest);
      await recordPolicyDecision(actionRequest, decision);

      publishEvent({
        projectId: existingProject.id,
        agent: "agentlatch",
        level: "warning",
        message: `AgentLatch blocked ${actionRequest.actionType} as ${decision.decision}.`
      });

      response.status(409).json({
        error: "Foxit eSign send is human-only and cannot be executed by the AI agent.",
        decision
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/esign/envelope", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.foxitESignPackage) {
        throw new ApiError(409, "Foxit eSign package is required before envelope creation.");
      }

      const currentESignPackage = existingProject.foxitESignPackage;
      const signerEmail = currentESignPackage.signer.email ?? "aayush19053000@gmail.com";
      const selectedDocuments = currentESignPackage.documents.slice(0, 1);
      const documents = await Promise.all(
        selectedDocuments.map(async (document) => ({
          fileName: document.fileName,
          pdfBase64: (await readPreparedPdf({
            documentsRoot,
            projectId: existingProject.id,
            downloadUrl: document.downloadUrl
          })).toString("base64")
        }))
      );
      const actionRequest = toolActionRequestSchema.parse({
        projectId: existingProject.id,
        requestedBy: "document",
        actionType: "foxit.createESignEnvelope",
        resource: `${currentESignPackage.productName} eSign draft envelope`,
        payload: {
          documents: selectedDocuments.map((document) => ({
            documentId: document.documentId,
            fileName: document.fileName
          })),
          signerEmail,
          sendNow: false,
          createEmbeddedSendingSession: true
        },
        reason: "Create a Foxit eSign draft envelope and embedded human preparation session without sending or signing."
      });
      const decision = agentLatch.evaluate(actionRequest);
      await recordPolicyDecision(actionRequest, decision);
      const receipt = await secureExecutor.execute({
        request: actionRequest,
        approval: decision,
        operation: async (context) => {
          const secretName = config.FOXIT_ESIGN_CLIENT_SECRET ? "FOXIT_ESIGN_CLIENT_SECRET" : "FOXIT_CLIENT_SECRET";
          const foxitESign = createFoxitESignClient(await context.getSecret(secretName));
          const created = await foxitESign.createEnvelope({
            folderName: `${currentESignPackage.productName} Founder Signature Package`,
            signer: {
              firstName: "Aayush",
              lastName: "Kumar",
              emailId: signerEmail,
              permission: "FILL_FIELDS_AND_SIGN"
            },
            documents,
            sendNow: false,
            createEmbeddedSendingSession: true
          });
          return {
            created: true,
            foxitEnvelopeId: created.envelopeId,
            status: created.status,
            embeddedSessionUrl: created.embeddedSessionUrl
          };
        }
      });
      await recordReceiptAudit(receipt, existingProject.id, `${currentESignPackage.productName} eSign draft envelope`);
      const esignPackage = foxitESignPackageSchema.parse({
        ...currentESignPackage,
        signer: {
          ...currentESignPackage.signer,
          email: signerEmail
        },
        foxitEnvelopeId: String(receipt.result.foxitEnvelopeId),
        ...(typeof receipt.result.embeddedSessionUrl === "string"
          ? { foxitEmbeddedSessionUrl: receipt.result.embeddedSessionUrl }
          : {}),
        status: "human_action_required",
        updatedAt: new Date().toISOString()
      });
      const project = await projects.saveFoxitESignPackage(existingProject.id, esignPackage);

      publishEvent({
        projectId: project.id,
        agent: "document",
        level: "warning",
        message: `Foxit eSign draft envelope ${esignPackage.foxitEnvelopeId} created. Human preparation/signing remains required.`
      });

      response.json({ project, esignPackage, receipt });
    } catch (error) {
      if (
        error instanceof FoxitESignConfigurationError ||
        error instanceof FoxitESignRequestError ||
        (error instanceof Error && error.message.includes("FOXIT_"))
      ) {
        next(new ApiError(424, error.message));
        return;
      }

      next(mapApprovalError(error));
    }
  });

  app.patch("/api/projects/:projectId/esign/status", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.foxitESignPackage) {
        throw new ApiError(409, "Foxit eSign package is required before status updates.");
      }

      const input = updateESignStatusSchema.parse(request.body);
      const esignPackage = foxitESignPackageSchema.parse({
        ...existingProject.foxitESignPackage,
        foxitEnvelopeId: input.foxitEnvelopeId,
        status: input.status,
        updatedAt: new Date().toISOString()
      });
      const project = await projects.saveFoxitESignPackage(existingProject.id, esignPackage);
      await audits.record({
        projectId: project.id,
        type: "security_boundary",
        severity: input.status === "executed" ? "success" : "info",
        actor: "document",
        action: "foxit.esign.status.recorded",
        resource: input.foxitEnvelopeId,
        decision: input.status,
        metadata: {
          humanOnly: esignPackage.humanOnly
        }
      });

      publishEvent({
        projectId: project.id,
        agent: "document",
        level: input.status === "executed" ? "success" : "info",
        message: `Foxit eSign envelope ${input.foxitEnvelopeId} status recorded as ${input.status}.`
      });

      response.json({ project, esignPackage });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/projects/:projectId/esign/status/refresh", async (request, response, next) => {
    try {
      const existingProject = await projects.findById(request.params.projectId);

      if (!existingProject) {
        throw new ApiError(404, "Project not found.");
      }

      if (!existingProject.foxitESignPackage) {
        throw new ApiError(409, "Foxit eSign package is required before status refresh.");
      }

      const input = refreshESignStatusSchema.parse(request.body ?? {});
      const envelopeId = input.foxitEnvelopeId ?? existingProject.foxitESignPackage.foxitEnvelopeId;

      if (!envelopeId) {
        throw new ApiError(409, "Foxit envelope id is required before status refresh.");
      }

      const actionRequest = toolActionRequestSchema.parse({
        projectId: existingProject.id,
        requestedBy: "document",
        actionType: "foxit.getEnvelopeStatus",
        resource: envelopeId,
        payload: { foxitEnvelopeId: envelopeId },
        reason: "Refresh read-only Foxit eSign envelope status."
      });
      const decision = agentLatch.evaluate(actionRequest);
      await recordPolicyDecision(actionRequest, decision);
      const receipt = await secureExecutor.execute({
        request: actionRequest,
        approval: decision,
        operation: async (context) => {
          const secretName = config.FOXIT_ESIGN_CLIENT_SECRET ? "FOXIT_ESIGN_CLIENT_SECRET" : "FOXIT_CLIENT_SECRET";
          const foxitESign = createFoxitESignClient(await context.getSecret(secretName));
          const status = await foxitESign.getEnvelopeStatus(envelopeId);
          return {
            refreshed: true,
            foxitEnvelopeId: status.envelopeId,
            status: status.status
          };
        }
      });
      await recordReceiptAudit(receipt, existingProject.id, envelopeId);
      const rawStatus = typeof receipt.result.status === "string" ? receipt.result.status : "shared";
      const mappedStatus = mapFoxitESignStatus(rawStatus);
      const esignPackage = foxitESignPackageSchema.parse({
        ...existingProject.foxitESignPackage,
        foxitEnvelopeId: String(receipt.result.foxitEnvelopeId ?? envelopeId),
        status: mappedStatus,
        updatedAt: new Date().toISOString()
      });
      const project = await projects.saveFoxitESignPackage(existingProject.id, esignPackage);

      publishEvent({
        projectId: project.id,
        agent: "document",
        level: "info",
        message: `Foxit eSign status refreshed as ${mappedStatus}.`
      });

      response.json({ project, esignPackage, receipt });
    } catch (error) {
      if (
        error instanceof FoxitESignConfigurationError ||
        error instanceof FoxitESignRequestError ||
        (error instanceof Error && error.message.includes("FOXIT_"))
      ) {
        next(new ApiError(424, error.message));
        return;
      }

      next(mapApprovalError(error));
    }
  });

  app.post("/api/agentlatch/evaluate", async (request, response, next) => {
    try {
      const actionRequest = toolActionRequestSchema.parse(request.body);
      const decision = agentLatch.evaluate(actionRequest);
      await recordPolicyDecision(actionRequest, decision);

      publishEvent({
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
      await recordPolicyDecision(actionRequest, decision);

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
      await recordApprovalAudit(approval, "created");

      publishEvent({
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
      await recordApprovalAudit(approval, "approved");

      publishEvent({
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
      await recordApprovalAudit(approval, "rejected");

      publishEvent({
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
      await recordReceiptAudit(receipt, approval.projectId, approval.actionRequest.resource);

      publishEvent({
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
      await recordReceiptAudit(receipt, approval.projectId, payload.domainName);

      publishEvent({
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
      await recordReceiptAudit(receipt, approval.projectId, `${plannedArtifact.productName} API`);

      publishEvent({
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

async function storeGeneratedPdf({
  documentsRoot,
  projectId,
  fileName,
  base64FileString,
  baseUrl
}: {
  documentsRoot: string;
  projectId: string;
  fileName: string;
  base64FileString: string;
  baseUrl: string;
}): Promise<string> {
  const safeFileName = path.basename(fileName);
  const projectDir = path.join(documentsRoot, projectId);
  const outputPath = path.join(projectDir, safeFileName);
  const normalizedRoot = path.resolve(documentsRoot);
  const normalizedOutput = path.resolve(outputPath);

  if (!normalizedOutput.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new ApiError(400, "Document path is invalid.");
  }

  const pdfBytes = Buffer.from(base64FileString, "base64");

  if (pdfBytes.subarray(0, 5).toString("utf8") !== "%PDF-") {
    throw new ApiError(502, "Foxit response did not contain a valid PDF.");
  }

  await mkdir(projectDir, { recursive: true });
  await writeFile(outputPath, pdfBytes);

  return `${baseUrl}/documents/${encodeURIComponent(projectId)}/${encodeURIComponent(safeFileName)}`;
}

async function readPreparedPdf({
  documentsRoot,
  projectId,
  downloadUrl
}: {
  documentsRoot: string;
  projectId: string;
  downloadUrl: string;
}): Promise<Buffer> {
  const parsedUrl = new URL(downloadUrl);
  const prefix = `/documents/${projectId}/`;
  const documentPathIndex = parsedUrl.pathname.indexOf(prefix);

  if (documentPathIndex === -1) {
    throw new ApiError(400, "Document download URL is outside the project document store.");
  }

  const fileName = decodeURIComponent(parsedUrl.pathname.slice(documentPathIndex + prefix.length));
  const filePath = path.join(documentsRoot, projectId, fileName);
  const normalizedRoot = path.resolve(documentsRoot, projectId);
  const normalizedPath = path.resolve(filePath);

  if (!normalizedPath.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new ApiError(400, "Document path is invalid.");
  }

  return readFile(normalizedPath);
}

function mapFoxitESignStatus(status: string) {
  const normalized = status.toLowerCase().replace(/[\s-]+/g, "_");

  if (normalized === "draft" || normalized === "prepared") {
    return "human_action_required";
  }

  if (normalized === "shared" || normalized === "partially_signed") {
    return "shared";
  }

  if (normalized === "completed" || normalized === "folder_completed") {
    return "completed";
  }

  if (normalized === "executed" || normalized === "folder_executed") {
    return "executed";
  }

  return foxitESignStatusSchema.catch("shared").parse(normalized);
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
