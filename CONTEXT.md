# Context

## Project Summary

LaunchForge is an autonomous AI startup-launching platform. AgentLatch is its authorization layer for sensitive AI-requested actions. The final product must integrate SerpApi, name.com, Xano, Foxit, LangGraph application workflows/agents, a secure execution boundary using a real TEE/confidential computing technology, approvals, audit, and a polished AI launch command center UI.

## Current Phase

Phase 10 - Xano + Backend Agent is complete and approved.
Current next phase: Phase 11 - Deployment System.

Phase 0 - Project Analysis & Master Design is complete and approved.
Phase 1 - Application Foundation is complete and approved.
Phase 2 - LangGraph + Orchestrator is complete and approved.
Phase 3 - SerpApi + Market & Brand Agent is complete and approved.
Phase 4 - name.com + Domain Agent is complete and approved.
Phase 5 - AgentLatch Policy Engine is complete and approved.
Phase 6 - Human Approval System is complete and approved.
Phase 7 - TEE / Secure Execution is complete and approved.
Phase 8 - Protected name.com Registration is complete and approved.
Phase 9 - Website / Product Agent is complete and approved.
Phase 10 - Xano + Backend Agent is complete and approved.

## Completed Work

- Cloned the empty GitHub repository.
- Confirmed there were no existing source files, dependencies, docs, tests, or commits.
- Initialized the project repo at `/home/aayush/Desktop/devlopment` and attached GitHub remote `https://github.com/tony19053000/develop.git`.
- Pushed Phase 0 foundation to `origin/main`.
- Created Phase 0 documentation foundation:
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
- Created Phase 1 application foundation:
  - npm workspace monorepo.
  - React/Vite frontend in `apps/web`.
  - Express API in `apps/api`.
  - Shared contracts and validation in `packages/shared`.
  - File-backed project storage under configurable `DATA_DIR`.
  - API routes for health, project list, project creation, project lookup, and project SSE events.
  - Frontend command center shell with navigation, new launch form, project list, and live workspace task timeline.
  - Baseline unit/integration tests, typecheck, lint, build, and audit commands.
- Pushed Phase 1 implementation commit `dd9b5ea` to `origin/main`.
- Added Phase 2 implementation:
  - `packages/agents` workspace.
  - `@langchain/langgraph` integration.
  - LangGraph Orchestrator state graph with configurable model metadata.
  - Deterministic credential-free workflow planner executed through the compiled graph.
  - Shared workflow plan schemas and task mapping helpers.
  - API orchestration on project creation.
  - API route `POST /api/projects/:projectId/orchestrate`.
  - Tests for shared workflow mapping, LangGraph runtime construction, planner behavior, and API orchestration.
- Added Phase 3 implementation:
  - `packages/integrations` workspace.
  - Real SerpApi Google Search HTTP adapter using `https://serpapi.com/search.json`.
  - Market & Brand Agent that performs competitor, market signal, and naming conflict searches through SerpApi.
  - Shared market research and research evidence schemas.
  - API route `POST /api/projects/:projectId/research/market`.
  - File-backed persistence for market research on launch projects.
  - Frontend research action and Market Intelligence result panel.
  - Unit and integration tests with mocked SerpApi responses.
  - Live verification with a real `SERPAPI_API_KEY`, returning six competitor results, six market signal results, and six naming conflict results.
- Added API config loading improvements:
  - The API now discovers the nearest parent `.env` so root-level setup works with npm workspace commands.
  - Relative `DATA_DIR` values resolve from the `.env` file directory.
- Added Phase 4 implementation:
  - name.com availability adapter using `POST /core/v1/domains:checkAvailability`.
  - Domain Agent that builds candidate names from Phase 3 brand output or the startup idea.
  - Domain ranking for purchasable, standard-registration, non-premium, brand-matching domains.
  - Shared domain research schemas.
  - API route `POST /api/projects/:projectId/research/domains`.
  - File-backed persistence for domain research on launch projects.
  - Frontend `Find Domains` action and Domain Intelligence panel.
  - Unit and integration tests with mocked name.com responses.
  - Live verification with real name.com credentials, checking 20 domains and recommending a purchasable standard-registration domain.
