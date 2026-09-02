# Development Plan

## Phase Weights

The full project is weighted at 100 points. Only reviewer-approved completed phase weight counts toward overall completion.

| Phase | Name | Weight |
| --- | --- | ---: |
| 0 | Project Analysis & Master Design | 4 |
| 1 | Application Foundation | 6 |
| 2 | LangGraph + Orchestrator | 6 |
| 3 | SerpApi + Market & Brand Agent | 6 |
| 4 | name.com + Domain Agent | 5 |
| 5 | AgentLatch Policy Engine | 7 |
| 6 | Human Approval System | 7 |
| 7 | TEE / Secure Execution | 7 |
| 8 | Protected name.com Registration | 5 |
| 9 | Website / Product Agent | 6 |
| 10 | Xano + Backend Agent | 6 |
| 11 | Deployment System | 3 |
| 12 | Foxit + Document Agent | 4 |
| 13 | Foxit eSign + Human-Only Boundary | 4 |
| 14 | Full Multi-Agent Orchestration | 6 |
| 15 | Audit + Security Center | 5 |
| 16 | Final UI / UX | 3 |
| 17 | Full Security & Failure Testing | 4 |
| 18 | End-to-End Final Integration | 4 |
| 19 | Hackathon Finalization | 2 |

Total: 100.

## Definition of Done for Every Phase

- Phase tasks are implemented.
- Acceptance criteria pass.
- Coder tests pass.
- Reviewer/Tester verifies independently.
- Required docs are updated.
- `STATUS.md` and `CONTEXT.md` are updated.
- Git status is inspected.
- Secrets are checked.
- Commit is created.
- Push to GitHub succeeds when remote is configured.

## Phase 0 - Project Analysis & Master Design

Tasks:

- Inspect repository, git state, source files, docs, dependencies, and build/test commands.
- Establish product requirements.
- Establish architecture.
- Establish phase roadmap and weights.
- Establish persistent status and context docs.
- Establish permanent project rules.
- Record initial technical decisions.
- Run baseline checks or document absence of commands.

Acceptance:

- Documentation foundation exists.
- Future sessions can continue from `CONTEXT.md`.
- Phase weights are objective and sum to 100.
- Initial repo is committed and pushed.

## Phase 1 - Application Foundation

Tasks:

- Select and scaffold frontend/backend stack.
- Implement project/session model.
- Implement storage foundation.
- Implement UI shell and navigation.
- Implement common API patterns.
- Implement configuration and environment handling.
- Implement error-handling foundation.
- Implement event/status foundation.
- Add baseline tests, lint, typecheck, and build commands.

Acceptance:

- Base LaunchForge app runs locally.
- A user can create/view a basic launch project.
- Foundation supports later agents, events, approvals, and audit.

## Phase 2 - LangGraph + Orchestrator

Tasks:

- Integrate LangGraph.
- Add model/provider configuration abstraction.
- Build Orchestrator Agent.
- Create structured workflow planning.
- Add task state tracking and agent events.
- Support tool abstraction and error handling.

Acceptance:

- User launch request creates a structured workflow using a LangGraph state graph.

## Phase 3 - SerpApi + Market & Brand Agent

Tasks:

- Real SerpApi integration.
- Market, competitor, and naming searches.
- Structured research result validation.
- Market & Brand Agent.
- Research UI and brand decision handoff.

Acceptance:

- Startup idea produces evidence-backed brand and positioning from real search results.

## Phase 4 - name.com + Domain Agent

Tasks:

- Real name.com integration.
- Search, availability, and ranking.
- Domain Agent.
- Domain UI.
- Sandbox behavior where available.

Acceptance:

- Agent finds and recommends real available domains.

## Phase 5 - AgentLatch Policy Engine

Tasks:

- Action schema.
- Deterministic policies.
- Risk categories.
- Tool interception.
- Policy tests and bypass tests.

Acceptance:

- Protected tools cannot execute without passing through AgentLatch.

