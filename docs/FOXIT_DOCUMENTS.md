# Foxit Documents

## Phase 12 Status

Phase 12 is implemented as a checkpoint and awaits live Foxit credential verification.

The implemented workflow follows Foxit's public API direction: Foxit provides cloud PDF Services and Document Generation APIs for generating documents from structured data and templates. The public reference describes a document-generation endpoint that merges structured JSON input into predefined templates.

References:

- https://developer-api.foxit.com/
- https://app.developer-api.foxit.com/reference/tag/document-generation-overview
- https://app.developer-api.foxit.com/reference/tag/generate-a-document

## Runtime Flow

```text
Document Agent
  -> prepared founder documents
  -> foxit.generateDocument action request
  -> AgentLatch AUTO_ALLOW
  -> SecureExecutor
  -> Foxit credential resolution
  -> Foxit document generation API
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

Set either:

```bash
FOXIT_API_KEY=your_foxit_api_key
```

or:

```bash
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
```

Optional endpoint overrides:

```bash
FOXIT_API_BASE_URL=https://api.developer-api.foxit.com
FOXIT_DOCUMENT_GENERATION_PATH=/document-generation/api/v1/documents/generate
```

## Security Boundary

`foxit.generateDocument` is auto-allowed by AgentLatch because it creates generated artifacts. It still runs through SecureExecutor so privileged Foxit credentials are only resolved in the protected operation context.

`foxit.sendForSignature` is human-only and intentionally not implemented in Phase 12. Signature routing belongs to Phase 13.

Local development mode reports `evidenceVerified: false`. Only a real Google Confidential Space deployment with valid attestation may report `evidenceVerified: true`.

## Verification

Checkpoint verification:

- `npm run typecheck`
- `npm run test`
- Local no-credential smoke test: HTTP 424 from `POST /api/projects/:projectId/documents`.

Completion verification still required:

- Configure real Foxit credentials in local `.env`.
- Run `POST /api/projects/:projectId/documents`.
- Confirm Foxit returns document metadata for all generated founder PDFs.
- Confirm no credential values are present in project JSON, frontend state, logs, or generated documents.
- Reviewer/Tester independently verifies the run.
