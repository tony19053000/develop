# Secure Execution

## Phase 7 Status

LaunchForge has a SecureExecutor abstraction, development-mode enforcement, and real Google Confidential Space attestation verification. It is not hardware-backed in local development.

Selected real TEE path: Google Confidential Space.

AWS Nitro Enclaves remains a viable alternative, but Google Confidential Space is the preferred target for LaunchForge because it is container-oriented, fits the existing TypeScript service packaging direction, and supports confidential workloads with attestation-oriented access to protected resources.

## Boundary

Protected sponsor operations must flow through:

```text
Agent action request
  -> AgentLatch policy result
  -> Human approval when required
  -> Executable exact-action decision
  -> SecureExecutor
  -> Allowlisted secret access
  -> Sponsor API operation
  -> Secure execution receipt
```

Agents do not receive sponsor credentials. Secure operations receive a context object that can resolve only explicitly allowlisted secret names.

## Local Mode

`SECURE_EXECUTOR_MODE=development` verifies:

- AgentLatch decision is executable.
- Action request ID matches the approval.
- Payload hash matches the approved exact payload.
- Protected operation is not called when validation fails.
- Secret access is allowlisted.
- A receipt is created with `evidenceVerified: false`.

Local mode must never be described as hardware-backed.

## Google Confidential Space Mode

`SECURE_EXECUTOR_MODE=google_confidential_space` requires structured evidence:

- `TEE_PROVIDER=google_confidential_space`
- `TEE_ATTESTATION_TOKEN`
- `TEE_WORKLOAD_IDENTITY`
- `TEE_IMAGE_DIGEST`
- `TEE_IMAGE_REFERENCE`
- `TEE_ATTESTATION_AUDIENCE`
- `TEE_GCP_PROJECT_ID`
- `TEE_GCP_ZONE`

The SecureExecutor verifies the Google-signed attestation token before execution can produce a receipt with `evidenceVerified: true`. Verification checks:

- Issuer `https://confidentialcomputing.googleapis.com`.
- Expected audience.
- `swname=CONFIDENTIAL_SPACE`.
- Production debug status `disabled-since-boot`.
- Secure Boot.
- Stable Confidential Space support attributes.
- Expected workload service account.
- Expected container image digest and image reference.
- Expected Google Cloud project and zone when configured.

Phase 7 was verified against:

- Project: `launchforge-tee`
- Workload service account: `launchforge-tee-workload@launchforge-tee.iam.gserviceaccount.com`
- Artifact Registry repository: `us-central1/launchforge-secure-executor`
- Workload image: `us-central1-docker.pkg.dev/launchforge-tee/launchforge-secure-executor/secure-executor@sha256:11a74bc84df6c1ec2d5b644d03c74a195598b0edacbfacd148c2a2c5ed7592c5`
- Confidential Space zone: `us-central1-c`
- Evidence export bucket: `gs://launchforge-tee-phase7-evidence`

The workload service account received only the additional bucket-level `roles/storage.objectCreator` role needed to write attestation evidence. Sponsor secrets are not written to the bucket, logs, frontend, or agent context.

## Phase 8 Handoff

Protected name.com registration must use the SecureExecutor after AgentLatch and human approval. The first registration implementation should remain blocked unless:

- An approval request has status `approved`.
- The approval decision is executable.
- The payload hash matches the registration payload.
- The secure executor mode and evidence requirements pass.
- Sponsor credentials are only resolved inside the secure execution operation.

Phase 8 registration uses the name.com Create Domain endpoint only after a fresh availability re-check inside SecureExecutor. The approval ID is sent as the name.com `X-Idempotency-Key` so retries do not double-purchase. Phase 8 permits only standard non-premium `registration` purchases; premium, aftermarket, expiring, or backorder acquisitions remain blocked until separate pricing and claims controls are added.

Phase 8 was verified against `https://api.dev.name.com` by registering sandbox domain `launchforge-phase8-1788261813202.com` through `AgentLatch -> approval -> SecureExecutor -> availability re-check -> name.com Create Domain`. The sandbox order was `2132723`, and the post-registration availability check reported `purchasable: false`.

## Phase 12 Foxit Handoff

Foxit document generation uses the same SecureExecutor credential boundary even though `foxit.generateDocument` is an AgentLatch `AUTO_ALLOW` action.

```text
Document Agent
  -> foxit.generateDocument request
  -> AgentLatch AUTO_ALLOW executable decision
  -> SecureExecutor
  -> FOXIT_CLIENT_SECRET secret resolution
  -> Foxit DocGen API
  -> receipt
```

The Document Agent prepares founder-facing business documents without credentials. The frontend only receives document metadata and generated artifact records. Foxit credential values must not be included in project state, generated markdown, receipt results, frontend state, or logs.

Local development execution must still report `evidenceVerified: false`. Phase 12 cannot be marked complete until a real Foxit call succeeds. In Google Confidential Space mode, `evidenceVerified: true` remains tied to the Phase 7 attestation policy and not to the mere presence of Foxit credentials.

`foxit.sendForSignature` remains `HUMAN_ONLY` and is reserved for Phase 13.

Phase 12 was live verified with `https://na1.fusion.foxit.com/document-generation/api/GenerateDocumentBase64`. The local development receipt correctly reported `evidenceVerified: false`; the generated PDF files were stored under `/documents`, served as `application/pdf`, and validated with `%PDF-` signatures.