- Added Phase 5 implementation:
  - `packages/agentlatch` workspace.
  - Structured `ToolActionRequest` schema.
  - Deterministic policy decisions: `AUTO_ALLOW`, `APPROVAL_REQUIRED`, `HIGH_RISK_APPROVAL`, `HUMAN_ONLY`, and `DENY`.
  - Policy classes for read-only research, domain registration, DNS updates, backend provisioning, signature execution, and direct system writes.
  - Stable payload hashing for exact-action binding.
  - Protected tool executor that blocks execution unless AgentLatch returns a matching executable decision.
  - API route `POST /api/agentlatch/evaluate`.
  - Policy, bypass, altered-payload replay, and API tests.
- Added Phase 6 implementation:
  - File-backed approval repository in the API.
  - Signed HMAC approval tokens bound to approval ID, action request ID, payload hash, and expiration.
  - Approval URLs suitable for dashboard or email-link routing.
  - API routes for listing, creating, approving, and rejecting approval requests.
  - Single-use approval/rejection transitions with replay blocking.
  - Project pause/resume behavior via `waiting_for_approval`, active resume on approval, and failed stop on rejection.
  - Dashboard approvals panel with approve/reject icon controls.
  - Tests for tokens, executable approved decisions, API flows, replay blocking, rejection, and web approval UI.
- Added Phase 7 implementation:
  - `packages/secure-executor` workspace.
  - SecureExecutor abstraction with development mode and Google Confidential Space mode.
  - Exact-action validation against executable AgentLatch decisions.
  - Payload-hash mismatch rejection before protected operations are called.
  - Allowlisted secret access through a secure operation context.
  - Structured Google Confidential Space evidence requirements.
  - Secure execution receipt schema.
  - API dry-run route `POST /api/secure-executions/dry-run`.
  - Dashboard dry-run receipt display for approved actions.
  - Secure execution design note at `docs/SECURE_EXECUTION.md`.
  - Tests for non-executable rejection, altered-payload rejection, secret allowlisting, evidence requirements, receipt creation, API dry-run, and web receipt UI.
- Completed real Phase 7 Google Confidential Space integration:
  - Verified local gcloud and Application Default Credentials for project `launchforge-tee`.
  - Verified required APIs: Compute Engine, Confidential Computing, Artifact Registry, and IAM Service Account Credentials.
  - Created Artifact Registry repository `us-central1/launchforge-secure-executor`.
  - Added a SecureExecutor workload container at `infra/secure-executor/Dockerfile`.
  - Built and pushed `us-central1-docker.pkg.dev/launchforge-tee/launchforge-secure-executor/secure-executor@sha256:11a74bc84df6c1ec2d5b644d03c74a195598b0edacbfacd148c2a2c5ed7592c5`.
  - Deployed the workload to a production Google Confidential Space VM in `us-central1-c`.
  - Obtained a real attestation token from `/v1/token` inside Confidential Space.
  - Verified the Google-signed token against workload identity, image digest, image reference, project, zone, secure boot, stable support attributes, and production debug status.
  - Created `gs://launchforge-tee-phase7-evidence` and granted the workload service account only `roles/storage.objectCreator` for evidence export.
- Completed Phase 8 protected name.com registration:
  - Added name.com Create Domain support using `POST /core/v1/domains`.
  - Bound registration retries to the approval ID using `X-Idempotency-Key`.
  - Added protected API execution route `POST /api/secure-executions/namecom/register-domain`.
  - Required an approved `namecom.registerDomain` action before registration.
  - Re-checked name.com availability inside SecureExecutor immediately before Create Domain.
  - Blocked premium and non-standard registration purchase types for Phase 8.
  - Added dashboard controls to execute registration after approval.
  - Verified the full protected flow against `https://api.dev.name.com` by registering sandbox domain `launchforge-phase8-1788261813202.com`, order `2132723`.
