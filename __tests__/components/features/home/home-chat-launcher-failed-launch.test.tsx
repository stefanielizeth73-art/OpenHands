import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import toast, { Toaster } from "react-hot-toast";
import { HttpError } from "@openhands/typescript-client";

import { HomeChatLauncher } from "#/components/features/home/home-chat-launcher";
import AgentServerConversationService from "#/api/conversation-service/agent-server-conversation-service.api";
import AgentProfilesService from "#/api/agent-profiles-service/agent-profiles-service.api";
import ProfilesService from "#/api/profiles-service/profiles-service.api";
import WorkspacesService from "#/api/workspaces-service/workspaces-service.api";
import { HOME_PROMPT_DRAFT_KEY } from "#/hooks/chat/use-draft-persistence";
import { createAgentServerQueryClient } from "#/query-client-config";
import { useConversationStore } from "#/stores/conversation-store";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { ChatInputLlmProfilePicker } from "#/components/features/chat/components/chat-input-llm-profile-picker";
import { useModelStore } from "#/stores/model-store";
import { HomeModelPickProvider } from "#/contexts/home-model-pick-context";
import { AGENT_PROFILES_QUERY_KEYS } from "#/hooks/query/query-keys";
import { ChatInputModelMenuContent } from "#/components/features/chat/components/chat-input-model";

const acpPicker = vi.hoisted(() => ({ visible: false }));

const activeSelection = vi.hoisted(() => ({
  backend: {
    id: "local-id",
    name: "Local",
    host: "http://localhost",
    apiKey: "test",
    kind: "local" as "local" | "cloud",
  },
  orgId: null as string | null,
}));

// The launch failure path is exercised end to end: the real composer, the real
// conversation store, the real toast handlers and the app's query client (with
// its global error toasts). Only the network-facing services are mocked.

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock("#/context/navigation-context", () => ({
  useNavigation: () => ({
    currentPath: "/",
    conversationId: null,
    isNavigating: false,
    navigate: mockNavigate,
  }),
}));

vi.mock("#/contexts/active-backend-context", () => ({
  useActiveBackend: () => activeSelection,
}));

vi.mock("#/hooks/use-llm-configured", () => ({
  useLlmConfigured: () => ({ isConfigured: true, isLoading: false }),
}));

vi.mock("#/hooks/query/use-conversation-workspace", () => ({
  useConversationWorkspace: () => ({
    isolated: false,
    unsupportedMessage: null,
  }),
}));

vi.mock("#/hooks/use-tracking", () => ({
  useTracking: () => ({ trackConversationCreated: vi.fn() }),
}));

// The composer's model/profile controls and the automation sections below it
// issue their own requests; none of them take part in launching.
vi.mock("#/components/features/chat/components/chat-input-actions", () => ({
  ChatInputActions: ({ handleSubmit }: { handleSubmit: () => void }) => (
    <>
      <ChatInputLlmProfilePicker />
      {acpPicker.visible && (
        <ul>
          <ChatInputModelMenuContent
            onClose={() => {}}
            model={{
              isAcpContext: true,
              displayModel: "ACP model",
              currentModelId: "current",
              selectedModelId: "current",
              availableAcpModels: [{ id: "selected", label: "Selected model" }],
              agentDefaultLabel: "Agent default",
              showAcpPicker: true,
              switchConversationId: null,
              destinationPath: "/settings/agents",
              destinationLabel: "Settings",
            }}
          />
        </ul>
      )}
      <button
        type="button"
        data-testid="submit-button"
        onClick={handleSubmit}
      />
    </>
  ),
}));

vi.mock(
  "#/components/features/automations/recommended-automations-launcher",
  () => ({ RecommendedAutomationsLauncher: () => null }),
);

vi.mock(
  "#/components/features/home/featured-automations/pinned-automations-dashboard",
  () => ({ PinnedAutomationsDashboard: () => null }),
);

vi.mock(
  "#/components/features/home/featured-automations/running-automations-list",
  () => ({ RunningAutomationsList: () => null }),
);

const PROMPT = "Refactor the billing module";
const UNREACHABLE_MESSAGE =
  'HTTP request failed (502 Bad Gateway): "Bad Gateway: connect ECONNREFUSED 127.0.0.1:18811"';

