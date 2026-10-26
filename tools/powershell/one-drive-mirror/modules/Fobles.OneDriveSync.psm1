$script:SourceRoot = "C:\Projects\fobles"
$script:DestinationRoot = "C:\Users\gregory.mertens\OneDrive - Kestra Financial\Projects\fobles"
$script:DebounceMilliseconds = 2000

$script:ExcludedDirectories = @(
    "node_modules",
    ".git",
    "build",
    "dist",
    "coverage",
    ".next",
    "test-results",
    "playwright-report",
    "artifacts"
)

$script:ExcludedRelativePaths = @(
    "playwright\test-artifacts\browser-profile"
)

$script:ExcludedFilePatterns = @(
    "*.log",
    "*.tmp",
    "*.cache"
)

$script:Watcher = $null
$script:EventSubscriptions = @()
$script:SyncRunning = $false
$script:SyncPending = $false

function Test-FoblesExcludedPath {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $normalizedPath = $Path.Replace("/", "\")
    $relativePath = $normalizedPath

    if ($normalizedPath.StartsWith($script:SourceRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        $relativePath = $normalizedPath.Substring($script:SourceRoot.Length)
    }

    $relativePath = $relativePath.TrimStart("\")

    foreach ($excludedRelativePath in $script:ExcludedRelativePaths) {
        if (
            $relativePath.Equals($excludedRelativePath, [System.StringComparison]::OrdinalIgnoreCase) -or
            $relativePath.StartsWith("$excludedRelativePath\", [System.StringComparison]::OrdinalIgnoreCase)
        ) {
            return $true
        }
    }

    $pathParts = $relativePath.Split("\", [System.StringSplitOptions]::RemoveEmptyEntries)

    foreach ($directory in $script:ExcludedDirectories) {
        foreach ($part in $pathParts) {
            if ([System.String]::Equals($part, $directory, [System.StringComparison]::OrdinalIgnoreCase)) {
                return $true
            }
        }
    }

    $fileName = [System.IO.Path]::GetFileName($normalizedPath)

    foreach ($pattern in $script:ExcludedFilePatterns) {
        if ($fileName -like $pattern) {
            return $true
        }
    }

    return $false
}
function Sync-FoblesTypeScriptTextCopies {
    $keep = @{}
    $sourceFiles = git -c core.quotepath=off -C $script:SourceRoot ls-files --cached --others --exclude-standard -- '*.ts' '*.tsx'

    foreach ($relative in $sourceFiles) {
        $relativeWindows = $relative.Replace("/", "\")
        $sourcePath = Join-Path $script:SourceRoot $relativeWindows
        $targetPath = Join-Path $script:DestinationRoot "$relativeWindows.txt"

        if ((Test-Path -LiteralPath $sourcePath) -and -not (Test-FoblesExcludedPath -Path $sourcePath)) {
            $keep[$targetPath] = $true

            if (-not (Test-Path -LiteralPath $targetPath) -or (Get-Item -LiteralPath $targetPath).LastWriteTimeUtc -ne (Get-Item -LiteralPath $sourcePath).LastWriteTimeUtc) {
                New-Item -ItemType Directory -Path (Split-Path $targetPath) -Force | Out-Null
                Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Force
            }
        }
    }

    Get-ChildItem -LiteralPath $script:DestinationRoot -Recurse -File -Include "*.ts", "*.tsx", "*.ts.txt", "*.tsx.txt" |
        Where-Object { -not $keep.ContainsKey($_.FullName) } |
        Remove-Item -Force
}
function Invoke-FoblesOneDriveSync {
    if ($script:SyncRunning) {
        $script:SyncPending = $true
    }
    else {
        $script:SyncRunning = $true

        try {
            do {
                $script:SyncPending = $false

                Write-Host "Fobles OneDrive sync started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

                $arguments = @(
                    $script:SourceRoot,
                    $script:DestinationRoot,
                    "/MIR",
                    "/FFT",
                    "/R:1",
                    "/W:1",
                    "/NJH",
                    "/NJS",
                    "/NP"
                )

                if (
                    $script:ExcludedDirectories.Count -gt 0 -or
                    $script:ExcludedRelativePaths.Count -gt 0
                ) {
                    $arguments += "/XD"

                    foreach ($directory in $script:ExcludedDirectories) {
                        $arguments += [System.IO.Path]::Combine($script:SourceRoot, $directory)
                    }

                    foreach ($relativePath in $script:ExcludedRelativePaths) {
                        $arguments += [System.IO.Path]::Combine($script:SourceRoot, $relativePath)
                    }
                }

                $arguments += "/XF"
                $arguments += $script:ExcludedFilePatterns
                $arguments += $script:TextCopyExcludePatterns

                & robocopy @arguments
                $robocopyExitCode = $LASTEXITCODE

                if ($robocopyExitCode -ge 8) {
                    Write-Error "Fobles OneDrive sync failed. Robocopy exit code: $robocopyExitCode"
                }
                else {
                    Sync-FoblesTypeScriptTextCopies
                    Write-Host "Fobles OneDrive sync complete. Robocopy exit code: $robocopyExitCode"
                }
            }
            while ($script:SyncPending)
        }
        finally {
            $script:SyncRunning = $false
        }
    }
}

function Initialize-FoblesOneDriveWatcher {
    if ($script:Watcher) {
        throw "Fobles OneDrive watcher is already running."
    }

    if (-not (Test-Path -LiteralPath $script:SourceRoot)) {
        throw "Source directory does not exist: $script:SourceRoot"
    }

    if (-not (Test-Path -LiteralPath $script:DestinationRoot)) {
        New-Item -ItemType Directory -Path $script:DestinationRoot -Force | Out-Null
    }

    $script:Watcher = [System.IO.FileSystemWatcher]::new()
    $script:Watcher.Path = $script:SourceRoot
    $script:Watcher.IncludeSubdirectories = $true
    $script:Watcher.InternalBufferSize = 65536
    $script:Watcher.NotifyFilter =
        [System.IO.NotifyFilters]::FileName -bor
        [System.IO.NotifyFilters]::DirectoryName -bor
        [System.IO.NotifyFilters]::LastWrite -bor
        [System.IO.NotifyFilters]::Size

    $script:EventSubscriptions = @(
        Register-ObjectEvent -InputObject $script:Watcher -EventName Changed -SourceIdentifier "Fobles.OneDrive.Changed"
        Register-ObjectEvent -InputObject $script:Watcher -EventName Created -SourceIdentifier "Fobles.OneDrive.Created"
        Register-ObjectEvent -InputObject $script:Watcher -EventName Deleted -SourceIdentifier "Fobles.OneDrive.Deleted"
        Register-ObjectEvent -InputObject $script:Watcher -EventName Renamed -SourceIdentifier "Fobles.OneDrive.Renamed"
        Register-ObjectEvent -InputObject $script:Watcher -EventName Error -SourceIdentifier "Fobles.OneDrive.Error"
    )

    $script:Watcher.EnableRaisingEvents = $true

    Write-Host "Fobles OneDrive watcher started."
    Write-Host "Source:      $script:SourceRoot"
    Write-Host "Destination: $script:DestinationRoot"
}

function Test-FoblesWatcherEventRelevant {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.PSEventArgs]$EventRecord
    )

    if ($EventRecord.SourceIdentifier -eq "Fobles.OneDrive.Error") {
        Write-Warning "Fobles watcher reported an error or buffer overflow; forcing a full sync."
        return $true
    }

    $eventPath = $EventRecord.SourceEventArgs.FullPath

    if ([string]::IsNullOrWhiteSpace($eventPath)) {
        return $false
    }

    if (Test-FoblesExcludedPath -Path $eventPath) {
        return $false
    }

    Write-Host "Fobles change detected [$($EventRecord.SourceEventArgs.ChangeType)]: $eventPath"
    return $true
}

function Wait-FoblesDebounceWindow {
    param(
        [Parameter(Mandatory)]
        [System.Management.Automation.PSEventArgs]$InitialEvent
    )

    $relevantChangeDetected = Test-FoblesWatcherEventRelevant -EventRecord $InitialEvent
    Remove-Event -EventIdentifier $InitialEvent.EventIdentifier -ErrorAction SilentlyContinue
    $quietDeadline = [DateTime]::UtcNow.AddMilliseconds($script:DebounceMilliseconds)

    while ([DateTime]::UtcNow -lt $quietDeadline) {
        $remainingMilliseconds = [Math]::Max(
            1,
            [int]($quietDeadline - [DateTime]::UtcNow).TotalMilliseconds
        )
        $eventRecord = Wait-Event -Timeout ([Math]::Min(1, [Math]::Ceiling($remainingMilliseconds / 1000)))

        if ($null -ne $eventRecord -and $eventRecord.SourceIdentifier.StartsWith("Fobles.OneDrive.")) {
            if (Test-FoblesWatcherEventRelevant -EventRecord $eventRecord) {
                $relevantChangeDetected = $true
                $quietDeadline = [DateTime]::UtcNow.AddMilliseconds($script:DebounceMilliseconds)
            }

            Remove-Event -EventIdentifier $eventRecord.EventIdentifier -ErrorAction SilentlyContinue
        }
    }

    return $relevantChangeDetected
}

function Start-FoblesOneDriveWatcher {
    Initialize-FoblesOneDriveWatcher
    Invoke-FoblesOneDriveSync

    try {
        while ($true) {
            $eventRecord = Wait-Event -Timeout 1

            if ($null -eq $eventRecord) {
                continue
            }

            if (-not $eventRecord.SourceIdentifier.StartsWith("Fobles.OneDrive.")) {
                continue
            }

            if (Wait-FoblesDebounceWindow -InitialEvent $eventRecord) {
                Invoke-FoblesOneDriveSync
            }
        }
    }
    finally {
        Stop-FoblesOneDriveWatcher
    }
}

function Stop-FoblesOneDriveWatcher {
    if ($script:Watcher) {
        $script:Watcher.EnableRaisingEvents = $false
    }

    foreach ($subscription in $script:EventSubscriptions) {
        Unregister-Event -SubscriptionId $subscription.Id -ErrorAction SilentlyContinue
    }

    $script:EventSubscriptions = @()

    Get-Event |
        Where-Object SourceIdentifier -Like "Fobles.OneDrive.*" |
        Remove-Event -ErrorAction SilentlyContinue

    if ($script:Watcher) {
        $script:Watcher.Dispose()
        $script:Watcher = $null
    }

    Write-Host "Fobles OneDrive watcher stopped."
}

function Get-FoblesOneDriveWatcherStatus {
    $watcherRunning =
        $null -ne $script:Watcher -and
        $script:Watcher.EnableRaisingEvents

    [PSCustomObject]@{
        Running = $watcherRunning
        SyncRunning = $script:SyncRunning
        SyncPending = $script:SyncPending
        Source = $script:SourceRoot
        Destination = $script:DestinationRoot
        DebounceMilliseconds = $script:DebounceMilliseconds
        ExcludedDirectories = $script:ExcludedDirectories
        ExcludedRelativePaths = $script:ExcludedRelativePaths
        ExcludedFilePatterns = $script:ExcludedFilePatterns
    }
}

Export-ModuleMember -Function @(
    "Start-FoblesOneDriveWatcher",
    "Stop-FoblesOneDriveWatcher",
    "Get-FoblesOneDriveWatcherStatus",
    "Invoke-FoblesOneDriveSync"
)
