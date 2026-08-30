import { useEffect, useMemo, useState } from "react";
import type { AgentRole, AgentTask, LaunchProject, ResearchResult } from "@launchforge/shared";
import {
  Activity,
  BadgeCheck,
  Blocks,
  Bot,
  ClipboardCheck,
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
  Server
} from "lucide-react";
import { createProject, listProjects, runMarketResearch } from "./api.js";

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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [idea, setIdea] = useState("Launch an AI interview-preparation platform for university students.");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshProjects();
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
            <p className="eyebrow">Phase 1 foundation</p>
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
