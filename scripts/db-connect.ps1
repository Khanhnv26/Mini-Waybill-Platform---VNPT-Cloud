$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   KET NOI CO SO DU LIEU SQL SERVER (KUBERNETES WAYBILL)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$serviceCheck = & kubectl get svc sqlserver-replica -n waybill 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Loi: Khong tim thay service sqlserver-replica trong namespace waybill." -ForegroundColor Red
    Write-Host "Vui long kiem tra lai cum Kubernetes cua ban." -ForegroundColor Yellow
    exit 1
}

Write-Host "Dang thiet lap kenh port-forward den sqlserver-replica:1433..." -ForegroundColor Green
Write-Host "Thong tin dang nhap SSMS / DBeaver / DataGrip:" -ForegroundColor Yellow
Write-Host "  - Server / Host : localhost,1433" -ForegroundColor White
Write-Host "  - User          : sa" -ForegroundColor White
Write-Host "  - Password      : Admin@123456" -ForegroundColor White
Write-Host ""
Write-Host "Nhan Ctrl + C de dong kenh ket noi va khoa an toan co so du lieu." -ForegroundColor Magenta
Write-Host "==========================================================" -ForegroundColor Cyan

& kubectl port-forward svc/sqlserver-replica 1433:1433 -n waybill
