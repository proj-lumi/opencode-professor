$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$configDir = if ($env:OPENCODE_CONFIG_DIR) {
    $env:OPENCODE_CONFIG_DIR
} else {
    Join-Path $HOME ".config/opencode"
}
$marker = "Managed by opencode-professor."
$resources = @(
    "agents/professor.md"
    "agents/professor-researcher.md"
    "agents/professor-svg-artist.md"
    "commands/gap.md"
    "commands/lessons.md"
    "commands/log.md"
    "commands/resume.md"
    "commands/teach.md"
    "lib/professor-core.js"
    "plugins/professor.js"
    "skills/teach/SKILL.md"
)

foreach ($destinationRel in $resources) {
    $destination = Join-Path $configDir $destinationRel
    if (-not (Test-Path -LiteralPath $destination)) {
        continue
    }
    $existing = Get-Content -LiteralPath $destination -Raw
    if (-not $existing.Contains($marker)) {
        Write-Output "kept $destination (not managed by opencode-professor)"
        continue
    }
    Remove-Item -LiteralPath $destination -Force
    Write-Output "removed $destination"
}

Write-Output "Professor uninstall finished."
