# @source-path [fobles] tools/powershell/source-mirror/modules/Fobles.SourceMirrorSync.psm1

$script:SourceRoot = "C:\Projects\fobles"
$script:DebounceMilliseconds = 2000
$script:SyncMutexName = "Global\Fobles.SourceMirrorSync"
$script:ExcludedDirectories = @("node_modules", ".git", "build", "dist", "coverage", ".next", "test-results", "playwright-report", "artifacts")
$script:ExcludedRelativePaths = @("playwright\test-artifacts\browser-profile")
$script:ExcludedFilePatterns = @("*.log", "*.tmp", "*.cache", "*.ts.txt", "*.tsx.txt", ".env")
$script:Watcher = $null
$script:EventSubscriptions = @()

function Get-MirrorDestination {
    $envPath = Join-Path $script:SourceRoot ".env"
    if (-not (Test-Path -LiteralPath $envPath)) {
        throw "Missing .env file: $envPath"
    }

    $line = Get-Content -LiteralPath $envPath |
        Where-Object { $_ -match '^\s*FOBLES_MIRROR_DESTINATION\s*=' } |
        Select-Object -First 1

    if (-not $line) {
        throw "FOBLES_MIRROR_DESTINATION is not defined in $envPath"
    }

    $destination = ($line -split '=', 2)[1].Trim().Trim('"').Trim("'")

    if ([string]::IsNullOrWhiteSpace($destination)) {
        throw "FOBLES_MIRROR_DESTINATION is empty in $envPath"
    }

    return $destination
}

$script:DestinationRoot = Get-MirrorDestination

