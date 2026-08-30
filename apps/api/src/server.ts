import { createOrchestratorRuntime, loadAgentModelConfig } from "@launchforge/agents";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

const config = loadConfig();
const orchestrator = createOrchestratorRuntime(loadAgentModelConfig());
const app = createApp({
  config,
  projects: new FileProjectRepository(config.DATA_DIR),
  events: new EventBus(),
  orchestrator
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});
