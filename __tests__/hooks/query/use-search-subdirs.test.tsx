import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileClient } from "@openhands/typescript-client/clients";
import { FolderBrowserModal } from "#/components/features/home/workspace-dropdown/folder-browser-modal";
import {
  useHomeDirectory,
  useSearchSubdirs,
} from "#/hooks/query/use-search-subdirs";

const backend = vi.hoisted(() => ({
  current: {
    backend: { id: "saved-local", connectionRevision: 0 },
    orgId: null,
  },
}));
vi.mock("#/contexts/active-backend-context", () => ({
  useActiveBackend: () => backend.current,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  backend.current.backend.connectionRevision = 0;
});
afterEach(() => vi.restoreAllMocks());

describe("folder browser connection scope", () => {
  it("resets an open browser before searching the edited connection with its old path", async () => {
    const searches: { revision: number; path: string }[] = [];
    vi.spyOn(FileClient.prototype, "getHome").mockImplementation(async () => ({
      home:
        backend.current.backend.connectionRevision === 0
          ? "/home/first"
          : "/home/second",
    }));
    vi.spyOn(FileClient.prototype, "searchSubdirectories").mockImplementation(
      async (path) => {
        searches.push({
          revision: backend.current.backend.connectionRevision,
          path,
        });
        return { items: [], next_page_id: null };
      },
    );
    const modal = () => (
      <FolderBrowserModal isOpen onClose={() => {}} onAdd={() => {}} />
    );
    const { rerender } = render(modal(), { wrapper });
    await waitFor(() =>
      expect(
        screen.getByTestId("folder-browser-current-path"),
      ).toHaveTextContent("/home/first"),
    );
    await waitFor(() =>
      expect(searches).toContainEqual({ revision: 0, path: "/home/first" }),
    );

    act(() => {
      backend.current.backend.connectionRevision = 1;
      rerender(modal());
    });

    await waitFor(() =>
      expect(
        screen.getByTestId("folder-browser-current-path"),
      ).toHaveTextContent("/home/second"),
    );
    await waitFor(() =>
      expect(searches.filter((call) => call.revision === 1)).toEqual([
        { revision: 1, path: "/home/second" },
      ]),
    );
  });

  it("reloads home and the same directory after editing a saved connection", async () => {
    const home = vi
      .spyOn(FileClient.prototype, "getHome")
      .mockResolvedValueOnce({ home: "/home/first" })
      .mockResolvedValueOnce({ home: "/home/second" });
    const directories = vi
      .spyOn(FileClient.prototype, "searchSubdirectories")
      .mockResolvedValueOnce({
        items: [{ name: "first-project", path: "/projects/first" }],
        next_page_id: null,
      })
      .mockResolvedValueOnce({
        items: [{ name: "second-project", path: "/projects/second" }],
        next_page_id: null,
      });
    const { result, rerender } = renderHook(
      () => ({
        home: useHomeDirectory(),
        listing: useSearchSubdirs("/projects"),
      }),
      { wrapper },
    );
    await waitFor(() =>
      expect(result.current.home.data?.home).toBe("/home/first"),
    );
    await waitFor(() =>
      expect(result.current.listing.data?.items[0].name).toBe("first-project"),
    );

    act(() => {
      backend.current.backend.connectionRevision = 1;
      rerender();
    });

    await waitFor(() =>
      expect(result.current.home.data?.home).toBe("/home/second"),
    );
    await waitFor(() =>
      expect(result.current.listing.data?.items[0].name).toBe("second-project"),
    );
    expect(home).toHaveBeenCalledTimes(2);
    expect(directories).toHaveBeenCalledTimes(2);
  });

  it("does not replace the edited connection's listing with a late old result", async () => {
    let resolveOld!: (
      page: Awaited<ReturnType<FileClient["searchSubdirectories"]>>,
    ) => void;
    const old = new Promise<
      Awaited<ReturnType<FileClient["searchSubdirectories"]>>
    >((resolve) => {
      resolveOld = resolve;
    });
    vi.spyOn(FileClient.prototype, "searchSubdirectories")
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce({
        items: [{ name: "current", path: "/projects/current" }],
        next_page_id: null,
      });
    const { result, rerender } = renderHook(
      () => useSearchSubdirs("/projects"),
      { wrapper },
    );
    act(() => {
      backend.current.backend.connectionRevision = 1;
      rerender();
    });
    await waitFor(() =>
      expect(result.current.data?.items[0].name).toBe("current"),
    );
    await act(async () => {
      resolveOld({
        items: [{ name: "obsolete", path: "/projects/obsolete" }],
        next_page_id: null,
      });
      await old;
    });
    expect(result.current.data?.items[0].name).toBe("current");
  });
});
