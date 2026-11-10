param(
  [Parameter(Mandatory=$true)][string]$RunName,
  [Parameter(Mandatory=$true)][int]$Port,
  [Parameter(Mandatory=$true)][string]$ConversationId,
  [Parameter(Mandatory=$true)][string]$Label,
  [int]$Width=1280,
  [int]$Height=800
)
$ErrorActionPreference='Stop'
$audit=$PSScriptRoot
$node='C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$cli='D:/GitHub_project/oss-contributions/validation/openhands-r3-browser/node_modules/@playwright/cli/playwright-cli.js'
function Run-Step([string]$Step,[int]$Attempt=0) {
  $code=(Get-Content -LiteralPath "$audit/files-record-$Step.js" -Raw).Replace('__PORT__',"$Port").Replace('__CID__',$ConversationId).Replace('__LABEL__',$Label).Replace('__WIDTH__',"$Width").Replace('__HEIGHT__',"$Height").Replace('__ATTEMPT__',"$Attempt") -replace '[\r\n]+',' '
  & $node $cli -s=openhands-r3-base run-code $code *> "$audit/files-$Label-$Step-$Attempt.log"
  if($LASTEXITCODE -ne 0) { throw "Browser step failed: $Step $Attempt" }
}
python -X utf8 "$audit/arrange-listing-failure.py" $RunName prepare
if($LASTEXITCODE -ne 0) { throw 'Workspace preparation failed' }
try {
  Run-Step 'start'
  foreach($attempt in 1,2) {
    python -X utf8 "$audit/arrange-listing-failure.py" $RunName fail
    if($LASTEXITCODE -ne 0) { throw 'Workspace failure arrangement failed' }
    try { Run-Step 'failure' $attempt }
    finally {
      python -X utf8 "$audit/arrange-listing-failure.py" $RunName restore
      if($LASTEXITCODE -ne 0) { throw 'Workspace restoration failed' }
    }
    Run-Step 'recovery' $attempt
  }
} finally { Run-Step 'finish' }
Write-Output "Completed native recording: $Label"
