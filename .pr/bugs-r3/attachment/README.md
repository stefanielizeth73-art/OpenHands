# Main reproduction evidence

Baseline: OpenHands/OpenHands `d64cb8a75ec520dd00b75d98838c80158b255344`, Canvas1.38.0, Agent Server/TypeScript client1.61.0, automation1.31.0. Source-built production Canvas, actual isolated backend, Chrome on Windows with the backend in WSL. Consent and onboarding were completed, no model inference or intercepted responses were used.

Both desktop1280×800 and phone390×844 recordings contain two attempts. The screenshots were reviewed; session keys are masked in the backend edit form and are absent from results.json. The `.js` file is a Playwright CLI `run-code` driver: fill its label/port placeholders and output directory for your environment. The source run used the canonical control-openhands launcher and doctor; task-specific WSL/npm wrappers do not alter the verification skill.

This branch publishes reproduction artifacts for issue intake. It is not a product PR and is not counted as a contribution submission. Reproduction and investigation used Codex assistance.

## Steps and result

1. Visit Customize and return to New Chat, so both routes are loaded.
2. Select a batch and immediately navigate back to Customize before reading settles. Return to New Chat after completion.
3. The abandoned attachments reappear, including race-file-0000.txt, in all four attempts.

The driver arranges1,000 native File objects of2KiB each (2,048,000bytes total, under the3MiB limit). It dispatches the actual input change event and clicks the Customize link in the same task. Native FileReader and the application are unmodified. At phone width it opens the navigation menu to follow the same link and waits for the drawer to close before capture. A32-file control did not reproduce. This is a controlled timing stress case, not a claim that every single-file upload triggers the race.

- [Desktop video](attachment-before.webm)
- [Phone video](attachment-before-phone.webm)
- [Assertions](results.json)
