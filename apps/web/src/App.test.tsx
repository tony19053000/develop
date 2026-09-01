import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.fetch = fetchMock;
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ projects: [] })
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LaunchForge web foundation", () => {
  it("renders the command center shell", async () => {
    render(<App />);

    expect(await screen.findByRole("heading", { name: "AI Launch Command Center" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start Launch/i })).toBeInTheDocument();
  });

  it("creates a launch project through the API", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ projects: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "planning",
            progress: 0,
            tasks: [],
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:00:00.000Z"
          }
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Start Launch/i }));

    expect(
      await screen.findByRole("button", { name: /Launch Interview Preparation planning/i })
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/projects",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("runs market research and renders brand evidence", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 25,
              tasks: [],
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 50,
            tasks: [],
            marketResearch: {
              id: "research-1",
              projectId: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              queries: ["AI interview prep competitors"],
              competitors: [
                {
                  title: "Interview Prep Example",
                  link: "https://example.com",
                  snippet: "Practice interviews.",
                  source: "SerpApi"
                }
              ],
              marketSignals: [],
              namingConflicts: [],
              brand: {
                name: "InterviewForge",
                tagline: "Practice interviews faster with AI.",
                description: "AI interview preparation.",
                targetUsers: ["University students"],
                positioning: "Differentiated interview readiness for early-career candidates."
              },
              evidenceSummary: "Found 1 competitor result.",
              generatedAt: "2026-08-31T00:00:00.000Z"
            },
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          },
          research: {
            brand: {
              name: "InterviewForge"
            }
          }
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Run Research/i }));

    expect(await screen.findByRole("heading", { name: "InterviewForge" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Interview Prep Example/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/projects/project-1/research/market", {
      method: "POST"
    });
  });

  it("runs domain research and renders the recommended domain", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 50,
              tasks: [],
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 63,
            tasks: [],
            domainResearch: {
              id: "domain-research-1",
              projectId: "project-1",
              brandName: "InterviewForge",
              checkedDomains: ["interviewforge.com"],
              candidates: [
                {
                  domainName: "interviewforge.com",
                  sld: "interviewforge",
                  tld: "com",
                  purchasable: true,
                  premium: false,
                  purchaseType: "registration",
                  purchasePrice: 12.99,
                  renewalPrice: 14.99,
                  reason: "",
                  score: 100,
                  recommendation: "Available for standard registration."
                }
              ],
              recommendedDomain: {
                domainName: "interviewforge.com",
                sld: "interviewforge",
                tld: "com",
                purchasable: true,
                premium: false,
                purchaseType: "registration",
                purchasePrice: 12.99,
                renewalPrice: 14.99,
                reason: "",
                score: 100,
                recommendation: "Available for standard registration."
              },
              generatedAt: "2026-08-31T00:00:00.000Z"
            },
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          },
          research: {
            recommendedDomain: {
              domainName: "interviewforge.com"
            }
          }
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Find Domains/i }));

    expect(await screen.findByRole("heading", { name: "interviewforge.com" })).toBeInTheDocument();
    expect(screen.getAllByText("Available for standard registration.")).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/projects/project-1/research/domains", {
      method: "POST"
    });
  });

  it("generates and previews a website artifact", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 63,
              tasks: [],
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 75,
            tasks: [],
            websiteArtifact: {
              id: "website-artifact-1",
              projectId: "project-1",
              productName: "InterviewForge",
              tagline: "Practice interviews faster with AI.",
              domainName: "interviewforge.com",
              previewPath: "index.html",
              files: [
                {
                  path: "index.html",
                  contentType: "text/html",
                  contents:
                    '<!doctype html><html><head><link rel="stylesheet" href="./styles.css"></head><body><h1>InterviewForge</h1><script src="./app.js"></script></body></html>'
                },
                { path: "styles.css", contentType: "text/css", contents: "body { color: #17201c; }" },
                { path: "app.js", contentType: "text/javascript", contents: "document.querySelector('h1');" }
              ],
              validation: {
                passed: true,
                checks: [{ name: "HTML document", passed: true, message: "Generated site includes HTML." }]
              },
              deployment: {
                buildCommand: "No build step required for the generated static site.",
                outputDirectory: ".",
                requiredEnvironment: []
              },
              generatedAt: "2026-08-31T00:00:00.000Z"
            },
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          },
          artifact: {
            productName: "InterviewForge"
          }
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Generate Website/i }));

    expect(await screen.findByRole("heading", { name: "InterviewForge" })).toBeInTheDocument();
    expect(screen.getByText("Validated")).toBeInTheDocument();
    expect(screen.getByTitle("InterviewForge preview")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/projects/project-1/website", {
      method: "POST"
    });
  });

  it("deploys a generated website and renders health checks", async () => {
    const websiteArtifact = {
      id: "website-artifact-1",
      projectId: "project-1",
      productName: "InterviewForge",
      tagline: "Practice interviews faster with AI.",
      domainName: "interviewforge.com",
      previewPath: "index.html",
      files: [
        {
          path: "index.html",
          contentType: "text/html",
          contents: "<!doctype html><html><body><h1>InterviewForge</h1></body></html>"
        }
      ],
      validation: {
        passed: true,
        checks: [{ name: "HTML document", passed: true, message: "Generated site includes HTML." }]
      },
      deployment: {
        buildCommand: "No build step required for the generated static site.",
        outputDirectory: ".",
        requiredEnvironment: []
      },
      generatedAt: "2026-08-31T00:00:00.000Z"
    };
    const deploymentRecord = {
      id: "deployment-1",
      projectId: "project-1",
      websiteArtifactId: "website-artifact-1",
      environment: "local_static",
      status: "healthy",
      url: "http://localhost:4000/deployments/deployment-1/",
      files: [{ path: "index.html", contentType: "text/html", size: 64 }],
      healthChecks: [
        {
          name: "Preview document",
          passed: true,
          message: "Preview HTML is present and complete.",
          checkedAt: "2026-08-31T00:01:00.000Z"
        }
      ],
      createdAt: "2026-08-31T00:01:00.000Z",
      updatedAt: "2026-08-31T00:01:00.000Z"
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 75,
              tasks: [],
              websiteArtifact,
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 88,
            tasks: [],
            websiteArtifact,
            deploymentRecord,
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          },
          deployment: deploymentRecord
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /^Deploy$/i }));

    expect(await screen.findByRole("heading", { name: "local static" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open deployment/i })).toHaveAttribute(
      "href",
      "http://localhost:4000/deployments/deployment-1/"
    );
    expect(screen.getByText("Preview HTML is present and complete.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/projects/project-1/deployments", {
      method: "POST"
    });
  });

  it("plans and provisions a Xano backend through approval controls", async () => {
    const backendArtifact = {
      id: "backend-artifact-1",
      projectId: "project-1",
      productName: "InterviewForge",
      mode: "planned",
      tables: [
        {
          name: "interviewforge_waitlist_leads",
          description: "Stores waitlist leads.",
          fields: [{ name: "email", type: "email", required: true, description: "Lead email." }]
        }
      ],
      endpoints: [
        {
          name: "create_interviewforge_waitlist_lead",
          verb: "POST",
          path: "/waitlist",
          tableName: "interviewforge_waitlist_leads",
          description: "Create waitlist lead.",
          xanoScript: "query create_interviewforge_waitlist_lead verb=POST {\n  response = true\n}"
        }
      ],
      frontendConnection: {
        environmentVariable: "VITE_PRODUCT_API_URL",
        clientFilePath: "src/productApi.ts",
        usage: "POST /waitlist with { email }."
      },
      generatedAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z"
    };
    const pendingApproval = {
      id: "approval-2",
      projectId: "project-1",
      actionRequest: {
        id: "request-2",
        projectId: "project-1",
        requestedBy: "backend",
        actionType: "xano.provisionBackend",
        resource: "InterviewForge API",
        payload: backendArtifact,
        reason: "Provision the Xano backend.",
        createdAt: "2026-08-31T00:00:00.000Z"
      },
      decision: {
        id: "decision-2",
        requestId: "request-2",
        decision: "APPROVAL_REQUIRED",
        category: "external-infrastructure-change",
        explanation: "Backend provisioning requires approval.",
        payloadHash: "hash",
        requiresHumanApproval: true,
        executable: false,
        evaluatedAt: "2026-08-31T00:00:00.000Z"
      },
      status: "pending",
      approvalUrl: "http://localhost:5173/approvals/approval-2?token=test-token",
      tokenExpiresAt: "2026-08-31T01:00:00.000Z",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z"
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 75,
              tasks: [],
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 75,
            tasks: [],
            backendArtifact,
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          },
          artifact: backendArtifact
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approval: pendingApproval,
          token: "test-token",
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "waiting_for_approval",
            progress: 75,
            tasks: [],
            backendArtifact,
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:02:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approval: { ...pendingApproval, status: "approved" },
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 75,
            tasks: [],
            backendArtifact,
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:03:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          receipt: {
            id: "receipt-3",
            requestId: "request-2",
            actionType: "xano.provisionBackend",
            payloadHash: "hash",
            mode: "development",
            evidenceVerified: false,
            result: {
              provisioned: true,
              productName: "InterviewForge"
            },
            executedAt: "2026-08-31T00:04:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 88,
              tasks: [],
              backendArtifact: {
                ...backendArtifact,
                mode: "provisioned",
                provisioning: {
                  id: "workspace-1:100",
                  workspaceId: "workspace-1",
                  apiGroup: { id: 100, name: "InterviewForge API" },
                  tables: [{ id: 200, name: "interviewforge_waitlist_leads" }],
                  endpoints: [{ id: 300, name: "create_interviewforge_waitlist_lead", verb: "POST", path: "/waitlist" }],
                  provisionedAt: "2026-08-31T00:04:00.000Z"
                }
              },
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:04:00.000Z"
            }
          ]
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Plan Backend/i }));
    expect(await screen.findByRole("heading", { name: "InterviewForge API" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Request Backend Approval/i }));
    expect(await screen.findByText("APPROVAL REQUIRED")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Approve InterviewForge API/i }));
    expect(await screen.findByRole("button", { name: /Provision backend InterviewForge API/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Provision backend InterviewForge API/i }));
    expect(await screen.findByText("provisioned InterviewForge")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/api/projects/project-1/backend/plan", {
      method: "POST"
    });
  });

  it("requests and approves protected domain registration", async () => {
    const pendingApproval = {
      id: "approval-1",
      projectId: "project-1",
      actionRequest: {
        id: "request-1",
        projectId: "project-1",
        requestedBy: "domain",
        actionType: "namecom.registerDomain",
        resource: "interviewforge.com",
        payload: { domainName: "interviewforge.com", years: 1, price: 12.99 },
        reason: "Register the recommended domain.",
        createdAt: "2026-08-31T00:00:00.000Z"
      },
      decision: {
        id: "decision-1",
        requestId: "request-1",
        decision: "HIGH_RISK_APPROVAL",
        category: "paid-domain-registration",
        explanation: "Domain registration requires approval.",
        payloadHash: "hash",
        requiresHumanApproval: true,
        executable: false,
        evaluatedAt: "2026-08-31T00:00:00.000Z"
      },
      status: "pending",
      approvalUrl: "http://localhost:5173/approvals/approval-1?token=test-token",
      tokenExpiresAt: "2026-08-31T01:00:00.000Z",
      createdAt: "2026-08-31T00:00:00.000Z",
      updatedAt: "2026-08-31T00:00:00.000Z"
    };

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: "project-1",
              idea: "Launch an AI interview-preparation platform for university students.",
              name: "Launch Interview Preparation",
              status: "active",
              progress: 63,
              tasks: [],
              domainResearch: {
                id: "domain-research-1",
                projectId: "project-1",
                brandName: "InterviewForge",
                checkedDomains: ["interviewforge.com"],
                candidates: [],
                recommendedDomain: {
                  domainName: "interviewforge.com",
                  sld: "interviewforge",
                  tld: "com",
                  purchasable: true,
                  premium: false,
                  purchaseType: "registration",
                  purchasePrice: 12.99,
                  renewalPrice: 14.99,
                  reason: "",
                  score: 100,
                  recommendation: "Available for standard registration."
                },
                generatedAt: "2026-08-31T00:00:00.000Z"
              },
              createdAt: "2026-08-31T00:00:00.000Z",
              updatedAt: "2026-08-31T00:00:00.000Z"
            }
          ]
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approval: pendingApproval,
          token: "test-token",
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "waiting_for_approval",
            progress: 63,
            tasks: [],
            domainResearch: {
              id: "domain-research-1",
              projectId: "project-1",
              brandName: "InterviewForge",
              checkedDomains: ["interviewforge.com"],
              candidates: [],
              recommendedDomain: {
                domainName: "interviewforge.com",
                sld: "interviewforge",
                tld: "com",
                purchasable: true,
                premium: false,
                purchaseType: "registration",
                purchasePrice: 12.99,
                renewalPrice: 14.99,
                reason: "",
                score: 100,
                recommendation: "Available for standard registration."
              },
              generatedAt: "2026-08-31T00:00:00.000Z"
            },
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:01:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approval: { ...pendingApproval, status: "approved" },
          project: {
            id: "project-1",
            idea: "Launch an AI interview-preparation platform for university students.",
            name: "Launch Interview Preparation",
            status: "active",
            progress: 75,
            tasks: [],
            createdAt: "2026-08-31T00:00:00.000Z",
            updatedAt: "2026-08-31T00:02:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          receipt: {
            id: "receipt-1",
            requestId: "request-1",
            actionType: "namecom.registerDomain",
            payloadHash: "hash",
            mode: "development",
            evidenceVerified: false,
            result: {
              dryRun: true
            },
            executedAt: "2026-08-31T00:03:00.000Z"
          }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          receipt: {
            id: "receipt-2",
            requestId: "request-1",
            actionType: "namecom.registerDomain",
            payloadHash: "hash",
            mode: "development",
            evidenceVerified: false,
            result: {
              registered: true,
              domainName: "interviewforge.com"
            },
            executedAt: "2026-08-31T00:04:00.000Z"
          }
        })
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Request Approval/i }));
    expect(await screen.findByText("HIGH RISK APPROVAL")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Approve interviewforge.com/i }));
    expect(await screen.findByRole("button", { name: /Dry run interviewforge.com/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Dry run interviewforge.com/i }));
    expect(await screen.findByText("development boundary")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Register interviewforge.com/i }));
    expect(await screen.findByText("registered interviewforge.com")).toBeInTheDocument();
  });
});
