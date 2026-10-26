$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Push-Location $repoRoot
try {
    node .\tools\migrations\auditor-progress\apply-auditor-progress.mjs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build:extension
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally { Pop-Location }
