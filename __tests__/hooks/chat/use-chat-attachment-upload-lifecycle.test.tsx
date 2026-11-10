import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChatAttachmentUpload } from "#/hooks/chat/use-chat-attachment-upload";
import { useConversationStore } from "#/stores/conversation-store";

const { processFiles, processImages, toast } = vi.hoisted(() => ({
  processFiles: vi.fn(),
  processImages: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("#/utils/file-processing", () => ({ processFiles, processImages }));
vi.mock("#/utils/custom-toast-handlers", () => ({ displayErrorToast: toast }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
type FileResults = {
  successful: File[];
  failed: { file: File; error: Error }[];
};

beforeEach(() => {
  vi.clearAllMocks();
  useConversationStore.getState().clearAllFiles();
  processFiles.mockResolvedValue({ successful: [], failed: [] });
  processImages.mockResolvedValue({ successful: [], failed: [] });
});

describe("attachment processing after leaving the composer", () => {
  it("does not reattach a late file after the old composer cleared its attachments", async () => {
    const pending = deferred<FileResults>();
    const file = new File(["private draft"], "old-draft.txt");
    processFiles.mockReturnValueOnce(pending.promise);
    const old = renderHook(() => useChatAttachmentUpload());
    let upload!: Promise<void>;
    act(() => {
      upload = old.result.current.handleUpload([file]);
    });
    old.unmount();
    useConversationStore.getState().clearAllFiles();
    const current = renderHook(() => useChatAttachmentUpload());

    await act(async () => {
      pending.resolve({ successful: [file], failed: [] });
      await upload;
    });

    expect(useConversationStore.getState().files).toEqual([]);
    expect(toast).not.toHaveBeenCalled();
    current.unmount();
  });

  it("leaves a new upload's same-name loading marker alone when an old read fails", async () => {
    const first = deferred<FileResults>();
    const second = deferred<FileResults>();
    const file = new File(["draft"], "notes.txt");
    processFiles
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const old = renderHook(() => useChatAttachmentUpload());
    let oldUpload!: Promise<void>;
    act(() => {
      oldUpload = old.result.current.handleUpload([file]);
    });
    old.unmount();
    useConversationStore.getState().clearAllFiles();
    const current = renderHook(() => useChatAttachmentUpload());
    let newUpload!: Promise<void>;
    act(() => {
      newUpload = current.result.current.handleUpload([file]);
    });

    await act(async () => {
      first.resolve({
        successful: [],
        failed: [{ file, error: new Error("old read failed") }],
      });
      await oldUpload;
    });

    expect(useConversationStore.getState().loadingFiles).toEqual(["notes.txt"]);
    expect(toast).not.toHaveBeenCalled();
    await act(async () => {
      second.resolve({ successful: [file], failed: [] });
      await newUpload;
    });
    expect(useConversationStore.getState().files).toEqual([file]);
    expect(useConversationStore.getState().loadingFiles).toEqual([]);
    current.unmount();
  });
});
