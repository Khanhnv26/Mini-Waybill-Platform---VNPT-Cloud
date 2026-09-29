$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   TRIEN KHAI CU CHUAN HOA KUBERNETES (PRODUCTION-LIGHT)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$context = & kubectl config current-context 2>$null
Write-Host "K8s Context hien tai: $context" -ForegroundColor Yellow

Write-Host "1. Kiem tra va cai dat Ingress NGINX..." -ForegroundColor Green
$ingressNamespace = & kubectl get ns ingress-nginx 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Dang cai dat Ingress NGINX Controller..." -ForegroundColor Yellow
    & kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.1/deploy/static/provider/cloud/deploy.yaml
} else {
    Write-Host "Ingress NGINX da duoc cai dat san." -ForegroundColor Green
}

Write-Host "2. Ap dung ha tang (Database, Cache, Brokers, Eureka, MinIO)..." -ForegroundColor Green
& kubectl apply -f k8s/01-infrastructure/

Write-Host "3. Ap dung cac microservices nghiep vu (13 services + frontend)..." -ForegroundColor Green
& kubectl apply -f k8s/02-services/

Write-Host "4. Ap dung quy tac Ingress..." -ForegroundColor Green
& kubectl apply -f k8s/03-ingress/

Write-Host "5. Ap dung chinh sach an ninh NetworkPolicy..." -ForegroundColor Green
& kubectl apply -f k8s/01-infrastructure/network-policies.yaml

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   HOAN TAT AP DUNG KIEN TRUC CHUAN HOA                   " -ForegroundColor Cyan
Write-Host "   Dung lenh: kubectl get pods -n waybill de kiem tra     " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
