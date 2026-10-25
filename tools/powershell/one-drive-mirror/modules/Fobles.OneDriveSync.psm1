$script:SourceRoot = "C:\Projects\fobles"
$script:DestinationRoot = "C:\Users\gregory.mertens\OneDrive - Kestra Financial\Projects\fobles"
$script:DebounceMilliseconds = 2000
$script:ExcludedDirectories = @("node_modules", ".git", "build", "dist", "coverage", ".next", "test-results", "playwright-report", "artifacts")
$script:ExcludedFilePatterns = @("*.log", "*.tmp", "*.cache")
$script:Watcher = $null
$script:SyncTimer = $null
$script:SyncRunning = $false
$script:SyncPending = $false
$script:EventSubscriptions = @()

function Test-FoblesExcludedPath {
    param([Parameter(Mandatory)][string]$Path)
    $normalizedPath = $Path.Replace("/", "\")
    $relativePath = $normalizedPath
    if ($normalizedPath.StartsWith($script:SourceRoot, [System.StringComparison]::OrdinalIgnoreCase)) { $relativePath = $normalizedPath.Substring($script:SourceRoot.Length) }
    $pathParts = $relativePath.Split("\", [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($directory in $script:ExcludedDirectories) {
        foreach ($part in $pathParts) { if ([System.String]::Equals($part, $directory, [System.StringComparison]::OrdinalIgnoreCase)) { return $true } }
    }
    $fileName = [System.IO.Path]::GetFileName($normalizedPath)
    foreach ($pattern in $script:ExcludedFilePatterns) { if ($fileName -like $pattern) { return $true } }
    return $false
}

function Invoke-FoblesOneDriveSync {
    if ($script:SyncRunning) { $script:SyncPending = $true }
    else {
        $script:SyncRunning = $true
        try {
            do {
                $script:SyncPending = $false
                Write-Host "Fobles OneDrive sync started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                $arguments = @($script:SourceRoot, $script:DestinationRoot, "/MIR", "/FFT", "/R:1", "/W:1", "/NJH", "/NJS", "/NP")
                if ($script:ExcludedDirectories.Count -gt 0) {
                    $arguments += "/XD"
                    foreach ($directory in $script:ExcludedDirectories) { $arguments += [System.IO.Path]::Combine($script:SourceRoot, $directory) }
                }
                if ($script:ExcludedFilePatterns.Count -gt 0) { $arguments += "/XF"; $arguments += $script:ExcludedFilePatterns }
                & robocopy @arguments
                $robocopyExitCode = $LASTEXITCODE
                if ($robocopyExitCode -ge 8) { Write-Error "Fobles OneDrive sync failed. Robocopy exit code: $robocopyExitCode" }
                else { Write-Host "Fobles OneDrive sync complete. Robocopy exit code: $robocopyExitCode" }
            } while ($script:SyncPending)
        } finally { $script:SyncRunning = $false }
    }
}

function Start-FoblesDebouncedSync {
    if ($script:SyncTimer) { $script:SyncTimer.Dispose(); $script:SyncTimer = $null }
    $callback = { $script:SyncTimer = $null; Invoke-FoblesOneDriveSync }
    $script:SyncTimer = [System.Threading.Timer]::new($callback, $null, $script:DebounceMilliseconds, [System.Threading.Timeout]::Infinite)
}

function Invoke-FoblesWatcherEvent {
    param([Parameter(Mandatory)][string]$Path, [Parameter(Mandatory)][string]$ChangeType)
    if (-not (Test-FoblesExcludedPath -Path $Path)) { Write-Host "Fobles change detected [$ChangeType]: $Path"; Start-FoblesDebouncedSync }
}

function Start-FoblesOneDriveWatcher {
    if ($script:Watcher) { Write-Host "Fobles OneDrive watcher is already running." }
    else {
        if (-not (Test-Path -LiteralPath $script:SourceRoot)) { throw "Source directory does not exist: $script:SourceRoot" }
        if (-not (Test-Path -LiteralPath $script:DestinationRoot)) { New-Item -ItemType Directory -Path $script:DestinationRoot -Force | Out-Null }
        $script:Watcher = [System.IO.FileSystemWatcher]::new()
        $script:Watcher.Path = $script:SourceRoot
        $script:Watcher.IncludeSubdirectories = $true
        $script:Watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::Size
        $eventAction = { Invoke-FoblesWatcherEvent -Path $Event.SourceEventArgs.FullPath -ChangeType $Event.SourceEventArgs.ChangeType.ToString() }
        $renamedAction = { Invoke-FoblesWatcherEvent -Path $Event.SourceEventArgs.FullPath -ChangeType "Renamed" }
        $errorAction = { Write-Warning "Fobles watcher reported an error/possible buffer overflow; forcing full sync."; Invoke-FoblesOneDriveSync }
        $script:EventSubscriptions = @(
            Register-ObjectEvent -InputObject $script:Watcher -EventName Changed -Action $eventAction
            Register-ObjectEvent -InputObject $script:Watcher -EventName Created -Action $eventAction
            Register-ObjectEvent -InputObject $script:Watcher -EventName Deleted -Action $eventAction
            Register-ObjectEvent -InputObject $script:Watcher -EventName Renamed -Action $renamedAction
            Register-ObjectEvent -InputObject $script:Watcher -EventName Error -Action $errorAction
        )
        $script:Watcher.EnableRaisingEvents = $true
        Write-Host "Fobles OneDrive watcher started."
        Invoke-FoblesOneDriveSync
    }
}

function Stop-FoblesOneDriveWatcher {
    if ($script:SyncTimer) { $script:SyncTimer.Dispose(); $script:SyncTimer = $null }
    foreach ($subscription in $script:EventSubscriptions) { Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue }
    $script:EventSubscriptions = @()
    if ($script:Watcher) { $script:Watcher.EnableRaisingEvents = $false; $script:Watcher.Dispose(); $script:Watcher = $null }
    Write-Host "Fobles OneDrive watcher stopped."
}

function Get-FoblesOneDriveWatcherStatus {
    $watcherRunning = $null -ne $script:Watcher -and $script:Watcher.EnableRaisingEvents
    [PSCustomObject]@{ Running = $watcherRunning; SyncRunning = $script:SyncRunning; SyncPending = $script:SyncPending; Source = $script:SourceRoot; Destination = $script:DestinationRoot; DebounceMilliseconds = $script:DebounceMilliseconds; ExcludedDirectories = $script:ExcludedDirectories; ExcludedFilePatterns = $script:ExcludedFilePatterns }
}

Export-ModuleMember -Function @("Start-FoblesOneDriveWatcher", "Stop-FoblesOneDriveWatcher", "Get-FoblesOneDriveWatcherStatus", "Invoke-FoblesOneDriveSync")
