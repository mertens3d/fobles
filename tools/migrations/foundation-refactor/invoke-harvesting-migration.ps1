$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$scriptPath = Join-Path $PSScriptRoot "migrate-foundation.mjs"

Push-Location $repositoryRoot
try {
    node $scriptPath
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    node $scriptPath --apply
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build:extension
    if ($LASTEXITCODE -ne 0) {
        Write-Error "The harvesting migration completed, but build:extension failed. Review the compiler output and use Git to inspect or revert the migration."
        exit $LASTEXITCODE
    }

    Write-Host "Foundation harvesting migration and build completed successfully."
}
finally {
    Pop-Location
}
