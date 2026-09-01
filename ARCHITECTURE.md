# Architecture

## Status Legend

- IMPLEMENTED: present in code and verified.
- PARTIAL: present but incomplete or not fully verified.
- PLANNED: designed but not implemented.

## Current Architecture Status

- Documentation baseline: IMPLEMENTED.
- Frontend application: IMPLEMENTED.
- Backend API: IMPLEMENTED.
- Database/storage: PARTIAL.
- LangGraph orchestration: IMPLEMENTED.
- AgentLatch policy engine: IMPLEMENTED.
- Approval system: IMPLEMENTED.
- TEE secure executor: IMPLEMENTED.
- Website/Product Agent: IMPLEMENTED.
- Xano + Backend Agent: PARTIAL.
- Sponsor integrations: PARTIAL.
- Audit system: PLANNED.
- Deployment system: PLANNED.

## Proposed System Shape

LaunchForge uses a full-stack TypeScript architecture:

- React/Vite frontend command center for project creation, live agent workspace, approvals, artifacts, security center, and audit.
- Express backend application service exposing APIs and realtime event streams.
- File-backed Phase 1 project state store for launch projects and initial agent tasks.
- Agent/workflow runtime using LangGraph with replaceable model/provider configuration.
- Tool adapter layer for sponsor integrations. SerpApi and name.com availability are implemented and live verified; remaining sponsor adapters are planned.
- AgentLatch policy and authorization boundary before sensitive tool execution.
- SecureExecutor abstraction that maps privileged execution to development mode locally and Google Confidential Space mode in production with Google-signed attestation verification.
- Website/Product Agent that creates static product website artifacts, validates them, persists them with the project, and previews them in the command center.
- Backend Agent that creates Xano backend plans and routes real provisioning through AgentLatch approval and SecureExecutor.

## Trust Boundaries

Agents may request actions, but they do not authorize sensitive execution.

Sensitive path:

```text
Application Agent
  -> Structured Action Request
  -> AgentLatch Policy Engine
  -> Approval System when required
  -> Signed Exact-Action Authorization
  -> SecureExecutor
  -> Protected Sponsor Credentials
  -> Sponsor API
```

Secrets must not be available to the frontend, prompts, LLM outputs, browser logs, audit logs, or generated product artifacts.

## AgentLatch

AgentLatch is deterministic infrastructure. It classifies structured action requests into:

- AUTO_ALLOW.
- APPROVAL_REQUIRED.
- HIGH_RISK_APPROVAL.
- HUMAN_ONLY.
- DENY.

AgentLatch currently owns policy evaluation, protected execution interception, and exact payload hashing. Phase 6 adds approval persistence; later phases add replay prevention backed by durable authorization state and audit events.

## Approval System

Approvals support:

- Dashboard approval.
- Signed approval links suitable for email routing.
- Signed tokens.
- Expiration.
- Single use.
- Exact payload binding.
- Founder decision attribution.
- Replay protection for pending approval transitions.
- Approval and rejection audit events.

Human-only actions, such as signing legal documents as the user, cannot be converted into normal approvals. Durable owner authentication and full audit browsing are expanded in later phases.

## TEE / Secure Execution

The SecureExecutor abstraction is implemented. The selected and verified real confidential computing technology is Google Confidential Space.

Considered platforms:

- Google Confidential Space: selected target.
- Google Confidential VM: viable platform family, but less specific to the single-workload secure execution path.
- AWS Nitro Enclaves: viable alternative with strong isolation and attestation, but it requires an EC2/enclave architecture that is heavier for the current app shape.

The system must never claim local development execution is hardware-backed. Hardware-backed status requires a real Google Confidential Space deployment and attestation verification. Phase 7 verified production Confidential Space execution in project `launchforge-tee` using workload image digest `sha256:11a74bc84df6c1ec2d5b644d03c74a195598b0edacbfacd148c2a2c5ed7592c5` and service account `launchforge-tee-workload@launchforge-tee.iam.gserviceaccount.com`.

## Sponsor Adapters

Each sponsor integration should live behind a narrow adapter:

- SerpApiAdapter for web intelligence. IMPLEMENTED: Google Search integration and organic result mapping live verified with `SERPAPI_API_KEY`.
- NameComAdapter for domain search, availability, registration, and DNS. PARTIAL: availability search and ranking are live verified; protected registration code is implemented behind AgentLatch, human approval, SecureExecutor, idempotency, and pre-create availability re-check; DNS remains planned.
- XanoAdapter for backend provisioning and metadata. PARTIAL: Metadata API adapter, backend planning, approval, and protected provisioning route are implemented; live Xano workspace provisioning is pending credentials.
- FoxitAdapter for document and eSign workflows.

Adapters must handle authentication failure, timeout, rate limit, malformed response, unavailable dependency, partial execution, retries where safe, and redaction.

## Realtime Events

The Live Agent Workspace uses SSE as the Phase 1 realtime foundation because current workflow updates are server-to-client status events. WebSocket remains available as a later option if bidirectional agent operations require it.

## Data Model

Planned entities:

- User.
- LaunchProject.
- LaunchWorkflow.
- AgentTask.
- AgentEvent.
- ToolActionRequest.
- AgentLatchDecision.
- ApprovalRequest.
- ApprovalToken.
- SecureExecutionRequest.
- SponsorExecutionResult.
- Artifact.
- AuditEvent.
- DeploymentRecord.
- WebsiteArtifact.
- BackendArtifact.

## Folder Structure

Implemented Phase 1 structure:

```text
apps/
  web/
  api/
packages/
  shared/
```

Planned later structure:

```text
packages/
  agentlatch/
  integrations/
  agents/
  secure-executor/
infra/
  secure-executor/
docs/
tests/
```

The selected package manager is npm workspaces.

## Diagrams

### Launch Workflow

```text
User
  -> Launch Request
  -> Orchestrator
  -> Market & Brand Agent
  -> Domain Agent
  -> AgentLatch Approval Boundary
  -> Website/Product Agent
  -> Backend Agent
  -> Document Agent
  -> Final Launch Summary
```

### Protected Domain Registration

```text
Domain Agent
  -> register_domain request
  -> AgentLatch RED decision
  -> Human Approval
  -> Signed Authorization
  -> SecureExecutor / TEE
  -> Re-check name.com availability
  -> Idempotent Create Domain
  -> name.com API
  -> Audit Event
```

### Website / Product Artifact

```text
Market & Brand Agent
  -> Brand direction and audience
Domain Agent
  -> Recommended domain when available
Website/Product Agent
  -> Static site files
  -> Deterministic validation checks
  -> Project artifact persistence
  -> Command center preview
  -> Phase 11 deployment handoff
```

### Protected Xano Provisioning

```text
Backend Agent
  -> BackendArtifact plan
  -> xano.provisionBackend request
  -> AgentLatch approval
  -> Signed exact-action authorization
  -> SecureExecutor
  -> XANO_API_KEY secret resolution
  -> Xano Metadata API
  -> Provisioned backend metadata
```
