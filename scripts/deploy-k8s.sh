#!/bin/bash
set -e

echo "=== 1. TẠO NAMESPACE WAYBILL & MONITOR ==="
kubectl apply -f k8s/00-namespaces/

echo "=== 2. TẠO RUNTIME SECRET VÀ CONFIGMAP ==="
kubectl create secret generic waybill-runtime -n waybill \
  --from-literal=db-password="Replica@123456" \
  --from-literal=jwt-secret="9a7b8c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b" \
  --from-literal=rabbitmq-user="admin" \
  --from-literal=rabbitmq-password="admin" \
  --from-literal=minio-user="minioadmin" \
  --from-literal=minio-password="minioadmin" \
  --from-literal=ai-api-key="default-key" \
  --from-literal=mail-username="noreply@waybill.vn" \
  --from-literal=mail-password="dummy-password" \
  --dry-run=client -o yaml | kubectl apply -f -

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
