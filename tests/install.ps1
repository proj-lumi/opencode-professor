$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("professor-test-" + [guid]::NewGuid())
$env:OPENCODE_CONFIG_DIR = Join-Path $tempDir "config"
$destination = Join-Path $env:OPENCODE_CONFIG_DIR "agents/professor.md"
$sourceFile = Join-Path $root ".opencode/agents/professor.md"

try {
    & (Join-Path $root "scripts/install.ps1") | Out-Null
    if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
        throw "installer did not create the agent"
    }
    if ((Get-Content $sourceFile -Raw) -ne (Get-Content $destination -Raw)) {
        throw "installed agent differs from source"
    }

    Set-Content -LiteralPath $destination -Value "<!-- Managed by opencode-professor. -->`nstale"
    & (Join-Path $root "scripts/install.ps1") | Out-Null
    if ((Get-Content $sourceFile -Raw) -ne (Get-Content $destination -Raw)) {
        throw "installer did not update the managed agent"
    }

    & (Join-Path $root "scripts/uninstall.ps1") | Out-Null
    if (Test-Path -LiteralPath $destination) {
        throw "uninstaller did not remove the agent"
    }

    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    Set-Content -LiteralPath $destination -Value "user-owned"
    $refused = $false
    try {
        & (Join-Path $root "scripts/install.ps1") | Out-Null
    } catch {
        $refused = $true
    }
    if (-not $refused) {
        throw "installer overwrote an unmanaged agent"
    }
    if ((Get-Content -LiteralPath $destination -Raw).Trim() -ne "user-owned") {
        throw "installer changed an unmanaged agent"
    }

    Write-Output "PowerShell installer tests passed"
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
