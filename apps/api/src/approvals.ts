import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  approvalRequestSchema,
  createApprovalToken,
  createExecutableApprovalDecision,
  verifyApprovalToken,
  type AgentLatchPolicyResult,
  type ApprovalRequest,
  type ToolActionRequest
} from "@launchforge/agentlatch";

const approvalRequestListSchema = approvalRequestSchema.array();

export interface CreateApprovalInput {
  actionRequest: ToolActionRequest;
  decision: AgentLatchPolicyResult;
  webOrigin: string;
  tokenSecret: string;
  ttlMinutes?: number;
}

export interface ApprovalRepository {
  list(): Promise<ApprovalRequest[]>;
  findById(id: string): Promise<ApprovalRequest | undefined>;
  create(input: CreateApprovalInput): Promise<{ approval: ApprovalRequest; token: string }>;
  approve(id: string, token: string, tokenSecret: string, decidedBy: string): Promise<ApprovalRequest>;
  reject(id: string, token: string, tokenSecret: string, decidedBy: string, rejectionReason?: string): Promise<ApprovalRequest>;
}

export class ApprovalRepositoryError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export class FileApprovalRepository implements ApprovalRepository {
  private readonly filePath: string;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "approvals.json");
  }

  async list(): Promise<ApprovalRequest[]> {
    return this.readApprovals();
  }

  async findById(id: string): Promise<ApprovalRequest | undefined> {
    const approvals = await this.readApprovals();
    return approvals.find((approval) => approval.id === id);
  }

  async create(input: CreateApprovalInput): Promise<{ approval: ApprovalRequest; token: string }> {
    if (!input.decision.requiresHumanApproval || input.decision.decision === "HUMAN_ONLY") {
      throw new ApprovalRepositoryError(409, `Decision ${input.decision.decision} cannot create a normal approval request.`);
    }

    const approvals = await this.readApprovals();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (input.ttlMinutes ?? 60) * 60_000).toISOString();
    const approvalId = randomUUID();
    const token = createApprovalToken(
      {
        approvalId,
        requestId: input.actionRequest.id,
        payloadHash: input.decision.payloadHash,
        expiresAt
      },
      input.tokenSecret
    );
    const approval = approvalRequestSchema.parse({
      id: approvalId,
      projectId: input.actionRequest.projectId,
      actionRequest: input.actionRequest,
      decision: input.decision,
      status: "pending",
      approvalUrl: `${input.webOrigin}/approvals/${approvalId}?token=${encodeURIComponent(token)}`,
      tokenExpiresAt: expiresAt,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    approvals.unshift(approval);
    await this.writeApprovals(approvals);
    return { approval, token };
  }

  async approve(id: string, token: string, tokenSecret: string, decidedBy: string): Promise<ApprovalRequest> {
    return this.decide(id, token, tokenSecret, decidedBy, "approved");
  }

  async reject(
    id: string,
    token: string,
    tokenSecret: string,
    decidedBy: string,
    rejectionReason?: string
  ): Promise<ApprovalRequest> {
    return this.decide(id, token, tokenSecret, decidedBy, "rejected", rejectionReason);
  }

  private async decide(
    id: string,
    token: string,
    tokenSecret: string,
    decidedBy: string,
    status: "approved" | "rejected",
    rejectionReason?: string
  ): Promise<ApprovalRequest> {
    const approvals = await this.readApprovals();
    const approvalIndex = approvals.findIndex((approval) => approval.id === id);

    if (approvalIndex === -1) {
      throw new ApprovalRepositoryError(404, `Approval not found: ${id}`);
    }

    const approval = approvals[approvalIndex];

    if (!approval) {
      throw new ApprovalRepositoryError(404, `Approval not found: ${id}`);
    }

    if (approval.status !== "pending") {
      throw new ApprovalRepositoryError(409, `Approval is already ${approval.status}.`);
    }

    const tokenPayload = verifyApprovalToken(token, tokenSecret);

    if (
      tokenPayload.approvalId !== approval.id ||
      tokenPayload.requestId !== approval.actionRequest.id ||
      tokenPayload.payloadHash !== approval.decision.payloadHash
    ) {
      throw new ApprovalRepositoryError(403, "Approval token does not match the pending request.");
    }

    const now = new Date().toISOString();
    const nextApproval = approvalRequestSchema.parse({
      ...approval,
      decision: status === "approved" ? createExecutableApprovalDecision(approval.decision) : approval.decision,
      status,
      decidedAt: now,
      decidedBy,
      ...(rejectionReason ? { rejectionReason } : {}),
      updatedAt: now
    });

    approvals[approvalIndex] = nextApproval;
    await this.writeApprovals(approvals);
    return nextApproval;
  }

  private async readApprovals(): Promise<ApprovalRequest[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return approvalRequestListSchema.parse(JSON.parse(content));
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async writeApprovals(approvals: ApprovalRequest[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(approvals, null, 2)}\n`, "utf8");
  }
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
