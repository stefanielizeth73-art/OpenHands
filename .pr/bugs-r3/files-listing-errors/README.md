# Files listing errors appear as stale or empty workspaces

Canvas 1.38.0 at main d64cb8a with a real isolated Agent Server/SDK 1.61.0 and automation 1.31.0. The canonical launcher and doctor were used. The conversation was initialized through the real send-message API with `run=false`; no model inference or mocked backend response was used.

The task-owned fixture contains `listing-validation.txt`. Temporarily moving only this isolated run's workspace makes the real command endpoint return BashOutput with `exit_code=-1` and an ENOENT error. Refresh retains the old list without an alert. Reloading Canvas and opening Files shows “No files in workspace”, still with no alert. Restoring the directory and pressing Refresh loads the file again. The helper verifies the exact task-owned directory and restores it in `finally`.

This reproduces twice at 1280×800 and twice at 390×844. On phones, Show panel navigates to the dedicated panel route; the driver waits for that route's Files view after reload.

[Desktop recording](files-before.webm) · [Phone recording](files-before-phone.webm) · [Actual command results and UI assertions](results.json).

Implementation investigation and local verification used Codex assistance.
