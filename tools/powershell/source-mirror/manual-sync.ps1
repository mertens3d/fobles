$ErrorActionPreference = "Stop"
$modulePath = Join-Path $PSScriptRoot "modules\Fobles.SourceMirrorSync.psm1"
Import-Module $modulePath -Force
Invoke-FoblesMirrorSync
