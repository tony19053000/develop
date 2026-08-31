import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@launchforge/agentlatch": path.resolve(import.meta.dirname, "../agentlatch/src/index.ts")
    }
  }
});
