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

    # Xoa ValidatingWebhookConfiguration tranh loi "connection refused" tren cluster local
    Invoke-Kubectl -Arguments @("delete", "-A", "ValidatingWebhookConfiguration", "ingress-nginx-admission", "--ignore-not-found") -AllowFailure

    Write-Host "1.1. Kiem tra va cai dat Metrics-Server (cho HPA Autoscaling)..." -ForegroundColor Green
    $metricsDeploy = Invoke-Kubectl -Arguments @("get", "deployment", "metrics-server", "-n", "kube-system", "--ignore-not-found") -AllowFailure
    if ([string]::IsNullOrWhiteSpace($metricsDeploy)) {
        Write-Host "Dang cai dat Metrics-Server..." -ForegroundColor Yellow
        Invoke-Kubectl -Arguments @("apply", "-f", "https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml") -AllowFailure
        Invoke-Kubectl -Arguments @("patch", "deployment", "metrics-server", "-n", "kube-system", "--type=json", "-p=[{`"op`": `"add`", `"path`": `"/spec/template/spec/containers/0/args/-`", `"value`": `"--kubelet-insecure-tls`"}]") -AllowFailure
    } else {
        Write-Host "Metrics-Server da duoc cai dat san." -ForegroundColor Green
    }

    Write-Host "2. Ap dung namespace waybill..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/00-namespaces/")

    Write-Host "2.1. Tao Runtime Secret va ConfigMap waybill..." -ForegroundColor Green
    & kubectl create secret generic waybill-runtime -n waybill `
        --from-literal=db-password="Replica@123456" `
        --from-literal=jwt-secret="9a7b8c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b" `
        --from-literal=rabbitmq-user="admin" `
        --from-literal=rabbitmq-password="admin" `
        --from-literal=minio-user="minioadmin" `
        --from-literal=minio-password="minioadmin" `
        --from-literal=ai-api-key="default-key" `
        --from-literal=mail-username="noreply@waybill.vn" `
        --from-literal=mail-password="dummy-password" `
        --dry-run=client -o yaml | kubectl apply -f -

    & kubectl create configmap waybill-config -n waybill `
        --from-literal=AI_BASE_URL="http://host.docker.internal:11434/v1" `
        --from-literal=AI_MODEL="qwen2.5:3b" `
        --from-literal=MINIO_PUBLIC_URL="https://storage.waybill.vn" `
        --dry-run=client -o yaml | kubectl apply -f -

    if (Test-Path "waybill.vn+1.pem" -and Test-Path "waybill.vn+1-key.pem") {
        Write-Host "2.2. Ap dung chung chi TLS hop le..." -ForegroundColor Green
        & kubectl create secret tls waybill-tls --cert=waybill.vn+1.pem --key=waybill.vn+1-key.pem -n waybill --dry-run=client -o yaml | kubectl apply -f -
        & kubectl create secret tls monitoring-tls --cert=waybill.vn+1.pem --key=waybill.vn+1-key.pem -n monitor --dry-run=client -o yaml | kubectl apply -f -
        & kubectl create secret tls dashboard-tls --cert=waybill.vn+1.pem --key=waybill.vn+1-key.pem -n kubernetes-dashboard --dry-run=client -o yaml | kubectl apply -f -
    }

    Write-Host "3. Ap dung ha tang (Database, Cache, Brokers, Eureka, MinIO)..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/01-infrastructure/")

    Write-Host "4. Ap dung cac microservices nghiep vu (13 services + frontend)..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/02-services/")

    Write-Host "5. Ap dung quy tac Ingress..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/03-ingress/")

    Write-Host "6. Ap dung he thong giam sat (Prometheus & Grafana)..." -ForegroundColor Green
    Invoke-Kubectl -Arguments @("apply", "-f", "k8s/04-monitoring/")

    Write-Host "7. Kiem tra va cai dat ArgoCD GitOps..." -ForegroundColor Green
    $argocdNamespace = Invoke-Kubectl -Arguments @("get", "ns", "argocd", "--ignore-not-found") -AllowFailure
    if ([string]::IsNullOrWhiteSpace($argocdNamespace)) {
        Write-Host "Dang tao namespace argocd va cai dat ArgoCD Controller..." -ForegroundColor Yellow
        Invoke-Kubectl -Arguments @("create", "namespace", "argocd") -AllowFailure
        Invoke-Kubectl -Arguments @("apply", "-n", "argocd", "-f", "https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml") -AllowFailure
    } else {
        Write-Host "ArgoCD da duoc cai dat san." -ForegroundColor Green
    }
    if (Test-Path "k8s/argocd-app.yaml") {
        Write-Host "Ap dung cau hinh ArgoCD Application waybill-microservices..." -ForegroundColor Yellow
        Invoke-Kubectl -Arguments @("apply", "-f", "k8s/argocd-app.yaml") -AllowFailure
    }

    Write-Host "=== TRIEN KHAI HOAN TAT TOAN BO HE THONG K8S CHUAN HOA 100%! ===" -ForegroundColor Green
} finally {
    Pop-Location
}
