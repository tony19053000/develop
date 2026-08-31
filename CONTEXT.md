# Context

## Project Summary

LaunchForge is an autonomous AI startup-launching platform. AgentLatch is its authorization layer for sensitive AI-requested actions. The final product must integrate SerpApi, name.com, Xano, Foxit, LangGraph application workflows/agents, a secure execution boundary using a real TEE/confidential computing technology, approvals, audit, and a polished AI launch command center UI.

## Current Phase

Phase 6 - Human Approval System is next.

Phase 0 - Project Analysis & Master Design is complete and approved.
Phase 1 - Application Foundation is complete and approved.
Phase 2 - LangGraph + Orchestrator is complete and approved.
Phase 3 - SerpApi + Market & Brand Agent is complete and approved.
Phase 4 - name.com + Domain Agent is complete and approved.
Phase 5 - AgentLatch Policy Engine is complete and approved.

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

## Architecture Summary

Current architecture:

- Full-stack TypeScript LaunchForge command center.
- React/Vite frontend.
- Express backend API and SSE event foundation.
- Shared Zod-backed TypeScript contracts.
- File-backed Phase 1 project storage.
- LangGraph Orchestrator runtime is implemented.
- Sponsor adapter layer has live-verified SerpApi and name.com availability implementations; Xano and Foxit are planned.
- AgentLatch deterministic policy engine and protected executor boundary are implemented. Approval persistence and UI are planned for Phase 6.
- SecureExecutor abstraction, later backed by a real TEE/confidential computing platform, is planned.
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
- Build/typecheck/test/lint: passing with Phase 5 implementation.
- npm audit: passing, 0 vulnerabilities.
- Live SerpApi endpoint verification: passed.
- Live name.com endpoint verification: passed.
- Phase 0 foundation commit: `d5f824b`.
- Phase 1 implementation commit: `dd9b5ea`.
- Phase 2 implementation commit: `742dfee`.
- Phase 3 implementation commit: `9d9c646`.
- Phase 3 verification commit: `a9e9893`.
- Phase 4 implementation commit: `3db3a8a`.

## Environment Assumptions

- Current workspace: `/home/aayush/Desktop/devlopment`.
- Real credentials must be provided through local environment variables and never committed.
- `SERPAPI_API_KEY` is configured locally for Phase 3 verification and must not be committed.
- `NAMECOM_USERNAME` and `NAMECOM_API_TOKEN` are configured locally for Phase 4 verification and must not be committed.

## Blockers

None for Phase 5.

## Next Exact Task

Begin Phase 6 by implementing approval storage, dashboard approval UI, approve/reject flows, secure approval tokens, and pause/resume behavior.
