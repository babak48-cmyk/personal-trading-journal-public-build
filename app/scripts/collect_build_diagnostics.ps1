param([string]$OutputPath = "")
$ErrorActionPreference = 'Continue'
$Root = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path $Root "build_diagnostics.txt"
}
$lines = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$s) { $lines.Add($s) }
function Capture([string]$label, [scriptblock]$cmd) {
  Add-Line "=== $label ==="
  try { $out = & $cmd 2>&1 | Out-String; Add-Line $out.TrimEnd() }
  catch { Add-Line "ERROR: $($_.Exception.Message)" }
}
Add-Line "Personal Trading Journal - Build Diagnostics"
Add-Line "Generated: $([DateTime]::UtcNow.ToString('o'))"
Add-Line "OS: $([System.Environment]::OSVersion.VersionString)"
Capture "Node" { node --version }
Capture "npm" { npm --version }
Capture "Rust" { rustc --version }
Capture "Cargo" { cargo --version }
Capture "rustup toolchains" { rustup toolchain list }
Capture "Python" { python --version }
Capture "Package version" { (Get-Content (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json).version }
Capture "Tauri config version" { (Get-Content (Join-Path $Root 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json).version }
Capture "Cargo package version" {
  $line = Select-String -Path (Join-Path $Root 'src-tauri\Cargo.toml') -Pattern '^version\s*=\s*"' | Select-Object -First 1
  $line.Line
}
Capture "NSIS bundle directory" {
  Get-ChildItem (Join-Path $Root 'src-tauri\target\release\bundle\nsis') -ErrorAction SilentlyContinue | Format-Table Name,Length,LastWriteTime -AutoSize
}
$lines | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "Diagnostics written to $OutputPath" -ForegroundColor Cyan
