#!/bin/bash
set -e

echo "=== UNZIPPING BACKUPS ==="
sudo apt-get update && sudo apt-get install -y unzip
mkdir -p ~/waybill_backups
unzip -o ~/waybill_dbs.zip -d ~/waybill_backups

echo "=== WAITING FOR SQL SERVER CONTAINER ==="
until docker exec waybill-sqlserver-replica /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Replica@123456" -C -b -Q "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for SQL Server to be ready..."
    sleep 3
done

echo "=== RESTORING 12 DATABASES ==="
docker exec waybill-sqlserver-replica mkdir -p /var/opt/mssql/backup

dbs=("auth_db" "customer_db" "shipment_db" "routing_db" "tracking_db" "shipper_db" "notification_db" "audit_db" "report_db" "support_db" "rating_db" "payment_db")

for db in "${dbs[@]}"; do
    echo ">>> Restoring $db..."
    docker cp ~/waybill_backups/$db.bak waybill-sqlserver-replica:/var/opt/mssql/backup/$db.bak
    docker exec waybill-sqlserver-replica /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Replica@123456" -C -Q "
    IF DB_ID('$db') IS NOT NULL
    BEGIN
        ALTER DATABASE [$db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    END
    RESTORE DATABASE [$db] FROM DISK = '/var/opt/mssql/backup/$db.bak' WITH REPLACE,
    MOVE '$db' TO '/var/opt/mssql/data/$db.mdf',
    MOVE '${db}_log' TO '/var/opt/mssql/data/${db}_log.ldf';
    ALTER DATABASE [$db] SET MULTI_USER;
    "
done

echo "=== RESTORE COMPLETED 100%! ==="
