# Secure Execution

## Phase 7 Status

LaunchForge now has a SecureExecutor abstraction and development-mode enforcement. It is not hardware-backed in local development.

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

Current code validates that evidence is present and structured before execution. A later cloud deployment must verify the attestation token against Google Cloud claims before production protected sponsor operations are enabled.

## Phase 8 Handoff

Protected name.com registration must use the SecureExecutor after AgentLatch and human approval. The first registration implementation should remain blocked unless:

- An approval request has status `approved`.
- The approval decision is executable.
- The payload hash matches the registration payload.
- The secure executor mode and evidence requirements pass.
- Sponsor credentials are only resolved inside the secure execution operation.
