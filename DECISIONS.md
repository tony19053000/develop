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

Reason: This gives clean boundaries for later Google ADK agents, AgentLatch, and sponsor adapters while staying fast to run locally.

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
