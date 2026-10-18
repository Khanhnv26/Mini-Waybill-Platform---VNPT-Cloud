#!/bin/bash
set -euo pipefail

# These scripts overwrite databases: limit execution to an explicit staging drill.
: "${RESTORE_TARGET_ENV:?Set RESTORE_TARGET_ENV=staging}"
: "${RESTORE_CONFIRM:?Set RESTORE_CONFIRM=REPLACE_STAGING_DATABASES}"
[ "$RESTORE_TARGET_ENV" = staging ] && [ "$RESTORE_CONFIRM" = REPLACE_STAGING_DATABASES ] || { echo "Restore is restricted to a staging drill" >&2; exit 1; }

: "${RESTORE_CONTAINER:?Set the isolated staging SQL Server container}"

echo "=== UNZIPPING BACKUPS ==="
sudo apt-get update && sudo apt-get install -y unzip
mkdir -p ~/waybill_backups
unzip -o ~/waybill_dbs.zip -d ~/waybill_backups

echo "=== WAITING FOR SQL SERVER CONTAINER ==="
until docker exec "$RESTORE_CONTAINER" /bin/bash -c 'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b "$@"' -- -Q "SELECT 1" >/dev/null 2>&1; do
    echo "Waiting for SQL Server to be ready..."
    sleep 3
done

echo "=== RESTORING 12 DATABASES ==="
docker exec "$RESTORE_CONTAINER" mkdir -p /var/opt/mssql/backup

dbs=("auth_db" "customer_db" "shipment_db" "routing_db" "tracking_db" "shipper_db" "notification_db" "audit_db" "report_db" "support_db" "rating_db" "payment_db")

for db in "${dbs[@]}"; do
    echo ">>> Restoring $db..."
    docker cp ~/waybill_backups/$db.bak "$RESTORE_CONTAINER":/var/opt/mssql/backup/$db.bak
    docker exec "$RESTORE_CONTAINER" /bin/bash -c 'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b "$@"' -- -Q "
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
