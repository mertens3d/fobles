param(
    [Parameter(Mandatory)]
    [ValidateRange(1, 99)]
    [int]$Phase,

    # Validate everything and write the report, but change nothing.
    [switch]$DryRun,

    # Overwrite files even if they changed after the payload was prepared.
    [switch]$ForcePayload
)

$ErrorActionPreference = "Stop"

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$migrationScript = Join-Path $PSScriptRoot "migrate-foundation.mjs"
$boundaryCheck = Join-Path $repositoryRoot "tools\scripts\dev\check-boundaries.mjs"
$phasePrefix = $Phase.ToString("00")
$phaseFiles = @(Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot "phases") -File -Filter "$phasePrefix-*.json")

if ($phaseFiles.Count -ne 1) {
    throw "Expected exactly one phase file matching '$phasePrefix-*.json'; found $($phaseFiles.Count)."
}

Copy-Item -LiteralPath $phaseFiles[0].FullName -Destination (Join-Path $PSScriptRoot "move-map.json") -Force

$engineArguments = @($migrationScript)

if ($ForcePayload) {
    $engineArguments += "--force-payload"
}

Push-Location $repositoryRoot
try {
    Write-Host "Validating Foundation migration phase $Phase ($($phaseFiles[0].Name))..."
    node @engineArguments
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    if ($DryRun) {
        Write-Host "Dry run complete. Nothing was changed."
        exit 0
    }

    Write-Host "Applying phase $Phase..."
    node @($engineArguments + "--apply")
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    npm run build:extension
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Phase $Phase was applied, but build:extension failed. Fix the compiler errors, or use Git to revert the phase."
        exit $LASTEXITCODE
    }

    Write-Host "Phase $Phase applied and build:extension passed. Remaining architecture violations:"
    node $boundaryCheck
    exit 0
}
finally {
    Pop-Location
}
