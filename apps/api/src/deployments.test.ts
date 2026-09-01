import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DeploymentError, LocalStaticDeploymentService } from "./deployments.js";

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), "launchforge-deployments-"));
});

afterEach(async () => {
  await rm(dataDir, { recursive: true, force: true });
});

describe("LocalStaticDeploymentService", () => {
  it("writes a healthy static deployment record", async () => {
    const service = new LocalStaticDeploymentService(dataDir);
    const deployment = await service.deployWebsite({
      projectId: "project-1",
      baseUrl: "http://localhost:4000",
      artifact: {
        id: "website-1",
        projectId: "project-1",
        productName: "EvidenceForge",
        tagline: "Review contracts faster with AI.",
        previewPath: "index.html",
        files: [
          {
            path: "index.html",
            contentType: "text/html",
            contents: "<!doctype html><html><body><h1>EvidenceForge</h1></body></html>"
          }
        ],
        validation: {
          passed: true,
          checks: [{ name: "HTML document", passed: true, message: "Generated site includes HTML." }]
        },
        deployment: {
          buildCommand: "No build step required.",
          outputDirectory: ".",
          requiredEnvironment: []
        },
        generatedAt: "2026-09-01T00:00:00.000Z"
      }
    });

    expect(deployment).toMatchObject({
      projectId: "project-1",
      websiteArtifactId: "website-1",
      environment: "local_static",
      status: "healthy"
    });
    expect(deployment.url).toContain("/deployments/");
    expect(deployment.healthChecks.every((check) => check.passed)).toBe(true);
  });

  it("rejects unvalidated websites and unsafe file paths", async () => {
    const service = new LocalStaticDeploymentService(dataDir);
    const artifact = {
      id: "website-1",
      projectId: "project-1",
      productName: "EvidenceForge",
      tagline: "Review contracts faster with AI.",
      previewPath: "index.html",
      files: [
        {
          path: "../index.html",
          contentType: "text/html",
          contents: "<!doctype html><html><body></body></html>"
        }
      ],
      validation: {
        passed: true,
        checks: []
      },
      deployment: {
        buildCommand: "No build step required.",
        outputDirectory: ".",
        requiredEnvironment: []
      },
      generatedAt: "2026-09-01T00:00:00.000Z"
    };

    await expect(service.deployWebsite({ projectId: "project-1", baseUrl: "http://localhost:4000", artifact })).rejects.toBeInstanceOf(
      DeploymentError
    );
    await expect(
      service.deployWebsite({
        projectId: "project-1",
        baseUrl: "http://localhost:4000",
        artifact: {
          ...artifact,
          files: [{ path: "index.html", contentType: "text/html", contents: "<!doctype html>" }],
          validation: { passed: false, checks: [] }
        }
      })
    ).rejects.toBeInstanceOf(DeploymentError);
  });
});
