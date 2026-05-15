param(
    [Parameter(Mandatory = $true)]
    [string]$RequestJson,

    [Parameter(Mandatory = $true)]
    [string]$GenericInstaller,

    [Parameter(Mandatory = $true)]
    [string]$InnoSetupCompiler,

    [Parameter(Mandatory = $true)]
    [string]$OutputDir
)

$ErrorActionPreference = "Stop"

function Safe-FilePart {
    param(
        [AllowNull()]
        [string]$Value
    )

    if ($null -eq $Value) {
        $v = ""
    } else {
        $v = [string]$Value
    }

    $v = $v.Trim()
    $v = $v -replace "[^a-zA-Z0-9_-]+", "-"
    $v = $v.Trim("-")

    if ([string]::IsNullOrWhiteSpace($v)) {
        return "Default"
    }

    if ($v.Length -gt 80) {
        return $v.Substring(0, 80)
    }

    return $v
}

function Invoke-NativeChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter()]
        [string[]]$Arguments = @(),

        [Parameter(Mandatory = $true)]
        [string]$ErrorMessage
    )

    Write-Host ""
    Write-Host ("> " + $FilePath + " " + ($Arguments -join " "))

    & $FilePath @Arguments

    $success = $?
    $exitCode = $LASTEXITCODE

    if ($null -eq $exitCode) {
        if ($success) {
            $exitCode = 0
        } else {
            $exitCode = 1
        }
    }

    if (-not $success -or $exitCode -ne 0) {
        throw "$ErrorMessage ExitCode=$exitCode"
    }
}

if (!(Test-Path $RequestJson)) {
    throw "Request JSON not found: $RequestJson"
}

if (!(Test-Path $GenericInstaller)) {
    throw "Generic installer not found: $GenericInstaller"
}

if (!(Test-Path $InnoSetupCompiler)) {
    throw "Inno Setup compiler not found: $InnoSetupCompiler"
}

$request = Get-Content $RequestJson -Raw | ConvertFrom-Json

$repoRoot = (Resolve-Path ".").Path
$workDir = Join-Path $repoRoot ".build\wrapper"
$payloadDir = Join-Path $workDir "payload"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$outDir = (Resolve-Path $OutputDir).Path

Remove-Item -Recurse -Force $workDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $payloadDir | Out-Null

$tenantName = Safe-FilePart ([string]$request.tenant_slug)
$groupName = Safe-FilePart ([string]$request.group_name)
$packageId = [string]$request.package_id

if ([string]::IsNullOrWhiteSpace($packageId)) {
    throw "package_id missing from request JSON"
}

$filename = "$tenantName-$groupName-Hi5TechAgentSetup.exe"
$outputBaseName = [System.IO.Path]::GetFileNameWithoutExtension($filename)

Copy-Item $GenericInstaller (Join-Path $payloadDir "Hi5TechAgentSetup.exe") -Force

$iniPath = Join-Path $payloadDir "provisioning.ini"

$apiBaseUrl = [string]$request.api_base_url
$agentWsBaseUrl = [string]$request.agent_ws_base_url
$tenantId = [string]$request.tenant_id
$groupId = [string]$request.group_id
$enrollmentToken = [string]$request.enrollment_token

if ([string]::IsNullOrWhiteSpace($apiBaseUrl)) {
    throw "api_base_url missing from request JSON"
}

if ([string]::IsNullOrWhiteSpace($agentWsBaseUrl)) {
    throw "agent_ws_base_url missing from request JSON"
}

if ([string]::IsNullOrWhiteSpace($tenantId)) {
    throw "tenant_id missing from request JSON"
}

if ([string]::IsNullOrWhiteSpace($groupId)) {
    $groupId = "default"
}

if ([string]::IsNullOrWhiteSpace($enrollmentToken)) {
    throw "enrollment_token missing from request JSON"
}

@"
[agent]
api_base_url=$apiBaseUrl
agent_ws_base_url=$agentWsBaseUrl
tenant_id=$tenantId
group_id=$groupId
package_id=$packageId
enrollment_token=$enrollmentToken
install_source=github-provisioned-exe
"@ | Set-Content -Path $iniPath -Encoding ASCII

$issPath = Join-Path $repoRoot ".github\agent-installer\Hi5TechProvisionedAgentWrapper.iss"

if (!(Test-Path $issPath)) {
    throw "Wrapper Inno script not found: $issPath"
}

Invoke-NativeChecked `
    -FilePath $InnoSetupCompiler `
    -Arguments @(
        "/DPayloadDir=$payloadDir",
        "/DOutputDir=$outDir",
        "/DOutputBaseName=$outputBaseName",
        $issPath
    ) `
    -ErrorMessage "Inno Setup failed."

$localPath = Join-Path $outDir $filename

if (!(Test-Path $localPath)) {
    throw "Expected output installer not found: $localPath"
}

$storagePath = "$tenantId/$packageId/$filename"

$meta = @{
    filename = $filename
    local_path = $localPath
    storage_path = $storagePath
    package_id = $packageId
    tenant_id = $tenantId
    group_id = $groupId
}

$meta | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $outDir "installer-meta.json") -Encoding UTF8

Write-Host ""
Write-Host "Provisioned wrapper built:"
Write-Host $localPath
Write-Host ""
Write-Host "Storage path:"
Write-Host $storagePath
