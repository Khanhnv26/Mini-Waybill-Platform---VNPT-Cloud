param(
    [string]$Service = "frontend"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  DONG BO CODE MOI LEN MINIKUBE: $Service" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

function Update-SingleService($name) {
    Write-Host "`n>>> [1/3] Build Docker Image cho: $name..." -ForegroundColor Yellow
    
    if ($name -eq "frontend") {
        docker build -t "khanhnv26/frontend:1.0" -f "frontend/Dockerfile" .
    } else {
        docker build -t "khanhnv26/${name}:1.0" -f "${name}/Dockerfile" "./$name"
    }

    Write-Host ">>> [2/3] Nap image vao Minikube..." -ForegroundColor Yellow
    minikube image load "khanhnv26/${name}:1.0"

    Write-Host ">>> [3/3] Restart Pod trong Kubernetes..." -ForegroundColor Yellow
    kubectl rollout restart "deployment/$name" -n waybill
    kubectl rollout status "deployment/$name" -n waybill --timeout=120s

    Write-Host " [THANH CONG] $name da duoc cap nhat code moi nhat!" -ForegroundColor Green
}

if ($Service -eq "all") {
    $services = @("frontend", "api-gateway", "auth-service", "customer-service", "shipment-service", "routing-service", "tracking-service", "notification-service", "audit-service", "shipper-service", "report-service", "support-service", "rating-service")
    foreach ($s in $services) {
        Update-SingleService $s
    }
} else {
    Update-SingleService $Service
}

Write-Host "`n Hoan tat dong bo code moi len Minikube!" -ForegroundColor Cyan