- Completed Phase 9 Website/Product Agent:
  - Added typed website artifact contracts for generated files, validation checks, and deployment preparation metadata.
  - Added `createWebsiteProductAgent` in `@launchforge/agents`.
  - Generated a static product website from the startup idea, Phase 3 brand direction, and Phase 4 domain recommendation when available.
  - Produced `index.html`, `styles.css`, and `app.js` artifact files with responsive layout and a small interactive waitlist form.
  - Added deterministic validation for document completeness, brand signal, responsive CSS, and interactive script.
  - Persisted website artifacts on launch projects.
  - Added `POST /api/projects/:projectId/website`.
  - Added dashboard `Generate Website` control, validation summary, file list, and embedded preview.
  - Live local verification generated a validated artifact for project `68681644-448b-4997-b56a-83df0df3a300`.
- Completed Phase 10 Xano + Backend Agent:
  - Added `HttpXanoClient` for Xano Metadata API provisioning.
  - Added XanoScript helpers for API group and table creation.
  - Added Backend Agent planning for a waitlist backend.
  - Added backend artifact contracts for tables, endpoints, frontend connection metadata, and Xano provisioning results.
  - Added project persistence for backend artifacts.
  - Added `POST /api/projects/:projectId/backend/plan`.
  - Added protected `POST /api/secure-executions/xano/provision-backend`.
  - Added dashboard backend planning, approval request, and provision controls.
  - Added `docs/XANO_BACKEND.md`.
  - Automated tests pass with mocked Xano API responses.
  - Local planning smoke test generated `onboarding_waitlist_leads` and `POST /waitlist` for project `b9d169bc-e98f-4e57-9e21-1b146baf4f5e`.
  - Corrected the Xano instance URL to `https://x8ki-letl-twmt.n7.xano.io` after the originally supplied host returned a fake Kubernetes ingress certificate.
  - Corrected the Metadata API workspace ID to `168062`.
  - Verified real Xano provisioning through `AgentLatch -> approval -> SecureExecutor -> Xano Metadata API`.
  - Provisioned API group `430757`, table `884783`, and endpoint `4032650`.
  - Independently verified the provisioned Xano resources through Metadata API read-back.

## Architecture Summary

Current architecture:

- Full-stack TypeScript LaunchForge command center.
- React/Vite frontend.
- Express backend API and SSE event foundation.
- Shared Zod-backed TypeScript contracts.
- File-backed Phase 1 project storage.
- LangGraph Orchestrator runtime is implemented.
- Sponsor adapter layer has live-verified SerpApi, name.com availability, protected name.com development/test registration, and protected Xano Metadata API provisioning; Foxit is planned.
- AgentLatch deterministic policy engine, protected executor boundary, approval persistence, signed tokens, and approval dashboard are implemented.
- SecureExecutor abstraction is implemented and real Google Confidential Space attestation is verified. Local mode is not hardware-backed and always reports `evidenceVerified: false`.
- Website/Product Agent is implemented with local static artifact generation, validation, project persistence, and dashboard preview.
- Backend Agent is implemented and live verified with Xano Metadata API provisioning.
- Audit trail with redaction and exact action tracking is planned.

## Decisions

- Build phase by phase, preserving the master product scope.
- Treat Phase 0 as documentation and master design because the repo began empty.
- Use objective phase weights totaling 100.
- Do not claim sponsor integrations are complete until real APIs are functional.
- Do not claim TEE behavior is hardware-backed until a real platform is implemented.
- Use npm workspaces with TypeScript, React/Vite, Express, Zod, Vitest, and ESLint for the Phase 1 foundation.
- Use SSE for Phase 1 realtime server-to-client agent/project events.
- Use LangGraph instead of Google ADK by latest explicit user instruction. This resolved the prior ADK transitive dependency audit blocker.
- Use a narrow SerpApi adapter and store evidence-backed research results before downstream domain, website, backend, and document phases consume the brand direction.
- Use name.com only for availability/ranking in Phase 4. Registration remains a protected AgentLatch/approval/secure-executor flow for Phase 8.
- Keep AgentLatch deterministic and non-LLM-owned; agents request actions, but AgentLatch classifies and binds exact payloads.
- Store approvals separately from projects while reflecting pause/resume status on project tasks.
- Select Google Confidential Space as the real TEE target for protected execution; keep local development mode clearly non-hardware-backed.

## Recent Commands

