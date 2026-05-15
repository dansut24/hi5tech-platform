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
    param([string]$Value)

    $v = ($Value ?? "").Trim()
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

$workDir = Join-Path (Resolve-Path ".").Path ".build\wrapper"
$payloadDir = Join-Path $workDir "payload"
$outDir = Resolve-Path (New-Item -ItemType Directory -Force -Path $OutputDir).FullName

Remove-Item -Recurse -Force $workDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $payloadDir | Out-Null

$tenantName = Safe-FilePart $request.tenant_slug
$groupName = Safe-FilePart $request.group_name
$packageId = [string]$request.package_id

$filename = "$tenantName-$groupName-Hi5TechAgentSetup.exe"
$outputBaseName = [System.IO.Path]::GetFileNameWithoutExtension($filename)

Copy-Item $GenericInstaller (Join-Path $payloadDir "Hi5TechAgentSetup.exe") -Force

$iniPath = Join-Path $payloadDir "provisioning.ini"

@"
[agent]
api_base_url=$($request.api_base_url)
agent_ws_base_url=$($request.agent_ws_base_url)
tenant_id=$($request.tenant_id)
group_id=$($request.group_id)
package_id=$($request.package_id)
enrollment_token=$($request.enrollment_token)
install_source=github-provisioned-exe
"@ | Set-Content -Path $iniPath -Encoding ASCII

$issPath = ".github\agent-installer\Hi5TechProvisionedAgentWrapper.iss"

if (!(Test-Path $issPath)) {
    throw "Wrapper Inno script not found: $issPath"
}

& $InnoSetupCompiler `
    "/DPayloadDir=$payloadDir" `
    "/DOutputDir=$outDir" `
    "/DOutputBaseName=$outputBaseName" `
    $issPath

if ($LASTEXITCODE -ne 0) {
    throw "Inno Setup failed with exit code $LASTEXITCODE"
}

$localPath = Join-Path $outDir $filename

if (!(Test-Path $localPath)) {
    throw "Expected output installer not found: $localPath"
}

$storagePath = "$($request.tenant_id)/$packageId/$filename"

@{
    filename = $filename
    local_path = $localPath
    storage_path = $storagePath
    package_id = $packageId
    tenant_id = [string]$request.tenant_id
    group_id = [string]$request.group_id
} | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $outDir "installer-meta.json") -Encoding UTF8

Write-Host "Provisioned wrapper built:"
Write-Host $localPath
