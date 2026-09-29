param(
    [string]$Service = "frontend",
    [switch]$SkipMaven,
    [switch]$BuildOnly,
    [string]$Profile = "minikube"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$allServices = @(
    "service-registry", "api-gateway", "auth-service", "customer-service",
    "shipment-service", "routing-service", "tracking-service", "notification-service",
    "audit-service", "shipper-service", "report-service", "support-service",
    "rating-service", "payment-service", "frontend"
)

if ($Service -eq "all") {
    $services = $allServices
} elseif ($allServices -contains $Service) {
    $services = @($Service)
} else {
    throw "Unknown service '$Service'. Valid services: $($allServices -join ', '), all."
}

$context = & kubectl config current-context 2>$null
if ($LASTEXITCODE -ne 0 -or $context -ne $Profile) {
    throw "kubectl context must be '$Profile'. Run scripts/minikube-up.ps1 first."
}

Push-Location $repoRoot
try {
    if (-not $SkipMaven) {
        if ($Service -eq "all") {
            Write-Host "Building all Maven modules..." -ForegroundColor Yellow
            & mvn clean package -DskipTests
        } else {
            $javaServices = $services | Where-Object { $_ -ne "frontend" }
            foreach ($javaService in $javaServices) {
                Write-Host "Building Maven module '$javaService'..." -ForegroundColor Yellow
                & mvn clean package -pl $javaService -am -DskipTests
                if ($LASTEXITCODE -ne 0) { throw "Maven build failed for '$javaService'." }
            }
        }
        if ($Service -eq "all" -and $LASTEXITCODE -ne 0) { throw "Maven build failed." }
    }

    foreach ($name in $services) {
        $image = "khanhnv26/${name}:minikube"
        Write-Host "Building $image with Minikube's container runtime..." -ForegroundColor Yellow
        & minikube -p $Profile image build --tag $image --file "$name/Dockerfile" $name
        if ($LASTEXITCODE -ne 0) { throw "Image build failed for '$name'." }

        if (-not $BuildOnly) {
            $deployment = if ($name -eq "service-registry") { "eureka-peer1" } else { $name }
            & kubectl rollout restart "deployment/$deployment" -n waybill
            if ($LASTEXITCODE -ne 0) { throw "Unable to restart deployment '$deployment'. Is it deployed?" }
            & kubectl rollout status "deployment/$deployment" -n waybill --timeout=180s
            if ($LASTEXITCODE -ne 0) { throw "Rollout failed for deployment '$deployment'." }
        }
    }
} finally {
    Pop-Location
}

Write-Host "Minikube image build completed." -ForegroundColor Green
