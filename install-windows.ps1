#!/usr/bin/env pwsh
# Candidate Catcher ATS — one-shot Windows installer.
#
#   irm https://raw.githubusercontent.com/YOUR-ORG/candidate-catcher-ats/main/install-windows.ps1 | iex
#
# Installs git + Node.js 22+ if missing (winget where available, otherwise a
# direct official-installer download — winget isn't present on every
# Windows box, notably Windows Server), clones the repo (skipped if you're
# already running this from a local checkout — see $TargetDir detection
# below), runs `npm ci` in scaffold/, and (optionally) installs Ollama for a
# fully local run. Safe to re-run: skips anything already present/done.
#
# After this finishes, `cd candidate-catcher-ats\scaffold` and run `npm run setup`
# (cloud API keys) or `npm run setup:local -- --yes` (fully local via
# Ollama), then `npm run dev`.

$ErrorActionPreference = "Stop"

# TODO: set this once the repo has a real GitHub remote.
$RepoUrl = if ($env:CANDIDATE_CATCHER_REPO_URL) { $env:CANDIDATE_CATCHER_REPO_URL } else { "https://github.com/KurtLehnardt/candidate-catcher-ats.git" }
$TargetDir = if ($env:CANDIDATE_CATCHER_INSTALL_DIR) { $env:CANDIDATE_CATCHER_INSTALL_DIR } else { "candidate-catcher-ats" }
$NodeMajorMin = 22

function Write-Heading($msg) { Write-Host "`n$msg" -ForegroundColor White }
function Write-Ok($msg)      { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-WarnMsg($msg) { Write-Host "  [!]  $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "  [X]  $msg" -ForegroundColor Red; exit 1 }

Write-Heading "Candidate Catcher ATS — Windows install"

$HasWinget = [bool](Get-Command winget -ErrorAction SilentlyContinue)
if ($HasWinget) {
  Write-Ok "winget found"
} else {
  Write-WarnMsg "winget not found — will fall back to direct downloads (expected on e.g. Windows Server)"
}

# 1) git.
$GitCmd = Get-Command git -ErrorAction SilentlyContinue
if ($GitCmd) {
  Write-Ok "git already installed ($(git --version))"
} else {
  Write-Heading "Installing git..."
  if ($HasWinget) {
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  } else {
    $GitInstaller = Join-Path $env:TEMP "git-installer.exe"
    # The redirect always points at the latest release build for this arch.
    $GitUrl = "https://github.com/git-for-windows/git/releases/latest/download/Git-64-bit.exe"
    Invoke-WebRequest -Uri $GitUrl -OutFile $GitInstaller
    Start-Process -FilePath $GitInstaller -ArgumentList "/VERYSILENT", "/NORESTART" -Wait
    Remove-Item $GitInstaller -ErrorAction SilentlyContinue
  }
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Die "git still isn't on PATH after installing. Open a new terminal and re-run this script."
  }
  Write-Ok "git installed ($(git --version))"
}

# 2) Node.js 22+.
$NodeOk = $false
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCmd) {
  $NodeVersionRaw = (node -v) -replace '^v', ''
  $NodeMajor = [int]($NodeVersionRaw -split '\.')[0]
  if ($NodeMajor -ge $NodeMajorMin) {
    Write-Ok "node already installed (v$NodeVersionRaw)"
    $NodeOk = $true
  } else {
    Write-WarnMsg "node v$NodeVersionRaw is older than $NodeMajorMin — installing a newer one"
  }
}
if (-not $NodeOk) {
  Write-Heading "Installing Node.js $NodeMajorMin+..."
  if ($HasWinget) {
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
  } else {
    # nodejs.org's "latest-vNN.x" index always has the newest patch release for
    # that major version — fetch the directory listing and take the first
    # Windows x64 .msi it offers rather than hardcoding a patch version.
    $NodeIndexUrl = "https://nodejs.org/dist/latest-v$NodeMajorMin.x/"
    $NodeIndex = Invoke-WebRequest -Uri $NodeIndexUrl -UseBasicParsing
    $MsiName = ($NodeIndex.Links | Where-Object { $_.href -match 'node-v[\d.]+-x64\.msi$' } | Select-Object -First 1).href
    if (-not $MsiName) { Die "Couldn't find a Node .msi at $NodeIndexUrl — install Node from https://nodejs.org and re-run." }
    $MsiPath = Join-Path $env:TEMP $MsiName
    Invoke-WebRequest -Uri "$NodeIndexUrl$MsiName" -OutFile $MsiPath
    Start-Process -FilePath "msiexec.exe" -ArgumentList "/i", "`"$MsiPath`"", "/qn", "/norestart" -Wait
    Remove-Item $MsiPath -ErrorAction SilentlyContinue
  }
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Die "Node still isn't on PATH after installing. Open a new terminal and re-run this script."
  }
  Write-Ok "node installed ($(node -v))"
}

# 3) Clone, unless we're already running this from inside a checkout.
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path -ErrorAction SilentlyContinue
if ($ScriptDir -and (Test-Path (Join-Path $ScriptDir "scaffold\package.json"))) {
  $TargetDir = $ScriptDir
  Write-Ok "running from an existing checkout ($TargetDir) — skipping clone"
} elseif (Test-Path (Join-Path $TargetDir "scaffold\package.json")) {
  Write-Ok "$TargetDir already cloned"
} else {
  if ($RepoUrl -like "*TODO-SET-ME*") {
    Die "CANDIDATE_CATCHER_REPO_URL isn't set and no local checkout was found next to this script. Set `$env:CANDIDATE_CATCHER_REPO_URL = '<your fork''s git URL>'`, or run this script from inside an already-cloned copy of the repo."
  }
  Write-Heading "Cloning $RepoUrl into .\$TargetDir ..."
  git clone $RepoUrl $TargetDir
  Write-Ok "cloned"
}

# 4) npm ci -- never rewrites package-lock.json (unlike npm install).
Set-Location (Join-Path $TargetDir "scaffold")
Write-Heading "Installing npm dependencies..."
npm ci
Write-Ok "dependencies installed"

# 5) Ollama (only needed for the fully-local path, so never fatal).
Write-Heading "Ollama (for the fully local, no-API-key path)"
if (Get-Command ollama -ErrorAction SilentlyContinue) {
  Write-Ok "ollama already installed"
} elseif ($HasWinget) {
  Write-Heading "Installing Ollama..."
  try {
    winget install -e --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements
    Write-Ok "ollama installed"
  } catch {
    Write-WarnMsg "winget install of Ollama failed — get it from https://ollama.com/download if you want the fully local path"
  }
} else {
  Write-WarnMsg "no winget — get Ollama from https://ollama.com/download if you want the fully local path"
}

Write-Heading "Done. Next steps:"
Write-Host "  cd $TargetDir\scaffold"
Write-Host "  npm run setup                  # cloud API keys (Anthropic and/or OpenAI), or"
Write-Host "  npm run setup:local -- --yes   # fully local via Ollama, no API keys"
Write-Host "  npm run dev                    # -> http://localhost:3000"
