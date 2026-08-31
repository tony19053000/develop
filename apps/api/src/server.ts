import { createAgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { createDomainAgent, createMarketBrandAgent, createOrchestratorRuntime, loadAgentModelConfig } from "@launchforge/agents";
import { HttpNameComClient, HttpSerpApiClient } from "@launchforge/integrations";
import { createSecureExecutor, EnvironmentSecretProvider, type SecureExecutionEvidence } from "@launchforge/secure-executor";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { FileApprovalRepository } from "./approvals.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

const config = loadConfig();
const orchestrator = createOrchestratorRuntime(loadAgentModelConfig());
const agentLatch = createAgentLatchPolicyEngine();
const secureExecutionEvidence =
  config.SECURE_EXECUTOR_MODE === "google_confidential_space" &&
  config.TEE_ATTESTATION_TOKEN &&
  config.TEE_WORKLOAD_IDENTITY &&
  config.TEE_IMAGE_DIGEST
    ? ({
        provider: config.TEE_PROVIDER,
        attestationToken: config.TEE_ATTESTATION_TOKEN,
        workloadIdentity: config.TEE_WORKLOAD_IDENTITY,
        imageDigest: config.TEE_IMAGE_DIGEST,
        ...(config.TEE_IMAGE_REFERENCE ? { imageReference: config.TEE_IMAGE_REFERENCE } : {}),
        verifiedAt: new Date().toISOString()
      } satisfies SecureExecutionEvidence)
    : undefined;
const secureExecutor = createSecureExecutor(
  {
    mode: config.SECURE_EXECUTOR_MODE,
    allowedSecretNames: ["NAMECOM_USERNAME", "NAMECOM_API_TOKEN", "FOXIT_CLIENT_SECRET", "XANO_API_KEY"],
    ...(secureExecutionEvidence ? { evidence: secureExecutionEvidence } : {}),
    attestationPolicy: {
      audience: config.TEE_ATTESTATION_AUDIENCE,
      ...(config.TEE_WORKLOAD_IDENTITY ? { expectedWorkloadIdentity: config.TEE_WORKLOAD_IDENTITY } : {}),
      ...(config.TEE_IMAGE_DIGEST ? { expectedImageDigest: config.TEE_IMAGE_DIGEST } : {}),
      ...(config.TEE_IMAGE_REFERENCE ? { expectedImageReference: config.TEE_IMAGE_REFERENCE } : {}),
      ...(config.TEE_GCP_PROJECT_ID ? { expectedProjectId: config.TEE_GCP_PROJECT_ID } : {}),
      ...(config.TEE_GCP_ZONE ? { expectedZone: config.TEE_GCP_ZONE } : {})
    }
  },
  agentLatch,
  new EnvironmentSecretProvider()
);
const marketBrand = createMarketBrandAgent(
  new HttpSerpApiClient(config.SERPAPI_API_KEY ? { apiKey: config.SERPAPI_API_KEY } : {})
);
const domain = createDomainAgent(
  new HttpNameComClient(
    config.NAMECOM_USERNAME && config.NAMECOM_API_TOKEN
      ? {
          username: config.NAMECOM_USERNAME,
          apiToken: config.NAMECOM_API_TOKEN,
          baseUrl: config.NAMECOM_API_BASE_URL
        }
      : { baseUrl: config.NAMECOM_API_BASE_URL }
  )
);
const app = createApp({
  config,
  projects: new FileProjectRepository(config.DATA_DIR),
  events: new EventBus(),
  orchestrator,
  marketBrand,
  domain,
  agentLatch,
  approvals: new FileApprovalRepository(config.DATA_DIR),
  secureExecutor
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});
