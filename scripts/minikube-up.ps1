param(
    [string]$Profile = "minikube",
    [string]$Driver = "hyperv",
    [int]$Cpus = 6,
    [int]$MemoryMb = 10240,
    [string]$DiskSize = "40g",
    [switch]$SkipImageBuild
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $repoRoot ".env.minikube"

function Invoke-Native {
    param([string]$Command, [string[]]$Arguments)
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE."
    }
}

foreach ($command in @("minikube", "kubectl", "mvn")) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command '$command' was not found in PATH."
    }
}

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing $envFile. Copy .env.minikube.example to .env.minikube and set the local secrets first."
}

$settings = @{}
foreach ($line in Get-Content -LiteralPath $envFile) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
    $parts = $trimmed -split "=", 2
    if ($parts.Count -ne 2) { continue }
    $key = $parts[0].Trim()
    $value = $parts[1].Trim()
    if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
        $value = $value.Substring(1, $value.Length - 2)
    }
    $settings[$key] = $value
}

$dbPassword = $settings["MINIKUBE_DB_PASSWORD"]
$jwtSecret = $settings["MINIKUBE_JWT_SECRET"]
$rabbitmqUser = $settings["MINIKUBE_RABBITMQ_USER"]
$rabbitmqPassword = $settings["MINIKUBE_RABBITMQ_PASSWORD"]
$minioUser = $settings["MINIKUBE_MINIO_USER"]
$minioPassword = $settings["MINIKUBE_MINIO_PASSWORD"]
$aiApiKey = $settings["AI_API_KEY"]
$aiBaseUrl = $settings["AI_BASE_URL"]
$aiModel = $settings["AI_MODEL"]
$minioPublicUrl = $settings["MINIO_PUBLIC_URL"]
if ([string]::IsNullOrWhiteSpace($dbPassword) -or $dbPassword -like "ReplaceWith*") {
    throw "Set MINIKUBE_DB_PASSWORD in .env.minikube to a non-placeholder SQL Server password."
}
if ($dbPassword.Length -lt 8 -or $dbPassword -notmatch '[A-Z]' -or $dbPassword -notmatch '[a-z]' -or $dbPassword -notmatch '\d' -or $dbPassword -notmatch '[^a-zA-Z0-9]') {
    throw "MINIKUBE_DB_PASSWORD must be at least 8 characters and include upper/lowercase letters, a digit, and a symbol."
}
if ([string]::IsNullOrWhiteSpace($jwtSecret) -or $jwtSecret.Length -lt 32 -or $jwtSecret -like "ReplaceWith*") {
    throw "Set MINIKUBE_JWT_SECRET in .env.minikube to a random value of at least 32 characters."
}
if ([string]::IsNullOrWhiteSpace($rabbitmqUser)) { $rabbitmqUser = "admin" }
if ([string]::IsNullOrWhiteSpace($rabbitmqPassword) -or $rabbitmqPassword -like "ReplaceWith*") {
    throw "Set MINIKUBE_RABBITMQ_PASSWORD in .env.minikube to a non-placeholder password."
}
if ([string]::IsNullOrWhiteSpace($minioUser)) { $minioUser = "minioadmin" }
if ([string]::IsNullOrWhiteSpace($minioPassword) -or $minioPassword -like "ReplaceWith*") {
    throw "Set MINIKUBE_MINIO_PASSWORD in .env.minikube to a non-placeholder password."
}
if ($minioPassword.Length -lt 8) {
    throw "MINIKUBE_MINIO_PASSWORD must be at least 8 characters."
}
if ([string]::IsNullOrWhiteSpace($aiApiKey)) { $aiApiKey = "ollama" }
if ([string]::IsNullOrWhiteSpace($aiBaseUrl)) { $aiBaseUrl = "http://host.docker.internal:11434/v1" }
if ([string]::IsNullOrWhiteSpace($aiModel)) { $aiModel = "qwen2.5:3b" }
if ([string]::IsNullOrWhiteSpace($minioPublicUrl)) { $minioPublicUrl = "http://storage.waybill.local" }

Write-Host "Starting Minikube profile '$Profile' with driver '$Driver'..." -ForegroundColor Cyan
Invoke-Native "minikube" @("start", "-p", $Profile, "--driver=$Driver", "--cpus=$Cpus", "--memory=$MemoryMb", "--disk-size=$DiskSize")
Invoke-Native "minikube" @("update-context", "-p", $Profile)
Invoke-Native "kubectl" @("config", "use-context", $Profile)
Invoke-Native "minikube" @("addons", "enable", "ingress", "-p", $Profile)

