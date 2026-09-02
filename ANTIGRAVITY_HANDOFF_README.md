# Antigravity Handoff README

This file is a migration handoff for continuing LaunchForge + AgentLatch in a new agent/session without losing the project rules, intent, progress, or security boundaries.

## Repository

- Local path: `/home/aayush/Desktop/devlopment`
- Remote: `https://github.com/tony19053000/develop.git`
- Branch: `main`
- Last known pushed phase: Phase 14
- Last known pushed commit in status notes: `e921557 Mark phase 14 complete`
- Current working tree: contains uncommitted Phase 15 audit/security-center work.

Before doing anything else in the next session:

```bash
cd /home/aayush/Desktop/devlopment
git status --short
git log --oneline -5
```

Do not discard or reset the uncommitted work unless the user explicitly says to.

## Product Intent

LaunchForge is an AI startup-launching command center. A founder enters a startup idea, and the system coordinates multiple agents and sponsor integrations to:

- research the market and competitors,
- generate brand positioning,
- find available domains,
- request approval for protected actions,
- register approved domains through a protected path,
- generate a product website,
- plan and provision a Xano backend,
- deploy a local generated product,
- generate Foxit-powered founder documents,
- prepare Foxit eSign envelopes,
- stop at human-only signing boundaries,
- produce audit evidence for every sensitive decision and action.

AgentLatch is the deterministic authorization layer. AI agents can request actions, but they cannot authorize or directly execute sensitive operations.

## Core Security Model

The protected execution path is:

```text
AI/Application Agent
  -> Structured ToolActionRequest
  -> AgentLatch deterministic policy decision
  -> Human approval when required
  -> Exact payload hash binding
  -> Signed approval token / executable authorization
  -> SecureExecutor
  -> Secret resolution only inside protected operation
  -> Sponsor API
  -> Secure receipt and audit event
```

Critical rules:

- Never expose `.env` secrets to the frontend, prompts, generated artifacts, logs, screenshots, or audit output.
- Never commit `.env`, cloud credentials, service-account JSON keys, API tokens, OAuth secrets, or signed tokens.
- Local SecureExecutor execution must report `evidenceVerified: false`.
- `evidenceVerified: true` is allowed only after genuine Google Confidential Space attestation verification.
- Human-only actions cannot be downgraded into normal approval-required actions.
- `foxit.sendForSignature` is permanently `HUMAN_ONLY`; AI cannot send or sign as the user.
- Domain production purchases require explicit human confirmation for the exact real domain.

## Phase Protocol

The project is being built one phase at a time.

For each phase:

1. Implement only the current phase.
2. Add or update tests.
3. Run typecheck, tests, lint, build, and audit.
4. Run any required live sponsor verification.
5. Have Reviewer/Tester independently verify the phase.
6. Update `STATUS.md`, `CONTEXT.md`, `ARCHITECTURE.md`, `DECISIONS.md`, and any phase docs.
7. Check for secrets.
8. Commit.
9. Push to `origin/main`.
10. Start the next phase only after the current phase is truly complete.

Source-of-truth order when files disagree:

1. Latest explicit user instruction.
2. Master project prompt.
3. `PROJECT_REQUIREMENTS.md`.
4. `RULES.md`.
5. `ARCHITECTURE.md`.
6. `DEVELOPMENT_PLAN.md`.
7. `DECISIONS.md`.
8. `STATUS.md`.
9. `CONTEXT.md`.
10. Existing code.

## Current Official Status

Official completion is 82%.

Phases 0 through 14 are complete and approved.

Phase 15, Audit + Security Center, is currently in progress and not yet officially complete because final documentation, full verification, commit, and push have not been finished.

Remaining phases:

- Phase 15: Audit + Security Center, weight 5.
- Phase 16: Final UI / UX, weight 3.
- Phase 17: Full Security & Failure Testing, weight 4.
- Phase 18: End-to-End Final Integration, weight 4.
- Phase 19: Hackathon Finalization, weight 2.

## Completed Path So Far

### Phase 0 - Project Analysis & Master Design

Completed documentation foundation:

- `README.md`
- `PROJECT_REQUIREMENTS.md`
- `ARCHITECTURE.md`
- `DEVELOPMENT_PLAN.md`
- `STATUS.md`
- `CONTEXT.md`
- `RULES.md`
- `DECISIONS.md`
- `.gitignore`
- `.env.example`

Established fixed phase weights totaling 100.

### Phase 1 - Application Foundation

Implemented npm workspace monorepo:

- `apps/web`: React + Vite command center.
- `apps/api`: Express API.
- `packages/shared`: shared Zod schemas and TypeScript contracts.

Added file-backed storage, project APIs, health route, SSE event foundation, project creation UI, and baseline tests.

### Phase 2 - LangGraph + Orchestrator

