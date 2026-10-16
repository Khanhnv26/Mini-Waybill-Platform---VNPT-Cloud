#!/bin/bash
set -e

echo "=== 1. TẠO NAMESPACE WAYBILL & MONITOR ==="
kubectl apply -f k8s/00-namespaces/

echo "=== 2. TẠO RUNTIME SECRET VÀ CONFIGMAP ==="
RUNTIME_SECRET_FILE=${RUNTIME_SECRET_FILE:-.secrets/waybill-runtime.env}
if [ ! -f "$RUNTIME_SECRET_FILE" ]; then
  echo "Prepare private runtime configuration first; see docs/security-rollout.md" >&2
  exit 1
fi
kubectl create secret generic waybill-runtime -n waybill --from-env-file="$RUNTIME_SECRET_FILE" --dry-run=client -o yaml | kubectl apply -f -

kubectl create configmap waybill-config -n waybill \
  --from-literal=AI_BASE_URL="http://172.17.0.1:11434/v1" \
  --from-literal=AI_MODEL="qwen2.5:3b" \
  --from-literal=MINIO_PUBLIC_URL="https://storage.waybill.vn" \
  --dry-run=client -o yaml | kubectl apply -f -

if [ -f "waybill.vn+1.pem" ] && [ -f "waybill.vn+1-key.pem" ]; then
  echo "=== 2.1. TẠO TLS SECRET ==="
  kubectl create secret tls waybill-tls --cert=waybill.vn+1.pem --key=waybill.vn+1-key.pem -n waybill --dry-run=client -o yaml | kubectl apply -f -
fi

echo "=== 3. TRIỂN KHAI HẠ TẦNG (SQL SERVER, KAFKA, REDIS, RABBITMQ, MINIO, EUREKA) ==="
kubectl apply -f k8s/01-infrastructure/

echo "=== 4. TRIỂN KHAI 14 MICROSERVICES & FRONTEND ==="
kubectl apply -f k8s/02-services/

echo "=== 5. ÁP DỤNG QUY TẮC INGRESS CỔNG MẠNG ==="
kubectl delete -A ValidatingWebhookConfiguration ingress-nginx-admission --ignore-not-found
kubectl apply -f k8s/03-ingress/

echo "=== HOÀN TẤT TRIỂN KHAI CỤM K8S! ==="
kubectl get pods -n waybill
