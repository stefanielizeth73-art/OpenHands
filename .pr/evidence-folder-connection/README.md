# Reload folder data after connection edits

Baseline main d64cb8a, Canvas 1.38.0, Agent Server/typed client 1.61.0, automation 1.31.0; two real isolated Local runtimes with different HOME paths. The final after-fix recordings use this branch's scoped-path implementation. Desktop 1280×800 and phone 390×844 each perform two attempts.

## Reproduce

1. Point a saved Local connection at A (port 3390); open Open Workspace → Toggle menu → + Add Workspace and observe first-home-marker.
2. Cancel both dialogs. Manage backends → edit that same connection → enter B's host/key (port 3400) → Save. Its ID remains unchanged and connectionRevision advances.
3. Reopen the folder browser. Main retains A's HOME/listing; the fix shows B's HOME and second-home-marker, without a page reload.

The driver also reads B's authenticated /api/file/home to establish the expected HOME. Keys are masked in the form and omitted from the results. Neither server responses nor the app are mocked.

[Desktop before](folder-before.webm) · [Desktop after](folder-after.webm) · [Phone before](folder-before-phone.webm) · [Phone after](folder-after-phone.webm) · [Assertions](results.json).

## Ownership and verification

HOME and directory queries include backend ID, connection revision and organization. The picker owns a path together with that scope, deriving a null path immediately when the scope changes; an effect cannot briefly send the old path to the edited connection. The caller-level regression verifies an open-picker connection edit as well as eventual new-HOME display. Older pending results remain on their original query key. Cosmetic names are outside the key. These Local folder-picker paths are shared by Home and the conversation-panel picker; Cloud's repository picker is separate. No endpoint, schema, dependency, persistence migration or compatibility-floor change is introduced.

The final focused query/caller/entrypoint suites pass 11 tests; lint/typecheck and app/library builds pass. The earlier full Windows iteration reported 10,467 passed, 67 failed and one unhandled error. Of those, 61 failure identifiers match unchanged main. A serial rerun passes the extra dev-launcher case. The other five OAuth cases fail in both serial branch and unchanged-main controls: each reports 109 passed, 5 failed, 3 skipped and one `listen EACCES` error on port 53682; the earlier parallel run reported `EADDRINUSE` on that port. The final scoped-path refinement is covered by the focused suites and refreshed Canvas recordings; the full suite was not repeated for that refinement.

Implementation and local verification used Codex assistance.
