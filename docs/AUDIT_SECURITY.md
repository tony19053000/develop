# Audit + Security Center

## Overview

Phase 15 implements a unified, immutable-style audit logging system and Security Center interface for LaunchForge + AgentLatch. Every sensitive operation—including policy evaluations, approval creations, approval decisions, secure execution receipts, eSign status transitions, and general agent events—is captured, redacted, persisted, and queryable.

## Core Principles

1. **Mandatory Redaction**: Sensitive keys (API keys, authorization headers, passwords, secrets, tokens, client secrets) and secret-like strings (Bearer tokens, JWTs, high-entropy tokens) are automatically replaced with `[REDACTED]` prior to persistence or API responses.
2. **Immutable Audit Events**: Audit events have fixed schemas, timestamping, actor attribution, resource identifiers, decision results, and explicit `redacted: true` flags.
3. **Evidence Verification Boundary**:
   - Local `SecureExecutor` runs explicitly record `evidenceVerified: false` because local execution is not hardware-backed.
   - `evidenceVerified: true` is set only when executing inside genuine Google Confidential Space with verified Google-signed attestation tokens matching the workload identity and container image digest.
4. **Human-Only Signature Enforcement**: Signature dispatch operations (`foxit.sendForSignature`) remain permanently classified as `HUMAN_ONLY`. AgentLatch blocks AI execution attempts and audit events log the `HUMAN_ONLY` decision and security boundary.

## Audit Event Schema

Audit events are validated against the shared `@launchforge/shared` Zod schema:

```typescript
export const auditEventTypeSchema = z.enum([
  "agent_event",
  "policy_decision",
  "approval_created",
  "approval_decided",
  "secure_execution",
  "sponsor_action",
  "security_boundary"
]);

export const auditEventSeveritySchema = z.enum(["info", "success", "warning", "error"]);

export const auditEventSchema = z.object({
  id: z.string(),
  projectId: z.string().optional(),
  type: auditEventTypeSchema,
  severity: auditEventSeveritySchema,
  actor: z.string(),
  action: z.string(),
  resource: z.string().optional(),
  decision: z.string().optional(),
  evidenceVerified: z.boolean().optional(),
  redacted: z.literal(true),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime()
});
```

## API Endpoints

- **`GET /api/audit-events`**
  - Query parameters:
    - `projectId` (optional): Filter events by project ID.
    - `type` (optional): Filter events by event type (e.g. `policy_decision`, `secure_execution`).
    - `limit` (optional): Maximum number of events to return (default 100, max 500).
  - Returns: `{ auditEvents: AuditEvent[] }` sorted newest first.

## Web Command Center Integration

- **Security Center Panel**: Displays high-level governance metrics for the selected launch project:
  - Total audit events count
  - Pending approval count
  - Blocked action count (`HUMAN_ONLY` and `DENY` decisions)
  - TEE verified receipt count
- **Audit Decision Timeline Panel**: Displays the chronologically ordered timeline of audit events, including actor, action, resource, severity indicator, decision, and evidence verification status (`TEE verified`, `local evidence false`, or `redacted`).

## Verification & Testing

- Unit tests in `packages/shared/src/index.test.ts` verify audit event Zod parsing and `redacted: true` enforcement.
- Unit tests in `apps/api/src/app.test.ts` verify event recording, query filtering, and secret redaction.
- Web component tests in `apps/web/src/App.test.tsx` verify Security Center metrics and Audit Timeline rendering.
