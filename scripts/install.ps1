$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
$sourceFile = Join-Path $repo ".opencode/agents/professor.md"
$configDir = if ($env:OPENCODE_CONFIG_DIR) {
    $env:OPENCODE_CONFIG_DIR
} else {
    Join-Path $HOME ".config/opencode"
}
$destination = Join-Path $configDir "agents/professor.md"
$marker = "<!-- Managed by opencode-professor. -->"

if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
    throw "Professor installation is incomplete; missing $sourceFile"
}

if (Test-Path -LiteralPath $destination) {
    $existing = Get-Content -LiteralPath $destination -Raw
    if (-not $existing.Contains($marker)) {
        throw "Refusing to overwrite existing path: $destination`nMove it aside or remove it, then run the installer again."
    }
    Remove-Item -LiteralPath $destination -Force
}

$agentDir = Split-Path -Parent $destination
New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
Copy-Item -LiteralPath $sourceFile -Destination $destination
Write-Output "installed $destination"
Write-Output "Restart OpenCode Desktop and select Professor."
