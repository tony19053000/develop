import type { ApprovalRequest } from "@launchforge/agentlatch";
import type { SecureExecutionReceipt } from "@launchforge/secure-executor";
import type {
  CreateLaunchProjectInput,
  AuditEvent,
  BackendArtifact,
  DeploymentRecord,
  DocumentArtifact,
  FoxitESignPackage,
  DomainResearch,
  LaunchProject,
  MarketResearch,
  WebsiteArtifact
} from "@launchforge/shared";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

interface ProjectListResponse {
  projects: LaunchProject[];
}

interface ProjectResponse {
  project: LaunchProject;
}

interface MarketResearchResponse {
  project: LaunchProject;
  research: MarketResearch;
}

interface DomainResearchResponse {
  project: LaunchProject;
  research: DomainResearch;
}

interface WebsiteArtifactResponse {
  project: LaunchProject;
  artifact: WebsiteArtifact;
}

interface BackendArtifactResponse {
  project: LaunchProject;
  artifact: BackendArtifact;
}

interface DeploymentResponse {
  project: LaunchProject;
  deployment: DeploymentRecord;
}

interface DocumentArtifactResponse {
  project: LaunchProject;
  artifact: DocumentArtifact;
  receipt: SecureExecutionReceipt;
}

interface ESignPackageResponse {
  project: LaunchProject;
  esignPackage: FoxitESignPackage;
  receipt?: SecureExecutionReceipt;
}

interface HumanOnlyDecisionResponse {
  error: string;
  decision: ApprovalRequest["decision"];
}

interface ApprovalListResponse {
  approvals: ApprovalRequest[];
}

interface AuditEventListResponse {
  auditEvents: AuditEvent[];
}

interface ApprovalResponse {
  approval: ApprovalRequest;
  token?: string;
  project: LaunchProject;
}

interface SecureExecutionResponse {
  receipt: SecureExecutionReceipt;
}

interface FullOrchestrationResponse {
  project: LaunchProject;
  status: "completed" | "paused_for_approval" | "human_action_required";
  steps: Array<{
    id: string;
    status: "complete" | "skipped" | "paused";
    message: string;
  }>;
  approvals: ApprovalRequest[];
  receipts: SecureExecutionReceipt[];
}

export async function listProjects(): Promise<LaunchProject[]> {
  const response = await fetch(`${API_BASE_URL}/api/projects`);
  const body = await readJson<ProjectListResponse>(response);
  return body.projects ?? [];
}

export async function listApprovals(): Promise<ApprovalRequest[]> {
  const response = await fetch(`${API_BASE_URL}/api/approvals`);
  const body = await readJson<ApprovalListResponse>(response);
  return body.approvals ?? [];
}

export async function listAuditEvents(projectId?: string): Promise<AuditEvent[]> {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
  const response = await fetch(`${API_BASE_URL}/api/audit-events${query}`);
  const body = await readJson<AuditEventListResponse>(response);
  return body.auditEvents ?? [];
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

export async function runFullOrchestration(projectId: string): Promise<FullOrchestrationResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/orchestrate/full`, {
    method: "POST"
  });
  return readJson<FullOrchestrationResponse>(response);
}

export async function runMarketResearch(projectId: string): Promise<MarketResearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/research/market`, {
    method: "POST"
  });
  return readJson<MarketResearchResponse>(response);
}

export async function runDomainResearch(projectId: string): Promise<DomainResearchResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/research/domains`, {
    method: "POST"
  });
  return readJson<DomainResearchResponse>(response);
}

export async function generateWebsite(projectId: string): Promise<WebsiteArtifactResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/website`, {
    method: "POST"
  });
  return readJson<WebsiteArtifactResponse>(response);
}

export async function planBackend(projectId: string): Promise<BackendArtifactResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/backend/plan`, {
    method: "POST"
  });
  return readJson<BackendArtifactResponse>(response);
}

export async function deployProject(projectId: string): Promise<DeploymentResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/deployments`, {
    method: "POST"
  });
  return readJson<DeploymentResponse>(response);
}

