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

## 2026-08-31 - Real Confidential Space Attestation Gate

Decision: Require Google-signed Confidential Space attestation verification before SecureExecutor receipts can report `evidenceVerified: true`.

Context: Phase 7 must prove real TEE execution without API keys, OAuth client secrets, service-account JSON keys, or long-lived cloud credentials.

Alternatives:

- Accept structured attestation fields without signature verification.
- Keep Phase 7 in local development mode.
- Use debug Confidential Space images for easier logging.

Chosen Approach: Package the SecureExecutor workload as a container, push it to Artifact Registry, run it on a production Google Confidential Space VM, retrieve an attestation token from the launcher `/v1/token` endpoint, and verify the signed token against expected audience, workload service account, image digest, image reference, project, zone, secure boot, stable support attributes, and production debug status.

Reason: This gives LaunchForge a concrete hardware-backed execution proof while preserving the rule that agents and the frontend never receive sponsor credentials.

Consequences: Local execution remains available but always reports `evidenceVerified: false`. Production verified receipts require current Confidential Space evidence matching the deployed workload policy.

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

## 2026-08-31 - Protected name.com Registration Start

Decision: Implement name.com Create Domain only behind approved SecureExecutor execution.

Context: Phase 8 introduces a paid domain purchase path. The local `.env` was switched to the name.com development/test environment so verification could run without a production purchase.

Alternatives:

- Call Create Domain directly from the Domain Agent.
- Reuse dry-run execution as if registration were complete.
- Execute a production purchase immediately.

Chosen Approach: Add a `registerDomain` method to the name.com adapter, require an approved `namecom.registerDomain` action, re-check availability inside SecureExecutor, block premium/non-registration purchases for Phase 8, and use the approval ID as the name.com `X-Idempotency-Key`.

Reason: This preserves AgentLatch exact-action authorization, prevents double purchase retries, and keeps name.com credentials available only inside the secure operation context.

Consequences: Registration is implemented, locally tested with mocks, and verified against the name.com development/test environment. Production Create Domain must still require explicit user confirmation for the exact domain.

Reversibility: Medium.

## 2026-09-01 - Static Website/Product Artifact Generation

Decision: Implement Phase 9 as deterministic static website artifact generation inside the existing agent layer.

Context: Phase 9 needs website generation, artifact storage, build validation, preview, and deployment preparation before the Xano backend and deployment phases exist.

Alternatives:

- Add a new LLM provider requirement for website generation.
- Generate only mock UI text without artifact files.
- Wait for the deployment phase before producing website artifacts.

Chosen Approach: Add a Website/Product Agent that consumes the startup idea, optional market brand research, and optional domain research, then produces `index.html`, `styles.css`, and `app.js` as typed project artifacts with deterministic validation checks and deployment metadata.

Reason: This creates a real, previewable product surface without introducing another API key or exposing sponsor credentials to generated artifacts.

Consequences: Phase 9 produces static frontend artifacts ready for later backend wiring and deployment. Dynamic backend behavior remains intentionally deferred to Phase 10 and Phase 11.

Reversibility: High.

## 2026-09-01 - Protected Xano Metadata API Provisioning

Decision: Implement Xano provisioning through a Backend Agent plan plus a protected SecureExecutor route.

Context: Phase 10 requires real backend functionality powered by Xano, but Xano workspace changes are external infrastructure actions and the Xano API key must never be exposed to agents, generated artifacts, or the frontend.

Alternatives:

- Let the Backend Agent call Xano directly.
- Store the Xano token in generated website code.
- Only generate a mock backend plan.

Chosen Approach: Add a Xano Metadata API adapter using bearer authentication and `text/x-xanoscript`, generate backend artifacts locally, require an approved `xano.provisionBackend` AgentLatch request, and resolve `XANO_API_KEY` only inside SecureExecutor.

Reason: This keeps infrastructure mutation behind the same approval and exact-action authorization boundary as other sensitive sponsor operations.

Consequences: The implementation can be tested with mocked Xano responses and local planning can run without credentials. Phase 10 was marked complete only after real Xano credentials were configured, workspace `168062` was provisioned through the protected path, and Metadata API read-back verified the created resources.

Reversibility: Medium.

## 2026-09-01 - Local Static Deployment First

Decision: Implement Phase 11 as local static deployment of generated website artifacts through the API service.

Context: Phase 11 requires deployment workflow, state, environment, health checks, errors, and progress. No `.openai/hosting.json` exists in the repository, and public production hosting/DNS wiring belongs later in the full launch hardening path.

Alternatives:

- Add a new external deployment provider immediately.
- Treat the iframe preview as a deployment.
- Wait for the final orchestration phase before adding deployment state.

Chosen Approach: Add a local deployment service that writes validated website artifact files to `DATA_DIR/deployments/{deployment_id}`, serves them under `/deployments/{deployment_id}/`, stores a typed deployment record, and runs deterministic health checks.

Reason: This produces a real accessible URL for generated products without adding another credential surface or exposing sponsor secrets.

Consequences: Phase 11 deployments are local to the API process. Public production hosting and DNS routing remain later-phase work.

Reversibility: High.

## 2026-09-01 - SecureExecutor-Gated Foxit Document Generation

Decision: Implement Phase 12 document generation as a credential-free Document Agent plus a SecureExecutor-gated Foxit adapter call.

Context: Phase 12 requires real Foxit document/PDF workflows, while Phase 13 separately handles eSign and must remain human-only.

Alternatives:

- Let the Document Agent call Foxit directly.
- Generate local PDFs and claim the sponsor phase is complete.
- Add eSign preparation and sending in the same phase.