- `git clone https://github.com/tony19053000/develop.git develop`
- `git status --short --branch`
- `git log --oneline --decorate --max-count 5`
- `find . -maxdepth 2 -type f -not -path './.git/*'`
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- `gcloud auth list --filter=status:ACTIVE --format='value(account)'`
- `gcloud auth application-default set-quota-project launchforge-tee`
- `gcloud services list --enabled --project launchforge-tee`
- `gcloud artifacts repositories create launchforge-secure-executor --repository-format=docker --location=us-central1 --project=launchforge-tee`
- `docker build -f infra/secure-executor/Dockerfile -t us-central1-docker.pkg.dev/launchforge-tee/launchforge-secure-executor/secure-executor:phase7-gcs .`
- `docker push us-central1-docker.pkg.dev/launchforge-tee/launchforge-secure-executor/secure-executor:phase7-gcs`
- `gcloud compute instances create launchforge-phase7-attest-gcs-20260831 ... --image-family=confidential-space --metadata=tee-image-reference=... --service-account=launchforge-tee-workload@launchforge-tee.iam.gserviceaccount.com`
- `gcloud storage cp gs://launchforge-tee-phase7-evidence/confidential-space-evidence.json /tmp/launchforge-phase7-evidence.json --project=launchforge-tee`
- `POST /api/secure-executions/namecom/register-domain`
- `POST /api/projects/:projectId/website`
- `POST /api/projects/:projectId/backend/plan`
- `POST /api/secure-executions/xano/provision-backend`
- `npm run start -w @launchforge/api`
- Live `POST /api/projects/:projectId/research/market`
- Live `POST /api/projects/:projectId/research/domains`
- `npm view @langchain/langgraph version description`
- `npm audit fix`
- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`

## Baseline Results

- Git history: no commits at start.
- Branch: `main`.
- Remote: `origin` points to `https://github.com/tony19053000/develop.git`.
- Build/typecheck/test/lint: passing with Phase 7 implementation.
- Build/typecheck/test/lint: passing with Phase 9 implementation.
- Build/typecheck/test/lint: passing with Phase 10 implementation.
- npm audit: passing, 0 vulnerabilities.
- Live SerpApi endpoint verification: passed.
- Live name.com endpoint verification: passed.
- Phase 0 foundation commit: `d5f824b`.
- Phase 1 implementation commit: `dd9b5ea`.
- Phase 2 implementation commit: `742dfee`.
- Phase 3 implementation commit: `9d9c646`.
- Phase 3 verification commit: `a9e9893`.
- Phase 4 implementation commit: `3db3a8a`.
- Phase 4 verification commit: `20d6aaa`.
- Phase 5 implementation commit: `91cc45d`.
- Phase 6 implementation commit: `8e4094f`.
- Phase 7 checkpoint commit: `787d5b4`.
- Phase 7 real Confidential Space image digest: `sha256:11a74bc84df6c1ec2d5b644d03c74a195598b0edacbfacd148c2a2c5ed7592c5`.
- Phase 7 real attestation verification: passed with `evidenceVerified: true`.
- Phase 8 sandbox domain registration: `launchforge-phase8-1788261813202.com`, order `2132723`, post-registration availability `purchasable: false`.
- Phase 9 generated product artifact smoke test: passed with `validationPassed: true`.
- Phase 10 backend plan smoke test: passed locally with `mode: planned`.
- Phase 10 real Xano provisioning: passed in workspace `168062`.

## Environment Assumptions

- Current workspace: `/home/aayush/Desktop/devlopment`.
- Real credentials must be provided through local environment variables and never committed.
- `SERPAPI_API_KEY` is configured locally for Phase 3 verification and must not be committed.
- `NAMECOM_USERNAME` and `NAMECOM_API_TOKEN` are configured locally for Phase 4 verification and must not be committed.
- `XANO_API_KEY`, `XANO_WORKSPACE_ID`, and `XANO_INSTANCE_BASE_URL` are configured locally and must not be committed.

## Blockers

Production domain registration still requires explicit user confirmation for the exact real domain.

## Next Exact Task

Start Phase 11 by building the Deployment System. Do not expose sponsor credentials to agents, generated artifacts, or the frontend.
