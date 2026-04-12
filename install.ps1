# Fluxa — one-line installer for Windows (PowerShell)
# Usage: irm https://raw.githubusercontent.com/SoumyaRKN/Fluxa/main/install.ps1 | iex
#
# What this script does:
#   1. Detects your Windows architecture (x64 or ARM64)
#   2. Downloads the latest pre-built Fluxa binary from GitHub Releases
#   3. Places it in %LOCALAPPDATA%\Fluxa  (no admin rights needed)
#   4. Adds that folder to your PATH permanently
#   5. Creates a desktop shortcut

$ErrorActionPreference = "Stop"

$Repo        = "SoumyaRKN/Fluxa"
$InstallDir  = "$env:LOCALAPPDATA\Fluxa"
$ApiUrl      = "https://api.github.com/repos/$Repo/releases/latest"
$ProgressPreference = "SilentlyContinue"   # speeds up Invoke-WebRequest

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔═══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        Fluxa Installer (Windows)      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Detect architecture ───────────────────────────────────────────────────────
$Arch = $env:PROCESSOR_ARCHITECTURE
$ArchTag = switch ($Arch) {
    "AMD64"   { "x86_64" }
    "ARM64"   { "aarch64" }
    default   { Write-Host "Unsupported architecture: $Arch" -ForegroundColor Red; exit 1 }
}
$AssetName = "fluxa-windows-${ArchTag}.zip"
Write-Host "  Detected: Windows $Arch → looking for $AssetName" -ForegroundColor DarkCyan

# ── Fetch latest release ──────────────────────────────────────────────────────
Write-Host "  Fetching latest Fluxa release..." -ForegroundColor DarkCyan
try {
    $Release = Invoke-RestMethod -Uri $ApiUrl -Headers @{ "User-Agent" = "fluxa-installer" }
} catch {
    Write-Host "Could not reach GitHub API. Check your internet connection." -ForegroundColor Red
    exit 1
}
$Tag = $Release.tag_name
if (-not $Tag) {
    Write-Host "Could not determine latest release. The repo may not have published releases yet." -ForegroundColor Red
    Write-Host "See: https://github.com/$Repo#build-from-source" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Latest version: $Tag" -ForegroundColor DarkCyan

$Asset = $Release.assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
if (-not $Asset) {
    Write-Host "Binary '$AssetName' not found in release $Tag." -ForegroundColor Red
    Write-Host "Available assets:" -ForegroundColor Yellow
    $Release.assets | ForEach-Object { Write-Host "  - $($_.name)" }
    exit 1
}
$DownloadUrl = $Asset.browser_download_url

# ── Download ──────────────────────────────────────────────────────────────────
$TmpDir  = Join-Path $env:TEMP "fluxa-install-$([System.IO.Path]::GetRandomFileName())"
$ZipPath = Join-Path $TmpDir "fluxa.zip"

New-Item -ItemType Directory -Path $TmpDir -Force | Out-Null
Write-Host "  Downloading $DownloadUrl ..." -ForegroundColor DarkCyan
try {
    Invoke-WebRequest -Uri $DownloadUrl -OutFile $ZipPath
} catch {
    Write-Host "Download failed: $_" -ForegroundColor Red
    exit 1
}

# ── Install ───────────────────────────────────────────────────────────────────
Expand-Archive -Path $ZipPath -DestinationPath $TmpDir -Force

$Binary = Get-ChildItem -Path $TmpDir -Filter "fluxa.exe" -Recurse | Select-Object -First 1
if (-not $Binary) {
    Write-Host "Could not find fluxa.exe in the downloaded archive." -ForegroundColor Red
    exit 1
}

New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path $Binary.FullName -Destination "$InstallDir\fluxa.exe" -Force

Write-Host "  ✔ Installed fluxa $Tag → $InstallDir\fluxa.exe" -ForegroundColor Green

# ── PATH ──────────────────────────────────────────────────────────────────────
$UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$UserPath;$InstallDir", "User")
    Write-Host "  ✔ Added $InstallDir to your PATH" -ForegroundColor Green
    Write-Host "    (Restart your terminal for the PATH change to take effect)" -ForegroundColor Yellow
    # Also update current session
    $env:PATH = "$env:PATH;$InstallDir"
}

# ── Desktop shortcut ─────────────────────────────────────────────────────────
$ShortcutPath = [System.IO.Path]::Combine([Environment]::GetFolderPath("Desktop"), "Fluxa.lnk")
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$InstallDir\fluxa.exe"
$Shortcut.WorkingDirectory = $InstallDir
$Shortcut.Description = "Fluxa LAN File Server"
$Shortcut.Save()
Write-Host "  ✔ Created desktop shortcut: Fluxa.lnk" -ForegroundColor Green

# ── Cleanup ───────────────────────────────────────────────────────────────────
Remove-Item -Path $TmpDir -Recurse -Force -ErrorAction SilentlyContinue

# ── Done ──────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "Fluxa is installed!" -ForegroundColor Green
Write-Host ""
Write-Host "  Start Fluxa:    " -NoNewline; Write-Host "fluxa" -ForegroundColor Cyan
Write-Host "  Share a folder: " -NoNewline; Write-Host '$env:FLUXA_ROOT="C:\Users\you\Documents"; fluxa' -ForegroundColor Cyan
Write-Host "  Then open:      " -NoNewline; Write-Host "http://localhost:7070" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Or double-click the Fluxa shortcut on your desktop." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Uninstall:      Remove-Item '$InstallDir' -Recurse" -ForegroundColor DarkGray
Write-Host ""
