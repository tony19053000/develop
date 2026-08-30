import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATA_DIR: z.string().min(1).default(path.resolve(process.cwd(), "data")),
  SERPAPI_API_KEY: z.string().optional()
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  return configSchema.parse(env);
}
