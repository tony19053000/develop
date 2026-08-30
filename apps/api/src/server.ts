import { createMarketBrandAgent, createOrchestratorRuntime, loadAgentModelConfig } from "@launchforge/agents";
import { HttpSerpApiClient } from "@launchforge/integrations";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

const config = loadConfig();
const orchestrator = createOrchestratorRuntime(loadAgentModelConfig());
const marketBrand = createMarketBrandAgent(
  new HttpSerpApiClient(config.SERPAPI_API_KEY ? { apiKey: config.SERPAPI_API_KEY } : {})
);
const app = createApp({
  config,
  projects: new FileProjectRepository(config.DATA_DIR),
  events: new EventBus(),
  orchestrator,
  marketBrand
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});
