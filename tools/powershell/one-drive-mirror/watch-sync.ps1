$modulePath = Join-Path $PSScriptRoot "modules\Fobles.OneDriveSync.psm1"
Import-Module $modulePath -Force
Start-FoblesOneDriveWatcher
