# Architecture

## Status Legend

- IMPLEMENTED: present in code and verified.
- PARTIAL: present but incomplete or not fully verified.
- PLANNED: designed but not implemented.

## Current Architecture Status

- Documentation baseline: IMPLEMENTED.
- Frontend application: PLANNED.
- Backend API: PLANNED.
- Database/storage: PLANNED.
- Google ADK agents: PLANNED.
- AgentLatch policy engine: PLANNED.
- Approval system: PLANNED.
- TEE secure executor: PLANNED.
- Sponsor integrations: PLANNED.
- Audit system: PLANNED.
- Deployment system: PLANNED.

## Proposed System Shape

LaunchForge will use a full-stack architecture:

- Frontend command center for project creation, live agent workspace, approvals, artifacts, security center, and audit.
- Backend application service exposing authenticated APIs and realtime event streams.
- Workflow state store for projects, phases, tasks, approvals, artifacts, and audit events.
- Agent runtime using Google ADK with replaceable model/provider configuration.
- Tool adapter layer for sponsor integrations.
- AgentLatch policy and authorization boundary before sensitive tool execution.
- SecureExecutor abstraction that later maps privileged execution to a real TEE/confidential computing platform.

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

AgentLatch is deterministic infrastructure. It must classify structured action requests into:

- AUTO_ALLOW.
- APPROVAL_REQUIRED.
- HIGH_RISK_APPROVAL.
- HUMAN_ONLY.
- DENY.

AgentLatch owns policy evaluation, authorization checks, replay prevention, exact payload binding, and audit events for action decisions.

## Approval System

Approvals must support:

- Dashboard approval.
- Email approval links.
- Signed tokens.
- Expiration.
- Single use.
- Exact payload binding.
- Owner authentication.
- Replay protection.
- Approval and rejection audit events.

Human-only actions, such as signing legal documents as the user, cannot be converted into normal approvals.

## TEE / Secure Execution

The first implementation may include a development SecureExecutor abstraction, but the TEE phase must select and document a real confidential computing technology.

Candidate platforms:

- Google Confidential Space.
- Google Confidential VM.
- AWS Nitro Enclaves.

The system must never claim a local simulation is hardware-backed.

## Sponsor Adapters

Each sponsor integration should live behind a narrow adapter:

- SerpApiAdapter for web intelligence.
- NameComAdapter for domain search, availability, registration, and DNS.
- XanoAdapter for backend provisioning and metadata.
- FoxitAdapter for document and eSign workflows.

Adapters must handle authentication failure, timeout, rate limit, malformed response, unavailable dependency, partial execution, retries where safe, and redaction.

## Realtime Events

The Live Agent Workspace requires realtime project events. Phase 1 will choose SSE or WebSocket. SSE is the initial preferred option because the early workflow is server-to-client status streaming, but this remains a Phase 1 implementation decision.

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

## Folder Structure

Planned Phase 1 structure:

```text
apps/
  web/
  api/
packages/
  shared/
  agentlatch/
  integrations/
  agents/
docs/
tests/
```

The exact framework and package manager will be finalized in Phase 1.

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
  -> name.com API
  -> Audit Event
```

