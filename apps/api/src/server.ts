import { createAgentLatchPolicyEngine } from "@launchforge/agentlatch";
import {
  createBackendAgent,
  createDocumentAgent,
  createDomainAgent,
  createMarketBrandAgent,
  createOrchestratorRuntime,
  createWebsiteProductAgent,
  loadAgentModelConfig
} from "@launchforge/agents";
import { HttpFoxitClient, HttpNameComClient, HttpSerpApiClient, HttpXanoClient } from "@launchforge/integrations";
import { createSecureExecutor, EnvironmentSecretProvider, type SecureExecutionEvidence } from "@launchforge/secure-executor";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { FileApprovalRepository } from "./approvals.js";
import { LocalStaticDeploymentService } from "./deployments.js";
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
    allowedSecretNames: ["NAMECOM_USERNAME", "NAMECOM_API_TOKEN", "FOXIT_API_KEY", "FOXIT_CLIENT_SECRET", "XANO_API_KEY"],
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
const websiteProduct = createWebsiteProductAgent();
const backend = createBackendAgent();
const document = createDocumentAgent();
const app = createApp({
  config,
  projects: new FileProjectRepository(config.DATA_DIR),
  events: new EventBus(),
  orchestrator,
  marketBrand,
  domain,
  websiteProduct,
  backend,
  document,
  createXanoClient: (apiKey) =>
    new HttpXanoClient({
      apiKey,
      ...(config.XANO_WORKSPACE_ID ? { workspaceId: config.XANO_WORKSPACE_ID } : {}),
      ...(config.XANO_INSTANCE_BASE_URL ? { instanceBaseUrl: config.XANO_INSTANCE_BASE_URL } : {})
    }),
  createFoxitClient: ({ apiKey, clientSecret }) =>
    new HttpFoxitClient({
      ...(apiKey ? { apiKey } : {}),
      ...(config.FOXIT_CLIENT_ID ? { clientId: config.FOXIT_CLIENT_ID } : {}),
      ...(clientSecret ? { clientSecret } : {}),
      baseUrl: config.FOXIT_API_BASE_URL,
      documentGenerationPath: config.FOXIT_DOCUMENT_GENERATION_PATH
    }),
  agentLatch,
  approvals: new FileApprovalRepository(config.DATA_DIR),
  secureExecutor,
  deployments: new LocalStaticDeploymentService(config.DATA_DIR)
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});