const unreachable = () =>
  new HttpError(
    502,
    "Bad Gateway",
    "Bad Gateway: connect ECONNREFUSED 127.0.0.1:18811",
    UNREACHABLE_MESSAGE,
  );

function NonHomeLaunch() {
  const { mutate } = useCreateConversation();
  return (
    <button type="button" onClick={() => mutate({ query: "sidebar launch" })}>
      Sidebar launch
    </button>
  );
}

const renderLauncher = () => {
  const client = createAgentServerQueryClient();
  let showHome = true;
  const tree = () => (
    <QueryClientProvider client={client}>
      <HomeModelPickProvider>
        {showHome && <HomeChatLauncher />}
        <NonHomeLaunch />
        <Toaster />
      </HomeModelPickProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  return {
    ...view,
    client,
    rerenderLauncher: (visible = true) => {
      showHome = visible;
      view.rerender(tree());
    },
  };
};

async function pickHomeModel() {
  await userEvent.click(await screen.findByTestId("chat-input-llm-profile"));
  await userEvent.click(
    await screen.findByTestId("chat-input-llm-profile-option-Smart"),
  );
}

function arrangeModelProfiles() {
  vi.mocked(ProfilesService.listProfiles).mockResolvedValue({
    active_profile: "Fast",
    profiles: [
      { name: "Fast", model: "openai/fast", api_key_set: true },
      { name: "Smart", model: "openai/smart", api_key_set: true },
    ],
  } as never);
  vi.spyOn(AgentProfilesService, "getProfile").mockResolvedValue({
    profile: { id: "default-id", name: "default", agent_kind: "openhands" },
  } as never);
  vi.spyOn(AgentServerConversationService, "switchProfile").mockResolvedValue(
    undefined as never,
  );
  return vi
    .spyOn(AgentServerConversationService, "createConversation")
    .mockResolvedValue({
      id: "task-id",
      app_conversation_id: "conversation-id",
      agent_server_url: "http://localhost",
    } as never);
}

// jsdom has no layout, so `innerText` (which the composer reads on submit) is
// undefined; mirror `textContent` the way a browser would for plain text.
const originalInnerText = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "innerText",
);

async function submitPrompt() {
  const input = await screen.findByTestId("chat-input");
  input.textContent = PROMPT;
  fireEvent.input(input);
  await userEvent.setup().click(screen.getByTestId("submit-button"));
  return input;
}

