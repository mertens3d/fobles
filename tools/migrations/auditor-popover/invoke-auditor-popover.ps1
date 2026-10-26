$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Push-Location $repoRoot
try {
    node .\tools\migrations\auditor-popover\apply-auditor-popover.mjs
    npm run build:extension
}
finally {
    Pop-Location
}
