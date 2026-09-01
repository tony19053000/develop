# Foxit Documents

## Phase 12 Status

Phase 12 is complete and live verified.

The implemented workflow follows Foxit's current DocGen API direction: `GenerateDocumentBase64` receives a base64 DOCX template, structured `documentValues`, and an output format, then returns the generated PDF as base64 in the same response.

References:

- https://developer-api.foxit.com/
- https://developer-api.foxit.com/developer-blogs/api-guides-tutorials/document-generation-api-quickstart/

## Runtime Flow

```text
Document Agent
  -> prepared founder documents
  -> foxit.generateDocument action request
  -> AgentLatch AUTO_ALLOW
  -> SecureExecutor
  -> Foxit credential resolution
  -> Foxit GenerateDocumentBase64 API
  -> PDF bytes stored under /documents
  -> persisted DocumentArtifact
```

## Generated Documents

The Document Agent prepares:

- Founder launch brief.
- Investor one-pager.
- Technical delivery summary.

The agent receives launch context such as market research, selected domain, generated website artifact, backend artifact, and deployment URL. It does not receive Foxit credentials.

## API

```text
POST /api/projects/:projectId/documents
```

Behavior:

- Prepares document payloads from project state.
- Validates that required founder document types exist.
- Validates that generated markdown does not include credential labels.
- Creates a `foxit.generateDocument` action request.
- Executes through SecureExecutor.
- Persists returned Foxit document IDs and optional download URLs.

## Required Environment

Set:

```bash
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
```

Optional endpoint overrides:

```bash
FOXIT_API_BASE_URL=https://na1.fusion.foxit.com
FOXIT_DOCUMENT_GENERATION_PATH=/document-generation/api/GenerateDocumentBase64
```

## Security Boundary

`foxit.generateDocument` is auto-allowed by AgentLatch because it creates generated artifacts. It still runs through SecureExecutor so privileged Foxit credentials are only resolved in the protected operation context.

`foxit.sendForSignature` is human-only and intentionally not implemented in Phase 12. Signature routing belongs to Phase 13.

Local development mode reports `evidenceVerified: false`. Only a real Google Confidential Space deployment with valid attestation may report `evidenceVerified: true`.

## Verification

Verification:

- `npm run typecheck`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`
- Local no-credential smoke test: HTTP 424 from `POST /api/projects/:projectId/documents`.
- Live Foxit smoke test: HTTP 200 from `POST /api/projects/68d5b4b2-7855-4256-9af5-b2a81a463359/documents`.
- PDF signature checks passed for all generated files.
- Static serving check passed with `Content-Type: application/pdf`.

Live outputs:

- Founder launch brief: `6523` bytes.
- Investor one-pager: `6399` bytes.
- Technical delivery summary: `6527` bytes.

Reviewer/Tester independently verified Phase 12 after the real Foxit run.
