import { useEffect, useMemo, useState } from "react";
import type { AgentRole, AgentTask, LaunchProject } from "@launchforge/shared";
import {
  Activity,
  BadgeCheck,
  Blocks,
  Bot,
  ClipboardCheck,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Radio,
  Rocket,
  Server
} from "lucide-react";
import { createProject, listProjects } from "./api.js";

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
            API-backed project flow
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

