# Automation log tabs keyboard evidence

Issue: OpenHands/OpenHands#19522. Baseline product source: cc99322a1efd0f4be8d6934ae93a4d1d4bc33e05. Fixed code includes e8313790 and the React/native keyboard type clarification fa42f0b. Canvas1.37.0, SDK/AgentServer1.60.1, automation1.30.1, Windows Chrome, Node24.22.1/npm11.12.1 frontend builds, existing Ubuntu WSL Node24.21.0 launcher. No model inference was used.

Both checkouts were launched through their unmodified `.agents/skills/verify-openhands/scripts/control-openhands launch --new --no-browser --build auto --port-from <port> --timeout 240`, then `doctor --skip-ui`. Baseline ingress3260, fixed3280. Doctor passes; its unconfigured-LLM warning is expected for this script-only automation.

Create a Python script bundle with `print('stdout-visible')` and `print('stderr-keyboard-proof', file=sys.stderr)`, upload through the automation upload API, create an inactive cron automation with entrypoint `python logs_fixture.py`, and explicitly dispatch once. This exercises the actual automation service, sandbox log API, Canvas query and modal. The UI still reports RUNNING in both runs; these artifacts assert log delivery and tab selection, not successful run completion.

1. Open its run Logs, focus Output and press ArrowRight.
2. Baseline: two attempts leave Output selected/focused and display stdout. Clicking Error with the mouse displays real stderr (control).
3. Fixed: two attempts select and focus Error and show stderr. ArrowRight wraps back to Output; ArrowLeft wraps to Error; Home selects stdout; End selects stderr.

Artifacts: `baseline.webm`, `before-arrow.png`, `before-mouse.png`, `fixed.webm`, `after-arrow.png`. The native browser videos use the same script contents and operation sequence; no responses are mocked.

Tests: regression fails on original product (1 failed/2 passed); both modal suites pass after the fix (23 tests). Final lint/typecheck and production app/library builds pass. Full Windows suite:10177 passed,66 failed,45 pending,7 todo. Of those,60 failing test names exactly match unchanged-main controls;6 additional timeouts all pass when their six files run with one worker (40 passed). See comparison JSON. No test timeout/config/fixture changes were made.
