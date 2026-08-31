import type { ApprovalRequest } from "@launchforge/agentlatch";
import type { CreateLaunchProjectInput, DomainResearch, LaunchProject, MarketResearch } from "@launchforge/shared";

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

interface ApprovalListResponse {
  approvals: ApprovalRequest[];
}

interface ApprovalResponse {
  approval: ApprovalRequest;
  token?: string;
  project: LaunchProject;
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
