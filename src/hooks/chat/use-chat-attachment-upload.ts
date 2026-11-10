import { useCallback, useEffect, useRef } from "react";

export type ChatAttachmentUploadOptions = {
  fromPaste?: boolean;
};
import { isFileImage } from "#/utils/is-file-image";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { validateFiles } from "#/utils/file-validation";
import { processFiles, processImages } from "#/utils/file-processing";
import { useConversationStore } from "#/stores/conversation-store";

/**
 * Shared attachment pipeline for home and conversation chat inputs.
 */
export function useChatAttachmentUpload() {
  const pendingUploads = useRef(new Set<AbortController>());
  useEffect(() => {
    const pending = pendingUploads.current;
    return () => {
      pending.forEach((upload) => upload.abort());
      pending.clear();
    };
  }, []);
  const {
    images,
    files,
    addImages,
    addFiles,
    addFileLoading,
    removeFileLoading,
    addImageLoading,
    removeImageLoading,
    markImagesAsPasted,
  } = useConversationStore();

  const handleUpload = useCallback(
    async (selectedFiles: File[], _options?: ChatAttachmentUploadOptions) => {
      const validation = validateFiles(selectedFiles, [...images, ...files]);

      if (!validation.isValid) {
        displayErrorToast(`Error: ${validation.errorMessage}`);
        return;
      }

      const validFiles = selectedFiles.filter((f) => !isFileImage(f));
      const validImages = selectedFiles.filter((f) => isFileImage(f));

      if (validImages.length > 0) {
        markImagesAsPasted(validImages.map((image) => image.name));
      }

      validFiles.forEach((file) => addFileLoading(file.name));
      validImages.forEach((image) => addImageLoading(image.name));
      const upload = new AbortController();
      pendingUploads.current.add(upload);

      try {
        const [fileResults, imageResults] = await Promise.all([
          processFiles(validFiles),
          processImages(validImages),
        ]);
        // The old input clears its attachments on unmount. Its readers may
        // finish later, while a different composer owns the shared store.
        if (upload.signal.aborted) return;

        if (fileResults.successful.length > 0) {
          addFiles(fileResults.successful);
          fileResults.successful.forEach((file) =>
            removeFileLoading(file.name),
          );
        }

        if (imageResults.successful.length > 0) {
          addImages(imageResults.successful);
          imageResults.successful.forEach((image) =>
            removeImageLoading(image.name),
          );
        }

        fileResults.failed.forEach(({ file, error }) => {
          removeFileLoading(file.name);
          displayErrorToast(
            `Failed to process file ${file.name}: ${error.message}`,
          );
        });

        imageResults.failed.forEach(({ file, error }) => {
          removeImageLoading(file.name);
          displayErrorToast(
            `Failed to process image ${file.name}: ${error.message}`,
          );
        });
      } catch {
        if (upload.signal.aborted) return;
        validFiles.forEach((file) => removeFileLoading(file.name));
        validImages.forEach((image) => removeImageLoading(image.name));
        displayErrorToast(
          "An unexpected error occurred while processing files",
        );
      } finally {
        pendingUploads.current.delete(upload);
      }
    },
    [
      images,
      files,
      addImages,
      addFiles,
      addFileLoading,
      removeFileLoading,
      addImageLoading,
      removeImageLoading,
      markImagesAsPasted,
    ],
  );

  return { handleUpload };
}
