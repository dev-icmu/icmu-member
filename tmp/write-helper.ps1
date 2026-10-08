function Set-PortfolioFile([string]$RelativePath, [string]$Content) {
  $targetPath = Join-Path (Get-Location) $RelativePath
  $tempPath = "$targetPath.write-tmp"
  [System.IO.File]::WriteAllText($tempPath, $Content, [System.Text.UTF8Encoding]::new($false))
  [System.IO.File]::Move($tempPath, $targetPath, $true)
}
