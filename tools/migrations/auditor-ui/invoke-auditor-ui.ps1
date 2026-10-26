$root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Push-Location $root
try {
    node (Join-Path $PSScriptRoot "apply-auditor-ui.mjs")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build:extension
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally { Pop-Location }