Implemented `packages/agents` with LangGraph orchestration and a deterministic workflow planner. User selected LangGraph after considering Google ADK.

### Phase 3 - SerpApi + Market & Brand Agent

Implemented real SerpApi adapter and Market & Brand Agent. Live verified with real `SERPAPI_API_KEY`.

### Phase 4 - name.com + Domain Agent

Implemented name.com domain availability checking and domain ranking. Live verified with name.com credentials.

### Phase 5 - AgentLatch Policy Engine

Implemented deterministic policy engine:

- `AUTO_ALLOW`
- `APPROVAL_REQUIRED`
- `HIGH_RISK_APPROVAL`
- `HUMAN_ONLY`
- `DENY`

Added exact payload hashing and protected execution interception.

### Phase 6 - Human Approval System

Implemented file-backed approvals, signed HMAC approval links, expiration, single-use approve/reject, replay protection, and dashboard approval controls.

### Phase 7 - TEE / Secure Execution

Implemented `packages/secure-executor`.

Real Google Confidential Space integration was completed and verified:

- Google Cloud project: `launchforge-tee`
- Workload service account: `launchforge-tee-workload@launchforge-tee.iam.gserviceaccount.com`
- Artifact Registry repo: `us-central1/launchforge-secure-executor`
- Verified workload image digest: `sha256:11a74bc84df6c1ec2d5b644d03c74a195598b0edacbfacd148c2a2c5ed7592c5`
- Verified Google-signed attestation token.
- Verified workload identity, image digest, image reference, project, zone, secure boot, stable support attributes, and production debug status.

Do not create API keys, OAuth client credentials, service-account JSON keys, or long-lived cloud credentials. Use local `gcloud` / Application Default Credentials.

### Phase 8 - Protected name.com Registration

Implemented protected name.com domain registration:

- approval required,
- SecureExecutor required,
- availability re-check inside execution,
- idempotency key bound to approval,
- premium/non-standard purchases blocked.

Live sandbox verification registered:

- Domain: `launchforge-phase8-1788261813202.com`
- Sandbox order: `2132723`

### Phase 9 - Website / Product Agent

Implemented generated static product-site artifacts:

- `index.html`
- `styles.css`
- `app.js`

Added validation checks and embedded dashboard preview.

### Phase 10 - Xano + Backend Agent

Implemented Xano backend planning and protected provisioning through Xano Metadata API.

Live verified:

- Workspace: `168062`
- Correct instance URL pattern: `https://x8ki-letl-twmt.n7.xano.io`
- Earlier user-provided host `https://x8kl-lelt-ltwmt.n7.xano.io` was incorrect and returned a fake Kubernetes ingress certificate.
- Provisioned API group `430757`, table `884783`, endpoint `4032650`.
- Later Phase 14 provisioned API group `430840`.

### Phase 11 - Deployment System

Implemented local static deployment:

- writes generated files to `DATA_DIR/deployments/{deployment_id}`,
- serves them through `/deployments/{deployment_id}/`,
- runs health checks.

Live verified deployment:

- `http://localhost:4000/deployments/73feef18-a64c-4d15-bd22-9319b23d3f8e/`

Phase 14 live deployment:

- `http://localhost:4000/deployments/67e8df0f-6112-40b9-8095-0aae85fac92e/`

### Phase 12 - Foxit + Document Agent

Implemented document generation:

- founder launch brief,
- investor one-pager,
- technical delivery summary.

Foxit DocGen endpoint:

```text
https://na1.fusion.foxit.com/document-generation/api/GenerateDocumentBase64
```

Uses `FOXIT_CLIENT_ID` and `FOXIT_CLIENT_SECRET` as request headers. Generated PDFs are stored locally and served as `application/pdf`.

### Phase 13 - Foxit eSign + Human-Only Boundary

Implemented current Foxit Fusion eSign workflow using:

```text
https://na1.fusion.foxit.com/esign/api/v1/
```

Important credential decision:

- Use existing `FOXIT_CLIENT_ID` and `FOXIT_CLIENT_SECRET`.
- Do not create separate `FOXIT_ESIGN_CLIENT_ID` / `FOXIT_ESIGN_CLIENT_SECRET` unless intentionally switching to Foxit's legacy eSign API.
- Do not use the old `na1.foxitesign.foxit.com/api/oauth2/access_token` legacy OAuth flow for current Fusion eSign.

Live verified:

- Created real draft envelope `35688804`.
- User manually sent and signed through Foxit UI.
- Foxit read-back reported `EXECUTED`.
- AI send path returned HTTP 409 with `HUMAN_ONLY`.

Signing email went to:

```text
aayush19053000@gmail.com
```

The Foxit email landed in Gmail Spam during the real test.

### Phase 14 - Full Multi-Agent Orchestration

Implemented:

```text
POST /api/projects/:projectId/orchestrate/full
```

