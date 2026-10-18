param(
    [string]$SourcePort = "1433",
    [string]$SourceUser = "sa",
    [string]$SourcePass = $env:WAYBILL_SOURCE_DB_PASSWORD,
    [Parameter(Mandatory = $true)]
    [ValidatePattern("staging")]
    [string]$Namespace,
    [switch]$ConfirmReplace
)

$ErrorActionPreference = "Stop"
if (-not $ConfirmReplace) { throw "Pass -ConfirmReplace only for a disposable staging restore drill." }
if ([string]::IsNullOrWhiteSpace($SourcePass)) { throw "Set WAYBILL_SOURCE_DB_PASSWORD for the source SQL Server." }

$dbs = @('auth_db', 'customer_db', 'shipment_db', 'routing_db', 'tracking_db', 'shipper_db', 'notification_db', 'audit_db', 'report_db', 'support_db', 'rating_db', 'payment_db')

$pod = (kubectl get pod -l app=sqlserver-replica -n $Namespace -o jsonpath='{.items[0].metadata.name}')
if (-not $pod) {
    Write-Error "Không tìm thấy Pod sqlserver-replica trong namespace $Namespace!"
    exit 1
}

Write-Host "=== BAT DAU DONG BO DU LIEU TU $SourcePort SANG K8S (2433) ===" -ForegroundColor Cyan

foreach ($db in $dbs) {
    Write-Host ">>> Dang xu ly: $db..." -ForegroundColor Yellow
    $bakLocal = "C:\Users\Public\$db.bak"
    $previousSqlPassword = $env:SQLCMDPASSWORD
    try {
        $env:SQLCMDPASSWORD = $SourcePass

    sqlcmd -S "localhost,$SourcePort" -U $SourceUser -C -Q "BACKUP DATABASE [$db] TO DISK = '$bakLocal' WITH INIT;"
        if ($LASTEXITCODE -ne 0) { throw "Source backup failed for $db" }
    } finally { $env:SQLCMDPASSWORD = $previousSqlPassword }
    
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
    kubectl exec -i "pod/$pod" -n $Namespace -- /bin/bash -c 'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b "$@"' -- -Q "$restoreSql"
    if ($LASTEXITCODE -ne 0) { throw "Staging restore failed for $db" }
}

kubectl exec -i "pod/$pod" -n $Namespace -- rm -f /var/opt/mssql/data/*.bak

Write-Host "=== DONG BO HOAN TAT 100%! ===" -ForegroundColor Green
