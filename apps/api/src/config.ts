import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

const envFilePath = findEnvFile(process.cwd());
dotenv.config({ path: envFilePath });

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  DATA_DIR: z.string().min(1).default(path.resolve(process.cwd(), "data")),
  SERPAPI_API_KEY: z.string().optional(),
  NAMECOM_USERNAME: z.string().optional(),
  NAMECOM_API_TOKEN: z.string().optional(),
  NAMECOM_API_BASE_URL: z.string().url().default("https://api.dev.name.com"),
  APPROVAL_TOKEN_SECRET: z.string().min(16).default("development-approval-secret"),
  SECURE_EXECUTOR_MODE: z.enum(["development", "google_confidential_space"]).default("development"),
  TEE_PROVIDER: z.enum(["google_confidential_space"]).default("google_confidential_space"),
  TEE_ATTESTATION_TOKEN: z.string().optional(),
  TEE_WORKLOAD_IDENTITY: z.string().optional(),
  TEE_IMAGE_DIGEST: z.string().optional(),
  TEE_IMAGE_REFERENCE: z.string().optional(),
  TEE_ATTESTATION_AUDIENCE: z.string().min(1).default("launchforge-secure-executor"),
  TEE_GCP_PROJECT_ID: z.string().optional(),
  TEE_GCP_ZONE: z.string().optional()
});

export type ApiConfig = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const config = configSchema.parse(env);

  return {
    ...config,
    DATA_DIR: path.isAbsolute(config.DATA_DIR) ? config.DATA_DIR : path.resolve(path.dirname(envFilePath), config.DATA_DIR)
  };
}

function findEnvFile(startDir: string): string {
  let currentDir = startDir;

  while (true) {
    const candidate = path.join(currentDir, ".env");

    if (existsSync(candidate)) {
      return candidate;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      return path.join(startDir, ".env");
    }

    currentDir = parentDir;
  }
}
