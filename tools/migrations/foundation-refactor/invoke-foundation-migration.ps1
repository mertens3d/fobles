param(
    [Parameter(Mandatory)]
    [ValidateRange(1, 99)]
    [int]$Phase
)

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$migrationScript = Join-Path $PSScriptRoot "migrate-foundation.mjs"
$phasePrefix = $Phase.ToString("00")
$phaseFiles = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "phases") -File -Filter "$phasePrefix-*.json")

if ($phaseFiles.Count -ne 1) {
    throw "Expected exactly one phase file matching '$phasePrefix-*.json'; found $($phaseFiles.Count)."
}

$phaseFile = $phaseFiles[0].FullName
$activeMoveMap = Join-Path $PSScriptRoot "move-map.json"
Copy-Item -LiteralPath $phaseFile -Destination $activeMoveMap -Force

Push-Location $repositoryRoot
try {
    Write-Host "Validating Foundation migration phase $Phase using $($phaseFiles[0].Name)..."
    node $migrationScript
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    Write-Host "Applying Foundation migration phase $Phase..."
    node $migrationScript --apply
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build:extension
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Foundation migration phase $Phase completed, but build:extension failed. Review compiler output and use Git to inspect or revert."
        exit $LASTEXITCODE
    }

    Write-Host "Foundation migration phase $Phase and build completed successfully."
}
finally {
    Pop-Location
}
