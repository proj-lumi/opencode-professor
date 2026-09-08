$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$configDir = if ($env:OPENCODE_CONFIG_DIR) {
    $env:OPENCODE_CONFIG_DIR
} else {
    Join-Path $HOME ".config/opencode"
}
$destination = Join-Path $configDir "agents/professor.md"
$marker = "<!-- Managed by opencode-professor. -->"

if (-not (Test-Path -LiteralPath $destination)) {
    Write-Output "Professor is already absent."
    return
}

$existing = Get-Content -LiteralPath $destination -Raw
if (-not $existing.Contains($marker)) {
    Write-Output "kept $destination (not managed by opencode-professor)"
    return
}

Remove-Item -LiteralPath $destination -Force
Write-Output "removed $destination"
