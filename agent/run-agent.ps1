$ErrorActionPreference = 'Stop'
$agentDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $agentDirectory '.env.agent'

if (-not (Test-Path -LiteralPath $configPath)) {
  throw "Missing agent config: $configPath (copy env.agent.example to .env.agent and fill it in)."
}

Get-Content -LiteralPath $configPath | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $split = $line.IndexOf('=')
  if ($split -le 0) { return }
  $name = $line.Substring(0, $split).Trim()
  $value = $line.Substring($split + 1).Trim()
  [Environment]::SetEnvironmentVariable($name, $value, 'Process')
}

Set-Location -LiteralPath $agentDirectory
& node agent.js
exit $LASTEXITCODE
