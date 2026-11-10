"""Temporarily move only an isolated verification run's own workspace."""
import sys
from pathlib import Path

root = Path('D:/GitHub_project/oss-contributions/validation/openhands-r3-runs' if sys.platform=='win32' else '/mnt/d/GitHub_project/oss-contributions/validation/openhands-r3-runs').resolve()
run = (root / sys.argv[1]).resolve()
assert run.is_relative_to(root) and run.parent == root and (run / 'run.json').is_file()
workspace = run / 'workspace'
unavailable = run / 'workspace-unavailable-for-listing-proof'
mode = sys.argv[2]
if mode == 'prepare':
    assert workspace.is_dir() and not unavailable.exists()
    (workspace / 'listing-validation.txt').write_text('Workspace listing recovery verification\n', encoding='utf-8')
elif mode == 'fail':
    assert workspace.is_dir() and (workspace / 'listing-validation.txt').is_file()
    assert not unavailable.exists()
    workspace.rename(unavailable)
elif mode == 'restore':
    assert unavailable.is_dir() and (unavailable / 'listing-validation.txt').is_file()
    assert not workspace.exists()
    unavailable.rename(workspace)
else:
    raise SystemExit('Unsupported mode')
print(f'{mode}: isolated workspace {run.name}')
