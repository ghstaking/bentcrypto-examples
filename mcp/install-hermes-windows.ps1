[CmdletBinding()]
param(
  [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA "BentCrypto"),
  [switch]$RegisterWithHermes,
  [string]$HermesProfile = ""
)

$ErrorActionPreference = "Stop"
$repoUrl = "https://github.com/ghstaking/bentcrypto-examples.git"
$repoDir = Join-Path $InstallRoot "bentcrypto-examples"
$mcpDir = Join-Path $repoDir "mcp"
$serverPath = Join-Path $mcpDir "server.mjs"
$snippetPath = Join-Path $mcpDir "hermes-bentcrypto-snippet.yaml"
$hermesRoot = Join-Path $HOME ".hermes"
$activeProfilePath = Join-Path $hermesRoot "active_profile"

function Require-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "$Name is required but was not found in PATH."
  }
  return $cmd.Source
}

function Get-HermesTargetDescription {
  if ($HermesProfile) {
    return "Hermes profile '$HermesProfile'"
  }
  if (Test-Path $activeProfilePath) {
    try {
      $active = (Get-Content $activeProfilePath -Raw -ErrorAction Stop).Trim()
      if ($active -and $active -ne "default") {
        return "active Hermes profile '$active'"
      }
    } catch {}
  }
  return "Hermes default/active profile"
}

function Get-HermesPrefixArgs {
  if ($HermesProfile) {
    return @("-p", $HermesProfile)
  }
  return @()
}

Write-Host "BentCrypto MCP -> Hermes Agent setup" -ForegroundColor Cyan
Write-Host "This helper installs and validates the public BentCrypto MCP bridge locally."
Write-Host "By default it does NOT modify Hermes config, store wallet keys, enable payments, or make a paid API call."
Write-Host "Use -RegisterWithHermes only when you explicitly want Hermes CLI to add the server to its active/profile-scoped config."
Write-Host ""

$git = Require-Command "git"
$node = Require-Command "node"
$npm = Require-Command "npm"
$hermes = (Get-Command "hermes" -ErrorAction SilentlyContinue)?.Source

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
# Manual fallback only. Prefer `hermes mcp add` so Hermes writes to the active profile.
# If a named Hermes profile is active, its config may live under ~/.hermes/profiles/<profile>/config.yaml.
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
Write-Host "Manual fallback snippet: $snippetPath"
Write-Host "Hermes target: $(Get-HermesTargetDescription)"
Write-Host ""

if ($RegisterWithHermes) {
  if (-not $hermes) {
    throw "Hermes CLI was not found in PATH. The MCP bridge is installed, but automatic Hermes registration cannot continue."
  }

  $prefixArgs = Get-HermesPrefixArgs
  Write-Host "Registering BentCrypto through Hermes CLI..." -ForegroundColor Cyan
  & $hermes @prefixArgs mcp add bentcrypto --command node --args $serverPath
  if ($LASTEXITCODE -ne 0) {
    throw "Hermes MCP registration failed. No payment was attempted."
  }

  Write-Host "Testing the registered MCP server..."
  & $hermes @prefixArgs mcp test bentcrypto
  if ($LASTEXITCODE -ne 0) {
    throw "Hermes registered the server but the MCP connection test failed."
  }

  Write-Host ""
  Write-Host "PASS BentCrypto is registered with $(Get-HermesTargetDescription)." -ForegroundColor Green
  Write-Host "Run 'hermes mcp configure bentcrypto' (add -p $HermesProfile before 'mcp' if targeting that named profile) and expose only:" -ForegroundColor Cyan
  Write-Host "  discover_bentcrypto"
  Write-Host "  preview_token_risk_payment"
} else {
  if ($hermes) {
    if ($HermesProfile) {
      Write-Host "Recommended profile-safe registration command:" -ForegroundColor Cyan
      Write-Host "hermes -p $HermesProfile mcp add bentcrypto --command node --args `"$serverPath`""
      Write-Host "Then: hermes -p $HermesProfile mcp test bentcrypto"
      Write-Host "Then: hermes -p $HermesProfile mcp configure bentcrypto"
    } else {
      Write-Host "Recommended profile-safe registration command:" -ForegroundColor Cyan
      Write-Host "hermes mcp add bentcrypto --command node --args `"$serverPath`""
      Write-Host "Then: hermes mcp test bentcrypto"
      Write-Host "Then: hermes mcp configure bentcrypto"
    }
  } else {
    Write-Host "Hermes CLI was not found in PATH. Use the generated YAML snippet as a manual fallback after confirming the active profile config path." -ForegroundColor Yellow
  }
}

Write-Host ""
Write-Host "For the first Hermes test, expose only discover_bentcrypto and preview_token_risk_payment." -ForegroundColor Cyan
Write-Host "Payments remain disabled by default. Do not add wallet private keys until the free discovery and preview flow is verified." -ForegroundColor Yellow
