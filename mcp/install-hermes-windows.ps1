[CmdletBinding()]
param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "BentCrypto")
)

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/ghstaking/bentcrypto-examples.git"
$repoDir = Join-Path $InstallRoot "bentcrypto-examples"
$mcpDir = Join-Path $repoDir "mcp"
$serverPath = Join-Path $mcpDir "server.mjs"
$snippetPath = Join-Path $mcpDir "hermes-bentcrypto-snippet.yaml"
$hermesConfig = Join-Path $HOME ".hermes\config.yaml"

function Require-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "$Name is required but was not found in PATH."
  }
  return $cmd.Source
}

Write-Host "BentCrypto MCP -> Hermes Agent setup" -ForegroundColor Cyan
Write-Host "This helper installs the public MCP bridge locally and creates a safe discovery-only Hermes config snippet."
Write-Host "It does NOT modify Hermes config, store wallet keys, enable payments, or make a paid API call."
Write-Host ""

$git = Require-Command "git"
$node = Require-Command "node"
$npm = Require-Command "npm"

$nodeVersionText = (& $node --version).Trim().TrimStart("v")
$nodeMajor = [int]($nodeVersionText.Split(".")[0])
if ($nodeMajor -lt 20) {
  throw "Node.js 20 or newer is required. Found v$nodeVersionText."
}
Write-Host "PASS Node.js v$nodeVersionText" -ForegroundColor Green

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

if (Test-Path (Join-Path $repoDir ".git")) {
  Write-Host "Updating existing BentCrypto examples checkout..."
  & $git -C $repoDir pull --ff-only
  if ($LASTEXITCODE -ne 0) { throw "git pull failed." }
} elseif (Test-Path $repoDir) {
  throw "Install path already exists but is not a Git checkout: $repoDir"
} else {
  Write-Host "Cloning BentCrypto examples..."
  & $git clone --depth 1 $repoUrl $repoDir
  if ($LASTEXITCODE -ne 0) { throw "git clone failed." }
}

if (-not (Test-Path $serverPath)) {
  throw "MCP server was not found after checkout: $serverPath"
}

Write-Host "Installing MCP dependencies..."
Push-Location $mcpDir
try {
  & $npm install --ignore-scripts
  if ($LASTEXITCODE -ne 0) { throw "npm install failed." }
  & $npm run check
  if ($LASTEXITCODE -ne 0) { throw "MCP syntax check failed." }
  & $npm test
  if ($LASTEXITCODE -ne 0) { throw "MCP tests failed." }
} finally {
  Pop-Location
}

$yamlServerPath = $serverPath.Replace("\", "/").Replace('"', '\"')
$snippet = @"
# Merge this block into ~/.hermes/config.yaml.
# If your config already has an mcp_servers: section, add only the indented bentcrypto: entry under it.
mcp_servers:
  bentcrypto:
    command: "node"
    args:
      - "$yamlServerPath"
    enabled: true
    timeout: 120
    tools:
      include:
        - discover_bentcrypto
        - preview_token_risk_payment
"@
Set-Content -Path $snippetPath -Value $snippet -Encoding UTF8

Write-Host ""
Write-Host "PASS BentCrypto MCP installed and validated." -ForegroundColor Green
Write-Host "Server: $serverPath"
Write-Host "Hermes config: $hermesConfig"
Write-Host "Safe config snippet: $snippetPath"
Write-Host ""
Write-Host "Next:" -ForegroundColor Cyan
Write-Host "1. Open $snippetPath"
Write-Host "2. Merge it into $hermesConfig"
Write-Host "3. Restart Hermes or run /reload-mcp"
Write-Host "4. Ask Hermes: Tell me which BentCrypto MCP tools are available, then use the free discovery tool. Do not make a payment."
Write-Host ""
Write-Host "Payments remain disabled. Do not add wallet private keys until the free discovery and preview flow is verified." -ForegroundColor Yellow
