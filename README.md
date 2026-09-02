# LaunchForge + AgentLatch

LaunchForge is an autonomous AI startup-launching platform. A user provides a startup idea, and LaunchForge coordinates specialized AI agents to research the market, create a brand, find and register domains, generate a product website, provision backend functionality, deploy the product, prepare founder documents, and track the entire launch through an audit trail.

AgentLatch is the enforceable authorization layer between AI agents and sensitive tools. It classifies requested actions as auto-allowed, approval-required, high-risk approval, human-only, or denied. Privileged operations are designed to flow through a secure execution boundary so agents never receive protected credentials directly.

## Current Status

Phase 13 is complete and approved. The repository contains a runnable full-stack TypeScript foundation with a React command-center shell, Express API, shared launch contracts, file-backed project storage, SSE event plumbing, LangGraph orchestration, live-verified SerpApi market research, live-verified name.com domain availability and protected development/test registration, deterministic AgentLatch policies, signed human approval flows, verified Google Confidential Space secure execution, generated product website artifacts with dashboard preview, verified protected Xano backend provisioning, local static deployment with health checks, live-verified SecureExecutor-gated Foxit PDF document generation, and live-verified Foxit Fusion eSign draft/status workflow with human-only send/sign protection.

## Sponsor Integrations

- SerpApi: market intelligence, competitor research, naming conflict research.
- name.com: domain search, availability, registration, DNS operations.
- Xano: generated product backend, APIs, data models, auth where appropriate.
- Foxit: business document generation, PDF workflows, and Fusion eSign draft/status workflows live verified; send/sign remains blocked as human-only.

## Architecture Summary

LaunchForge will be built as a full-stack application with:

- A command-center frontend for launch creation, live agent status, approvals, artifacts, audit, and final summary.
- A backend API for projects, workflows, events, approvals, policies, secure execution requests, and sponsor integration adapters.
- LangGraph-based application agents/workflows behind modular tool interfaces.
- AgentLatch as deterministic policy and authorization infrastructure, not as an LLM agent.
- A future hardware-backed TEE or confidential computing executor for privileged sponsor operations.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full design.

See [docs/SECURE_EXECUTION.md](./docs/SECURE_EXECUTION.md) for the selected TEE path and local-vs-hardware-backed boundary.

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

Prepare local environment variables from:

```bash
cp .env.example .env
```

Never commit `.env` or real credentials.

For Phase 3 live market research, set:

```bash
SERPAPI_API_KEY=your_serpapi_key_here
```

For Phase 4 live domain availability, set:

```bash
NAMECOM_USERNAME=your_namecom_username
NAMECOM_API_TOKEN=your_namecom_api_token
NAMECOM_API_BASE_URL=https://api.dev.name.com
```

For local approval tokens, set a private secret:

```bash
APPROVAL_TOKEN_SECRET=replace_with_a_long_random_secret
```

For Phase 10 live Xano backend provisioning, set:

```bash
XANO_API_KEY=your_xano_metadata_api_token
XANO_WORKSPACE_ID=your_xano_workspace_id
XANO_INSTANCE_BASE_URL=https://your-instance.xano.io
```

For Phase 12 live Foxit document generation, set:

```bash
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
```

Optional Foxit endpoint overrides:

```bash
FOXIT_API_BASE_URL=https://na1.fusion.foxit.com
FOXIT_DOCUMENT_GENERATION_PATH=/document-generation/api/GenerateDocumentBase64
```

For Phase 13 Foxit eSign, current Fusion eSign uses the same Foxit application credentials after eSign is activated in the Foxit Developer Portal:

```bash
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
FOXIT_ESIGN_BASE_URL=https://na1.fusion.foxit.com
```

Use `FOXIT_ESIGN_CLIENT_ID` and `FOXIT_ESIGN_CLIENT_SECRET` only when intentionally integrating Foxit's legacy eSign API credential model.

Install dependencies:

```bash
npm install
```

Run the full local application:

```bash
npm run dev
```

Default URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:4000`

Useful checks:

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --audit-level=moderate
```
