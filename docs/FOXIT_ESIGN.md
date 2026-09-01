# Foxit eSign

## Phase 13 Status

Phase 13 is implemented as a checkpoint and awaits Foxit Developer Portal eSign activation for the existing application.

Foxit's current eSign API uses the Fusion host and the same header-auth style as other current Foxit APIs:

```text
https://na1.fusion.foxit.com/esign/api/v1/...
```

The current create-envelope endpoint is:

```text
POST https://na1.fusion.foxit.com/esign/api/v1/folders/createfolder
```

Reference:

- https://app.developer-api.foxit.com/reference/tag/esign-api-overview
- https://app.developer-api.foxit.com/reference/tag/quick-start---send-a-document-for-signature
- https://app.developer-api.foxit.com/reference/tag/envelopes/POST/esign/api/v1/folders/createfolder

## Human-Only Boundary

`foxit.sendForSignature` is classified by AgentLatch as `HUMAN_ONLY`.

That means:

- No normal approval request can convert it into an executable action.
- SecureExecutor rejects it because the AgentLatch decision is not executable.
- The frontend can show preparation status but cannot send or sign as the user.

## Implemented Workflow

```text
Generated Foxit PDFs
  -> Prepare eSign package
  -> Record signer role and selected documents
  -> Show human-only status in dashboard
  -> AI send attempt returns 409 HUMAN_ONLY
```

Optional read-only status refresh:

```text
Foxit envelope id
  -> foxit.getEnvelopeStatus request
  -> AgentLatch AUTO_ALLOW
  -> SecureExecutor
  -> FOXIT_CLIENT_SECRET
  -> Foxit Fusion eSign status endpoint
```

## Required Environment

Current Fusion eSign uses the existing Foxit Developer Portal application credentials:

```bash
FOXIT_CLIENT_ID=your_foxit_client_id
FOXIT_CLIENT_SECRET=your_foxit_client_secret
FOXIT_ESIGN_BASE_URL=https://na1.fusion.foxit.com
```

Only use `FOXIT_ESIGN_CLIENT_ID` and `FOXIT_ESIGN_CLIENT_SECRET` if the project intentionally switches to Foxit's legacy eSign API credential model.

## Verification

Checkpoint verification:

- eSign package preparation returns HTTP 200.
- AI send attempt returns HTTP 409 with `HUMAN_ONLY`.
- Manual envelope state can be recorded as `shared`, `completed`, or `executed`.
- Read-only status refresh is implemented through SecureExecutor and tested with mocked Foxit responses.
- Existing `foxit.sendForSignature` AgentLatch policy test confirms the action is not executable.

Live activation status:

- Dummy credentials return JSON `401 Invalid credentials` from Fusion eSign, confirming the host is reachable.
- The current app credentials return HTTP 502 HTML from Fusion eSign, so eSign activation/access for the app needs review in the Foxit Developer Portal.

Pending live verification:

- Verify eSign is activated for the existing Foxit Developer Portal application.
- Run a real Fusion eSign folder/signing workflow.
- Verify read-only envelope/folder status refresh.
- Keep send/sign execution outside the AI path.
