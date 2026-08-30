# Context

## Project Summary

LaunchForge is an autonomous AI startup-launching platform. AgentLatch is its authorization layer for sensitive AI-requested actions. The final product must integrate SerpApi, name.com, Xano, Foxit, Google ADK application agents, a secure execution boundary using a real TEE/confidential computing technology, approvals, audit, and a polished AI launch command center UI.

## Current Phase

Phase 2 - Google ADK + Orchestrator is in progress and blocked on dependency audit.

Phase 0 - Project Analysis & Master Design is complete and approved.
Phase 1 - Application Foundation is complete and approved.

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
- Added Phase 2 local implementation:
  - `packages/agents` workspace.
  - `@google/adk@2.0.0` integration.
  - ADK Orchestrator `Agent` with configurable model.
  - ADK `FunctionTool` named `create_launch_workflow`.
  - Deterministic credential-free workflow planner used through the ADK tool wrapper.
  - Shared workflow plan schemas and task mapping helpers.
  - API orchestration on project creation.
  - API route `POST /api/projects/:projectId/orchestrate`.
  - Tests for shared workflow mapping, ADK runtime construction, planner behavior, and API orchestration.

## Architecture Summary

Current architecture:

- Full-stack TypeScript LaunchForge command center.
- React/Vite frontend.
- Express backend API and SSE event foundation.
- Shared Zod-backed TypeScript contracts.
- File-backed Phase 1 project storage.
- Google ADK agent runtime is next.
- Google ADK Orchestrator package is implemented locally but not approved because of dependency audit findings.
- Sponsor adapter layer for SerpApi, name.com, Xano, and Foxit is planned.
- AgentLatch deterministic policy and approval boundary is planned.
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
- Use `@google/adk@2.0.0` for Phase 2 because it is the current official TypeScript ADK package, with the caveat that its transitive dependency audit findings remain unresolved.

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
- `npm view @google/adk version description`
- `npm audit fix`

## Baseline Results

- Git history: no commits at start.
- Branch: `main`.
- Remote: `origin` points to `https://github.com/tony19053000/develop.git`.
- Build/typecheck/test/lint: passing with Phase 2 code.
- npm audit: failing because of `@google/adk@2.0.0` transitive dependencies.
- Phase 0 foundation commit: `d5f824b`.
- Phase 1 implementation commit: `dd9b5ea`.

## Environment Assumptions

- Current workspace: `/home/aayush/Desktop/devlopment`.
- Real credentials must be provided through local environment variables and never committed.
- Future Phase 1 should introduce actual dependency management and local development commands.

## Blockers

Phase 2 blocker: `npm audit --audit-level=moderate` reports vulnerabilities introduced by the current official `@google/adk@2.0.0` dependency tree. `npm audit fix` cannot resolve them without npm suggesting a breaking package change. Attempted overrides made the dependency tree invalid, so they were removed.

## Next Exact Task

Next exact task: resolve the ADK dependency audit blocker, either by finding a compatible patched `@google/adk` release, selecting an approved older ADK version after verifying its API and audit state, or documenting an explicit user-approved audit exception.
