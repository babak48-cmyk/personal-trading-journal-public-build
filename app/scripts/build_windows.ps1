param(
  [switch]$InstallRust,
  [switch]$SkipTests,
  [switch]$SkipBundle
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "Personal Trading Journal - Windows Beta Build" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot" -ForegroundColor DarkGray

function Fail($message, $help = $null) {
  Write-Host "FAIL: $message" -ForegroundColor Red
  if ($help) { Write-Host $help -ForegroundColor Yellow }
  exit 1
}

function Require-Command($name, $help) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    Fail "Missing command: $name" $help
  }
}

function Find-VSWhere {
  $candidates = @(
    "$env:ProgramFiles(x86)\Microsoft Visual Studio\Installer\vswhere.exe",
    "$env:ProgramFiles\Microsoft Visual Studio\Installer\vswhere.exe"
  )
  foreach ($p in $candidates) {
    if ($p -and (Test-Path $p)) { return $p }
  }
  return $null
}

function Test-CppBuildTools {
  $vswhere = Find-VSWhere
  if (-not $vswhere) { return $false }
  $path = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
  return -not [string]::IsNullOrWhiteSpace($path)
}

Require-Command node "Install the current Node.js LTS release, then reopen PowerShell."
Require-Command npm "npm is installed together with Node.js."

if (-not (Get-Command rustc -ErrorAction SilentlyContinue) -or -not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  if ($InstallRust) {
    Require-Command winget "winget is required for automatic Rust installation. Otherwise install Rust manually from rustup.rs."
    Write-Host "Installing Rustup through winget..." -ForegroundColor Cyan
    winget install --id Rustlang.Rustup --accept-source-agreements --accept-package-agreements
    Write-Host "Rustup installation completed. Close this PowerShell window, reopen it, then run this script again." -ForegroundColor Yellow
    exit 2
  }
  Fail "Rust/Cargo not found." "Install Rustup (recommended: winget install --id Rustlang.Rustup), select the stable MSVC toolchain, reopen PowerShell, then rerun this script."
}

if (-not (Test-CppBuildTools)) {
  Fail "Microsoft C++ Build Tools with the x64/x86 C++ toolset were not detected." "Install Visual Studio Build Tools and select 'Desktop development with C++'. This is required by Tauri on Windows."
}

Write-Host "Node:  $(node --version)" -ForegroundColor Green
Write-Host "npm:   $(npm --version)" -ForegroundColor Green
Write-Host "Rust:  $(rustc --version)" -ForegroundColor Green
Write-Host "Cargo: $(cargo --version)" -ForegroundColor Green

if (Get-Command rustup -ErrorAction SilentlyContinue) {
  Write-Host "Ensuring stable MSVC Rust toolchain..." -ForegroundColor Cyan
  rustup default stable-msvc | Out-Host
}

if (-not $SkipTests) {
  Write-Host "Running source/data integrity validation..." -ForegroundColor Cyan
  Require-Command python "Python 3 is required for the local validation suite."
  python scripts/validate_phase0.py
  python scripts/validate_phase6.py
  python scripts/validate_phase7.py
  python scripts/validate_beta_e2e.py
  python scripts/validate_phase8.py
  python scripts/validate_phase9.py
  python scripts/validate_phase10.py
  python scripts/validate_phase11.py
}

Write-Host "Installing JavaScript dependencies..." -ForegroundColor Cyan
if (Test-Path (Join-Path $ProjectRoot "package-lock.json")) {
  npm ci --no-audit --no-fund
} else {
  npm install --no-audit --no-fund
}

Write-Host "Running frontend unit tests..." -ForegroundColor Cyan
npm run test

Write-Host "Checking Rust formatting..." -ForegroundColor Cyan
Push-Location (Join-Path $ProjectRoot "src-tauri")
cargo fmt --check
Write-Host "Running Rust compile check..." -ForegroundColor Cyan
cargo check
Pop-Location

Write-Host "Running TypeScript + Vite production build..." -ForegroundColor Cyan
npm run build

if (-not $SkipBundle) {
  Write-Host "Building NSIS Windows installer..." -ForegroundColor Cyan
  npm run tauri build -- --bundles nsis

  $bundleDir = Join-Path $ProjectRoot "src-tauri\target\release\bundle\nsis"
  if (-not (Test-Path $bundleDir)) {
    Fail "Tauri reported completion but the NSIS bundle directory was not found." "Expected: $bundleDir"
  }
  $installers = Get-ChildItem $bundleDir -Filter *.exe -File -ErrorAction SilentlyContinue
  if (-not $installers) {
    Fail "No NSIS installer .exe was found after the build." "Check the Tauri build output above."
  }
  Write-Host "Windows installer(s):" -ForegroundColor Green
  $installers | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Green }
}

Write-Host "BUILD GATE PASSED" -ForegroundColor Green
