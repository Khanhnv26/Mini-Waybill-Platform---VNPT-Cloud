param(
    [string]$SourcePort = "1433",
    [string]$SourceUser = "sa",
    [string]$SourcePass = "sa",
    [string]$TargetPass = "Replica@123456",
    [string]$Namespace = "waybill"
)

$dbs = @('auth_db', 'customer_db', 'shipment_db', 'routing_db', 'tracking_db', 'shipper_db', 'notification_db', 'audit_db', 'report_db', 'support_db')

$pod = (kubectl get pod -l app=sqlserver-replica -n $Namespace -o jsonpath='{.items[0].metadata.name}')
if (-not $pod) {
    Write-Error "Không tìm thấy Pod sqlserver-replica trong namespace $Namespace!"
    exit 1
}

Write-Host "=== BAT DAU DONG BO DU LIEU TU $SourcePort SANG K8S (2433) ===" -ForegroundColor Cyan

foreach ($db in $dbs) {
    Write-Host ">>> Dang xu ly: $db..." -ForegroundColor Yellow
    $bakLocal = "C:\Users\Public\$db.bak"

    sqlcmd -S "localhost,$SourcePort" -U $SourceUser -P $SourcePass -C -Q "BACKUP DATABASE [$db] TO DISK = '$bakLocal' WITH INIT;"
    
    Copy-Item $bakLocal -Destination ".\$db.bak"
    kubectl cp ".\$db.bak" "$pod`:/var/opt/mssql/data/$db.bak" -n $Namespace
    Remove-Item ".\$db.bak" -Force
    Remove-Item $bakLocal -Force

    $restoreSql = @"
ALTER DATABASE [$db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [$db] FROM DISK = '/var/opt/mssql/data/$db.bak' WITH REPLACE,
MOVE '$db' TO '/var/opt/mssql/data/$db.mdf',
MOVE '${db}_log' TO '/var/opt/mssql/data/${db}_log.ldf';
ALTER DATABASE [$db] SET MULTI_USER;
"@
    kubectl exec -i "pod/$pod" -n $Namespace -- /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P $TargetPass -C -Q "$restoreSql"
}

kubectl exec -i "pod/$pod" -n $Namespace -- rm -f /var/opt/mssql/data/*.bak

Write-Host "=== DONG BO HOAN TAT 100%! ===" -ForegroundColor Green
