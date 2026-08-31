# Decisions

## 2026-08-31 - Phase-by-Phase Development

Decision: Build LaunchForge + AgentLatch one complete subsystem phase at a time.

Context: The master prompt requires a disciplined phase workflow and prohibits random partial implementation across many systems.

Alternatives:

- Build a broad prototype across all sponsor integrations.
- Build only a frontend demo first.
- Build only AgentLatch first.

Chosen Approach: Complete Phase 0 documentation and planning first, then move to Phase 1 application foundation.

Reason: The repository is empty, and future implementation needs a stable source of truth.

Consequences: Early progress is documentation-heavy, but later sessions can continue without restarting project discovery.

Reversibility: Low. This is the permanent project operating model.

## 2026-08-31 - Objective Phase Weights

Decision: Use fixed phase weights totaling 100 points for official completion percentage.

Context: The master prompt requires completion percentages not be guessed.

Alternatives:

- Equal phase weights.
- Story-point estimates per task.

Chosen Approach: Assign weighted percentages according to implementation/security complexity.

Reason: AgentLatch, approvals, TEE, integrations, and orchestration carry more risk than final cleanup phases.

Consequences: Overall completion is based only on approved completed phase weight.

Reversibility: Medium. Weights can be revised with an explicit documented decision before later phase completion accounting depends on them.

## 2026-08-31 - Documentation-First Initial Commit

Decision: Treat Phase 0 as documentation and master design, not runtime scaffolding.

Context: The repository was empty and the master prompt defines Phase 0 as analysis, architecture, roadmap, status, rules, and baseline verification.

Alternatives:

- Scaffold the application immediately.
- Add placeholder code for all systems.

Chosen Approach: Create the required project docs, `.gitignore`, and `.env.example` only.

Reason: Runtime stack selection belongs in Phase 1 after Phase 0 is approved.

Consequences: No app runs yet; that is expected and recorded in status.

Reversibility: Medium. Phase 1 can choose and scaffold the runtime stack.

## 2026-08-31 - TypeScript npm Workspace Foundation

Decision: Use an npm workspace monorepo with TypeScript, React/Vite, Express, Zod, Vitest, and ESLint for the Phase 1 application foundation.

Context: Phase 1 requires frontend foundation, backend foundation, shared data contracts, configuration, storage, error handling, event/status foundation, and baseline checks.

Alternatives:

- Next.js single application.
- Python backend with separate frontend.
- A heavier full-stack framework.

Chosen Approach: Keep `apps/web`, `apps/api`, and `packages/shared` as separate workspaces with shared TypeScript contracts.

Reason: This gives clean boundaries for later LangGraph workflows, AgentLatch, and sponsor adapters while staying fast to run locally.

Consequences: The project uses Node/npm as the primary local development toolchain.

Reversibility: Medium. The boundaries allow replacing individual apps/packages later if needed.

## 2026-08-31 - SSE for Phase 1 Events

Decision: Use Server-Sent Events as the Phase 1 realtime event foundation.

Context: The live workspace initially needs server-to-client project and agent status updates.

Alternatives:

- WebSocket.
- Polling.

Chosen Approach: Add an SSE endpoint at `/api/projects/:projectId/events`.

Reason: SSE is simple, browser-native, and appropriate for one-way status streams.

Consequences: Later phases can keep SSE or add WebSocket if bidirectional agent controls require it.

Reversibility: High.

## 2026-08-31 - LangGraph Orchestrator Runtime

Decision: Integrate the Orchestrator through LangGraph instead of Google ADK.

Context: Phase 2 requires model configurability, Orchestrator workflow control, structured interfaces, workflow state, and local tests. The user explicitly instructed: "LangGraph go ahead with it."

Alternatives:

- Continue with Google ADK and document the audit exception.
- Delay orchestration integration.
- Use a custom state machine only.

Chosen Approach: Use `@langchain/langgraph` in `packages/agents` with a compiled Orchestrator state graph and deterministic local planning node.

Reason: LangGraph is strong for explicit workflow/state control, avoids the unresolved ADK transitive audit findings, and fits AgentLatch's future deterministic security boundary.

Consequences: The master prompt's original Google ADK preference is superseded by latest explicit user instruction. The dependency audit is clean after the switch.

Reversibility: Medium.

## 2026-08-31 - SerpApi Evidence Adapter

