$modulePath = Join-Path $PSScriptRoot "modules\Fobles.OneDriveSync.psm1"
Import-Module $modulePath -Force
Invoke-FoblesOneDriveSync
if ($LASTEXITCODE -ge 8) { exit $LASTEXITCODE }
exit 0
