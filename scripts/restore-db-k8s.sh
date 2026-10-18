#!/bin/bash
set -euo pipefail

# These scripts overwrite databases: limit execution to an explicit staging drill.
: "${RESTORE_TARGET_ENV:?Set RESTORE_TARGET_ENV=staging}"
: "${RESTORE_CONFIRM:?Set RESTORE_CONFIRM=REPLACE_STAGING_DATABASES}"
[ "$RESTORE_TARGET_ENV" = staging ] && [ "$RESTORE_CONFIRM" = REPLACE_STAGING_DATABASES ] || { echo "Restore is restricted to a staging drill" >&2; exit 1; }

: "${RESTORE_NAMESPACE:?Set an isolated staging namespace}"
[[ "$RESTORE_NAMESPACE" == *staging* ]] || { echo "Namespace must identify staging" >&2; exit 1; }

echo "=== UNZIPPING BACKUPS ==="
sudo apt-get update && sudo apt-get install -y unzip
mkdir -p ~/waybill_backups
unzip -o ~/waybill_dbs.zip -d ~/waybill_backups

echo "=== CHO POD SQL SERVER SAN SANG TRONG K8S ==="
kubectl wait --namespace "$RESTORE_NAMESPACE" \
  --for=condition=ready pod \
  --selector=app=sqlserver-replica \
  --timeout=300s

POD=$(kubectl get pod -l app=sqlserver-replica -n "$RESTORE_NAMESPACE" --field-selector=status.phase=Running -o jsonpath='{.items[0].metadata.name}')
echo "SQL Server Pod Name: $POD"

echo "=== RESTORING 12 DATABASES VAO POD K8S ==="
dbs=("auth_db" "customer_db" "shipment_db" "routing_db" "tracking_db" "shipper_db" "notification_db" "audit_db" "report_db" "support_db" "rating_db" "payment_db")

for db in "${dbs[@]}"; do
    echo ">>> Dang phuc hoi $db vao pod $POD..."
    kubectl cp ~/waybill_backups/$db.bak "$POD:/var/opt/mssql/data/$db.bak" -n "$RESTORE_NAMESPACE"
    
    kubectl exec -i "$POD" -n "$RESTORE_NAMESPACE" -- /bin/bash -c 'export SQLCMDPASSWORD="$MSSQL_SA_PASSWORD"; exec /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -C -b "$@"' -- -Q "
    IF DB_ID('$db') IS NOT NULL
    BEGIN
        ALTER DATABASE [$db] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    END
    RESTORE DATABASE [$db] FROM DISK = '/var/opt/mssql/data/$db.bak' WITH REPLACE,
    MOVE '$db' TO '/var/opt/mssql/data/$db.mdf',
    MOVE '${db}_log' TO '/var/opt/mssql/data/${db}_log.ldf';
    ALTER DATABASE [$db] SET MULTI_USER;
    "
done

kubectl exec -i "$POD" -n "$RESTORE_NAMESPACE" -- rm -f /var/opt/mssql/data/*.bak
echo "=== DONG BO DU LIEU K8S HOAN TAT 100%! ==="
