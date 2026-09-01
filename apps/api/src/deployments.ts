import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { deploymentRecordSchema, type DeploymentRecord, type WebsiteArtifact, type WebsiteFile } from "@launchforge/shared";

export interface DeploymentService {
  readonly publicRoot: string;
  deployWebsite(input: { projectId: string; artifact: WebsiteArtifact; baseUrl: string }): Promise<DeploymentRecord>;
}

export class LocalStaticDeploymentService implements DeploymentService {
  readonly publicRoot: string;

  constructor(dataDir: string) {
    this.publicRoot = path.join(dataDir, "deployments");
  }

  async deployWebsite(input: { projectId: string; artifact: WebsiteArtifact; baseUrl: string }): Promise<DeploymentRecord> {
    if (!input.artifact.validation.passed) {
      throw new DeploymentError("Website artifact must pass validation before deployment.");
    }

    const deploymentId = randomUUID();
    const deploymentRoot = path.join(this.publicRoot, deploymentId);
    await mkdir(deploymentRoot, { recursive: true });

    const files = [];

    for (const file of input.artifact.files) {
      const safePath = normalizeArtifactPath(file);
      const absolutePath = path.join(deploymentRoot, safePath);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, file.contents, "utf8");
      const fileStat = await stat(absolutePath);
      files.push({
        path: safePath,
        contentType: file.contentType,
        size: fileStat.size
      });
    }

    const now = new Date().toISOString();
    const url = new URL(`/deployments/${deploymentId}/`, input.baseUrl).toString();
    const healthChecks = await this.checkDeployment(deploymentRoot, input.artifact.previewPath);
    const status = healthChecks.every((check) => check.passed) ? "healthy" : "failed";

    return deploymentRecordSchema.parse({
      id: deploymentId,
      projectId: input.projectId,
      websiteArtifactId: input.artifact.id,
      environment: "local_static",
      status,
      url,
      files,
      healthChecks,
      createdAt: now,
      updatedAt: now
    });
  }

  private async checkDeployment(deploymentRoot: string, previewPath: string): Promise<DeploymentRecord["healthChecks"]> {
    const checkedAt = new Date().toISOString();
    const checks = [];

    try {
      const indexPath = path.join(deploymentRoot, normalizeRelativePath(previewPath));
      const contents = await readFile(indexPath, "utf8");
      checks.push({
        name: "Preview document",
        passed: contents.includes("<!doctype html>") && contents.includes("</html>"),
        message: "Preview HTML is present and complete.",
        checkedAt
      });
    } catch {
      checks.push({
        name: "Preview document",
        passed: false,
        message: "Preview HTML is missing.",
        checkedAt
      });
    }

    try {
      const fileStat = await stat(deploymentRoot);
      checks.push({
        name: "Deployment directory",
        passed: fileStat.isDirectory(),
        message: "Deployment directory is accessible.",
        checkedAt
      });
    } catch {
      checks.push({
        name: "Deployment directory",
        passed: false,
        message: "Deployment directory is not accessible.",
        checkedAt
      });
    }

    return checks;
  }
}

export class DeploymentError extends Error {}

function normalizeArtifactPath(file: WebsiteFile): string {
  return normalizeRelativePath(file.path);
}

function normalizeRelativePath(value: string): string {
  const normalized = path.posix.normalize(value.replaceAll("\\", "/"));

  if (normalized.startsWith("../") || normalized === ".." || normalized.startsWith("/") || normalized === ".") {
    throw new DeploymentError(`Unsafe deployment artifact path: ${value}`);
  }

  return normalized;
}
