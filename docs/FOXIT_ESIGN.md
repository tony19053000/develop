# Foxit eSign

## Phase 13 Status

Phase 13 is complete and approved.

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
- https://app.developer-api.foxit.com/reference/tag/envelopes/GET/esign/api/v1/folders/myfolder

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
  -> Create Fusion eSign draft envelope
  -> Return embedded human send/sign URL
  -> Human sends and signs in Foxit
  -> Refresh read-only envelope status
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

Completed verification:

- eSign package preparation returns HTTP 200.
- AI send attempt returns HTTP 409 with `HUMAN_ONLY`.
- Manual envelope state can be recorded as `shared`, `completed`, or `executed`.
- Real Fusion eSign draft creation succeeds through SecureExecutor with the existing `FOXIT_CLIENT_ID` and `FOXIT_CLIENT_SECRET`.
- Real envelope `35688804` returned an embedded human send/sign URL.
- The human sent and signed the envelope in Foxit.
- Read-only status refresh returned Foxit status `EXECUTED`.
- Local SecureExecutor receipts for eSign create/status operations report `evidenceVerified: false`.
- Existing `foxit.sendForSignature` AgentLatch policy test confirms the action is not executable.
