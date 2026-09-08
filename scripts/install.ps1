$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repo = Split-Path -Parent $PSScriptRoot
$configDir = if ($env:OPENCODE_CONFIG_DIR) {
    $env:OPENCODE_CONFIG_DIR
} else {
    Join-Path $HOME ".config/opencode"
}
$marker = "Managed by opencode-professor."
$resources = @(
    @{ Source = ".opencode/agents/professor.md"; Destination = "agents/professor.md" }
    @{ Source = ".opencode/agents/professor-researcher.md"; Destination = "agents/professor-researcher.md" }
    @{ Source = ".opencode/agents/professor-svg-artist.md"; Destination = "agents/professor-svg-artist.md" }
    @{ Source = ".opencode/commands/gap.md"; Destination = "commands/gap.md" }
    @{ Source = ".opencode/commands/lessons.md"; Destination = "commands/lessons.md" }
    @{ Source = ".opencode/commands/log.md"; Destination = "commands/log.md" }
    @{ Source = ".opencode/commands/resume.md"; Destination = "commands/resume.md" }
    @{ Source = ".opencode/commands/teach.md"; Destination = "commands/teach.md" }
    @{ Source = ".opencode/lib/professor-core.js"; Destination = "lib/professor-core.js" }
    @{ Source = ".opencode/plugins/professor.js"; Destination = "plugins/professor.js" }
    @{ Source = ".opencode/skills/teach/SKILL.md"; Destination = "skills/teach/SKILL.md" }
)

foreach ($resource in $resources) {
    $sourceFile = Join-Path $repo $resource.Source
    if (-not (Test-Path -LiteralPath $sourceFile -PathType Leaf)) {
        throw "Professor installation is incomplete; missing $sourceFile"
    }
}

foreach ($resource in $resources) {
    $destination = Join-Path $configDir $resource.Destination
    if (Test-Path -LiteralPath $destination) {
        $existing = Get-Content -LiteralPath $destination -Raw
        if (-not $existing.Contains($marker)) {
            throw "Refusing to overwrite existing path: $destination`nMove it aside or remove it, then run the installer again."
        }
    }
}

foreach ($resource in $resources) {
    $sourceFile = Join-Path $repo $resource.Source
    $destination = Join-Path $configDir $resource.Destination
    New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
    if (Test-Path -LiteralPath $destination) {
        Remove-Item -LiteralPath $destination -Force
    }
    Copy-Item -LiteralPath $sourceFile -Destination $destination
    Write-Output "installed $destination"
}

Write-Output "Restart OpenCode Desktop, select Professor, or run /teach."
