import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { EventBus } from "./events.js";
import { FileProjectRepository } from "./storage.js";

const config = loadConfig();
const app = createApp({
  config,
  projects: new FileProjectRepository(config.DATA_DIR),
  events: new EventBus()
});

app.listen(config.API_PORT, () => {
  console.log(`LaunchForge API listening on http://localhost:${config.API_PORT}`);
});

