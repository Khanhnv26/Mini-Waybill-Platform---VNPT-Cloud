param(
    [string]$Service = "frontend",
    [switch]$SkipMaven = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DONG BO CODE MOI LEN MINIKUBE: $Service" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Update-SingleService($name) {
    # 1. Compile Java JAR/WAR neu khong phai frontend va khong skip maven
    if ($name -ne "frontend" -and -not $SkipMaven) {
        Write-Host "`n>>> [1/4] Bien dich Maven cho: $name..." -ForegroundColor Yellow
        mvn clean package -pl $name -am -DskipTests
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Maven build that bai cho $name!"
            return
        }
    }

    # 2. Build Docker image local
    Write-Host "`n>>> [2/4] Build Docker Image khanhnv26/${name}:latest..." -ForegroundColor Yellow
    if ($name -eq "frontend") {
        docker build -t "khanhnv26/frontend:latest" -f "frontend/Dockerfile" .
    } else {
        docker build -t "khanhnv26/${name}:latest" -f "${name}/Dockerfile" "./$name"
    }

    # 3. Nap image truc tiep vao Minikube
    Write-Host "`n>>> [3/4] Nap image truc tiep vao Minikube (khong ton bang thong mang)..." -ForegroundColor Yellow
    minikube image load "khanhnv26/${name}:latest"

    # 4. Restart Pod tren Kubernetes
    Write-Host "`n>>> [4/4] Restart Pod trong Kubernetes..." -ForegroundColor Yellow
    kubectl rollout restart "deployment/$name" -n waybill
    kubectl rollout status "deployment/$name" -n waybill --timeout=120s

    Write-Host "`n [THANH CONG] $name da duoc cap nhat code moi nhat len Minikube!" -ForegroundColor Green
}

if ($Service -eq "all") {
    $services = @("frontend", "api-gateway", "auth-service", "customer-service", "shipment-service", "routing-service", "tracking-service", "notification-service", "audit-service", "shipper-service", "report-service", "support-service", "rating-service", "payment-service")
    foreach ($s in $services) {
        Update-SingleService $s
    }
} else {
    Update-SingleService $Service
}

Write-Host "`n Hoan tat dong bo code!" -ForegroundColor Cyan
