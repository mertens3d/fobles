$modulePath = Join-Path $PSScriptRoot "modules\Fobles.OneDriveSync.psm1"
Import-Module $modulePath -Force
Start-FoblesOneDriveWatcher
try { while ($true) { Start-Sleep -Seconds 60 } }
finally { Stop-FoblesOneDriveWatcher }
