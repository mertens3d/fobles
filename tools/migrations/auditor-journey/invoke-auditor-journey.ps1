$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
Push-Location $repositoryRoot
try {
    node (Join-Path $PSScriptRoot "apply-auditor-journey.mjs")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npm run build:extension
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
finally { Pop-Location }
