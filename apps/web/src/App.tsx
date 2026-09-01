import { useEffect, useMemo, useState } from "react";
import type { ApprovalRequest } from "@launchforge/agentlatch";
import type { SecureExecutionReceipt } from "@launchforge/secure-executor";
import type {
  AgentRole,
  AgentTask,
  BackendArtifact,
  DomainCandidate,
  LaunchProject,
  ResearchResult,
  WebsiteArtifact
} from "@launchforge/shared";
import {
  Activity,
  BadgeCheck,
  Blocks,
  Bot,
  CheckCircle2,
  Code2,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Radio,
  Rocket,
  Search,
  Server,
  ShieldCheck,
  ShieldX
} from "lucide-react";
import {
  approveRequest,
  createProject,
  dryRunSecureExecution,
  executeBackendProvisioning,
  executeDomainRegistration,
  generateWebsite,
  listApprovals,
  listProjects,
  planBackend,
  rejectRequest,
  requestBackendProvisioningApproval,
  requestDomainRegistrationApproval,
  runDomainResearch,
  runMarketResearch
} from "./api.js";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "New Launch", icon: Plus },
  { label: "Live Workspace", icon: Radio },
  { label: "Approvals", icon: ClipboardCheck },
  { label: "Security", icon: LockKeyhole },
  { label: "Audit", icon: Activity }
];

const agentMeta: Record<AgentRole, { label: string; icon: typeof Bot }> = {
  orchestrator: { label: "Orchestrator", icon: Bot },
  market_brand: { label: "Market & Brand", icon: Gauge },
  domain: { label: "Domain", icon: Globe2 },
  agentlatch: { label: "AgentLatch", icon: LockKeyhole },
  website: { label: "Website", icon: Blocks },
  backend: { label: "Backend", icon: Server },
  document: { label: "Documents", icon: FileText }
};

