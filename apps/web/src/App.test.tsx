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
});
