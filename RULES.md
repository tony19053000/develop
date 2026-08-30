# Rules

## Source of Truth

When information conflicts, follow this order:

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

## Phase Rules

- Build one complete phase at a time.
- Do not start Phase N+1 until Phase N is complete, tested, reviewed, documented, committed, and pushed.
- Do not mark partial code as complete.
- If a phase is blocked, document the blocker, attempted fixes, impact, and next action.

## Engineering Rules

- Prefer modular architecture and clear boundaries.
- Avoid giant files and unnecessary abstractions.
- Validate external data and LLM outputs.
- Handle errors explicitly.
- Preserve workflow state across failures.
- Keep model/provider selection configurable.
- Use structured interfaces for tools and actions.

## Security Rules

- Agents request actions; they do not authorize sensitive actions.
- AgentLatch is deterministic infrastructure, not an LLM authority.
- Privileged sponsor credentials must never be exposed to agents.
- Do not store secrets in Git, logs, prompts, screenshots, or generated artifacts.
- Redact sensitive values in audit events.
- Human-only actions cannot be converted into approval-required actions.
- Do not falsely claim simulated secure execution is TEE-backed.

## Sponsor Rules

- SerpApi, name.com, Xano, and Foxit integrations must be real before their phases are complete.
- Mocks may exist temporarily but must be labeled as development-only.
- Sponsor outputs must materially affect product behavior where required.

## Testing Rules

- Add tests appropriate to the current phase.
- AgentLatch requires policy and bypass tests.
- Approval system requires expiration, replay, and altered-payload tests.
- Secure execution requires authorization and credential boundary tests.
- Final product requires end-to-end demonstration testing.

## Documentation Rules

- Update `CONTEXT.md` after meaningful work.
- Update `STATUS.md` after phase progress changes.
- Update `ARCHITECTURE.md` when system design changes.
- Record important decisions in `DECISIONS.md`.

## Git Rules

- Never commit `.env`, real API keys, cloud credentials, signing secrets, tokens, or TEE credentials.
- Inspect Git status before committing.
- Use meaningful commit messages.
- Push after each completed phase when remote is configured.
- Never force push unless explicitly requested.