export async function generateDocuments(projectId: string): Promise<DocumentArtifactResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/documents`, {
    method: "POST"
  });
  return readJson<DocumentArtifactResponse>(response);
}

export async function prepareESign(projectId: string): Promise<ESignPackageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/esign/prepare`, {
    method: "POST"
  });
  return readJson<ESignPackageResponse>(response);
}

export async function createESignEnvelope(projectId: string): Promise<ESignPackageResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/esign/envelope`, {
    method: "POST"
  });
  return readJson<ESignPackageResponse>(response);
}

export async function attemptAISignatureSend(projectId: string): Promise<HumanOnlyDecisionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}/esign/send-attempt`, {
    method: "POST"
  });
  const body = await response.json();

  if (response.status !== 409) {
    if (!response.ok) {
      const message = typeof body?.error === "string" ? body.error : "Request failed.";
      throw new Error(message);
    }
  }

  return body as HumanOnlyDecisionResponse;
}

export async function requestDomainRegistrationApproval(project: LaunchProject): Promise<ApprovalResponse> {
  const domain = project.domainResearch?.recommendedDomain;

  if (!domain) {
    throw new Error("No recommended domain is ready for approval.");
  }

  const response = await fetch(`${API_BASE_URL}/api/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectId: project.id,
      requestedBy: "domain",
      actionType: "namecom.registerDomain",
      resource: domain.domainName,
      payload: {
        domainName: domain.domainName,
        years: 1,
        price: domain.purchasePrice
      },
      reason: `Approve protected registration for ${domain.domainName}.`
    })
  });
  return readJson<ApprovalResponse>(response);
}

export async function requestBackendProvisioningApproval(project: LaunchProject): Promise<ApprovalResponse> {
  const backend = project.backendArtifact;

  if (!backend) {
    throw new Error("No backend plan is ready for approval.");
  }

  const response = await fetch(`${API_BASE_URL}/api/approvals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      projectId: project.id,
      requestedBy: "backend",
      actionType: "xano.provisionBackend",
      resource: `${backend.productName} API`,
      payload: backend,
      reason: `Approve Xano backend provisioning for ${backend.productName}.`
    })
  });
  return readJson<ApprovalResponse>(response);
}

export async function approveRequest(approval: ApprovalRequest): Promise<ApprovalResponse> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${approval.id}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: extractApprovalToken(approval),
      decidedBy: "founder"
    })
  });
  return readJson<ApprovalResponse>(response);
}

export async function rejectRequest(approval: ApprovalRequest): Promise<ApprovalResponse> {
  const response = await fetch(`${API_BASE_URL}/api/approvals/${approval.id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: extractApprovalToken(approval),
      decidedBy: "founder",
      reason: "Rejected from dashboard."
    })
  });
  return readJson<ApprovalResponse>(response);
}

export async function dryRunSecureExecution(approval: ApprovalRequest): Promise<SecureExecutionReceipt> {
  const response = await fetch(`${API_BASE_URL}/api/secure-executions/dry-run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ approvalId: approval.id })
  });
  const body = await readJson<SecureExecutionResponse>(response);
  return body.receipt;
}

export async function executeDomainRegistration(approval: ApprovalRequest): Promise<SecureExecutionReceipt> {
  const response = await fetch(`${API_BASE_URL}/api/secure-executions/namecom/register-domain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ approvalId: approval.id })
  });
  const body = await readJson<SecureExecutionResponse>(response);
  return body.receipt;
}

export async function executeBackendProvisioning(approval: ApprovalRequest): Promise<SecureExecutionReceipt> {
  const response = await fetch(`${API_BASE_URL}/api/secure-executions/xano/provision-backend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ approvalId: approval.id })
  });
  const body = await readJson<SecureExecutionResponse>(response);
  return body.receipt;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json();

  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "Request failed.";
    throw new Error(message);
  }

  return body as T;
}

function extractApprovalToken(approval: ApprovalRequest): string {
  const url = new URL(approval.approvalUrl);
  const token = url.searchParams.get("token");

  if (!token) {
    throw new Error("Approval token is missing.");
  }

  return token;
}
