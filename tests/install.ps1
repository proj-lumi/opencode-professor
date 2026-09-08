$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $PSScriptRoot
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("professor-test-" + [guid]::NewGuid())
$env:OPENCODE_CONFIG_DIR = Join-Path $tempDir "config"
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

try {
    & (Join-Path $root "scripts/install.ps1") | Out-Null
    foreach ($resource in $resources) {
        $sourceFile = Join-Path $root $resource.Source
        $destination = Join-Path $env:OPENCODE_CONFIG_DIR $resource.Destination
        if (-not (Test-Path -LiteralPath $destination -PathType Leaf)) {
            throw "installer did not create $destination"
        }
        if ((Get-Content $sourceFile -Raw) -ne (Get-Content $destination -Raw)) {
            throw "installed file differs from $sourceFile"
        }
    }

    $professor = Join-Path $env:OPENCODE_CONFIG_DIR "agents/professor.md"
    Set-Content -LiteralPath $professor -Value "<!-- Managed by opencode-professor. -->`nstale"
    & (Join-Path $root "scripts/install.ps1") | Out-Null
    if ((Get-Content (Join-Path $root ".opencode/agents/professor.md") -Raw) -ne (Get-Content $professor -Raw)) {
        throw "installer did not update managed files"
    }

    & (Join-Path $root "scripts/uninstall.ps1") | Out-Null
    foreach ($resource in $resources) {
        $destination = Join-Path $env:OPENCODE_CONFIG_DIR $resource.Destination
        if (Test-Path -LiteralPath $destination) {
            throw "uninstaller did not remove $destination"
        }
    }

    $commandDir = Join-Path $env:OPENCODE_CONFIG_DIR "commands"
    $teachCommand = Join-Path $commandDir "teach.md"
    New-Item -ItemType Directory -Path $commandDir -Force | Out-Null
    Set-Content -LiteralPath $teachCommand -Value "user-owned"
    $refused = $false
    try {
        & (Join-Path $root "scripts/install.ps1") | Out-Null
    } catch {
        $refused = $true
    }
    if (-not $refused) {
        throw "installer overwrote an unmanaged file"
    }
    if (Test-Path -LiteralPath (Join-Path $env:OPENCODE_CONFIG_DIR "agents/professor.md")) {
        throw "installer made partial changes before refusing a conflict"
    }
    if ((Get-Content -LiteralPath $teachCommand -Raw).Trim() -ne "user-owned") {
        throw "installer changed an unmanaged file"
    }

    Write-Output "PowerShell installer tests passed"
} finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}