export function App() {
  const [projects, setProjects] = useState<LaunchProject[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [secureReceipts, setSecureReceipts] = useState<SecureExecutionReceipt[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [idea, setIdea] = useState("Launch an AI interview-preparation platform for university students.");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [isFindingDomains, setIsFindingDomains] = useState(false);
  const [isGeneratingWebsite, setIsGeneratingWebsite] = useState(false);
  const [isPlanningBackend, setIsPlanningBackend] = useState(false);
  const [isRequestingApproval, setIsRequestingApproval] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshProjects();
    void refreshApprovals();
  }, []);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? projects[0],
    [projects, selectedProjectId]
  );

  async function refreshProjects() {
    setIsLoading(true);
    setError(null);

    try {
      const nextProjects = await listProjects();
      setProjects(nextProjects);
      setSelectedProjectId((current) => current ?? nextProjects[0]?.id ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load projects.");
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshApprovals() {
    try {
      setApprovals(await listApprovals());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load approvals.");
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const project = await createProject({ idea });
      setProjects((current) => [project, ...current]);
      setSelectedProjectId(project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create project.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRunResearch(projectId: string) {
    setIsResearching(true);
    setError(null);

    try {
      const { project } = await runMarketResearch(projectId);
      setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
      setSelectedProjectId(project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run market research.");
    } finally {
      setIsResearching(false);
    }
  }

  async function handleRunDomainResearch(projectId: string) {
    setIsFindingDomains(true);
    setError(null);

    try {
      const { project } = await runDomainResearch(projectId);
      setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
      setSelectedProjectId(project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run domain research.");
    } finally {
      setIsFindingDomains(false);
    }
  }

  async function handleGenerateWebsite(projectId: string) {
    setIsGeneratingWebsite(true);
    setError(null);

    try {
      const { project } = await generateWebsite(projectId);
      setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
      setSelectedProjectId(project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate website.");
    } finally {
      setIsGeneratingWebsite(false);
    }
  }

  async function handlePlanBackend(projectId: string) {
    setIsPlanningBackend(true);
    setError(null);

    try {
      const { project } = await planBackend(projectId);
      setProjects((current) => current.map((item) => (item.id === project.id ? project : item)));
      setSelectedProjectId(project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to plan backend.");
    } finally {
      setIsPlanningBackend(false);
    }
  }

  async function handleRequestApproval(project: LaunchProject) {
    setIsRequestingApproval(true);
    setError(null);

    try {
      const response = await requestDomainRegistrationApproval(project);
      setApprovals((current) => [response.approval, ...current.filter((approval) => approval.id !== response.approval.id)]);
      setProjects((current) => current.map((item) => (item.id === response.project.id ? response.project : item)));
      setSelectedProjectId(response.project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request approval.");
    } finally {
      setIsRequestingApproval(false);
    }
  }

  async function handleRequestBackendApproval(project: LaunchProject) {
    setIsRequestingApproval(true);
    setError(null);

    try {
      const response = await requestBackendProvisioningApproval(project);
      setApprovals((current) => [response.approval, ...current.filter((approval) => approval.id !== response.approval.id)]);
      setProjects((current) => current.map((item) => (item.id === response.project.id ? response.project : item)));
      setSelectedProjectId(response.project.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to request backend approval.");
    } finally {
      setIsRequestingApproval(false);
    }
  }

  async function handleApprovalDecision(approval: ApprovalRequest, decision: "approve" | "reject") {
    setError(null);

    try {
      const response = decision === "approve" ? await approveRequest(approval) : await rejectRequest(approval);
      setApprovals((current) => current.map((item) => (item.id === response.approval.id ? response.approval : item)));
      setProjects((current) => current.map((item) => (item.id === response.project.id ? response.project : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to decide approval.");
    }
  }

  async function handleDryRunSecureExecution(approval: ApprovalRequest) {
    setError(null);

    try {
      const receipt = await dryRunSecureExecution(approval);
      setSecureReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to run secure execution.");
    }
  }

  async function handleExecuteDomainRegistration(approval: ApprovalRequest) {
    setError(null);

    try {
      const receipt = await executeDomainRegistration(approval);
      setSecureReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to register domain.");
    }
  }

  async function handleExecuteBackendProvisioning(approval: ApprovalRequest) {
    setError(null);

    try {
      const receipt = await executeBackendProvisioning(approval);
      setSecureReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
      await refreshProjects();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to provision backend.");
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="LaunchForge navigation">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Rocket size={22} aria-hidden="true" />
          </div>
          <div>
            <strong>LaunchForge</strong>
            <span>AgentLatch command center</span>
          </div>
        </div>

        <nav className="nav-list">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button className="nav-item" key={item.label} type="button" title={item.label}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Launch Workspace</p>
            <h1>AI Launch Command Center</h1>
          </div>
          <div className="status-pill">
            <BadgeCheck size={18} aria-hidden="true" />
            SerpApi research flow
          </div>
        </header>

        {error ? <div className="alert" role="alert">{error}</div> : null}

        <section className="launch-entry" aria-labelledby="new-launch-title">
          <div>
            <p className="eyebrow">New Launch</p>
            <h2 id="new-launch-title">Create a startup launch project</h2>
          </div>
          <form className="launch-form" onSubmit={handleSubmit}>
            <textarea
              aria-label="Startup idea"
              value={idea}
              onChange={(event) => setIdea(event.target.value)}
              placeholder="Describe the startup idea to launch"
            />
            <button className="primary-button" disabled={isCreating} type="submit">
              <Rocket size={18} aria-hidden="true" />
              {isCreating ? "Creating..." : "Start Launch"}
            </button>
          </form>
        </section>

        <section className="command-grid" aria-live="polite">
          <div className="project-list-panel">
            <div className="section-heading">
              <p className="eyebrow">Dashboard</p>
              <h2>Projects</h2>
            </div>
            {isLoading ? (
              <p className="empty-state">Loading projects...</p>
            ) : projects.length === 0 ? (
              <p className="empty-state">No launches yet.</p>
            ) : (
              <div className="project-list">
                {projects.map((project) => (
                  <button
                    className={project.id === selectedProject?.id ? "project-row selected" : "project-row"}
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    type="button"
                  >
                    <span>{project.name}</span>
                    <small>{project.status.replaceAll("_", " ")}</small>
                  </button>
                ))}
              </div>
            )}

            <ApprovalPanel
              approvals={approvals}
              receipts={secureReceipts}
              onDecision={handleApprovalDecision}
              onDryRun={handleDryRunSecureExecution}
              onRegister={handleExecuteDomainRegistration}
              onProvisionBackend={handleExecuteBackendProvisioning}
            />
          </div>

          <div className="live-panel">
            <div className="section-heading">
              <p className="eyebrow">Live Workspace</p>
              <h2>{selectedProject?.name ?? "Waiting for launch"}</h2>
            </div>

            {selectedProject ? (
              <>
                <div className="workspace-actions">
                  <button
                    className="secondary-button"
                    disabled={isResearching}
                    onClick={() => void handleRunResearch(selectedProject.id)}
                    type="button"
                  >
                    <Search size={18} aria-hidden="true" />
                    {isResearching ? "Researching..." : "Run Research"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isFindingDomains}
                    onClick={() => void handleRunDomainResearch(selectedProject.id)}
                    type="button"
                  >
                    <Globe2 size={18} aria-hidden="true" />
                    {isFindingDomains ? "Checking..." : "Find Domains"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isGeneratingWebsite}
                    onClick={() => void handleGenerateWebsite(selectedProject.id)}
                    type="button"
                  >
                    <Blocks size={18} aria-hidden="true" />
                    {isGeneratingWebsite ? "Generating..." : "Generate Website"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isPlanningBackend}
                    onClick={() => void handlePlanBackend(selectedProject.id)}
                    type="button"
                  >
                    <Database size={18} aria-hidden="true" />
                    {isPlanningBackend ? "Planning..." : "Plan Backend"}
                  </button>
                </div>

                <div className="progress-block">
                  <span>Overall Progress</span>
                  <strong>{selectedProject.progress}%</strong>
                  <div className="progress-track" aria-hidden="true">
                    <div style={{ width: `${selectedProject.progress}%` }} />
                  </div>
                </div>

                <div className="task-timeline">
                  {selectedProject.tasks.map((task) => (
                    <AgentTaskRow key={task.id} task={task} />
                  ))}
                </div>

                {selectedProject.marketResearch ? (
                  <MarketResearchPanel project={selectedProject} />
                ) : null}

                {selectedProject.domainResearch ? <DomainResearchPanel project={selectedProject} /> : null}

                {selectedProject.websiteArtifact ? <WebsiteArtifactPanel artifact={selectedProject.websiteArtifact} /> : null}

                {selectedProject.backendArtifact ? <BackendArtifactPanel artifact={selectedProject.backendArtifact} /> : null}

                {selectedProject.domainResearch?.recommendedDomain ? (
                  <div className="approval-request-band">
                    <div>
                      <strong>{selectedProject.domainResearch.recommendedDomain.domainName}</strong>
                      <span>Protected registration requires approval.</span>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={isRequestingApproval}
                      onClick={() => void handleRequestApproval(selectedProject)}
                      type="button"
                    >
                      <LockKeyhole size={18} aria-hidden="true" />
                      {isRequestingApproval ? "Requesting..." : "Request Approval"}
                    </button>
                  </div>
                ) : null}

                {selectedProject.backendArtifact?.mode === "planned" ? (
                  <div className="approval-request-band">
                    <div>
                      <strong>{selectedProject.backendArtifact.productName} API</strong>
                      <span>Xano backend provisioning requires approval.</span>
                    </div>
                    <button
                      className="secondary-button"
                      disabled={isRequestingApproval}
                      onClick={() => void handleRequestBackendApproval(selectedProject)}
                      type="button"
                    >
                      <LockKeyhole size={18} aria-hidden="true" />
                      {isRequestingApproval ? "Requesting..." : "Request Backend Approval"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="empty-state">Start a launch to populate the workspace.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function WebsiteArtifactPanel({ artifact }: { artifact: WebsiteArtifact }) {
  const previewHtml = buildPreviewDocument(artifact);

  return (
    <section className="website-panel" aria-labelledby="website-artifact-title">
      <div className="section-heading artifact-heading">
        <div>
          <p className="eyebrow">Website Artifact</p>
          <h2 id="website-artifact-title">{artifact.productName}</h2>
        </div>
        <span className={artifact.validation.passed ? "validation-pill passed" : "validation-pill failed"}>
          <CheckCircle2 size={16} aria-hidden="true" />
          {artifact.validation.passed ? "Validated" : "Needs review"}
        </span>
      </div>

      <div className="artifact-summary">
        <p>{artifact.tagline}</p>
        <small>{artifact.domainName ?? "Domain not selected"}</small>
      </div>

      <div className="website-preview-frame">
        <iframe srcDoc={previewHtml} title={`${artifact.productName} preview`} />
      </div>

      <div className="artifact-grid">
        <div>
          <h3>Files</h3>
          <div className="artifact-file-list">
            {artifact.files.map((file) => (
              <div className="artifact-file-row" key={file.path}>
                <Code2 size={16} aria-hidden="true" />
                <span>{file.path}</span>
                <small>{file.contentType}</small>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>Validation</h3>
          <div className="artifact-check-list">
            {artifact.validation.checks.map((check) => (
              <div className={check.passed ? "artifact-check passed" : "artifact-check failed"} key={check.name}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <div>
                  <strong>{check.name}</strong>
                  <span>{check.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BackendArtifactPanel({ artifact }: { artifact: BackendArtifact }) {
  return (
    <section className="backend-panel" aria-labelledby="backend-artifact-title">
      <div className="section-heading artifact-heading">
        <div>
          <p className="eyebrow">Xano Backend</p>
          <h2 id="backend-artifact-title">{artifact.productName} API</h2>
        </div>
        <span className={artifact.mode === "provisioned" ? "validation-pill passed" : "validation-pill"}>
          <Database size={16} aria-hidden="true" />
          {artifact.mode}
        </span>
      </div>

      <div className="artifact-summary">
        <p>{artifact.frontendConnection.usage}</p>
        <small>{artifact.frontendConnection.environmentVariable}</small>
      </div>

      <div className="backend-grid">
        <div>
          <h3>Tables</h3>
          <div className="artifact-file-list">
            {artifact.tables.map((table) => (
              <div className="backend-table-row" key={table.name}>
                <Database size={16} aria-hidden="true" />
                <div>
                  <strong>{table.name}</strong>
                  <span>{table.fields.length} fields</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3>Endpoints</h3>
          <div className="artifact-file-list">
            {artifact.endpoints.map((endpoint) => (
              <div className="backend-endpoint-row" key={endpoint.name}>
                <Code2 size={16} aria-hidden="true" />
                <div>
                  <strong>
                    {endpoint.verb} {endpoint.path}
                  </strong>
                  <span>{endpoint.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {artifact.provisioning ? (
        <div className="provisioning-band">
          <strong>{artifact.provisioning.apiGroup.name}</strong>
          <span>{artifact.provisioning.endpoints.length} Xano endpoints provisioned</span>
        </div>
      ) : null}
    </section>
  );
}

function buildPreviewDocument(artifact: WebsiteArtifact): string {
  const html = artifact.files.find((file) => file.path === artifact.previewPath)?.contents ?? "";
  const css = artifact.files.find((file) => file.path === "styles.css")?.contents ?? "";
  const js = artifact.files.find((file) => file.path === "app.js")?.contents ?? "";

  return html
    .replace('<link rel="stylesheet" href="./styles.css">', `<style>${css}</style>`)
    .replace('<script src="./app.js"></script>', `<script>${js}</script>`);
}

function ApprovalPanel({
  approvals,
  receipts,
  onDecision,
  onDryRun,
  onRegister,
  onProvisionBackend
}: {
  approvals: ApprovalRequest[];
  receipts: SecureExecutionReceipt[];
  onDecision: (approval: ApprovalRequest, decision: "approve" | "reject") => Promise<void>;
  onDryRun: (approval: ApprovalRequest) => Promise<void>;
  onRegister: (approval: ApprovalRequest) => Promise<void>;
  onProvisionBackend: (approval: ApprovalRequest) => Promise<void>;
}) {
  const visibleApprovals = approvals.slice(0, 4);

  return (
    <section className="approval-panel" aria-labelledby="approval-panel-title">
      <div className="section-heading">
        <p className="eyebrow">Approvals</p>
        <h2 id="approval-panel-title">Protected Actions</h2>
      </div>
      {visibleApprovals.length === 0 ? (
        <p className="empty-state">No approval requests.</p>
      ) : (
        <div className="approval-list">
          {visibleApprovals.map((approval) => (
            <div className={`approval-row ${approval.status}`} key={approval.id}>
              <div>
                <strong>{approval.actionRequest.resource}</strong>
                <span>{approval.decision.decision.replaceAll("_", " ")}</span>
              </div>
              {approval.status === "pending" ? (
                <div className="approval-actions">
                  <button
                    aria-label={`Approve ${approval.actionRequest.resource}`}
                    onClick={() => void onDecision(approval, "approve")}
                    title="Approve"
                    type="button"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                  </button>
                  <button
                    aria-label={`Reject ${approval.actionRequest.resource}`}
                    onClick={() => void onDecision(approval, "reject")}
                    title="Reject"
                    type="button"
                  >
                    <ShieldX size={16} aria-hidden="true" />
                  </button>
                </div>
              ) : approval.status === "approved" ? (
                <div className="approval-actions compact">
                  <button
                    aria-label={`Dry run ${approval.actionRequest.resource}`}
                    onClick={() => void onDryRun(approval)}
                    title="Dry run"
                    type="button"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                  </button>
                  {approval.actionRequest.actionType === "namecom.registerDomain" ? (
                    <button
                      aria-label={`Register ${approval.actionRequest.resource}`}
                      onClick={() => void onRegister(approval)}
                      title="Register"
                      type="button"
                    >
                      <Globe2 size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                  {approval.actionRequest.actionType === "xano.provisionBackend" ? (
                    <button
                      aria-label={`Provision backend ${approval.actionRequest.resource}`}
                      onClick={() => void onProvisionBackend(approval)}
                      title="Provision backend"
                      type="button"
                    >
                      <Database size={16} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <small>{approval.status}</small>
              )}
            </div>
          ))}
          {receipts[0] ? (
            <div className="receipt-row">
              <strong>{receipts[0].actionType}</strong>
              <span>
                {receipts[0].result.registered === true
                  ? `registered ${String(receipts[0].result.domainName)}`
                  : receipts[0].result.provisioned === true
                    ? `provisioned ${String(receipts[0].result.productName)}`
                  : receipts[0].evidenceVerified
                    ? "TEE evidence verified"
                    : "development boundary"}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function DomainResearchPanel({ project }: { project: LaunchProject }) {
  const research = project.domainResearch;

  if (!research) {
    return null;
  }

  return (
    <section className="domain-panel" aria-labelledby="domain-intelligence-title">
      <div className="section-heading">
        <p className="eyebrow">Domain Intelligence</p>
        <h2 id="domain-intelligence-title">{research.recommendedDomain?.domainName ?? research.brandName}</h2>
      </div>

      {research.recommendedDomain ? (
        <div className="domain-recommendation">
          <strong>{research.recommendedDomain.domainName}</strong>
          <span>{formatDomainPrice(research.recommendedDomain.purchasePrice)}</span>
          <p>{research.recommendedDomain.recommendation}</p>
        </div>
      ) : (
        <p className="empty-state">No purchasable domain recommendation found.</p>
      )}

      <div className="domain-list">
        {research.candidates.slice(0, 8).map((candidate) => (
          <DomainCandidateRow candidate={candidate} key={candidate.domainName} />
        ))}
      </div>
    </section>
  );
}

function DomainCandidateRow({ candidate }: { candidate: DomainCandidate }) {
  return (
    <div className={candidate.purchasable ? "domain-row purchasable" : "domain-row"}>
      <div>
        <strong>{candidate.domainName}</strong>
        <span>{candidate.recommendation}</span>
      </div>
      <div className="domain-meta">
        <small>{candidate.score}</small>
        <small>{candidate.premium ? "premium" : candidate.purchaseType}</small>
        <small>{formatDomainPrice(candidate.purchasePrice)}</small>
      </div>
    </div>
  );
}

function formatDomainPrice(price: number | null): string {
  return price === null ? "No price" : `$${price.toFixed(2)}`;
}

function MarketResearchPanel({ project }: { project: LaunchProject }) {
  const research = project.marketResearch;

  if (!research) {
    return null;
  }

  return (
    <section className="research-panel" aria-labelledby="market-intelligence-title">
      <div className="section-heading">
        <p className="eyebrow">Market Intelligence</p>
        <h2 id="market-intelligence-title">{research.brand.name}</h2>
      </div>

      <div className="brand-direction">
        <strong>{research.brand.tagline}</strong>
        <p>{research.brand.positioning}</p>
        <div className="target-list">
          {research.brand.targetUsers.map((user) => (
            <span key={user}>{user}</span>
          ))}
        </div>
      </div>

      <p className="evidence-summary">{research.evidenceSummary}</p>

      <div className="research-grid">
        <ResearchColumn title="Competitors" results={research.competitors} />
        <ResearchColumn title="Signals" results={research.marketSignals} />
        <ResearchColumn title="Names" results={research.namingConflicts} />
      </div>
    </section>
  );
}

function ResearchColumn({ title, results }: { title: string; results: ResearchResult[] }) {
  return (
    <div className="research-column">
      <h3>{title}</h3>
      {results.length === 0 ? (
        <p className="research-empty">No results saved.</p>
      ) : (
        <ul>
          {results.slice(0, 3).map((result) => (
            <li key={result.link}>
              <a href={result.link} rel="noreferrer" target="_blank">
                <span>{result.title}</span>
                <ExternalLink size={14} aria-hidden="true" />
              </a>
              <p>{result.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AgentTaskRow({ task }: { task: AgentTask }) {
  const meta = agentMeta[task.agent];
  const Icon = meta.icon;

  return (
    <div className={`task-row ${task.status}`}>
      <Icon size={18} aria-hidden="true" />
      <div>
        <strong>{meta.label}</strong>
        <span>{task.title}</span>
      </div>
      <small>{task.status.replaceAll("_", " ")}</small>
    </div>
  );
}
