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

