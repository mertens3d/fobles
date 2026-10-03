param(
    [Parameter(Mandatory = $true)][ValidateSet("Get", "Set", "Remove")]
    [string]$Action,
    [Parameter(Mandatory = $true)][string]$Name
)

# Non-terminating errors (e.g. a cmdlet whose module fails to autoload) would otherwise let the
# switch below silently continue with a $null value, write a broken file, and still print a false
# "Stored securely" success - stop hard on the first real error instead.
$ErrorActionPreference = "Stop"

# DPAPI (via Export-Clixml's SecureString serialization) ties the ciphertext to this exact Windows
# user account + machine - nobody else, and not even this same user on a different machine, can
# decrypt it. Stored outside the repo entirely so it's never at risk of being committed.
$secretDir = Join-Path $env:LOCALAPPDATA "fobles\secrets"
$secretPath = Join-Path $secretDir "$Name.xml"

try {
    switch ($Action) {
        "Set" {
            New-Item -ItemType Directory -Path $secretDir -Force | Out-Null
            # Reads one already-masked line from stdin (Node owns the interactive prompt - see
            # secure-secret-store.js - so Ctrl+C/Escape are handled reliably in a single process
            # instead of depending on console-signal propagation into this nested child process).
            $plainValue = [Console]::In.ReadLine()
            # Built directly from the .NET type rather than ConvertTo-SecureString -AsPlainText -
            # that cmdlet lives in the Microsoft.PowerShell.Security module, which has failed to
            # autoload in some invocation contexts (e.g. a VS Code task terminal) even though
            # System.Security.SecureString itself always works with no module dependency at all.
            $secureValue = New-Object System.Security.SecureString
            foreach ($ch in $plainValue.ToCharArray()) {
                $secureValue.AppendChar($ch)
            }
            $secureValue.MakeReadOnly()
            $secureValue | Export-Clixml -Path $secretPath
            Write-Host "Stored '$Name' securely for this Windows user at $secretPath" -ForegroundColor Green
        }
        "Get" {
            if (-not (Test-Path $secretPath)) {
                exit 1
            }
            $secureValue = Import-Clixml -Path $secretPath
            $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
            try {
                [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
            }
            finally {
                [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
            }
        }
        "Remove" {
            Remove-Item -Path $secretPath -ErrorAction SilentlyContinue
        }
    }
}
catch {
    Write-Error $_
    exit 1
}