Decision: Implement Phase 3 market research through a narrow SerpApi adapter and store structured evidence on the launch project.

Context: The Market & Brand Agent needs real web intelligence for competitors, market signals, and naming conflicts, but normal tests must not require live sponsor credentials.

Alternatives:

- Call SerpApi directly from the agent.
- Store only generated brand text without source evidence.
- Use fixture data as if it were live research.

Chosen Approach: Add `@launchforge/integrations` with `HttpSerpApiClient`, expose a `SerpApiClient` interface to agents, persist typed research results, and keep tests on mocked HTTP/client boundaries.

Reason: This keeps sponsor credentials and network behavior isolated while letting downstream agents consume clear, evidence-backed market data.

Consequences: Phase 3 implementation can be tested locally without a key, but the phase cannot be marked complete until a real `SERPAPI_API_KEY` verifies live results.

Reversibility: High.

## 2026-08-31 - name.com Availability Before Registration

Decision: Limit Phase 4 name.com integration to domain availability search and recommendation ranking.

Context: Phase 4 needs real domain recommendations, while later protected registration must pass through AgentLatch, human approval, and secure execution.

Alternatives:

- Implement domain registration immediately.
- Generate domain ideas without checking real availability.
- Combine availability and registration in one adapter method.

Chosen Approach: Add a name.com availability client, a Domain Agent that ranks candidates, project persistence for domain research, and UI/API handoff without any registration execution.

Reason: Availability lookup is safe research behavior, but registration is a sensitive paid action that belongs behind the protected Phase 8 path.

Consequences: Phase 4 can recommend available domains once credentials are configured, while actual purchase remains blocked until AgentLatch and secure execution exist.

Reversibility: High.

## 2026-08-31 - Deterministic AgentLatch Policy Engine

Decision: Implement AgentLatch as deterministic infrastructure, not as an LLM agent.

Context: The core safety requirement is that agents may request sensitive actions but cannot authorize or execute them directly.

Alternatives:

- Let agents self-classify risk.
- Add approval checks inside each sponsor adapter only.
- Delay policy evaluation until human approval UI exists.

Chosen Approach: Add `@launchforge/agentlatch` with structured action requests, fixed policy categories, exact payload hashing, and a protected tool executor that blocks non-executable decisions.

Reason: A central deterministic gate gives later approval, secure execution, and audit phases a stable contract.

Consequences: Phase 5 can block protected execution before approval storage exists. Phase 6 will persist approval requests and convert eligible approval decisions into executable authorizations.

Reversibility: Medium.

## 2026-08-31 - Signed Approval Requests

Decision: Store approval requests separately from projects and bind approval tokens to exact AgentLatch payload hashes.

Context: Protected workflows need to pause for human decision before secure execution exists, while still preventing replay and altered-payload approval reuse.

Alternatives:

- Store approval status only on the project.
- Use unsigned approval IDs from the dashboard.
- Wait for email delivery before building approval tokens.

Chosen Approach: Add a file-backed approval repository, HMAC tokens with approval ID, request ID, payload hash, and expiration, plus API/dashboard approve and reject flows.

Reason: This gives Phase 7 and Phase 8 a precise authorization artifact without exposing sponsor credentials or letting agents self-authorize.

Consequences: Approval links are ready for email routing, and pending approvals are single-use. Full owner authentication and persistent audit browsing are left to later security/audit phases.

Reversibility: Medium.

## 2026-08-31 - Google Confidential Space SecureExecutor Target

Decision: Select Google Confidential Space as the real TEE target for LaunchForge protected execution.

Context: Phase 7 needs a secure execution boundary that prevents agents from seeing protected credentials and prepares later paid sponsor operations for hardware-backed confidential execution.

Alternatives:

- AWS Nitro Enclaves.
- Google Confidential VM without Confidential Space.
- Keep only a local secure executor simulation.

Chosen Approach: Add `@launchforge/secure-executor` with local development enforcement, Google Confidential Space evidence requirements, allowlisted secret access, exact AgentLatch approval validation, and secure execution receipts.

Reason: Google Confidential Space is container-oriented and fits a single-purpose protected workload model for sponsor operations. The local executor gives testable safety behavior while clearly reporting `evidenceVerified: false`.

Consequences: Phase 7 has an implemented boundary and selected TEE target, but cannot be called hardware-backed until deployed to Google Confidential Space with valid attestation evidence.

Reversibility: Medium.
