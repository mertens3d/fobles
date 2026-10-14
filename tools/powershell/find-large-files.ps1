param(
    [string]$Root = "C:\Projects\fobles\src"
)

Get-ChildItem -Path $Root -Recurse -File |
    Where-Object { $_.Extension -in ".ts", ".tsx", ".scss" } |
    ForEach-Object {
        $LineCount = (Get-Content $_.FullName).Count

        if ($LineCount -gt 400) {
            [PSCustomObject]@{
                Lines = $LineCount
                File  = $_.FullName
            }
        }
    } |
    Sort-Object Lines -Descending