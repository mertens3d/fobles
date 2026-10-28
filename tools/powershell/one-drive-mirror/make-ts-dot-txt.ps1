$ErrorActionPreference = "Stop"
$modulePath = Join-Path $PSScriptRoot "modules\Fobles.OneDriveSync.psm1"
Import-Module $modulePath -Force
Invoke-FoblesOneDriveSync
