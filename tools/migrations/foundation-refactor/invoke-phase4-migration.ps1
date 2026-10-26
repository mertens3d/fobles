$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$migrationScript = Join-Path $PSScriptRoot "migrate-foundation.mjs"
$uiScript = Join-Path $PSScriptRoot "apply-phase4-ui.mjs"

Push-Location $repositoryRoot
try {
    node $uiScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    node $migrationScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    node $migrationScript --apply
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build:extension
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Phase 4 changes were applied, but build:extension failed. Review compiler output and use Git to inspect or revert."
        exit $LASTEXITCODE
    }

    Write-Host "Phase 4 UI refinements, Reference Model migration, and build completed successfully."
}
finally { Pop-Location }
