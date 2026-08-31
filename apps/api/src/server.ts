import { createAgentLatchPolicyEngine } from "@launchforge/agentlatch";
import { createDomainAgent, createMarketBrandAgent, createOrchestratorRuntime, loadAgentModelConfig } from "@launchforge/agents";
import { HttpNameComClient, HttpSerpApiClient } from "@launchforge/integrations";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

const config = loadConfig();
const orchestrator = createOrchestratorRuntime(loadAgentModelConfig());
const agentLatch = createAgentLatchPolicyEngine();
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
  agentLatch
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});