## Phase 6 - Human Approval System

Tasks:

- Approval storage.
- Dashboard approval UI.
- Approve/reject flows.
- Secure approval tokens.
- Email approval links.
- Pause/resume behavior.

Acceptance:

- Protected workflow pauses, receives human decision, and resumes or stops correctly.

## Phase 7 - TEE / Secure Execution

Tasks:

- SecureExecutor abstraction.
- Select real TEE/confidential computing platform.
- Protected credential flow.
- Authorization verification.
- Replay and altered-payload rejection.
- Security tests.

Acceptance:

- Agents cannot access privileged credentials and protected actions execute only through approved secure path.

## Phase 8 - Protected name.com Registration

Tasks:

- AgentLatch -> approval -> secure executor -> name.com registration.
- DNS protected operations where implemented.
- Error handling and audit.

Acceptance:

- Domain registration completes only after correct authorization.

## Phase 9 - Website / Product Agent

Tasks:

- Website generation.
- Artifact storage.
- Build validation.
- Preview.
- Deployment preparation.

Acceptance:

- LaunchForge generates a functional web product from startup specification.

## Phase 10 - Xano + Backend Agent

Tasks:

- Real Xano integration.
- Data models, APIs, workflows, auth where appropriate.
- Backend Agent.
- Generated frontend/backend connection.

Acceptance:

- Generated product includes real backend functionality powered by Xano.

## Phase 11 - Deployment System

Tasks:

- Deployment workflow.
- State, environment, health checks, errors, progress.

Acceptance:

- Generated product can be deployed and accessed.

## Phase 12 - Foxit + Document Agent

Tasks:

- Real Foxit integration.
- Document Agent.
- PDF and founder document workflows.
- Document UI.

Acceptance:

- LaunchForge produces real sponsor-powered business documents.

## Phase 13 - Foxit eSign + Human-Only Boundary

Tasks:

- Signature workflow: complete with real Foxit Fusion eSign draft envelope creation.
- Human-only classification: complete for `foxit.sendForSignature`.
- AI signature prevention: complete; AI send attempts return HTTP 409 `HUMAN_ONLY`.
- Foxit eSign completion state: complete with read-only status refresh reporting `EXECUTED`.
- Audit: protected action receipts and status changes recorded for Phase 13 scope.

Acceptance:

- AI prepares documents but cannot sign as the user. Verified with real envelope `35688804`.

## Phase 14 - Full Multi-Agent Orchestration

Tasks:

- Connect all agents: complete through `POST /api/projects/:projectId/orchestrate/full`.
- Dependencies and handoffs: complete for market, domain, website, backend, deployment, documents, and eSign preparation.
- Recovery and pause/resume: complete for idempotent artifact reuse and Xano approval pause/resume.

Acceptance:

- One launch request flows through all required agents and integrations. Verified with live pause/resume through Xano provisioning, deployment, Foxit documents, and eSign preparation.

## Phase 15 - Audit + Security Center

Tasks:

- Complete audit timeline.
- AgentLatch dashboard.
- Filtering and redaction.

Acceptance:

- User can understand the complete AI action and decision history.

## Phase 16 - Final UI / UX

Tasks:

- Polish all command center views.
- Responsive states, loading, empty, error.

Acceptance:

- Product is demo-ready and visually polished.

## Phase 17 - Full Security & Failure Testing

Tasks:

- Test bypass, forged approval, replay, expired approval, altered payload, credential access, sponsor failures, model failures, workflow recovery.

Acceptance:

- Critical security and reliability cases behave correctly.

## Phase 18 - End-to-End Final Integration

Tasks:

- Run complete demonstration scenario.

Acceptance:

- Full workflow functions from request to final launch summary.

## Phase 19 - Hackathon Finalization

Tasks:

- Final README, docs, screenshots, demo script, cleanup, final push, optional release.

Acceptance:

- Repository and deployed project are submission-ready.