Push-Location $repoRoot
try {
    Invoke-Native "kubectl" @("apply", "-f", "k8s/00-namespaces/00-namespace.yaml")

    $runtimeSecretArgs = @(
        "create", "secret", "generic", "waybill-runtime", "-n", "waybill",
        "--from-literal=db-password=$dbPassword",
        "--from-literal=jwt-secret=$jwtSecret",
        "--from-literal=rabbitmq-user=$rabbitmqUser",
        "--from-literal=rabbitmq-password=$rabbitmqPassword",
        "--from-literal=minio-user=$minioUser",
        "--from-literal=minio-password=$minioPassword",
        "--from-literal=ai-api-key=$aiApiKey",
        "--dry-run=client", "-o", "yaml"
    )
    $runtimeSecret = & kubectl @runtimeSecretArgs
    if ($LASTEXITCODE -ne 0) { throw "Unable to generate the waybill-runtime Secret." }
    $runtimeSecret | & kubectl apply -f -
    if ($LASTEXITCODE -ne 0) { throw "Unable to apply the waybill-runtime Secret." }

    $configMapArgs = @(
        "create", "configmap", "waybill-config", "-n", "waybill",
        "--from-literal=AI_BASE_URL=$aiBaseUrl",
        "--from-literal=AI_MODEL=$aiModel",
        "--from-literal=MINIO_PUBLIC_URL=$minioPublicUrl",
        "--dry-run=client", "-o", "yaml"
    )
    $runtimeConfig = & kubectl @configMapArgs
    if ($LASTEXITCODE -ne 0) { throw "Unable to generate the waybill-config ConfigMap." }
    $runtimeConfig | & kubectl apply -f -
    if ($LASTEXITCODE -ne 0) { throw "Unable to apply the waybill-config ConfigMap." }

    if (-not $SkipImageBuild) {
        & (Join-Path $PSScriptRoot "rebuild-and-deploy.ps1") -Service all -BuildOnly -Profile $Profile
        if ($LASTEXITCODE -ne 0) { throw "Building application images failed." }
    }

    Invoke-Native "kubectl" @("delete", "job/sqlserver-init-db", "-n", "waybill", "--ignore-not-found")
    foreach ($manifest in @(
        "k8s/01-infrastructure/eureka.yaml",
        "k8s/01-infrastructure/kafka.yaml",
        "k8s/01-infrastructure/minio.yaml",
        "k8s/01-infrastructure/rabbitmq.yaml",
        "k8s/01-infrastructure/redis.yaml",
        "k8s/01-infrastructure/sqlserver.yaml",
        "k8s/01-infrastructure/sqlserver-init-job.yaml"
    )) {
        Invoke-Native "kubectl" @("apply", "-f", $manifest)
    }
    Invoke-Native "kubectl" @("wait", "--for=condition=Available", "deployment/sqlserver-replica", "-n", "waybill", "--timeout=300s")
    Invoke-Native "kubectl" @("wait", "--for=condition=Complete", "job/sqlserver-init-db", "-n", "waybill", "--timeout=300s")
    foreach ($deployment in @("eureka-peer1", "kafka", "minio", "rabbitmq", "redis")) {
        Invoke-Native "kubectl" @("wait", "--for=condition=Available", "deployment/$deployment", "-n", "waybill", "--timeout=300s")
    }
    Invoke-Native "kubectl" @("apply", "-k", "k8s")
    Invoke-Native "kubectl" @("wait", "--for=condition=Available", "deployment", "--all", "-n", "waybill", "--timeout=600s")
    Invoke-Native "kubectl" @("get", "pods,svc,ingress", "-n", "waybill")
    Invoke-Native "kubectl" @("wait", "--for=condition=Available", "deployment/ingress-nginx-controller", "-n", "ingress-nginx", "--timeout=300s")

    $minikubeIp = & minikube -p $Profile ip
    if ($LASTEXITCODE -ne 0) { throw "Unable to determine the Minikube IP." }
    Write-Host "Add this line to C:\Windows\System32\drivers\etc\hosts (as Administrator):" -ForegroundColor Yellow
    Write-Host "$minikubeIp waybill.local api.waybill.local storage.waybill.local" -ForegroundColor Yellow
    Write-Host "Then open http://waybill.local" -ForegroundColor Green
    Write-Host "For local SQL access run: kubectl port-forward svc/sqlserver-replica 2433:2433 -n waybill" -ForegroundColor Green
}
finally {
    Pop-Location
}
