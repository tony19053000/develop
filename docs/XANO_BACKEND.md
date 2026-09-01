# Xano Backend Provisioning

Phase 10 adds a protected Xano backend provisioning path.

## Local Planning

Backend planning does not require Xano credentials. The Backend Agent generates:

- Xano table specs.
- Xano API endpoint specs.
- XanoScript for endpoint creation.
- Frontend connection metadata.

Route:

```bash
POST /api/projects/:projectId/backend/plan
```

## Real Xano Provisioning

Real provisioning uses the Xano Metadata API from the backend only. Xano credentials must never be exposed to agents, generated website artifacts, browser code, or frontend logs.

Required local `.env` values:

```bash
XANO_API_KEY=your_metadata_api_token
XANO_WORKSPACE_ID=your_workspace_id
XANO_INSTANCE_BASE_URL=https://your-instance.xano.io
```

Provisioning route:

```bash
POST /api/secure-executions/xano/provision-backend
```

The route requires:

- An approved `xano.provisionBackend` AgentLatch request.
- A payload hash that still matches the approved backend artifact.
- SecureExecutor execution.
- Secret access only for `XANO_API_KEY`.

## Current Metadata API Shape

The Xano Metadata API uses bearer authentication and the Xano instance base URL. LaunchForge uses:

- `POST /api:meta/workspace/{workspace_id}/apigroup`
- `POST /api:meta/workspace/{workspace_id}/table`
- `POST /api:meta/workspace/{workspace_id}/apigroup/{apigroup_id}/api`

All creation requests send `Content-Type: text/x-xanoscript`.

## Verified Run

Real Xano provisioning was verified through:

```text
Backend Agent plan -> AgentLatch approval -> SecureExecutor -> Xano Metadata API
```

Verified resources:

- Workspace: `168062`
- Instance URL: `https://x8ki-letl-twmt.n7.xano.io`
- API group: `430757`
- Table: `884783`
- Endpoint: `4032650`

The run used local SecureExecutor development mode, so the receipt correctly reported `evidenceVerified: false`. Google Confidential Space evidence remains required before a receipt may report `evidenceVerified: true`.

## Completion Boundary

Phase 10 is complete only after a real Xano workspace is provisioned through:

```text
Backend Agent plan -> AgentLatch approval -> SecureExecutor -> Xano Metadata API
```

The completion run has passed and was independently verified with Metadata API read-back.