The route runs:

1. Market research.
2. Domain research.
3. Website generation.
4. Backend planning.
5. Xano approval gate.
6. Xano provisioning after approval.
7. Deployment.
8. Foxit document generation.
9. Foxit eSign preparation.
10. Stop at human eSign boundary.

Live verified project:

```text
1d2184fd-5ba4-4661-ae80-2d27abe0bff7
```

Approval:

```text
7b09a5ac-e4c7-4492-a7d7-589b92762b9e
```

After human approval, route resumed to:

- progress `100`,
- Xano backend `provisioned`,
- deployment healthy,
- three Foxit documents generated,
- eSign package prepared as human-only.

## Phase 15 Current In-Progress Work

Phase 15 is Audit + Security Center.

Uncommitted files currently include:

- `apps/api/src/audit.ts`
- `apps/api/src/app.ts`
- `apps/api/src/app.test.ts`
- `apps/api/src/server.ts`
- `apps/web/src/App.tsx`
- `apps/web/src/App.test.tsx`
- `apps/web/src/api.ts`
- `apps/web/src/styles.css`
- `packages/shared/src/index.ts`
- `packages/shared/src/index.test.ts`

Implemented in working tree:

- Shared `AuditEvent` schemas and types.
- File-backed `FileAuditRepository`.
- Redaction of sensitive keys and credential-like values.
- API dependency injection for audit repository.
- `GET /api/audit-events` route with `projectId`, `type`, and `limit` filters.
- Audit recording for:
  - policy decisions,
  - approval creation,
  - approval approve/reject,
  - secure execution receipts,
  - Foxit eSign status boundaries,
  - general agent events outside test mode.
- Web API `listAuditEvents`.
- Dashboard Security Center panel.
- Dashboard Audit Timeline panel.
- Test coverage for redacted audit events.

Validation already completed for this uncommitted Phase 15 work:

```text
npm run build -w @launchforge/shared
npm run typecheck -w @launchforge/api
npm run typecheck -w @launchforge/web
npm run test -w @launchforge/api
npm run test -w @launchforge/web
npm run test -w @launchforge/shared
npm run lint
```

Results seen:

- API tests: 28 passed.
- Web tests: 8 passed.
- Shared tests: 7 passed.
- Total targeted tests: 43 passed.
- Lint: passed.

Important caveat:

- A later combined `npm run typecheck` and `npm run build` command was interrupted by the user while switching context, so the next agent should rerun full root-level validation before marking Phase 15 complete.

Recommended next commands:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Then run a local audit smoke test:

```bash
curl -sS -X POST http://localhost:4000/api/agentlatch/evaluate \
  -H 'Content-Type: application/json' \
  --data '{
    "projectId":"1d2184fd-5ba4-4661-ae80-2d27abe0bff7",
    "requestedBy":"document",
    "actionType":"foxit.sendForSignature",
    "resource":"OnboardingPilot eSign envelope",
    "payload":{"clientSecret":"redaction-smoke-value-that-must-not-return","humanOnly":true},
    "reason":"Audit smoke for human-only signature boundary."
  }'

curl -sS "http://localhost:4000/api/audit-events?projectId=1d2184fd-5ba4-4661-ae80-2d27abe0bff7&limit=10"
```

Verify:

- response contains an audit event,
- event has `redacted: true`,
- event does not contain the smoke secret,
- `foxit.sendForSignature` remains `HUMAN_ONLY`,
- local receipts still show `evidenceVerified: false`.

Before committing Phase 15, update:

- `STATUS.md`
- `CONTEXT.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `README.md`
- optionally `docs/AUDIT_SECURITY.md`

Then commit and push:

```bash
git status --short
git add apps/api/src/audit.ts apps/api/src/app.ts apps/api/src/app.test.ts apps/api/src/server.ts \
  apps/web/src/App.tsx apps/web/src/App.test.tsx apps/web/src/api.ts apps/web/src/styles.css \
  packages/shared/src/index.ts packages/shared/src/index.test.ts \
  STATUS.md CONTEXT.md ARCHITECTURE.md DECISIONS.md README.md docs/AUDIT_SECURITY.md
git commit -m "Add audit security center"
git push origin main
```

Only mark Phase 15 complete after verification and review.

## Known Problems / Open Issues

### Phase 15 is not officially complete

It has working code in the local working tree, but it is not documented, committed, pushed, or reviewer-approved yet.

### Root validation was interrupted

The user intentionally interrupted the last session to move to Antigravity. Rerun root commands before claiming completion.

### Dev server may be stale

A dev server was running previously:

- Web: `http://localhost:5173/`
- API: `http://localhost:4000`

It may not reflect the latest uncommitted Phase 15 code if build/watch state is stale. Restart if needed:

```bash
npm run dev
```

### Approval buttons confusion

