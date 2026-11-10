# Report workspace file-list failures and recovery

Canvas 1.38.0 on main d64cb8a versus source commit 04b319e on this branch, real isolated Agent Server/SDK and typed client 1.61.0, automation 1.31.0. The canonical launcher and `doctor --skip-ui` verified the served builds, versions, authentication and services. Both frontends select the same saved Local connection to port 3390 and the same initialized conversation, holding backend state constant. Native Windows Chrome recorded desktop 1280×800 and phone 390×844; the launcher uses its supported `--no-browser` option. The conversation was initialized through the real API with `run=false`; its LLM profile points at an unused loopback port, so no live model inference occurs. Responses are not intercepted.

## Reproduce

1. Create `listing-validation.txt` in the isolated run's task-owned workspace, open the conversation and its Files panel, and wait for that file.
2. Temporarily rename only that isolated directory with `arrange-listing-failure.py`. Refresh Files. The driver matches the exact `find . -type…` listing request, distinguishing it from background Git probes using the same endpoint. Its real `BashOutput` has `exit_code=-1` and ENOENT.
3. Main keeps the old file list without a warning. This branch displays the failure reason and identifies the retained list as the last loaded one.
4. Reload Canvas and reopen Files. Main says “No files in workspace”; this branch shows the failure and omits that successful-empty message.
5. Restore the directory and press Refresh. The file loads again and the error clears. The helper guards the exact task-owned directory, confirms path visibility in the Agent Server's environment, and the wrapper restores the directory in `finally`.

Each sequence passes twice at each viewport, on each side. Phone Show panel navigates to a separate panel route; the driver follows that actual UI flow. See `results.json` for both actual listing failures in each attempt and the recovery assertion.

[Desktop before](files-before.webm) · [Desktop after](files-after.webm) · [Phone before](files-before-phone.webm) · [Phone after](files-after-phone.webm).

## Ownership and validation

React Query retains listing data and error state. The Local and Cloud adapters expose that error to Files; the route renders it above the tree/content layout so it remains visible with the tree hidden. Existing cached paths remain usable and are marked stale. Refresh uses the existing query invalidation; a genuinely empty successful result still shows the empty-workspace message. Selected-file preview errors remain separately owned by the content query. No SDK contract, dependency, persisted schema or compatibility-floor change is required.

Three new integration cases fail on unchanged main; the four scoped suites pass 50 tests. They mount Files with its real listing hook, backend registry and query lifecycle, mocking underlying Local/Cloud services. They cover initial errors/recovery in both transports and a failed refresh with cached paths, a hidden tree and subsequent successful replacement. Real application proof uses Local; no Cloud account was used. Lint/typecheck/format (0 errors, 140 existing warnings), 16-locale completeness, application build and library build pass. The full suite was not repeated for this scoped presentation/query-result change.

The implementation and local verification were completed with Codex assistance.
