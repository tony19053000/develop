import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditEventListSchema, auditEventSchema, type AuditEvent, type AuditEventSeverity, type AuditEventType } from "@launchforge/shared";

export interface AuditRecordInput {
  projectId?: string;
  type: AuditEventType;
  severity: AuditEventSeverity;
  actor: string;
  action: string;
  resource?: string;
  decision?: string;
  evidenceVerified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuditQuery {
  projectId?: string;
  type?: AuditEventType;
  limit?: number;
}

export interface AuditRepository {
  list(query?: AuditQuery): Promise<AuditEvent[]>;
  record(input: AuditRecordInput): Promise<AuditEvent>;
}

export class FileAuditRepository implements AuditRepository {
  private readonly filePath: string;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "audit-events.json");
  }

  async list(query: AuditQuery = {}): Promise<AuditEvent[]> {
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    return (await this.readEvents())
      .filter((event) => (query.projectId ? event.projectId === query.projectId : true))
      .filter((event) => (query.type ? event.type === query.type : true))
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .slice(0, limit);
  }

  async record(input: AuditRecordInput): Promise<AuditEvent> {
    const operation = this.writeQueue.then(async () => {
      const events = await this.readEvents();
      const event = auditEventSchema.parse({
        id: randomUUID(),
        ...(input.projectId ? { projectId: input.projectId } : {}),
        type: input.type,
        severity: input.severity,
        actor: input.actor,
        action: input.action,
        ...(input.resource ? { resource: input.resource } : {}),
        ...(input.decision ? { decision: input.decision } : {}),
        ...(input.evidenceVerified !== undefined ? { evidenceVerified: input.evidenceVerified } : {}),
        redacted: true,
        metadata: redactValue(input.metadata ?? {}),
        createdAt: new Date().toISOString()
      });

      events.push(event);
      await this.writeEvents(events);
      return event;
    });

    this.writeQueue = operation.catch(() => undefined);
    return operation;
  }

  private async readEvents(): Promise<AuditEvent[]> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return auditEventListSchema.parse(JSON.parse(content));
    } catch (error) {
      if (isMissingFileError(error)) {
        return [];
      }

      throw error;
    }
  }

  private async writeEvents(events: AuditEvent[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(events, null, 2)}\n`, "utf8");
  }
}

export function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactValue);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key) ? "[REDACTED]" : redactValue(nestedValue)
      ])
    );
  }

  if (typeof value === "string" && looksSensitiveValue(value)) {
    return "[REDACTED]";
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  return /api[_-]?key|authorization|client[_-]?secret|credential|password|secret|token/i.test(key);
}

function looksSensitiveValue(value: string): boolean {
  if (/^Bearer\s+/i.test(value)) {
    return true;
  }

  if (/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(value)) {
    return true;
  }

  return value.length >= 48 && /^[a-zA-Z0-9_.=-]+$/.test(value);
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
