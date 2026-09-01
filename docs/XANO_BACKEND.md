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

## Completion Boundary

Phase 10 must not be marked complete until a real Xano workspace is provisioned through:

```text
Backend Agent plan -> AgentLatch approval -> SecureExecutor -> Xano Metadata API
```
