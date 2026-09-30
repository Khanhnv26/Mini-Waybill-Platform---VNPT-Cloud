$ErrorActionPreference = "Stop"

function Invoke-Kubectl {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [switch]$AllowFailure
    )

    $exitCode = 1
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        & kubectl @Arguments
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previous
    }

    if ($exitCode -ne 0 -and -not $AllowFailure) {
        throw "kubectl $($Arguments -join ' ') that bai (exit code $exitCode)."
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Push-Location $repoRoot
try {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   TRIEN KHAI CU CHUAN HOA KUBERNETES (PRODUCTION-LIGHT)   " -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan

    $context = Invoke-Kubectl -Arguments @("config", "current-context")
    Write-Host "K8s Context hien tai: $context" -ForegroundColor Yellow

    Write-Host "1. Kiem tra va cai dat Ingress NGINX..." -ForegroundColor Green
    $ingressNamespace = Invoke-Kubectl -Arguments @("get", "ns", "ingress-nginx", "--ignore-not-found")
    if ([string]::IsNullOrWhiteSpace($ingressNamespace)) {
        Write-Host "Dang cai dat Ingress NGINX Controller..." -ForegroundColor Yellow
        Invoke-Kubectl -Arguments @("apply", "-f", "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.1/deploy/static/provider/cloud/deploy.yaml")
    } else {
        Write-Host "Ingress NGINX da duoc cai dat san." -ForegroundColor Green
    }
    Write-Host "Cho Ingress NGINX Controller san sang..." -ForegroundColor Yellow
    Invoke-Kubectl -Arguments @("wait", "-n", "ingress-nginx", "--for=condition=Available", "deployment/ingress-nginx-controller", "--timeout=180s")

    Write-Host "2. Ap dung namespace waybill..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/00-namespaces/")

    Write-Host "3. Ap dung ha tang (Database, Cache, Brokers, Eureka, MinIO)..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/01-infrastructure/")

    Write-Host "4. Ap dung cac microservices nghiep vu (13 services + frontend)..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/02-services/")

    Write-Host "5. Ap dung quy tac Ingress..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/03-ingress/")

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "   HOAN TAT AP DUNG KIEN TRUC CHUAN HOA                   " -ForegroundColor Cyan
    Write-Host "   Dung lenh: kubectl get pods -n waybill de kiem tra     " -ForegroundColor Yellow
    Write-Host "==========================================================" -ForegroundColor Cyan
} finally {
    Pop-Location
}
