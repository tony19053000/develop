import { randomUUID } from "node:crypto";
import {
  documentArtifactSchema,
  type BackendArtifact,
  type DeploymentRecord,
  type DocumentArtifact,
  type DomainResearch,
  type GeneratedDocument,
  type MarketResearch,
  type WebsiteArtifact
} from "@launchforge/shared";

export interface DocumentAgentInput {
  projectId: string;
  idea: string;
  marketResearch?: MarketResearch;
  domainResearch?: DomainResearch;
  websiteArtifact?: WebsiteArtifact;
  backendArtifact?: BackendArtifact;
  deploymentRecord?: DeploymentRecord;
}

export interface DocumentAgent {
  prepare(input: DocumentAgentInput): Promise<DocumentArtifact>;
}

export function createDocumentAgent(): DocumentAgent {
  return {
    async prepare(input) {
      const now = new Date().toISOString();
      const productName = input.marketResearch?.brand.name ?? input.websiteArtifact?.productName ?? deriveProductName(input.idea);
      const documents = buildFounderDocuments(input, productName, now);
      const validationChecks = [
        {
          name: "Founder launch brief",
          passed: documents.some((document) => document.type === "founder_launch_brief"),
          message: "Prepared a concise operating brief for the launch."
        },
        {
          name: "Investor one-pager",
          passed: documents.some((document) => document.type === "investor_one_pager"),
          message: "Prepared an investor-facing summary document."
        },
        {
          name: "Delivery summary",
          passed: documents.some((document) => document.type === "technical_delivery_summary"),
          message: "Prepared a technical delivery and integration summary."
        },
        {
          name: "Sensitive boundary",
          passed: !documents.some((document) => /api[_ -]?key|client[_ -]?secret|token/i.test(document.markdown)),
          message: "Document content does not include privileged credential labels."
        }
      ];

      return documentArtifactSchema.parse({
        id: randomUUID(),
        projectId: input.projectId,
        productName,
        provider: "foxit",
        status: "prepared",
        documents,
        validation: {
          passed: validationChecks.every((check) => check.passed),
          checks: validationChecks
        },
        generatedAt: now,
        updatedAt: now
      });
    }
  };
}

function buildFounderDocuments(input: DocumentAgentInput, productName: string, now: string): GeneratedDocument[] {
  const tagline = input.marketResearch?.brand.tagline ?? input.websiteArtifact?.tagline ?? "A focused launch built by LaunchForge.";
  const domainName = input.domainResearch?.recommendedDomain?.domainName ?? input.websiteArtifact?.domainName ?? "Domain pending";
  const backendMode = input.backendArtifact?.mode ?? "planned";
  const deploymentUrl = input.deploymentRecord?.url ?? "Deployment pending";

  return [
    {
      id: randomUUID(),
      type: "founder_launch_brief",
      title: `${productName} Founder Launch Brief`,
      fileName: `${toSlug(productName)}-founder-launch-brief.pdf`,
      contentType: "application/pdf",
      markdown: [
        `# ${productName} Founder Launch Brief`,
        "",
        `## Product Direction`,
        input.marketResearch?.brand.description ?? input.idea,
        "",
        `## Positioning`,
        input.marketResearch?.brand.positioning ?? tagline,
        "",
        `## Launch Assets`,
        `- Domain: ${domainName}`,
        `- Website: ${input.websiteArtifact ? "Generated and validated" : "Pending generation"}`,
        `- Backend: ${backendMode}`,
        `- Deployment: ${deploymentUrl}`,
        "",
        `## Evidence`,
        input.marketResearch?.evidenceSummary ?? "Market evidence pending."
      ].join("\n"),
      generatedAt: now
    },
    {
      id: randomUUID(),
      type: "investor_one_pager",
      title: `${productName} Investor One-Pager`,
      fileName: `${toSlug(productName)}-investor-one-pager.pdf`,
      contentType: "application/pdf",
      markdown: [
        `# ${productName} Investor One-Pager`,
        "",
        `## One-Line Offer`,
        tagline,
        "",
        `## Target Users`,
        (input.marketResearch?.brand.targetUsers ?? ["Early adopters"]).map((target) => `- ${target}`).join("\n"),
        "",
        `## Market Signals`,
        summarizeResults(input.marketResearch?.marketSignals),
        "",
        `## Competitive Context`,
        summarizeResults(input.marketResearch?.competitors)
      ].join("\n"),
      generatedAt: now
    },
    {
      id: randomUUID(),
      type: "technical_delivery_summary",
      title: `${productName} Technical Delivery Summary`,
      fileName: `${toSlug(productName)}-technical-delivery-summary.pdf`,
      contentType: "application/pdf",
      markdown: [
        `# ${productName} Technical Delivery Summary`,
        "",
        `## Frontend`,
        input.websiteArtifact
          ? `${input.websiteArtifact.files.length} generated website files, preview entry ${input.websiteArtifact.previewPath}.`
          : "Website artifact pending.",
        "",
        `## Backend`,
        input.backendArtifact
          ? `${input.backendArtifact.tables.length} Xano tables and ${input.backendArtifact.endpoints.length} endpoints, mode ${input.backendArtifact.mode}.`
          : "Backend artifact pending.",
        "",
        `## Deployment`,
        input.deploymentRecord
          ? `${input.deploymentRecord.environment} deployment is ${input.deploymentRecord.status} at ${input.deploymentRecord.url}.`
          : "Deployment pending.",
        "",
        `## Signature Boundary`,
        "Documents are prepared for founder review. Signature routing is intentionally reserved for the human-only eSign phase."
      ].join("\n"),
      generatedAt: now
    }
  ];
}

function summarizeResults(results: MarketResearch["marketSignals"] | undefined): string {
  if (!results || results.length === 0) {
    return "- Evidence pending.";
  }

  return results
    .slice(0, 3)
    .map((result) => `- ${result.title}: ${result.snippet}`)
    .join("\n");
}

function deriveProductName(idea: string): string {
  const seed =
    idea
      .replace(/[^a-zA-Z0-9 ]/g, " ")
      .split(/\s+/)
      .find((word) => word.length > 3 && !["launch", "with", "that", "platform", "startup"].includes(word.toLowerCase())) ??
    "Launch";

  return `${seed.charAt(0).toUpperCase()}${seed.slice(1).toLowerCase()}`;
}

function toSlug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "launchforge"
  );
}
