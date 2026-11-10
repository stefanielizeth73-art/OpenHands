# Keep abandoned attachment reads out of the next composer

Canvas 1.38.0 on main d64cb8a versus this branch, isolated Agent Server/typed client 1.61.0 and automation 1.31.0, Chrome desktop 1280×800 and phone 390×844. The proof uses real backend responses and native FileReader without model inference.

## Reproduce and inspect

Visit Customize and return to New Chat to load both routes. Start file reading, immediately follow Customize, then return after processing settles. The browser driver creates 1,000 native File objects of 2 KiB each (2,048,000 bytes, below the existing 3 MiB cap), dispatches the input change and follows the Customize link in the same task. At phone width it uses the mobile navigation menu and waits for the drawer to detach before inspection.

Main shows the abandoned `race-file-0000.txt` again on return (two attempts at each viewport). The fixed input remains empty in the same four attempts. A 32-file control did not reproduce; this is a controlled timing stress case.

[Desktop before](attachment-before.webm) · [Desktop after](attachment-after.webm) · [Phone before](attachment-before-phone.webm) · [Phone after](attachment-after-phone.webm) · [Assertions](results.json).

## Ownership and verification

The upload hook owns a token for each in-flight batch. Unmount invalidates those tokens; late successful or failed reads stop before updating the shared store or showing a toast. Native reads may still finish. The existing input cleanup remains the owner of clearing its attachments. A currently mounted input, including a fresh same-name upload, retains normal completion behavior. This changes the shared Home/conversation attachment processing hook, with no backend/API/persisted-state changes.

The two new lifecycle cases fail on main. Lifecycle, existing upload and file-processing suites pass 12 tests; lint/typecheck and app/library builds pass. Full Windows: 10,473 passed, 61 failed, 58 skipped, 7 todo. All 61 failure identifiers match the unchanged-main control (10,471 passed).

Implementation and local verification used Codex assistance.