function Test-FoblesExcludedPath {
    param([Parameter(Mandatory)][string]$Path)
    $normalizedPath = $Path.Replace("/", "\")
    $relativePath = $normalizedPath
    if ($normalizedPath.StartsWith($script:SourceRoot, [System.StringComparison]::OrdinalIgnoreCase)) { $relativePath = $normalizedPath.Substring($script:SourceRoot.Length) }
    $relativePath = $relativePath.TrimStart("\")
    foreach ($excludedRelativePath in $script:ExcludedRelativePaths) {
        if ($relativePath.Equals($excludedRelativePath, [System.StringComparison]::OrdinalIgnoreCase) -or $relativePath.StartsWith("$excludedRelativePath\", [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
    }
    foreach ($part in $relativePath.Split("\", [System.StringSplitOptions]::RemoveEmptyEntries)) {
        foreach ($directory in $script:ExcludedDirectories) {
            if ([System.String]::Equals($part, $directory, [System.StringComparison]::OrdinalIgnoreCase)) { return $true }
        }
    }
    $fileName = [System.IO.Path]::GetFileName($normalizedPath)
    foreach ($pattern in $script:ExcludedFilePatterns) { if ($fileName -like $pattern) { return $true } }
    return $false
}

function Sync-FoblesTypeScriptTextCopies {
    $safeDirectory = $script:SourceRoot.Replace("\", "/")
    $sourceFiles = @(git -c "safe.directory=$safeDirectory" -c core.quotepath=off -C $script:SourceRoot ls-files --cached --others --exclude-standard -- '*.ts' '*.tsx')
    if ($LASTEXITCODE -ne 0) { throw "git ls-files failed with exit code $LASTEXITCODE. Proxy cleanup was not run." }
    $keep = @{}
    foreach ($relative in $sourceFiles) {
        $relativeWindows = $relative.Replace("/", "\")
        $sourcePath = Join-Path $script:SourceRoot $relativeWindows
        $targetPath = Join-Path $script:DestinationRoot "$relativeWindows.txt"
        if ((Test-Path -LiteralPath $sourcePath) -and -not (Test-FoblesExcludedPath -Path $sourcePath)) {
            $keep[$targetPath] = $true
            New-Item -ItemType Directory -Path (Split-Path $targetPath) -Force | Out-Null
            Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
        }
    }
    Get-ChildItem -LiteralPath $script:DestinationRoot -Recurse -File |
        Where-Object {
            ($_.Name.EndsWith(".ts.txt", [System.StringComparison]::OrdinalIgnoreCase) -or
             $_.Name.EndsWith(".tsx.txt", [System.StringComparison]::OrdinalIgnoreCase)) -and
            -not $keep.ContainsKey($_.FullName)
        } |
        Remove-Item -Force
}

function Invoke-FoblesMirrorSync {

    $mutex = [System.Threading.Mutex]::new($false, $script:SyncMutexName)
    $lockTaken = $false
    try {
        try { $lockTaken = $mutex.WaitOne([TimeSpan]::FromMinutes(5)) }
        catch [System.Threading.AbandonedMutexException] { $lockTaken = $true }
        if (-not $lockTaken) { throw "Timed out waiting for another Fobles source mirror sync to finish." }
        Write-Host "Fobles source mirror sync started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        $arguments = @($script:SourceRoot, $script:DestinationRoot, "/MIR", "/FFT", "/R:1", "/W:1", "/NJH", "/NJS", "/NP", "/XD")
        foreach ($directory in $script:ExcludedDirectories) { $arguments += $directory }
        foreach ($relativePath in $script:ExcludedRelativePaths) { $arguments += [System.IO.Path]::Combine($script:SourceRoot, $relativePath) }
        $arguments += "/XF"
        $arguments += $script:ExcludedFilePatterns
        & robocopy @arguments
        $robocopyExitCode = $LASTEXITCODE
        if ($robocopyExitCode -ge 8) { throw "Robocopy failed with exit code $robocopyExitCode." }
        Sync-FoblesTypeScriptTextCopies
        Write-Host "Fobles source mirror sync complete. Robocopy exit code: $robocopyExitCode"
    } finally {
        if ($lockTaken) { $mutex.ReleaseMutex() }
        $mutex.Dispose()
    }
}

function Test-FoblesWatcherEventRelevant {
    param([Parameter(Mandatory)][System.Management.Automation.PSEventArgs]$EventRecord)
    if ($EventRecord.SourceIdentifier -eq "Fobles.SourceMirror.Error") { Write-Warning "Watcher error or overflow; forcing full sync."; return $true }
    $eventPath = $EventRecord.SourceEventArgs.FullPath
    if ([string]::IsNullOrWhiteSpace($eventPath) -or (Test-FoblesExcludedPath -Path $eventPath)) { return $false }
    Write-Host "Fobles change detected [$($EventRecord.SourceEventArgs.ChangeType)]: $eventPath"
    return $true
}

function Wait-FoblesDebounceWindow {
    param([Parameter(Mandatory)][System.Management.Automation.PSEventArgs]$InitialEvent)
    $relevant = Test-FoblesWatcherEventRelevant -EventRecord $InitialEvent
    Remove-Event -EventIdentifier $InitialEvent.EventIdentifier -ErrorAction SilentlyContinue
    $deadline = [DateTime]::UtcNow.AddMilliseconds($script:DebounceMilliseconds)
    while ([DateTime]::UtcNow -lt $deadline) {
        $eventRecord = Wait-Event -Timeout 1
        if ($null -ne $eventRecord -and $eventRecord.SourceIdentifier.StartsWith("Fobles.SourceMirror.")) {
            if (Test-FoblesWatcherEventRelevant -EventRecord $eventRecord) { $relevant = $true; $deadline = [DateTime]::UtcNow.AddMilliseconds($script:DebounceMilliseconds) }
            Remove-Event -EventIdentifier $eventRecord.EventIdentifier -ErrorAction SilentlyContinue
        }
    }
    return $relevant
}

function Start-FoblesSourceMirrorWatcher {
    if ($script:Watcher) { throw "Fobles SourceMirror watcher is already running." }
    Get-EventSubscriber |
        Where-Object SourceIdentifier -Like "Fobles.SourceMirror.*" |
        Unregister-Event
    Get-Event |
        Where-Object SourceIdentifier -Like "Fobles.SourceMirror.*" |
        Remove-Event
    if (-not (Test-Path -LiteralPath $script:SourceRoot)) { throw "Source directory does not exist: $script:SourceRoot" }
    New-Item -ItemType Directory -Path $script:DestinationRoot -Force | Out-Null
    $script:Watcher = [System.IO.FileSystemWatcher]::new($script:SourceRoot)
    $script:Watcher.IncludeSubdirectories = $true
    $script:Watcher.InternalBufferSize = 65536
    $script:Watcher.NotifyFilter = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::DirectoryName -bor [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::Size
    $script:EventSubscriptions = @(
        Register-ObjectEvent $script:Watcher Changed -SourceIdentifier "Fobles.SourceMirror.Changed"
        Register-ObjectEvent $script:Watcher Created -SourceIdentifier "Fobles.SourceMirror.Created"
        Register-ObjectEvent $script:Watcher Deleted -SourceIdentifier "Fobles.SourceMirror.Deleted"
        Register-ObjectEvent $script:Watcher Renamed -SourceIdentifier "Fobles.SourceMirror.Renamed"
        Register-ObjectEvent $script:Watcher Error -SourceIdentifier "Fobles.SourceMirror.Error"
    )
    $script:Watcher.EnableRaisingEvents = $true
    Invoke-FoblesMirrorSync
    try {
        while ($true) {
            $eventRecord = Wait-Event -Timeout 1
            if ($null -ne $eventRecord -and $eventRecord.SourceIdentifier.StartsWith("Fobles.SourceMirror.") -and (Wait-FoblesDebounceWindow -InitialEvent $eventRecord)) { Invoke-FoblesMirrorSync }
        }
    } finally { Stop-FoblesSourceMirrorWatcher }
}

function Stop-FoblesSourceMirrorWatcher {
    if ($script:Watcher) { $script:Watcher.EnableRaisingEvents = $false }
    foreach ($subscription in $script:EventSubscriptions) { Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue }
    $script:EventSubscriptions = @()
    Get-Event | Where-Object SourceIdentifier -Like "Fobles.SourceMirror.*" | Remove-Event -ErrorAction SilentlyContinue
    if ($script:Watcher) { $script:Watcher.Dispose(); $script:Watcher = $null }
}

function Get-FoblesSourceMirrorWatcherStatus {
    [PSCustomObject]@{ Running = $null -ne $script:Watcher -and $script:Watcher.EnableRaisingEvents; Source = $script:SourceRoot; Destination = $script:DestinationRoot; DebounceMilliseconds = $script:DebounceMilliseconds; MutexName = $script:SyncMutexName }
}

Export-ModuleMember -Function @("Start-FoblesSourceMirrorWatcher", "Stop-FoblesSourceMirrorWatcher", "Get-FoblesSourceMirrorWatcherStatus", "Invoke-FoblesMirrorSync")
