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
        Write-Error "The Sitecore data-cache migration completed, but build:extension failed. Review compiler output and use Git to inspect or revert."
        exit $LASTEXITCODE
    }

    Write-Host "Foundation Sitecore data-cache migration and build completed successfully."
}
finally {
    Pop-Location
}
