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
      } as Response);

    render(<App />);

    await userEvent.click(await screen.findByRole("button", { name: /Request Approval/i }));
    expect(await screen.findByText("HIGH RISK APPROVAL")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Approve interviewforge.com/i }));
    expect(await screen.findByText("approved")).toBeInTheDocument();
  });
});
