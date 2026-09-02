# CLAUDE.md - Project Guide & Handoff for LaunchForge + AgentLatch

Welcome to **LaunchForge + AgentLatch**. This repository is a production-ready, full-stack autonomous AI startup-launching platform with an enforceable security authorization layer (AgentLatch).

---

## 1. Executive Summary & Product Intent

- **LaunchForge**: An autonomous AI startup-launching command center. Given a startup idea from a founder, it coordinates specialized AI agents (using LangGraph) to conduct market research, generate branding, search and register domains, build static product landing pages, plan & provision backend APIs, deploy local product instances, generate founder documents, and prepare eSign packages.
- **AgentLatch**: A deterministic, enforceable policy & authorization layer positioned between AI agents and sensitive/privileged tools. It classifies requested operations into `AUTO_ALLOW`, `APPROVAL_REQUIRED`, `HIGH_RISK_APPROVAL`, `HUMAN_ONLY`, or `DENY`.
- **Confidential Computing / TEE**: Privileged operations flow through `SecureExecutor`. In production, execution is hardware-attested via **Google Confidential Space** (`launchforge-tee`) with Google-signed attestation tokens (`evidenceVerified: true`).

---

## 2. Quick Start & Common Commands

Always work within the repository root `/home/aayush/Desktop/devlopment`.

### Core Development Commands

```bash
# Install dependencies
npm install

# Run the backend API (port 4000) and frontend web app (port 5173) concurrently
npm run dev

# Full workspace static analysis & test execution
npm run typecheck
npm run test
npm run lint
npm run build
npm audit --audit-level=moderate
```

### Targeted Workspace Commands

```bash
# Run tests for specific packages
npm run test -w @launchforge/api
npm run test -w @launchforge/web
npm run test -w @launchforge/shared
npm run test -w @launchforge/agentlatch
npm run test -w @launchforge/secure-executor
npm run test -w @launchforge/agents
npm run test -w @launchforge/integrations

# Run typecheck for specific apps/packages
npm run typecheck -w @launchforge/api
npm run typecheck -w @launchforge/web
npm run build -w @launchforge/shared
```

---

## 3. Repository & Monorepo Layout

This project uses **npm workspaces** with TypeScript:

```
devlopment/
├── apps/
│   ├── api/             # Express.js REST API server, SSE event stream, project persistence
│   └── web/             # React + Vite Command Center dashboard frontend
├── packages/
│   ├── shared/          # Shared Zod schemas, TypeScript types, audit models
│   ├── agents/          # LangGraph multi-agent orchestrator & specialized agents
│   ├── agentlatch/      # Deterministic policy engine & payload hash verification
│   ├── secure-executor/ # TEE / local isolation secure execution boundary
│   └── integrations/    # External sponsor API adapters (SerpApi, name.com, Xano, Foxit)
├── infra/
│   └── secure-executor/ # Google Confidential Space TEE container definition & Dockerfile
└── docs/                # Architecture, security, and integration documentation
```

---

## 4. Architecture & Security Model

### Trust Boundary & Protected Execution Path

Agents may request actions, but **agents cannot authorize or execute sensitive operations directly**.

```text
AI Agent / Application
  └──► Structured ToolActionRequest
        └──► AgentLatch Policy Engine (Deterministic Rule Evaluation)
              ├──► AUTO_ALLOW ──────────────────────────────────────────┐
              ├──► APPROVAL_REQUIRED ──► Human Approver ──► Token Hash ─┤
              ├──► HUMAN_ONLY --------──► Blocked / UI Handoff          │
              └──► DENY ─────────────────► Blocked                      │
                                                                        ▼
                                                             SecureExecutor (TEE)
                                                                │ (Resolves Secrets)
                                                                ▼
                                                             Sponsor API
```

### AgentLatch Policy Categories
1. **`AUTO_ALLOW`**: Read-only queries (SerpApi market research, name.com domain search).
2. **`APPROVAL_REQUIRED`**: Paid or mutating infra actions (name.com domain registration, Xano backend provisioning). Bound to exact payload hashes & signed HMAC approval tokens.
3. **`HUMAN_ONLY`**: Sensitive human legal boundaries (e.g., `foxit.sendForSignature`). AI can generate draft PDFs and prepare eSign envelopes, but sending or signing is strictly forbidden for AI.
4. **`DENY`**: Unrecognized, illegal, or out-of-scope actions.

