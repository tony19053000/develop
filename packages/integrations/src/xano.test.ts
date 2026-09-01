import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildApiGroupScript, buildTableScript, HttpXanoClient, XanoConfigurationError } from "./xano.js";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("HttpXanoClient", () => {
  it("requires Xano credentials and instance metadata URL", async () => {
    const client = new HttpXanoClient({});

    await expect(
      client.provisionBackend({
        productName: "InterviewForge",
        apiGroupName: "InterviewForge API",
        tables: [],
        endpoints: []
      })
    ).rejects.toBeInstanceOf(XanoConfigurationError);
  });

  it("provisions an API group, table, and endpoint with bearer auth", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          JSON.stringify({
            id: 10,
            name: "InterviewForge API",
            canonical: "interviewforge_api",
            documentation: { link: "https://example.xano.io/docs" }
          })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 20, name: "waitlist_leads", guid: "table-guid" })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 30, name: "create_waitlist_lead", guid: "api-guid", verb: "POST" })
      } as Response);

    const client = new HttpXanoClient({
      apiKey: "xano-secret",
      workspaceId: "12345",
      instanceBaseUrl: "https://example.xano.io"
    });
    const result = await client.provisionBackend({
      productName: "InterviewForge",
      apiGroupName: "InterviewForge API",
      tables: [
        {
          name: "waitlist_leads",
          description: "Waitlist leads",
          fields: [
            { name: "id", type: "int", required: true, description: "Primary key" },
            { name: "email", type: "email", required: true, description: "Lead email" }
          ]
        }
      ],
      endpoints: [
        {
          name: "create_waitlist_lead",
          verb: "POST",
          path: "/waitlist",
          tableName: "waitlist_leads",
          description: "Create waitlist lead",
          xanoScript: "query create_waitlist_lead verb=POST {\n  response = true\n}"
        }
      ]
    });

    expect(result).toMatchObject({
      workspaceId: "12345",
      apiGroup: {
        id: 10,
        canonical: "interviewforge_api"
      },
      tables: [{ id: 20, name: "waitlist_leads", guid: "table-guid" }],
      endpoints: [{ id: 30, name: "create_waitlist_lead", verb: "POST", path: "/waitlist", guid: "api-guid" }]
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      new URL("https://example.xano.io/api:meta/workspace/12345/apigroup"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer xano-secret",
          "Content-Type": "text/x-xanoscript"
        })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      new URL("https://example.xano.io/api:meta/workspace/12345/table"),
      expect.objectContaining({ body: expect.stringContaining("table waitlist_leads") })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      new URL("https://example.xano.io/api:meta/workspace/12345/apigroup/10/api"),
      expect.objectContaining({ body: "query create_waitlist_lead verb=POST {\n  response = true\n}" })
    );
  });

  it("builds XanoScript identifiers safely", () => {
    expect(buildApiGroupScript("Interview Forge API")).toContain("api_group interview_forge_api");
    expect(
      buildTableScript({
        name: "Waitlist Leads",
        description: "Waitlist",
        fields: [{ name: "Email Address", type: "email", required: true, description: "Email" }]
      })
    ).toContain("email email_address");
  });
});
