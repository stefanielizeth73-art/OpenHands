# Automation log tabs: keyboard baseline

Canvas 1.37.0 at `cc99322a1efd0f4be8d6934ae93a4d1d4bc33e05`, Windows Chrome,
Node 24.22.1 for the frontend build, real Agent Server 1.60.1 and automation
1.30.1 in the existing Ubuntu WSL environment. The stack was launched with this
checkout's production `control-openhands launch --new --no-browser --build auto`.
No model was called. The script fixture only prints to stdout and stderr.

## Reproduce

1. Make a gzip tar bundle containing `logs_fixture.py`:

   ```python
   import sys
   print('stdout-visible')
   print('stderr-keyboard-proof', file=sys.stderr)
   ```

2. On a local Canvas, upload it with `POST /api/automation/v1/uploads?name=keyboard-logs`
   (`Content-Type: application/gzip`, the run's `X-Session-API-Key`). Create an
   inactive script automation with `POST /api/automation/v1`:

   ```json
   {
     "name": "Keyboard log tabs validation",
     "entrypoint": "python logs_fixture.py",
     "tarball_path": "<upload response tarball_path>",
     "trigger": {"type":"cron","schedule":"0 0 1 1 *","timezone":"UTC"},
     "state": "INACTIVE"
   }
   ```

3. Dispatch it with `POST /api/automation/v1/<id>/dispatch`. Open the automation
   detail page and its run's **View logs** button. Wait for `stdout-visible`.
4. Focus the **Output** tab and press **ArrowRight**. The **Error** tab remains
   unselected and focus stays on `run-logs-tab-stdout`. **Tab** cannot reach Error
   because it has `tabIndex=-1`.
5. Click **Error** with the mouse: `stderr-keyboard-proof` is present. This
   control shows the output exists and isolates the failure to keyboard navigation.

## Observations

Both independent attempts in `baseline.webm` produced:

```json
{
  "afterArrow": {
    "selected": "false",
    "panel": "stdout-visible\n",
    "focused": "run-logs-tab-stdout"
  },
  "mouseControl": "stderr-keyboard-proof\n"
}
```

`before-arrow.png` shows the unchanged Output panel after ArrowRight;
`before-mouse.png` shows the same run's stderr after the mouse control.
These are unmodified captures of the running Canvas and real backend logs.