describe("HomeChatLauncher failed launch", () => {
  beforeEach(() => {
    activeSelection.backend.id = "local-id";
    activeSelection.backend.kind = "local";
    activeSelection.orgId = null;
    acpPicker.visible = false;
    useModelStore.getState().clearAll();
    Object.defineProperty(HTMLElement.prototype, "innerText", {
      configurable: true,
      get() {
        return this.textContent ?? "";
      },
      set(value: string) {
        this.textContent = value;
      },
    });
    // <Toaster /> and framer-motion ask for the reduced-motion preference, which jsdom lacks.
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    );
    vi.spyOn(WorkspacesService, "listWorkspaces").mockResolvedValue({
      workspaces: [],
      workspaceParents: [],
    });
    vi.spyOn(ProfilesService, "listProfiles").mockResolvedValue({
      profiles: [],
      active_profile: null,
    } as never);
    // The seeded OpenHands `default` profile makes the launch path revalidate
    // the profile detail before it posts the conversation.
    vi.spyOn(AgentProfilesService, "listProfiles").mockResolvedValue({
      profiles: [
        { id: "default-id", name: "default", agent_kind: "openhands" },
      ],
      active_agent_profile_id: "default-id",
    } as never);
  });

  afterEach(() => {
    if (originalInnerText) {
      Object.defineProperty(
        HTMLElement.prototype,
        "innerText",
        originalInnerText,
      );
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, "innerText");
    }
    toast.remove();
    sessionStorage.removeItem(HOME_PROMPT_DRAFT_KEY);
    useConversationStore.getState().clearMessageRestoreIfEmpty();
    vi.restoreAllMocks();
  });

  it.each(["local", "cloud"] as const)(
    "keeps a %s home pick pending through a non-home launch and consumes it only on home success",
    async (kind) => {
      activeSelection.backend.kind = kind;
      const create = arrangeModelProfiles();
      const view = renderLauncher();
      await pickHomeModel();

      await userEvent.click(
        screen.getByRole("button", { name: "Sidebar launch" }),
      );
      await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
      expect(create.mock.calls[0][0]).not.toHaveProperty(
        "suppressRouterAtStart",
      );
      view.rerenderLauncher(false);
      view.rerenderLauncher(true);

      await submitPrompt();
      await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
      expect(create.mock.calls[1]?.[0]?.suppressRouterAtStart).toBe(true);

      await submitPrompt();
      await waitFor(() => expect(create).toHaveBeenCalledTimes(3));
      expect(create.mock.calls[2][0]).not.toHaveProperty(
        "suppressRouterAtStart",
      );
    },
  );

  it("keeps the home pick after a rejected launch for the retry", async () => {
    const create = arrangeModelProfiles().mockRejectedValueOnce(unreachable());
    renderLauncher();
    await pickHomeModel();

    await submitPrompt();
    await screen.findByText(UNREACHABLE_MESSAGE);
    await submitPrompt();
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));

    expect(create.mock.calls[1]?.[0]?.suppressRouterAtStart).toBe(true);
  });

  it.each(["backend", "organization", "agent"] as const)(
    "drops a pending home pick when the %s changes",
    async (boundary) => {
      if (boundary === "organization") {
        activeSelection.backend.kind = "cloud";
        activeSelection.orgId = "org-a";
      }
      const create = arrangeModelProfiles();
      const view = renderLauncher();
      await pickHomeModel();

      if (boundary === "backend") activeSelection.backend.id = "other-local";
      if (boundary === "organization") activeSelection.orgId = "other-org";
      if (boundary === "agent") {
        vi.mocked(AgentProfilesService.listProfiles).mockResolvedValue({
          profiles: [{ id: "acp-id", name: "ACP", agent_kind: "acp" }],
          active_agent_profile_id: "acp-id",
        } as never);
        await act(async () => {
          await view.client.invalidateQueries({
            queryKey: AGENT_PROFILES_QUERY_KEYS.all,
          });
        });
      }
      view.rerenderLauncher();
      await submitPrompt();
      await waitFor(() => expect(create).toHaveBeenCalled());

      expect(create.mock.lastCall?.[0]).not.toHaveProperty(
        "suppressRouterAtStart",
      );
    },
  );

  it.each(["agent-default", "selected"])(
    "does not carry an ACP %s pick into an OpenHands launch",
    async (option) => {
      const create = arrangeModelProfiles();
      vi.mocked(AgentProfilesService.listProfiles).mockResolvedValue({
        profiles: [{ id: "acp-id", name: "ACP", agent_kind: "acp" }],
        active_agent_profile_id: "acp-id",
      } as never);
      const save = vi
        .spyOn(AgentProfilesService, "saveProfile")
        .mockResolvedValue({
          name: "ACP",
        } as never);
      acpPicker.visible = true;
      const view = renderLauncher();

      await userEvent.click(
        await screen.findByTestId(`chat-input-acp-model-option-${option}`),
      );
      await waitFor(() => expect(save).toHaveBeenCalled());
      vi.mocked(AgentProfilesService.listProfiles).mockResolvedValue({
        profiles: [
          { id: "default-id", name: "default", agent_kind: "openhands" },
        ],
        active_agent_profile_id: "default-id",
      } as never);
      await act(async () => {
        await view.client.invalidateQueries({
          queryKey: AGENT_PROFILES_QUERY_KEYS.all,
        });
      });
      await submitPrompt();
      await waitFor(() => expect(create).toHaveBeenCalledTimes(1));

      expect(create.mock.lastCall?.[0]).not.toHaveProperty(
        "suppressRouterAtStart",
      );
    },
  );

  it("shows one error toast, no loading toast and keeps the prompt when the agent server is unreachable", async () => {
    // Arrange — every launch-path request fails the same way.
    vi.spyOn(AgentProfilesService, "getProfile").mockRejectedValue(
      unreachable(),
    );
    vi.spyOn(
      AgentServerConversationService,
      "createConversation",
    ).mockRejectedValue(unreachable());
    renderLauncher();

    // Act
    const input = await submitPrompt();

    // Assert — a fast failure goes straight to a single error; the loading
    // toast never appears, even after its delay has passed.
    await waitFor(() =>
      expect(screen.getAllByText(UNREACHABLE_MESSAGE)).toHaveLength(1),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 800);
    });
    expect(
      screen.queryByText("HOME$CREATING_CONVERSATION"),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText(UNREACHABLE_MESSAGE)).toHaveLength(1);
    expect(input).toHaveTextContent(PROMPT);
  });

  it("shows the loading toast only once a launch is slow, then replaces it with the error", async () => {
    // Arrange — the create stays in flight until the test fails it.
    vi.spyOn(AgentProfilesService, "getProfile").mockResolvedValue({
      profile: { name: "default" },
    } as never);
    let failCreate: (error: Error) => void = () => {};
    vi.spyOn(
      AgentServerConversationService,
      "createConversation",
    ).mockImplementation(
      () =>
        new Promise((_, reject) => {
          failCreate = reject;
        }),
    );
    renderLauncher();

    // Act
    const input = await submitPrompt();

    // Assert — nothing right away, the loading toast once the request lags,
    // then a single error in its place.
    expect(
      screen.queryByText("HOME$CREATING_CONVERSATION"),
    ).not.toBeInTheDocument();
    await screen.findByText(
      "HOME$CREATING_CONVERSATION",
      {},
      { timeout: 2000 },
    );
    failCreate(unreachable());
    await waitFor(
      () =>
        expect(
          screen.queryByText("HOME$CREATING_CONVERSATION"),
        ).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(screen.getAllByText(UNREACHABLE_MESSAGE)).toHaveLength(1);
    expect(input).toHaveTextContent(PROMPT);
  });

  it("keeps a slow launch's loading toast up briefly after navigating instead of flashing it", async () => {
    // Arrange — the create stays in flight until the test resolves it.
    vi.spyOn(AgentProfilesService, "getProfile").mockResolvedValue({
      profile: { name: "default" },
    } as never);
    let finishCreate: (value: unknown) => void = () => {};
    vi.spyOn(
      AgentServerConversationService,
      "createConversation",
    ).mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }) as never,
    );
    // A dismissed toast stays in the DOM while it animates out, so watch the
    // dismissal itself.
    const dismissSpy = vi.spyOn(toast, "dismiss");
    renderLauncher();

    // Act — the create finishes right after the toast appears.
    await submitPrompt();
    await screen.findByText(
      "HOME$CREATING_CONVERSATION",
      {},
      { timeout: 2000 },
    );
    finishCreate({
      id: "conv-slow",
      status: "READY",
      app_conversation_id: "conv-slow",
      request: { initial_message: PROMPT, plugins: null },
    });

    // Assert — navigation is not held back, but the toast stays readable
    // for a moment before it goes.
    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith("/conversations/conv-slow"),
    );
    expect(dismissSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(dismissSpy).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
  });

  it("names the missing MCP server in one readable toast and keeps the prompt when the launch is refused", async () => {
    // Arrange — Agent Server's structured 422 for a dangling MCP server ref.
    const detailMessage =
      "MCP server ref(s) not present in the user's MCP config: 'qa_mcp_a'";
    const body = {
      detail: {
        message: detailMessage,
        dangling_mcp_server_refs: ["qa_mcp_a"],
      },
    };
    vi.spyOn(AgentProfilesService, "getProfile").mockResolvedValue({
      profile: { name: "default" },
    } as never);
    vi.spyOn(
      AgentServerConversationService,
      "createConversation",
    ).mockRejectedValue(
      new HttpError(
        422,
        "Unprocessable Entity",
        body,
        `HTTP request failed (422 Unprocessable Entity): ${JSON.stringify(body)}`,
      ),
    );
    renderLauncher();

    // Act
    const input = await submitPrompt();

    // Assert
    await waitFor(() =>
      expect(screen.getAllByText(detailMessage)).toHaveLength(1),
    );
    expect(screen.queryByText(/dangling_mcp_server_refs/)).toBeNull();
    expect(input).toHaveTextContent(PROMPT);
  });
});
