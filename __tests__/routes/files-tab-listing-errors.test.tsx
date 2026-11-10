import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { RemoteWorkspace } from "@openhands/typescript-client/workspace/remote-workspace";
import FilesTab from "#/routes/files-tab";
import { NavigationProvider } from "#/context/navigation-context";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";
import {
  getSnapshot,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import type { AppConversation } from "#/api/conversation-service/agent-server-conversation-service.types";
import AgentServerRuntimeService from "#/api/runtime-service/agent-server-runtime-service";
import * as cloudFiles from "#/api/cloud/conversation-service.api";
import SettingsService from "#/api/settings-service/settings-service.api";
import { DEFAULT_SETTINGS } from "#/services/settings";
import { useFilesTabStore } from "#/stores/files-tab-store";

const initialBackend = getSnapshot();
const conversation = {
  id: "listing-errors",
  title: "Workspace listing",
  created_at: "2026-11-01T00:00:00Z",
  execution_status: "idle",
  conversation_url: "http://localhost:8000/api/conversations/listing-errors",
  session_api_key: "test-key",
  workspace: { working_dir: "/workspace/project" },
} as AppConversation;
const command = vi.spyOn(AgentServerRuntimeService, "executeCommand");
const cloud = vi.spyOn(cloudFiles, "listCloudConversationFiles");

beforeEach(() => {
  localStorage.clear();
  useFilesTabStore.setState({
    selectedPath: null,
    selectedConversationId: null,
    openPaths: [],
  });
  command.mockReset();
  cloud.mockReset();
  vi.spyOn(
    AgentServerConversationService,
    "batchGetAppConversations",
  ).mockResolvedValue([conversation]);
  vi.spyOn(SettingsService, "getSettings").mockResolvedValue(DEFAULT_SETTINGS);
  vi.spyOn(
    RemoteWorkspace.prototype,
    "startWorkspaceSession",
  ).mockResolvedValue("http://localhost:8000/workspace/");
});

afterEach(() => {
  vi.clearAllMocks();
  setRegisteredBackends(initialBackend.backends);
  setActiveSelection(initialBackend.selection);
});
afterAll(() => vi.restoreAllMocks());

function renderFiles(kind: "local" | "cloud") {
  setRegisteredBackends([
    {
      id: "listing-backend",
      name: "Listing backend",
      kind,
      host: "http://localhost:8000",
      apiKey: "test-key",
    },
  ]);
  setActiveSelection({ backendId: "listing-backend", orgId: "org-1" });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <MemoryRouter>
      <NavigationProvider
        value={{
          conversationId: conversation.id,
          currentPath: `/conversations/${conversation.id}`,
          navigate: () => {},
          isNavigating: false,
        }}
      >
        <QueryClientProvider client={client}>
          <ActiveBackendProvider>
            <FilesTab />
          </ActiveBackendProvider>
        </QueryClientProvider>
      </NavigationProvider>
    </MemoryRouter>,
  );
}

describe("Files tab listing failures", () => {
  it.each(["local", "cloud"] as const)(
    "distinguishes a %s failure from an empty workspace and recovers on Refresh",
    async (kind) => {
      const user = userEvent.setup();
      command.mockResolvedValue({
        exit_code: 1,
        stdout: "",
        stderr: "Workspace unavailable",
      });
      cloud.mockRejectedValue(new Error("Workspace unavailable"));
      renderFiles(kind);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Workspace unavailable",
      );
      expect(screen.queryByText("FILES$NO_FILES")).not.toBeInTheDocument();

      command.mockResolvedValue({ exit_code: 0, stdout: "", stderr: "" });
      cloud.mockResolvedValue([]);
      await user.click(screen.getByTestId("files-tab-refresh"));

      expect(await screen.findByText("FILES$NO_FILES")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it("marks the retained list as stale after a failed refresh, including with the tree hidden", async () => {
    const user = userEvent.setup();
    command.mockResolvedValue({
      exit_code: 0,
      stdout: "./report.md\n",
      stderr: "",
    });
    renderFiles("local");
    expect(await screen.findByText("report.md")).toBeInTheDocument();
    command.mockRejectedValue(new Error("Runtime disconnected"));

    await user.click(screen.getByTestId("files-tab-refresh"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Runtime disconnected",
    );
    expect(screen.getByText("report.md")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("FILES$LIST_STALE");
    await user.click(screen.getByTestId("file-quick-row-tree-toggle"));
    expect(screen.queryByTestId("files-tab-tree")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeVisible();

    command.mockResolvedValue({
      exit_code: 0,
      stdout: "./current.md\n",
      stderr: "",
    });
    await user.click(screen.getByTestId("files-tab-refresh"));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("file-quick-row-tree-toggle"));
    expect(await screen.findByText("current.md")).toBeInTheDocument();
    expect(screen.queryByText("report.md")).not.toBeInTheDocument();
  });
});
