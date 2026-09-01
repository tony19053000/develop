# Deployment System

Phase 11 adds a local static deployment system for generated product websites.

## Flow

```text
Website/Product Agent
  -> WebsiteArtifact
  -> Deployment System
  -> DATA_DIR/deployments/{deployment_id}
  -> Health checks
  -> /deployments/{deployment_id}/
```

## API

Create a deployment:

```bash
POST /api/projects/:projectId/deployments
```

The project must already have a validated `websiteArtifact`.

Served deployment URL:

```bash
GET /deployments/:deploymentId/
```

## Health Checks

The deployment system verifies:

- Preview HTML exists and is a complete document.
- Deployment directory is accessible.

Unsafe artifact paths such as `../index.html` are rejected before any file is written outside the deployment directory.

## Verified Run

Local deployment verification passed with:

- Deployment ID: `73feef18-a64c-4d15-bd22-9319b23d3f8e`
- URL: `http://localhost:4000/deployments/73feef18-a64c-4d15-bd22-9319b23d3f8e/`
- Published files: 3
- Health status: `healthy`
- Served response: HTTP 200

## Current Boundary

Phase 11 deployment is local static hosting from the API process. Public production hosting, DNS wiring, and deploy-provider integrations are intentionally deferred to later full orchestration and launch-hardening phases.