### TEE & Secret Protection Rules
- **Secrets Isolation**: Secrets (`SERPAPI_API_KEY`, `NAMECOM_API_TOKEN`, `XANO_API_KEY`, `FOXIT_CLIENT_SECRET`, `APPROVAL_TOKEN_SECRET`) are **never** exposed to frontend client apps, LLM prompts, LLM responses, logs, or generated artifacts.
- **Local vs TEE Execution**: Local execution reports `evidenceVerified: false`. Google Confidential Space hardware attestation reports `evidenceVerified: true`.

---

## 5. Sponsor Integrations & Endpoints

| Sponsor | Purpose | Key API Base URL / Endpoint | Policy |
| :--- | :--- | :--- | :--- |
| **SerpApi** | Market & Competitor Intelligence | `https://serpapi.com/search` | `AUTO_ALLOW` |
| **name.com** | Domain Search & Protected Purchase | Sandbox: `https://api.dev.name.com` | `APPROVAL_REQUIRED` |
| **Xano** | Backend API & Database Provisioning | Workspace Base: `https://x8ki-letl-twmt.n7.xano.io` | `APPROVAL_REQUIRED` |
| **Foxit** | Document PDF Generation | `https://na1.fusion.foxit.com/document-generation/api/GenerateDocumentBase64` | `AUTO_ALLOW` (Gated) |
| **Foxit Fusion** | eSign Drafts & Envelope Tracking | `https://na1.fusion.foxit.com/esign/api/v1/` | `HUMAN_ONLY` (Send/Sign) |

---

## 6. Environment Variables Setup (`.env`)

Environment variables are loaded from `.env` in the root directory (never commit `.env`!):

```bash
# Market Intelligence
SERPAPI_API_KEY=your_serpapi_key_here

# Domain Operations (name.com)
NAMECOM_USERNAME=your_namecom_username
NAMECOM_API_TOKEN=your_namecom_api_token
NAMECOM_API_BASE_URL=https://api.dev.name.com

# Approval Security
APPROVAL_TOKEN_SECRET=replace_with_a_long_random_secret

# Backend Provisioning (Xano)
XANO_API_KEY=your_xano_metadata_api_token
XANO_WORKSPACE_ID=168062
XANO_INSTANCE_BASE_URL=https://x8ki-letl-twmt.n7.xano.io

# Document & eSign Operations (Foxit)
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
FOXIT_API_BASE_URL=https://na1.fusion.foxit.com
FOXIT_DOCUMENT_GENERATION_PATH=/document-generation/api/GenerateDocumentBase64
FOXIT_ESIGN_BASE_URL=https://na1.fusion.foxit.com
```

---

## 7. Operational & Coding Guidelines

1. **Phase Development Protocol**: The project was developed across 20 phases (Phases 0 - 19), all of which are 100% complete and submission-ready.
2. **Secret Hygiene**: Before every commit, perform a secret scan to ensure no real API tokens or secrets are checked in:
   ```bash
   git status --short
   rg -n "FOXIT_CLIENT_SECRET=|NAMECOM_API_TOKEN=|SERPAPI_API_KEY=|XANO_API_KEY=|eyJhbGci|Bearer " . --glob '!node_modules' --glob '!dist' --glob '!data' --glob '!.env'
   ```
3. **Strict Policy Enforcement**: Never downgrade `HUMAN_ONLY` actions into normal approvals.
4. **Resumable Orchestration**: `POST /api/projects/:projectId/orchestrate/full` executes multi-agent handoffs sequentially, pausing at pending approvals (such as Xano provisioning) and resuming post-approval.

---

## 8. Current Project Status (100% Complete)

- **Overall Progress**: 100% (Phases 0 through 19 complete).
- **Git State**: Clean working tree on `main` branch.
- **Verification Status**: 83/83 unit and integration tests passing across all packages; static typecheck clean; zero moderate/high audit vulnerabilities.
