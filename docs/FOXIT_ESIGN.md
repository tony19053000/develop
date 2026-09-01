# Foxit eSign

## Phase 13 Status

Phase 13 is implemented as a checkpoint and awaits live Foxit eSign credential verification.

Foxit eSign uses a separate API surface from DocGen. Public examples show OAuth client credentials at:

```text
POST https://na1.foxitesign.foxit.com/api/oauth2/access_token
```

and read access for folders/envelopes at:

```text
GET https://na1.foxitesign.foxit.com/api/folders/myfolder
```

Reference:

- https://developers.foxit.com/developer-hub/document/signing-document-with-foxit-esign-api/

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
  -> FOXIT_ESIGN_CLIENT_SECRET
  -> Foxit eSign status endpoint
```

## Required Environment

The DocGen credentials used for Phase 12 did not authenticate against the eSign OAuth host. Phase 13 completion needs eSign-specific credentials if Foxit keeps those products separate:

```bash
FOXIT_ESIGN_CLIENT_ID=your_foxit_esign_client_id
FOXIT_ESIGN_CLIENT_SECRET=your_foxit_esign_client_secret
FOXIT_ESIGN_BASE_URL=https://na1.foxitesign.foxit.com
```

## Verification

Checkpoint verification:

- eSign package preparation returns HTTP 200.
- AI send attempt returns HTTP 409 with `HUMAN_ONLY`.
- Manual envelope state can be recorded as `shared`, `completed`, or `executed`.
- Read-only status refresh is implemented through SecureExecutor and tested with mocked Foxit responses.
- Existing `foxit.sendForSignature` AgentLatch policy test confirms the action is not executable.

Pending live verification:

- Configure real Foxit eSign credentials.
- Verify OAuth token retrieval succeeds without printing the token.
- Verify read-only envelope/folder status refresh.
- Keep send/sign execution outside the AI path.
