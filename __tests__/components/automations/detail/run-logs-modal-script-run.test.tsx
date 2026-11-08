/**
 * Regression for OHE-3105: a script automation's run has a bash command and a
 * sandbox but no conversation. On a cloud backend the modal used to wait on
 * a conversation lookup that could never run and showed "Loading logs…"
 * forever. The hook runs for real here; only the services behind it are
 * stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nKey } from "#/i18n/declaration";
import { RunLogsModal } from "#/components/features/automations/detail/run-logs-modal";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";

const { batchGetCloudSandboxesMock, listOutputsMock } = vi.hoisted(() => ({
  batchGetCloudSandboxesMock: vi.fn(),
  listOutputsMock: vi.fn(),
}));

vi.mock("#/api/cloud/sandbox-service.api", () => ({
  batchGetCloudSandboxes: (...args: unknown[]) =>
    batchGetCloudSandboxesMock(...args),
}));

vi.mock("#/api/bash-service/bash-service.api", () => ({
  default: { listOutputs: (...args: unknown[]) => listOutputsMock(...args) },
}));

const runningSandbox = {
  id: "sb-1",
  created_by_user_id: "user-1",
  sandbox_spec_id: "spec-1",
  status: "RUNNING",
  session_api_key: "sandbox-key",
  exposed_urls: [{ name: "AGENT_SERVER", url: "https://runtime.example.com" }],
  created_at: "2026-01-01T00:00:00Z",
};

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActiveBackendProvider>
        <RunLogsModal
          conversationId={null}
          sandboxId="sb-1"
          bashCommandId="cmd-1"
          isOpen
          onClose={() => {}}
        />
      </ActiveBackendProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  __resetActiveStoreForTests();
  setRegisteredBackends([
    {
      id: "cloud-1",
      name: "Cloud",
      host: "https://app.example.com",
      apiKey: "k",
      kind: "cloud",
    },
  ]);
  setActiveSelection({ backendId: "cloud-1", orgId: "org-1" });
  batchGetCloudSandboxesMock.mockReset();
  listOutputsMock.mockReset();
});

afterEach(() => {
  __resetActiveStoreForTests();
  vi.clearAllMocks();
});

describe("RunLogsModal — script run without a conversation (cloud)", () => {
  it("lets keyboard users switch streams, wrap and select the first/last tab", async () => {
    batchGetCloudSandboxesMock.mockResolvedValue([runningSandbox]);
    listOutputsMock.mockResolvedValue([
      {
        kind: "BashOutput",
        id: "out-keyboard",
        command_id: "cmd-1",
        timestamp: "2026-01-01T10:00:00Z",
        order: 0,
        stdout: "normal output",
        stderr: "error output",
      },
    ]);
    const user = userEvent.setup();
    renderModal();
    await screen.findByText("normal output");
    const output = screen.getByRole("tab", {
      name: I18nKey.AUTOMATIONS$DETAIL$LOGS_TAB_OUTPUT,
    });
    const error = screen.getByRole("tab", {
      name: I18nKey.AUTOMATIONS$DETAIL$LOGS_TAB_ERROR,
    });
    await user.click(output);
    await user.keyboard("{ArrowRight}");
    expect(error).toHaveFocus();
    expect(error).toHaveAttribute("aria-selected", "true");
    expect(error).toHaveAttribute("tabindex", "0");
    expect(output).toHaveAttribute("tabindex", "-1");
    expect(
      screen.getByRole("tabpanel", {
        name: I18nKey.AUTOMATIONS$DETAIL$LOGS_TAB_ERROR,
      }),
    ).toHaveTextContent("error output");
    await user.keyboard("{ArrowRight}");
    expect(output).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(error).toHaveFocus();
    await user.keyboard("{Home}");
    expect(output).toHaveFocus();
    expect(
      screen.getByRole("tabpanel", {
        name: I18nKey.AUTOMATIONS$DETAIL$LOGS_TAB_OUTPUT,
      }),
    ).toHaveTextContent("normal output");
    await user.keyboard("{End}");
    expect(error).toHaveFocus();
    expect(error).toHaveAttribute("aria-selected", "true");
    expect(listOutputsMock).toHaveBeenCalledTimes(1);
  });

  it("shows the run's output instead of loading forever", async () => {
    // Arrange
    batchGetCloudSandboxesMock.mockResolvedValue([runningSandbox]);
    listOutputsMock.mockResolvedValue([
      {
        kind: "BashOutput",
        id: "out-1",
        command_id: "cmd-1",
        timestamp: "2026-01-01T10:00:00Z",
        order: 0,
        stdout: "scanned 3 repositories\n",
        stderr: "",
      },
    ]);

    // Act
    renderModal();

    // Assert
    expect(
      await screen.findByTestId("run-logs-output-stdout"),
    ).toHaveTextContent("scanned 3 repositories");
    expect(
      screen.queryByText(I18nKey.AUTOMATIONS$DETAIL$LOGS_LOADING),
    ).not.toBeInTheDocument();
    expect(listOutputsMock).toHaveBeenCalledWith(
      "https://runtime.example.com",
      "sandbox-key",
      "cmd-1",
    );
  });

  it("says the sandbox is gone instead of loading forever once the run's sandbox was deleted", async () => {
    // Arrange
    batchGetCloudSandboxesMock.mockResolvedValue([null]);

    // Act
    renderModal();

    // Assert
    expect(
      await screen.findByTestId("run-logs-sandbox-issue-missing"),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByText(I18nKey.AUTOMATIONS$DETAIL$LOGS_LOADING),
      ).not.toBeInTheDocument(),
    );
    expect(listOutputsMock).not.toHaveBeenCalled();
  });
});
