# Project Requirements

## Product

LaunchForge is an AI launch command center for turning a startup or product idea into a researched, branded, domain-backed, deployed, documented product launch.

AgentLatch is the core security technology that controls AI access to sensitive actions and tools. It is an enforceable authorization layer, not an LLM agent.

TEE, Trusted Execution Environment, is the protected execution technology planned for privileged operations so agents cannot directly access sensitive credentials.

## Core User Experience

The user enters a startup idea and watches a live launch workspace showing:

- Orchestrator progress.
- Market and brand research.
- Domain recommendations.
- AgentLatch approvals and blocked actions.
- Website/product generation.
- Backend provisioning.
- Document generation.
- Audit trail and final launch summary.

The interface must feel like an AI launch command center, not a generic chatbot.

## End-to-End Workflow

1. User submits a launch request.
2. Orchestrator creates a structured workflow.
3. Market & Brand Agent uses SerpApi for current market research.
4. Brand output influences domain and product decisions.
5. Domain Agent uses name.com to search and check availability.
6. Domain registration requests pass through AgentLatch.
7. Human approval is required for high-risk domain registration.
8. A secure executor validates authorization and executes the exact approved action.
9. Website/Product Agent creates a functional frontend product.
10. Backend Agent provisions Xano functionality.
11. Deployment system publishes the generated product.
12. Document Agent uses Foxit for founder/business documents.
13. Foxit eSign routes human-only signatures to the human.
14. Final summary reports launch completion and security outcomes.

## Application Agents

- Orchestrator Agent: task planning, dependencies, delegation, progress, pause/resume, failures.
- Market & Brand Agent: SerpApi research, competitors, positioning, naming conflicts, brand output.
- Domain Agent: name.com search, availability, ranking, registration requests, DNS requests.
- Website/Product Agent: frontend generation, validation, preview, deployment preparation.
- Backend Agent: Xano APIs, database models, workflows, auth, generated backend metadata.
- Document Agent: Foxit document creation, PDF workflows, eSign initiation.

Application agents must use Google ADK as the current framework, with model/provider selection configurable.

## AgentLatch Requirements

AgentLatch must support:

- Green, auto allow.
- Yellow, approval required.
- Red, high-risk approval.
- Human-only.
- Deny.

Required security properties:

- Deterministic policy decisions.
- Structured action schema.
- Exact-action binding.
- Approval expiration.
- Single-use approvals.
- Replay protection.
- Authenticated owner checks.
- Audit history.
- No privileged credential exposure to agents.

## TEE Requirements

The final secure execution layer must use a real trusted execution or confidential computing technology selected during implementation. Possible candidates include Google Confidential Space, Google Confidential VM, AWS Nitro Enclaves, or another justified platform.

Development simulations must never be represented as hardware-backed TEE.

## Sponsor Requirements

Sponsor integrations must be real, meaningful, functional, and visible in the demo before their phases are complete.

- SerpApi must influence research and brand decisions.
- name.com must support real domain search and availability, and protected registration when AgentLatch and secure execution are ready.
- Xano must power actual generated backend functionality.
- Foxit must power actual business document and signature workflows.

## Functional Requirements

- Project/session model.
- Launch workflow state.
- Agent task state and events.
- Live workspace updates using SSE, WebSocket, or a justified equivalent.
- Approval center with dashboard and email approval.
- Audit log for important system actions.
- Redaction of sensitive data.
- Sponsor adapter error handling.
- Resume behavior after approval, rejection, and failures.
- Generated product artifact storage.
- Final launch summary.

## Non-Functional Requirements

- Modular architecture.
- Clear trust boundaries.
- Strict secret management.
- Typed/validated action and tool contracts.
- Testable policy and approval logic.
- Failure-tolerant workflow state.
- Demo-ready responsive UI by finalization.
- No fake sponsor functionality marked complete.

## Final Demo Requirements

The final project must demonstrate:

SerpApi research -> Brand -> name.com domain search -> AgentLatch approval -> TEE secure execution -> domain registration -> website generation -> Xano backend -> deployment -> Foxit documents -> human-only eSign -> final launch summary.