Chosen Approach: The Document Agent prepares founder launch brief, investor one-pager, and technical delivery summary payloads without credentials. The API creates a `foxit.generateDocument` action request, AgentLatch auto-allows it as a generated artifact action, and SecureExecutor resolves Foxit credentials only inside the protected operation before calling the Foxit adapter.

Reason: This preserves the sponsor credential boundary while avoiding unnecessary human approval for non-signature document generation.

Consequences: The implementation can be tested locally with mocked Foxit responses and refuses to fake live sponsor output when credentials are missing. Phase 12 was completed only after real Foxit credentials were configured, `GenerateDocumentBase64` returned valid PDF payloads, and generated files were verified with `%PDF-` signatures.

Reversibility: Medium.

## 2026-09-02 - Human-Only Foxit eSign Boundary

Decision: Implement real Fusion eSign draft/status workflows while keeping `foxit.sendForSignature` non-executable for AI agents.

Context: Phase 13 requires Foxit eSign workflows, but the product requirement explicitly says AI prepares documents and cannot sign as the user.

Alternatives:

- Let an approval convert eSign send into an executable action.
- Reuse the Phase 12 DocGen path and ignore eSign-specific API boundaries.
- Defer all eSign UX until live credentials are available.

Chosen Approach: Add typed `FoxitESignPackage` state, dashboard preparation controls, SecureExecutor-gated Fusion draft envelope creation, embedded human send/sign handoff, manual envelope status recording, and a read-only Foxit eSign status adapter. `foxit.sendForSignature` remains `HUMAN_ONLY`, cannot create a normal approval, and returns a 409 safety response if the AI path attempts it.

Reason: This gives the founder a prepared package and completion-state tracking while preserving signer identity and consent as human-only acts.

Consequences: Phase 13 is complete after a real Fusion eSign envelope `35688804` was created with the existing Foxit Developer Portal application credentials, sent by the human in Foxit, signed by the human signer, and verified through Foxit status read-back as `EXECUTED`. Local SecureExecutor eSign receipts still report `evidenceVerified: false`; `evidenceVerified: true` remains reserved for genuine Google Confidential Space attestation. Separate `FOXIT_ESIGN_CLIENT_ID` / `FOXIT_ESIGN_CLIENT_SECRET` values are reserved only for an intentional switch to Foxit's legacy eSign credential model.

Reversibility: Medium.

## 2026-09-02 - Resumable Full Orchestration Gate

Decision: Implement Phase 14 full orchestration as a resumable controller that pauses at protected approval gates.

Context: LaunchForge can now run market research, domain research, website generation, backend planning, deployment, Foxit document generation, and eSign preparation. Xano provisioning is an infrastructure-changing sponsor action and must not be executed until an approval converts the AgentLatch decision into an executable authorization.

Chosen Approach: Add `POST /api/projects/:projectId/orchestrate/full` and a dashboard `Run Full Launch` action. The route runs completed agent capabilities in dependency order, reuses existing artifacts, creates or waits for a Xano provisioning approval, resumes after that approval is granted, and stops at the human eSign boundary.

Reason: This creates the end-to-end product spine while preserving exact-action approval, secret isolation, and human-only signing.

Consequences: Phase 14 is complete after automated pause/resume coverage and a live local run. The route reached Xano approval `7b09a5ac-e4c7-4492-a7d7-589b92762b9e`, resumed after human approval, provisioned Xano API group `430840`, deployed a healthy static site, generated Foxit documents, and stopped at the human eSign boundary.

Reversibility: Medium.

## 2026-09-02 - Redacted Audit Events and Security Center

Decision: Implement Phase 15 Audit + Security Center with automated secret redaction, immutable audit events, query filtering, and a dashboard Security Center.

Context: LaunchForge and AgentLatch require transparent governance for every policy decision, approval, TEE execution, eSign event, and agent action, without ever exposing secrets in audit logs or API output.

Chosen Approach: Add shared `AuditEvent` Zod schemas, a file-backed `FileAuditRepository` in the API, recursive redaction for sensitive keys (e.g. `api_key`, `secret`, `token`) and high-entropy strings, `GET /api/audit-events` with `projectId`, `type`, and `limit` filters, and dashboard Security Center and Audit Timeline panels.

Reason: This provides full traceability and compliance evidence for human approvals, TEE attestation, and AgentLatch policy decisions while guaranteeing secret isolation.

Consequences: Local SecureExecutor audit receipts report `evidenceVerified: false`; `evidenceVerified: true` remains strictly reserved for verified Google Confidential Space attestation tokens. `foxit.sendForSignature` evaluations record `HUMAN_ONLY` decisions with `executable: false`.

Reversibility: Medium.

## 2026-09-02 - Active Navigation Tabs and Explicit Approval Controls

Decision: Implement Phase 16 Final UI / UX with interactive active sidebar navigation tabs and explicit labeled approval buttons.

Context: Users needed clear visual feedback for navigation view switching and explicit, unambiguous action controls for protected approvals.

Chosen Approach: Connect sidebar navigation items (`Dashboard`, `New Launch`, `Live Workspace`, `Approvals`, `Security`, `Audit`) to an `activeTab` state with highlighted active styling. Replace icon-only approval buttons with explicit, labeled buttons (`Approve`, `Reject`, `Dry Run`, `Register Domain`, `Provision Backend`) featuring distinct color indicators and hover states.

Reason: This eliminates user confusion around card vs button clicks and makes navigation and approval actions visually striking and intuitive.

Consequences: Phase 16 is complete after full workspace unit test validation, active tab switching verification, labeled approval button testing, and no-vulnerabilities security audit.

Reversibility: Medium.
