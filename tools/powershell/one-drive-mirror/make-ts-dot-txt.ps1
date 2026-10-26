param($Src='C:\Projects\fobles',$Dst="$env:OneDrive\fobles-sync")
$Src=$Src.TrimEnd('\')
$Dst=$Dst.TrimEnd('\')
robocopy $Src $Dst /MIR /XD node_modules .git .next dist out /XF *.ts *.tsx *.ts.txt *.tsx.txt /NFL /NDL /NJH /NJS
$keep=@{}
git -C $Src ls-files --cached --others --exclude-standard -- '*.ts' '*.tsx' | ForEach-Object {
  $s=Join-Path $Src ($_ -replace '/','\')
  $t="$($Dst)\$($_ -replace '/','\').txt"
  $keep[$t]=1
  if(Test-Path $s){
    New-Item -ItemType Directory -Force (Split-Path $t) | Out-Null
    if(-not (Test-Path $t) -or (Get-Item $t).LastWriteTimeUtc -lt (Get-Item $s).LastWriteTimeUtc){ Copy-Item $s $t -Force }
  }
}
Get-ChildItem $Dst -Recurse -File -Include *.ts.txt,*.tsx.txt | Where-Object { -not $keep.ContainsKey($_.FullName) } | Remove-Item -Force