# Main reproduction evidence

Baseline: OpenHands/OpenHands `d64cb8a75ec520dd00b75d98838c80158b255344`, Canvas1.38.0, Agent Server/TypeScript client1.61.0, automation1.31.0. Source-built production Canvas, actual isolated backend, Chrome on Windows with the backend in WSL. Consent and onboarding were completed, no model inference or intercepted responses were used.

Both desktop1280×800 and phone390×844 recordings contain two attempts. The screenshots were reviewed; session keys are masked in the backend edit form and are absent from results.json. The `.js` file is a Playwright CLI `run-code` driver: fill its label/port placeholders and output directory for your environment. The source run used the canonical control-openhands launcher and doctor; task-specific WSL/npm wrappers do not alter the verification skill.

This branch publishes reproduction artifacts for issue intake. It is not a product PR and is not counted as a contribution submission. Reproduction and investigation used Codex assistance.

## Steps and result

1. Launch two isolated stacks, A3390 and B3400. Their HOME paths differ. Create first-home-marker in A and second-home-marker in B.
2. Register one Local backend pointing at A. Open Open Workspace → Toggle menu → + Add Workspace to cache its HOME/listing, then cancel both dialogs.
3. Manage backends → edit that same saved record → enter B's host/session key → Save. The backend ID remains folder-validation while connectionRevision changes.
4. Reopen the picker: it still shows A's HOME and first-home-marker. The driver verifies that B's authenticated /api/file/home actually returns its different HOME.

All four attempts retain the old path (`usesEditedConnection=false`). No file API or UI response is mocked. The driver obtains each ephemeral key privately from that run's injected page value and never prints it.

- [Desktop video](folder-before.webm)
- [Phone video](folder-before-phone.webm)
- [Assertions](results.json)