The UI has protected action cards with shield/check style approval controls. User got confused because clicking the card itself does nothing; the small shield/check button is the approval action. Phase 16 should improve UI clarity.

### Foxit email deliverability

Foxit eSign invitation email went to Gmail Spam during testing. For demos, check Spam and search for:

```text
Please review or sign
Foxit eSign
notifications@foxitsign.com
```

### Production domain registration still needs explicit confirmation

The system can do sandbox name.com registration, but production paid domain purchase must not be automated without the exact domain confirmation from the user.

### Local deployment is not public production hosting

Phase 11 deploys to local API static serving. Public hosting/DNS can be handled later if needed, but do not pretend local deployment is public production.

## Environment Variables

`.env` exists locally and must not be committed.

Use `.env.example` for placeholder names. Do not copy real values into docs or commits.

Known variable groups:

```bash
SERPAPI_API_KEY=

NAMECOM_USERNAME=
NAMECOM_API_TOKEN=
NAMECOM_API_BASE_URL=https://api.dev.name.com

APPROVAL_TOKEN_SECRET=

XANO_API_KEY=
XANO_WORKSPACE_ID=168062
XANO_INSTANCE_BASE_URL=https://x8ki-letl-twmt.n7.xano.io

FOXIT_CLIENT_ID=
FOXIT_CLIENT_SECRET=
FOXIT_API_BASE_URL=https://na1.fusion.foxit.com
FOXIT_DOCUMENT_GENERATION_PATH=/document-generation/api/GenerateDocumentBase64
FOXIT_ESIGN_BASE_URL=https://na1.fusion.foxit.com
```

Do not ask the user for service-account JSON keys or long-lived Google credentials. Use `gcloud` and ADC.

## Secret-Handling Checklist

Before every commit:

```bash
git status --short
git diff -- . ':(exclude).env' ':(exclude)data'
rg -n "FOXIT_CLIENT_SECRET=|NAMECOM_API_TOKEN=|SERPAPI_API_KEY=|XANO_API_KEY=|eyJhbGci|Bearer |client_secret|api[_-]?key|password|token" \
  . --glob '!node_modules' --glob '!dist' --glob '!data' --glob '!.env' --glob '!package-lock.json'
```

The scan may find placeholder names in `.env.example` or documentation; that is fine. It must not find real secret values.

## Important Endpoints

Core:

- `GET /api/health`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `GET /api/projects/:projectId/events`

Agents:

- `POST /api/projects/:projectId/orchestrate`
- `POST /api/projects/:projectId/orchestrate/full`
- `POST /api/projects/:projectId/research/market`
- `POST /api/projects/:projectId/research/domains`
- `POST /api/projects/:projectId/website`
- `POST /api/projects/:projectId/backend/plan`
- `POST /api/projects/:projectId/deployments`
- `POST /api/projects/:projectId/documents`

AgentLatch / approvals:

- `POST /api/agentlatch/evaluate`
- `GET /api/approvals`
- `POST /api/approvals`
- `POST /api/approvals/:id/approve`
- `POST /api/approvals/:id/reject`

Secure execution:

- `POST /api/secure-executions/dry-run`
- `POST /api/secure-executions/namecom/register-domain`
- `POST /api/secure-executions/xano/provision-backend`

Foxit eSign:

- `POST /api/projects/:projectId/esign/prepare`
- `POST /api/projects/:projectId/esign/envelope`
- `POST /api/projects/:projectId/esign/send-attempt`
- `PATCH /api/projects/:projectId/esign/status`
- `POST /api/projects/:projectId/esign/status/refresh`

Phase 15 audit:

- `GET /api/audit-events`
- `GET /api/audit-events?projectId=<id>`
- `GET /api/audit-events?projectId=<id>&type=policy_decision&limit=25`

## Package Layout

```text
apps/
  api/
  web/
packages/
  shared/
  agents/
  integrations/
  agentlatch/
  secure-executor/
infra/
  secure-executor/
docs/
```

## Commands

Install:

```bash
npm install
```

Run app:

```bash
npm run dev
```

Verify:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --audit-level=moderate
```

Workspace-targeted checks:

```bash
npm run test -w @launchforge/api
npm run test -w @launchforge/web
npm run test -w @launchforge/shared
npm run typecheck -w @launchforge/api
npm run typecheck -w @launchforge/web
npm run build -w @launchforge/shared
```

## What To Do Next

Recommended next steps in Antigravity:

1. Inspect `git status --short`.
2. Review Phase 15 uncommitted files.
3. Rerun full validation.
4. Restart dev server if needed.
5. Run audit smoke test and verify redaction.
6. Update docs/status for Phase 15.
7. Secret scan.
8. Commit and push Phase 15.
9. Start Phase 16 only after Phase 15 is reviewer-approved.

Do not move to Phase 16 until Phase 15 is complete.

