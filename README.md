# LaunchForge + AgentLatch

LaunchForge is an autonomous AI startup-launching platform. A user provides a startup idea, and LaunchForge coordinates specialized AI agents to research the market, create a brand, find and register domains, generate a product website, provision backend functionality, deploy the product, prepare founder documents, and track the entire launch through an audit trail.

AgentLatch is the enforceable authorization layer between AI agents and sensitive tools. It classifies requested actions as auto-allowed, approval-required, high-risk approval, human-only, or denied. Privileged operations are designed to flow through a secure execution boundary so agents never receive protected credentials directly.

## Current Status

Phase 0, Project Analysis & Master Design, is complete as the initial repository foundation. The repository is intentionally documentation-first because this is a new project repo and later phases must be built one complete subsystem at a time.

## Sponsor Integrations

- SerpApi: market intelligence, competitor research, naming conflict research.
- name.com: domain search, availability, registration, DNS operations.
- Xano: generated product backend, APIs, data models, auth where appropriate.
- Foxit: business document generation, PDF workflows, eSign routing.

## Architecture Summary

LaunchForge will be built as a full-stack application with:

- A command-center frontend for launch creation, live agent status, approvals, artifacts, audit, and final summary.
- A backend API for projects, workflows, events, approvals, policies, secure execution requests, and sponsor integration adapters.
- Google ADK-based application agents behind modular tool interfaces.
- AgentLatch as deterministic policy and authorization infrastructure, not as an LLM agent.
- A future hardware-backed TEE or confidential computing executor for privileged sponsor operations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

## Development Flow

This project is developed phase by phase:

1. Complete one phase.
2. Test it.
3. Review it independently.
4. Update documentation and status.
5. Commit and push.
6. Move to the next phase only after approval.

See [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md), [STATUS.md](./STATUS.md), and [RULES.md](./RULES.md).

## Setup

No runtime application has been created yet. Phase 1 will establish the application foundation, dependency stack, build commands, test commands, and local development instructions.

Prepare local environment variables from:

```bash
cp .env.example .env
```

Never commit `.env` or real credentials.

