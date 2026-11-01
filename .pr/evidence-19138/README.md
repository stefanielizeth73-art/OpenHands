# Home model routing evidence

Code: `920637b6c8301226c50a9ede56d2193662db39cd`.
Baseline: upstream main `7df1e5c14c1ff1a9962562b29af0a9748735b9ac`.

The running Canvas used Chrome on Windows, Node 24.21.0, and a real Agent Server 1.59.0 in the existing Ubuntu WSL environment. The automation service was absent; its unrelated health requests returned 404.

## Reproduction

1. Create LLM profiles Fast and Smart. Set both the active LLM profile and the default Agent Profile's LLM reference to Fast.
2. Attach a Model Router to the default Agent Profile and enable Run on first message.
3. Open Home, confirm the pill says Fast, select Smart, and create a conversation with the sidebar's New / No workspace action.
4. Inspect the browser's actual POST to the Agent Server. Main returns 201 with no route-at-start instruction; the fix returns 201 with the instruction.
5. On the fix, use the sidebar navigation to return Home and send a message. The pending choice suppresses routing once. Return Home and send again without another pick: routing is restored.

The raw Playwright CLI results are in the adjacent text files. The screenshots show the settled conversations created by steps 3–4; the request captures establish the instruction difference. Both environments started with the same profile references.

These checks inspect launch payloads against the real server. The configured LLM credential was a local validation dummy with an unreachable loopback endpoint; no external model inference was used. Cloud and ACP branches are covered through the real picker/create hooks with service mocks.

## Checks

- 217 focused tests passed, including provider integration, Local/Cloud launch paths, ACP selections, scope changes, route unmount/remount, retry and single-launch consumption.
- `npm run lint`, `npm run build`, and `npm run build:lib` passed.
- Final full suite: 9,686 passed, 52 failed. All 52 failing names also fail on unchanged main; see `full-suite-comparison.json`. These results do not represent a green full-suite run.
