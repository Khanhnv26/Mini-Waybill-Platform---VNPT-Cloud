# VNPT Waybill Platform - Nền Tảng Điều Phối & Quản Trị Vận Đơn Bưu Chính Toàn Trình

[![Java](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2025.1.3-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-KRaft%20HA%20Cluster-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x%20Cache%20%26%20RateLimit-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-2022%20HA%20Primary%20%26%20Replica-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server)
[![Nginx](https://img.shields.io/badge/Nginx-Edge%20Load%20Balancer-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Flyway](https://img.shields.io/badge/Flyway-Database%20Migration-CC0202?style=for-the-badge&logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x%20Enterprise%20UI-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-B2B%20Logistics%20Design-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9.4%20GIS%20Map-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP%20Realtime-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://stomp.github.io/)
[![Telegram Bot](https://img.shields.io/badge/Telegram%20Bot-Long--Polling%20Dispatch-2CA5E0?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots)
[![Google OAuth2](https://img.shields.io/badge/Google%20OAuth2-Identity%20Services%20SSO-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://developers.google.com/identity)
[![Docker](https://img.shields.io/badge/Docker%20Compose-Containerized%20HA-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Docker%20Desktop%20%7C%20Enterprise-326CE5?style=for-the-badge&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![GitHub Actions](https://img.shields.io/badge/GitHub%20Actions-Smart%20Monorepo%20CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)](https://github.com/features/actions)
[![Swagger / OpenAPI](https://img.shields.io/badge/OpenAPI-Springdoc%203.1.0-85EA2D?style=for-the-badge&logo=openapiinitiative&logoColor=black)](https://springdoc.org/)
[![Quartz Scheduler](https://img.shields.io/badge/Quartz-Enterprise%20Scheduler-007ACC?style=for-the-badge&logo=spring&logoColor=white)](https://www.quartz-scheduler.org/)
[![Spring AI](https://img.shields.io/badge/Spring%20AI-Tool%20Calling%20Agent-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-ai)
[![Ollama](https://img.shields.io/badge/Ollama-Local%20LLM%20Qwen%202.5-black?style=for-the-badge&logo=ollama&logoColor=white)](https://ollama.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Priority%20Queue%20%26%20SLA%20DLX-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![MinIO](https://img.shields.io/badge/MinIO-S3%20Compatible%20Storage-C72C48?style=for-the-badge&logo=minio&logoColor=white)](https://min.io/)
[![VietQR](https://img.shields.io/badge/VietQR-NAPAS%20247%20Dynamic%20QR-005BAA?style=for-the-badge&logoColor=white)](https://vietqr.net/)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-GitOps%20Continuous%20Delivery-EF6B48?style=for-the-badge&logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![Prometheus](https://img.shields.io/badge/Prometheus-Metrics%20%26%20Alerting-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-Enterprise%20Observability-F46800?style=for-the-badge&logo=grafana&logoColor=white)](https://grafana.com/)
[![Frontend SPA](https://img.shields.io/badge/Frontend-Vue%203%20SPA%20%7C%20HTML5%20History-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://waybill.vn)
[![HTTPS SSL](https://img.shields.io/badge/Security-HTTPS%20%7C%20mkcert%20Wildcard%20SSL-00A4E4?style=for-the-badge&logo=letsencrypt&logoColor=white)](https://waybill.vn)

---


## 1. Giới Thiệu Tổng Quan

**VNPT Waybill Platform** là hệ thống Microservices chuẩn Enterprise mô phỏng chuỗi cung ứng chuyển phát bưu chính toàn trình: từ tiếp nhận bưu phẩm tại quầy / Shop B2B, quản lý chuyến xe trục liên tỉnh (Trips Management), phân luồng tại 5 Siêu Hub trọng điểm toàn quốc (Hà Nội, Hải Phòng, Đà Nẵng, TP.HCM, Cần Thơ), cho đến điều phối bưu tá phát hàng chặng cuối và quyết toán tiền thu hộ COD.

Hệ thống được thiết kế theo tiêu chuẩn **High Availability (HA - Tính sẵn sàng cao)** đa tầng, sẵn sàng chịu lỗi và tự phục hồi khi có sự cố phần cứng, mạng hoặc máy chủ dữ liệu.

---

## 2. Bối Cảnh Vận Hành & Nghiệp Vụ Bưu Chính Toàn Trình

Hệ thống bưu chính vận hành theo mô hình phân tầng đa chặng với mạng lưới kho bãi và phương tiện phân tán. Nền tảng tập trung giải quyết các bài toán nghiệp vụ trọng yếu sau:

### 2.1. Mô Hình Mạng Lưới Hub-and-Spoke & 5 Siêu Hub Toàn Quốc
* **Quy trình luân chuyển:** Luồng bưu gửi đa chặng: Bưu cục gửi (Origin PO) $\rightarrow$ Xe gom (Feeder) $\rightarrow$ Siêu Hub gửi $\rightarrow$ Chuyến xe trục liên tỉnh (Trunk Trip) $\rightarrow$ Siêu Hub nhận $\rightarrow$ Xe gom $\rightarrow$ Bưu cục phát (Dest PO) $\rightarrow$ Bưu tá (Last-mile) phát tới người nhận.
* **Mạng lưới 5 Siêu Hub:** Đặt tại Hà Nội (`HUB_HAN`), Hải Phòng (`HUB_HPH`), Đà Nẵng (`HUB_DAD`), TP.HCM (`HUB_SGN`), Cần Thơ (`HUB_VCA`) làm cửa ngõ gom tải và định tuyến liên vùng.
* *Chi tiết:* [Cẩm nang 04 - Mô Hình Hub-and-Spoke](docs/04-logistics-domain-and-rbac-station-context.md#1-bản-đồ-nghiệp-vụ-vận-tải-bưu-chính-thực-tế).

### 2.2. Vòng Đời Vận Đơn & Máy Trạng Thái (State Machine)
* **11 mốc trạng thái tuần tự:** `CREATED` $\rightarrow$ `PENDING_ROUTING` $\rightarrow$ `ROUTE_ASSIGNED` $\rightarrow$ `PICKED_UP` $\rightarrow$ `IN_TRANSIT` $\rightarrow$ `ARRIVED_DEST_HUB` $\rightarrow$ `OUT_FOR_DELIVERY` $\rightarrow$ `DELIVERED`.
* **Tự động chuyển hoàn (Auto-Returning):** Bưu tá báo phát thất bại (`DELIVERY_FAILED`) tối đa 3 lần; khi đủ 3 lần hệ thống tự chuyển sang `RETURNING` để hoàn hàng về người gửi.
* **Trạng thái kết thúc bất biến:** `DELIVERED`, `RETURNED`, `CANCELLED` là trạng thái cuối không thể sửa đổi nhằm bảo toàn tính toàn vẹn chứng từ tài chính.
* *Chi tiết:* [Cẩm nang 04 - Máy Trạng Thái Bưu Gửi](docs/04-logistics-domain-and-rbac-station-context.md#3-máy-trạng-thái-bưu-gửi-11-bước--tự-động-chuyển-hoàn-auto-returning) và [Cẩm nang 03 - Kafka KRaft Cluster](docs/03-kafka-kraft-cluster-and-event-streaming.md).

### 2.3. Điều Phối Chuyến Xe Trục (Trips), Tải Trọng & Niêm Phong Seal
* **Kiểm soát tải trọng theo thời gian thực:** Tự động cộng dồn khối lượng và thể tích quy đổi khi xếp kiện lên xe; thanh tải trọng cảnh báo theo ngưỡng (< 80% Xanh, 80-99% Vàng, $\ge 100\%$ Đỏ - chặn xếp thêm).
* **Niêm phong bảo an (Seal Number):** Bắt buộc chốt mã niêm chì trước khi xe xuất bến; Hub đích đối soát mã Seal trùng khớp với Manifest điện tử mới được phép dỡ hàng.
* **Chống xung đột đa luồng:** Áp dụng Redis Distributed Lock (`SETNX`) khi nhiều thiết bị cùng quét một kiện hàng trong môi trường đồng thời cao.
* *Chi tiết:* [Cẩm nang 04 - Quản Lý Chuyến Xe Trục](docs/04-logistics-domain-and-rbac-station-context.md#2-quản-lý-chuyến-xe-trục-đa-chặng-multi-leg-trips--manifests) và [Cẩm nang 05 - Redis Distributed Lock](docs/05-redis-caching-and-distributed-patterns.md#23-luồng-khóa-phân-tán-redis-distributed-lock---tránh-race-condition).

### 2.4. Quyết Toán Tài Chính COD 3 Pha & Đối Soát Dòng Tiền
* **Máy trạng thái COD 3 pha:** Tách biệt tiền thu hộ COD và tiền cước B2B; chu trình 3 pha: `UNSETTLED` (Bưu tá giữ tiền mặt) $\rightarrow$ `PENDING_SETTLEMENT` (Bưu tá nộp bảng kê ca phát) $\rightarrow$ `SETTLED` (Thủ quỹ trạm duyệt nhập két).
* **Ràng buộc ngữ cảnh trạm (Station Context RBAC):** Header `X-User-Station-Id` được trích xuất từ JWT tại Gateway và kiểm tra chéo tại Service, ngăn nhân viên thao tác ngoài phạm vi trạm phân công.
* **Thu hồi phiên tức thời:** Kiểm tra Redis Blacklist (< 0.5ms) tại Gateway để vô hiệu hóa token đăng xuất mà không cần chờ JWT hết hạn.
* *Chi tiết:* [Cẩm nang 04 - Station Context](docs/04-logistics-domain-and-rbac-station-context.md#4-bảo-mật-ngữ-cảnh-trạm-station-context-rbac), [Cẩm nang 06 - JWT & RBAC](docs/06-microservices-security-jwt-and-rbac.md), [Cẩm nang 09 - Quyết Toán COD](docs/09-cod-settlement-and-financial-reconciliation.md).

### 2.5. Tối Ưu Giao Diện & Phòng Thủ API Gateway
* **Client-side Caching (Vue 3 `<keep-alive>`):** Giữ trạng thái component trên RAM khi chuyển tab, bảo toàn bộ lọc tìm kiếm và giảm thiểu request dư thừa.
* **Rate Limiting phân tầng (Tiered Token Bucket):** Gateway giới hạn độc lập giữa thao tác đọc (`GET`: 200 req / 30s) và ghi (`POST/PUT/DELETE`: 30 req / 30s); tự động bypass CORS preflight (`OPTIONS`).
* **Service Registry HA 2 chiều:** Đồng bộ song phương giữa các node Eureka bằng cấu hình đan xen `localhost` và `127.0.0.1`, tránh lỗi `PeerEurekaNodes.isInstanceURL()`.
* *Chi tiết:* [Cẩm nang 01 - Cấu Hình HA & Eureka](docs/01-high-availability-and-nginx.md#34-bẫy-kỹ-thuật-eureka-peer-sync-1-chiều--cơ-chế-peereurekanodesisinstanceurl) và [Cẩm nang 05 - Redis Rate Limiter](docs/05-redis-caching-and-distributed-patterns.md#34-bộ-lọc-rate-limiting-phân-tầng-theo-http-method--xử-lý-an-toàn-cors).

### 2.6. Điều Phối Bưu Tá Qua Telegram Bot & WebSocket Thời Gian Thực
* **Điều phối bưu tá qua Telegram Bot:** Gửi thông tin phát hàng (mã vận đơn, địa chỉ, COD, người nhận) trực tiếp đến Telegram bưu tá; kết nối qua Long-Polling không yêu cầu mở cổng Inbound hay IP tĩnh.
* **Thông báo thời gian thực (WebSocket STOMP):** Đẩy thông báo sự kiện bưu gửi tức thì (< 50ms) tới Web Portal qua topic STOMP, thay thế cơ chế HTTP Polling.
* *Chi tiết:* [Cẩm nang 07 - Telegram Bot & Realtime Notifications](docs/07-telegram-bot-and-realtime-notifications.md).

### 2.7. Quản Trị Bưu Tá, Google Identity & Chống Quét Đúp (Idempotency)
* **Domain Bưu tá riêng biệt:** Quản lý bưu tá theo trạm (`stationCode`), trạng thái ca trực (`ACTIVE`/`INACTIVE`) và liên kết Telegram chat ID theo chuẩn Domain-Driven Design (DDD).
* **Google OAuth2 & Idempotency:** Hỗ trợ xác thực Google ID Token với avatar nhúng trong JWT; áp dụng `OperationId` để xử lý lỗi quét đúp mã vạch (Double-Scanning) hoặc mạng chập chờn.
* **Lập lịch gom chuyến xe (Quartz Scheduler):** Định kỳ kiểm tra tải trọng chuyến và tự động đóng sổ trước giờ khởi hành (Cut-off buffer 30 phút).
* *Chi tiết:* [Cẩm nang 08 - Quản Trị Bưu Tá & Idempotency](docs/08-shipper-service-identity-and-idempotency.md).

### 2.8. Phân Tích Đối Soát Dòng Tiền & Xuất Báo Cáo (CQRS)
* **Tách luồng đọc báo cáo (CQRS):** Bảng tổng hợp báo cáo độc lập được cập nhật bất đồng bộ qua Kafka, không chạy aggregate nặng (`SUM`, `COUNT`, `GROUP BY`) trên CSDL giao dịch.
* **Xuất báo cáo Excel 2 sheet:** Sheet 1 tổng hợp KPI tài chính (doanh thu, COD đã nộp, COD đang giữ); Sheet 2 chi tiết từng vận đơn để đối soát và kiểm toán.
* *Chi tiết:* [Cẩm nang 09 - Quyết Toán COD & Báo Cáo Đối Soát](docs/09-cod-settlement-and-financial-reconciliation.md).

### 2.9. Động Cơ Định Giá & Ma Trận Cước Bưu Chính (Pricing Engine)
* **Khối lượng thể tích:** Chuẩn IATA: $(L \times W \times H) / 5000 \times 1000$ (gram). Khối lượng tính cước là $\max(W_{\text{actual}}, W_{\text{volumetric}})$.
* **Ma trận cước phân vùng & phân tầng:** Phân định Nội tỉnh (`INTRA_PROVINCE`) và Liên miền (`INTER_REGION`) với 3 gói dịch vụ: `ECO`, `STANDARD`, `EXPRESS`.
* **Phụ phí tự động:** Nhiên liệu (6%), COD (1%, min 10.000 VNĐ), bảo hiểm khai giá (0.5%).
* *Chi tiết:* [Cẩm nang 13 - Động Cơ Định Giá & Ma Trận Cước Bưu Chính](docs/13-pricing-engine-and-tariff-matrix.md).

### 2.10. Trợ Lý AI & Quản Trị Khiếu Nại (Spring AI & Ollama)
* **On-Premise LLM với Ollama (`qwen2.5:7b`):** Chạy cục bộ bảo mật thông tin khách hàng, tích hợp qua Spring AI `ChatClient`.
* **Autonomous Tool Calling:** AI tự động gọi các công cụ nghiệp vụ nội bộ (`PostalAiTools`) để tra cứu lộ trình bưu phẩm, tính cước phí và kiểm tra trạng thái khiếu nại.
* **Quản trị vòng đời khiếu nại:** 4 bước `SUBMITTED` $\rightarrow$ `INVESTIGATING` $\rightarrow$ `RESOLVED` / `REJECTED`, lưu trữ trên CSDL độc lập quản lý bằng Flyway.
* *Chi tiết:* [Cẩm nang 14 - Trợ Lý Ảo GenAI & Spring AI Tool Calling](docs/14-spring-ai-agent-and-support-ticketing.md).

### 2.11. Đếm Ngược SLA RabbitMQ & Xử Lý Hủy Đơn Liên Dịch Vụ
* **Polyglot Messaging:** Kết hợp RabbitMQ (đếm ngược SLA), Kafka (truyền phát sự kiện toàn mạng) và OpenFeign (giao tiếp đồng bộ).
* **Bộ đếm lùi SLA qua Message TTL & DLX:** Hàng đợi tạm gắn TTL 120s kết hợp Dead-Letter Exchange; khi quá hạn không có nhân viên tiếp nhận, tin nhắn tự chuyển sang queue leo thang (`ESCALATED`) mà không cần polling CSDL.
* **Xử lý hủy đơn liên dịch vụ:** CSKH duyệt khiếu nại hư hỏng/mất mát kích hoạt Feign Client hủy đơn bên `shipment-service`; `routing-service` lắng nghe sự kiện để gỡ kiện khỏi bảng kê và hoàn trả tải trọng xe.
* *Chi tiết:* [Cẩm nang 15 - RabbitMQ SLA & Hủy Đơn Liên Dịch Vụ](docs/15-rabbitmq-priority-queue-and-sla-dead-letter-patterns.md).

### 2.12. Lưu Trữ Tệp Đính Kèm Khiếu Nại Với MinIO Object Storage
* **Kiến trúc S3 Object Storage:** Lưu trữ chứng từ, ảnh hư hỏng và biên bản giải quyết tại MinIO (S3 API), tách biệt hoàn toàn dữ liệu nhị phân khỏi CSDL quan hệ.
* **Tự khởi tạo Bucket & Chính sách truy cập:** `MinioBucketSupport` tự kiểm tra và tạo bucket kèm chính sách truy cập công khai khi khởi động; hỗ trợ Presigned URL có thời hạn cho chứng từ nhạy cảm.
* **Distroless Container:** Sử dụng image Chainguard bảo mật cao, phân định rành mạch giữa Port 9000 (S3 API) và Port 9001 (Web Console).
* *Chi tiết:* [Cẩm nang 16 - Lưu Trữ MinIO Object Storage & S3](docs/16-minio-object-storage-and-s3-boilerplate.md).

### 2.13. Cổng Thanh Toán VietQR & Thông Báo Thời Gian Thực
* **VietQR động chuẩn NAPAS 247:** Tạo mã QR kèm số tiền và mã bưu gửi cho cả cước vận chuyển và tiền COD; người nhận quét thanh toán qua ứng dụng ngân hàng.
* **Đồng bộ sự kiện & Chuông thông báo:** Webhook ngân hàng kích hoạt sự kiện Kafka `payment-success-events`, đẩy thông báo WebSocket STOMP tức thời (< 50ms) lên chuông Topbar của Web Portal.
* **Chống thanh toán đúp:** Kiểm tra trạng thái giao dịch `SUCCESS` trước khi sinh mã QR; giao diện tự chuyển đổi nút bấm sang trạng thái "Đã Thu".
* *Chi tiết:* [Cẩm nang 17 - Cổng Thanh Toán VietQR](docs/17-vietqr-payment-gateway-and-realtime-reconciliation.md).

### 2.14. Đánh Giá Bưu Phẩm 2 Tầng & Tính KPI Bưu Tá
* **Đánh giá 2 tầng độc lập:** Phân định rõ chất lượng vận chuyển / hàng hóa (`serviceRating`) và thái độ phục vụ của bưu tá (`shipperRating`) từ 1 đến 5 sao.
* **Bảo vệ chống gian lận & Tính KPI thời gian thực:** Chỉ đánh giá đơn `DELIVERED`, xác thực số điện thoại và ràng buộc unique tracking; gửi sự kiện Kafka để cập nhật điểm KPI trung bình lũy kế của bưu tá.
* **Hỗ trợ khiếu nại nhanh:** Tự động gắn cờ `suggestTicket = true` gợi ý mở ticket CSKH khi đánh giá dưới 3 sao.
* *Chi tiết:* [Cẩm nang 18 - Đánh Giá Bưu Phẩm & KPI Bưu Tá](docs/18-shipment-rating-and-shipper-kpi.md).

### 2.15. Giao Diện Single Page Application (SPA) & Clean URL
* **Kiến trúc Vue 3 SPA:** Hợp nhất toàn bộ giao diện thành một SPA duy nhất (HTML5 History Mode), hỗ trợ URL chuẩn (`/tracking`, `/shipment`, `/trips`, `/fleet`, `/post-office`, `/hub-ops`, `/shipper`, `/report`, `/support`, v.v.).
* **Thanh Sub-tab Segmented Pill đồng bộ:** Thiết kế dạng viên thuốc compact (~40px) có hiệu ứng chuyển động mượt mà trên 7 phân hệ, tích hợp nút Live Refresh 32px và chuẩn hóa làm tròn các tỷ lệ số liệu (SLA, công suất tải).
* **Bảo vệ tuyến đường (Route Guard):** Lưu URL đích và tự động chuyển hướng đăng nhập khi chưa có phiên; hỗ trợ nút Back/Forward qua sự kiện `popstate`.
* **SPA Server Fallback:** Node.js cấu hình rewrite URL về `index.html` và chuyển hướng 301 cho các đường dẫn HTML cũ.

### 2.16. Transactional Outbox Pattern & Saga Compensation Phân Tán
* **Khắc phục lỗi Dual-Write:** Lưu trữ bản ghi nghiệp vụ và `OutboxEvent` trong cùng một transaction CSDL SQL Server; bộ lập lịch định kỳ đọc và phát sự kiện lên Kafka có kiểm tra ACK.
* **Saga Compensation:** Khi đơn bị hủy (`CANCELLED`), lưu tombstone vào Redis và phát sự kiện bù trừ: gỡ kiện khỏi chuyến xe chờ (`SCHEDULED`), trừ tải trọng xe; hoặc gắn nhãn `HOLD_FOR_RETURN` nếu xe đang chạy (`IN_TRANSIT`).
* *Chi tiết:* [Cẩm nang 19 - Transactional Outbox & Saga Compensation](docs/19-transactional-outbox-and-saga-compensation.md).

### 2.17. Ước Tính ETA Động & Dự Báo Sản Lượng Giao Hàng
* **Động cơ ETA đa chặng:** Tính toán theo địa chỉ thực tế, giờ Cut-off (18h00), thời gian đệm quay đầu xe tại Hub (12h), khoảng cách địa lý và vận tốc định mức 55 km/h; tự động tái ước lượng định kỳ.
* **Dự báo sản lượng ngày kế tiếp:** Tổng hợp từ 3 nguồn (đang trên đường về, tồn kho tại bưu cục, cam kết giao ngày mai) để tính tỷ lệ tải ca bưu tá (`utilizationRate`) và đưa ra cảnh báo quá tải kèm đề xuất nhân sự.
* *Chi tiết:* [Cẩm nang 20 - Ước Tính ETA Động & Dự Báo Sản Lượng](docs/20-dynamic-eta-engine-and-delivery-forecast.md).

### 2.18. Quản Trị Đội Xe (Fleet Management) & Bot Telegram Bưu Tá 2 Chiều
* **Quản trị phương tiện:** Theo dõi 3 phân khúc xe (Xe tải liên tỉnh, Van trung chuyển, Xe máy bưu tá) về biển số, tải trọng, tình trạng bảo dưỡng và trạm gán qua giao diện `/fleet`.
* **Tương tác 2 chiều qua Telegram Bot:** Bưu tá xem danh sách đơn phát hôm nay, bấm nút cập nhật giao thành công hoặc lý do thất bại, kiểm tra tiền COD đang giữ và nộp quỹ ca phát trực tiếp từ Telegram.
* *Chi tiết:* [Cẩm nang 21 - Quản Trị Đội Xe & Telegram Bot Bưu Tá](docs/21-fleet-vehicle-management-and-shipper-bot-actions.md).

### 2.19. Tự Động Hóa GitOps (ArgoCD) & Hệ Thống Giám Sát (Prometheus & Grafana)
* **GitOps với ArgoCD:** Khai báo cấu hình K8s theo Git làm nguồn chân lý duy nhất, tự động đồng bộ và tự phục hồi khi có lệch cấu hình (`prune: true`, `selfHeal: true`).
* **Hạ tầng quan sát phân tầng:** Prometheus tự động cào metrics từ các microservice Spring Boot (`/actuator/prometheus`), Node Exporter và Kube State Metrics; Grafana cung cấp 3 dashboard giám sát nghiệp vụ, hạ tầng K8s và JVM.
* **Tối ưu HPA & Eureka:** Cấu hình HPA trần 3 replicas bảo vệ tài nguyên; gán Eureka instance ID ngẫu nhiên để tránh bản ghi rác khi Pod khởi động lại.
* *Chi tiết:* [Cẩm nang 22 - GitOps ArgoCD & Giám Sát Prometheus Grafana](docs/22-gitops-argocd-and-prometheus-grafana-monitoring.md).

---

## 3. Kiến Trúc Hệ Thống (System & HA Architecture)

Hệ thống kết hợp giữa **Spring Cloud Microservices**, **Apache Kafka KRaft Event-Driven Streaming**, và cơ chế **Database Read-Write Splitting** (Xem thêm chi tiết triển khai tại [Cẩm nang 01 - Cấu Hình HA & Nginx Failover](docs/01-high-availability-and-nginx.md) và [Cẩm nang 02 - Database Read-Write Splitting](docs/02-database-read-write-splitting-boilerplate.md)):

```mermaid
flowchart TB
    subgraph ClientLayer [" Client Layer (Trình Duyệt & Máy Quét POS) "]
        UI["Web Portal (Vue 3 + Tailwind + Leaflet)"]
        Scanner["POS Barcode Scanner / Mobile"]
    end

    subgraph EdgeLayer [" Edge Load Balancing Layer (HA) "]
        Nginx["Nginx Reverse Proxy & Load Balancer (Port 80)\n• Upstream Failover (502, 503, timeout)\n• Route /api/ -> Gateway Cluster | Route / -> Frontend"]
    end

    subgraph GatewayLayer [" API Gateway HA Cluster "]
        GW1["API Gateway 1 (Port 8080)"]
        GW2["API Gateway 2 (Port 8088)"]
    end

    subgraph RegistryLayer [" Service Discovery HA Cluster (Peer-to-Peer) "]
        Eureka1["Eureka Server 1 (Port 8761 - peer1)"]
        Eureka2["Eureka Server 2 (Port 8762 - peer2)"]
        Eureka1 <-->|"Đồng bộ Peer Replication"| Eureka2
    end

    subgraph ServiceLayer [" Business Microservices Layer "]
        AuthSvc["auth-service (8087)\n• OAuth2 / JWT / RBAC\n• Station Context Binding"]
        CustSvc["customer-service (8081)\n• Hồ sơ khách hàng / B2B"]
        ShipSvc["shipment-service (8082)\n• Quản lý vận đơn\n• Động cơ tính cước phí B2B"]
        RouteSvc["routing-service (8083)\n• Multi-leg Trips Management\n• Inventory Operations & Hub Dispatch"]
        TrackSvc["tracking-service (8084 / 8094)\n• Dynamic RoutingDataSource\n• State Machine & Quét barcode"]
        NotiSvc["notification-service (8085)\n• Telegram Bot / WebSocket STOMP\n• Email / SMS / Topbar Bell"]
        AuditSvc["audit-service (8086)\n• Nhật ký kiểm toán toàn mạng"]
        ShipperSvc["shipper-service (8089)\n• Quản lý đội ngũ bưu tá\n• Phân trạm & liên kết Telegram"]
        ReportSvc["report-service (8091)\n• Phân tích đối soát COD & KPI\n• Xuất báo cáo tài chính Excel"]
        RatingSvc["rating-service (8092)\n• Đánh giá chất lượng bưu phẩm\n• Phản hồi khách hàng & KPI shipper"]
        SupportSvc["support-service (8093)\n• Tiếp nhận khiếu nại toàn trình\n• Trợ lý ảo GenAI (Spring AI)"]
        PaymentSvc["payment-service (8095)\n• Cổng thanh toán VietQR động\n• Webhook đối soát & Kafka Events"]
    end

    subgraph AIEngine [" Local AI & Intelligence Layer "]
        OllamaLocal[("Ollama Local LLM (Port 11434)\n• Model: qwen2.5:7b\n• OpenAI-compatible API\n• Autonomous Tool Calling")]
    end

    subgraph EventAndCache [" Message Broker HA, Caching & Object Storage Layer "]
        KafkaCluster[("Apache Kafka 3-Broker KRaft Cluster (Quorum)\n• kafka-1 (9092), kafka-2 (9094), kafka-3 (9096)\n• RF=3, MinISR=2\n• Quorum Voters (Broker 1, 2, 3)")]
        RabbitMQ[("RabbitMQ Broker (Port 5672 / 15672)\n• Priority Queue (MaxPri 10)\n• SLA 120s TTL + DLX Outdate Queue")]
        Redis[("Redis In-Memory (Port 6379)\n• shipment-status Cache\n• Rate Limit Buckets (Bucket4j)\n• OTP & Station Cache")]
        MinIO[("MinIO Object Storage (Port 9000 / 9001)\n• S3 REST API & Web Console\n• Bucket: support-tickets\n• Public Policy + Presigned S3")]
        KafkaUI["Kafka UI Dashboard (Port 8090)"]
    end

    subgraph DatabaseLayer [" Database Layer (Database-per-Service + Read-Write Splitting) "]
        DB_Auth[(auth_db - 1433)]
        DB_Cust[(customer_db - 1433)]
        DB_Ship[(shipment_db - 1433)]
        DB_Route[(routing_db - 1433)]
        subgraph TrackingDB_HA [" tracking-service HA Database Cluster "]
            DB_Track_Primary[(tracking_db PRIMARY - Port 1433\nWrite / Read-Write Operations)]
            DB_Track_Replica[(tracking_db REPLICA - Port 2433\nRead-Only / Hikari Connection Pool)]
        end
        DB_Noti[(notification_db - 1433)]
        DB_Audit[(audit_db - 1433)]
        DB_Shipper[(shipper_db - 1433)]
        DB_Report[(report_db - 1433)]
        DB_Rating[(rating_db - 1433)]
        DB_Support[(support_db - 1433)]
        DB_Payment[(payment_db - 1433)]
    end

    UI & Scanner -->|"HTTP Port 80"| Nginx
    Nginx -->|"Upstream /api/"| GW1 & GW2
    Nginx -->|"Upstream /"| UI
    GW1 & GW2 --> Eureka1 & Eureka2
    GW1 & GW2 --> AuthSvc & CustSvc & ShipSvc & RouteSvc & TrackSvc & NotiSvc & AuditSvc & ShipperSvc & ReportSvc & RatingSvc & SupportSvc & PaymentSvc

    TrackSvc -->|"Ghi: Primary DB"| DB_Track_Primary
    TrackSvc -->|"Đọc: Replica DB"| DB_Track_Replica
    TrackSvc -->|"Publish: tracking-replica-sync"| KafkaCluster
    KafkaCluster -->|"Consumer: ReplicaSyncConsumer"| DB_Track_Replica

    GW1 & GW2 -.-> Redis
    TrackSvc <--> Redis
    AuthSvc <--> Redis

    ShipSvc --> KafkaCluster
    RouteSvc --> KafkaCluster
    TrackSvc --> KafkaCluster
    KafkaCluster --> RouteSvc & TrackSvc & ShipSvc & NotiSvc & AuditSvc & ShipperSvc & ReportSvc
    KafkaCluster -.-> KafkaUI

    PaymentSvc --> DB_Payment
    RatingSvc --> DB_Rating
    PaymentSvc -->|"Publish: payment-success-events"| KafkaCluster
    KafkaCluster -->|"Consumer: PaymentNotification"| NotiSvc
    KafkaCluster -->|"Consumer: PaymentSync"| ShipSvc & ShipperSvc
    NotiSvc -->|"STOMP Broadcast: /topic/notifications/broadcast"| UI
    RatingSvc -.->|"Feign: tra cứu bưu gửi"| TrackSvc & ShipSvc

    NotiSvc -.->|"Feign: /internal/link-telegram"| ShipperSvc
    SupportSvc -.->|"ChatClient (HTTP 11434)"| OllamaLocal
    SupportSvc -.->|"Feign Tools: cước & vận đơn"| TrackSvc & ShipSvc
    SupportSvc -->|"AMQP: priority & sla queue"| RabbitMQ
    RabbitMQ -->|"DLX Consumer: SLAEscalation"| SupportSvc
    SupportSvc -->|"Kafka: email-events"| KafkaCluster
    SupportSvc -.->|"Feign: /api/shipments/cancel"| ShipSvc
    SupportSvc -->|"S3 API: /api/tickets/upload"| MinIO
    UI -.->|"HTTP GET: Render ảnh đính kèm (Port 9000)"| MinIO

    AuthSvc --> DB_Auth
    CustSvc --> DB_Cust
    ShipSvc --> DB_Ship
    RouteSvc --> DB_Route
    NotiSvc --> DB_Noti
    AuditSvc --> DB_Audit
    ShipperSvc --> DB_Shipper
    ReportSvc --> DB_Report
    RatingSvc --> DB_Rating
    SupportSvc --> DB_Support
    PaymentSvc --> DB_Payment
```

---

## 4. Cẩm Nang Kỹ Thuật Chuyên Sâu & Boilerplate (Documentation Deep-Dive)

Toàn bộ chi tiết triển khai kiến trúc, cú pháp cấu hình mẫu, mã nguồn boilerplate Java và checklist câu hỏi phỏng vấn được lưu trữ trong thư mục [`docs/`](docs/):

| STT | Tài Liệu Chuyên Sâu | Nội Dung Trọng Tâm & Boilerplate Code |
| :---: | :--- | :--- |
| **01** | [**Kiến Trúc HA & Nginx Load Balancing**](docs/01-high-availability-and-nginx.md) | Cấu hình Nginx Upstream Failover, Eureka Peer-to-Peer Replication 2 chiều và Docker Compose HA. |
| **02** | [**Database Read-Write Splitting & Boilerplate**](docs/02-database-read-write-splitting-boilerplate.md) | Phân tách Đọc/Ghi với Spring `AbstractRoutingDataSource`, HikariCP, `ThreadLocal` và Template Generic độc lập. |
| **03** | [**Kafka KRaft Cluster & Event Streaming HA**](docs/03-kafka-kraft-cluster-and-event-streaming.md) | KRaft Consensus, Zero-Copy, Idempotent Producer, Exactly-Once Semantics và cụm 3 Broker Docker Compose. |
| **04** | [**Nghiệp Vụ Logistics & Station Context RBAC**](docs/04-logistics-domain-and-rbac-station-context.md) | Quản lý chuyến xe trục, kiểm soát tải trọng, niêm phong Seal, tự động chuyển hoàn và Station Context RBAC. |
| **05** | [**Redis Caching, Rate Limiter & Distributed Lock**](docs/05-redis-caching-and-distributed-patterns.md) | Cache-Aside (< 2ms), Token Bucket Rate Limiter phân tầng Read/Write, Redis Distributed Lock (`SETNX`). |
| **06** | [**Bảo Mật Microservices: Stateless JWT & RBAC**](docs/06-microservices-security-jwt-and-rbac.md) | API Gateway Authentication, Redis Token Blacklist (< 0.5ms), chống Header Spoofing và Spring Security 6.x. |
| **07** | [**Telegram Bot & Realtime Notification (WebSocket/STOMP)**](docs/07-telegram-bot-and-realtime-notifications.md) | Điều phối bưu tá qua Telegram Long-Polling, đẩy thông báo thời gian thực qua WebSocket STOMP Broker (< 50ms). |
| **08** | [**Quản Trị Bưu Tá, Google Identity & Idempotency**](docs/08-shipper-service-identity-and-idempotency.md) | Domain Bưu tá theo DDD, xác thực Google OAuth2, Idempotent OperationId chống quét đúp và Quartz Scheduler gom chuyến. |
| **09** | [**Quyết Toán COD & Báo Cáo Đối Soát Dòng Tiền**](docs/09-cod-settlement-and-financial-reconciliation.md) | Máy trạng thái COD 3 pha, nộp và duyệt quỹ tiền mặt, đồng bộ CQRS qua Kafka và xuất báo cáo Excel 2-sheet. |
| **10** | [**Container Hóa Toàn Trình & Điều Phối HA (Docker & Compose)**](docs/10-docker-containerization-and-ha-orchestration.md) | Đóng gói Dockerfile Java 21 / Node.js, xử lý mạng Docker DNS và bộ Compose mẫu 23 containers độc lập. |
| **11** | [**CI/CD Tự Động Hóa Với GitHub Actions (Microservices Monorepo)**](docs/11-cicd-github-actions-automation.md) | Pipeline 3 giai đoạn Monorepo (`paths-filter`, `matrix` build song song), gắn tag Git SHA và thông báo Telegram. |
| **12** | [**Điều Phối Toàn Trình Trên Kubernetes (K8s Architecture, Production & Troubleshooting)**](docs/12-kubernetes-orchestration-and-deployment.md) | Triển khai 13 microservices trên K8s, Ingress NGINX SSL Wildcard, Zero-Trust NetworkPolicy và sổ tay kubectl. |
| **13** | [**Động Cơ Định Giá & Ma Trận Cước Bưu Chính**](docs/13-pricing-engine-and-tariff-matrix.md) | Tính cước theo khối lượng thể tích IATA, ma trận cước 3 gói (ECO/STANDARD/EXPRESS) và phụ phí tự động. |
| **14** | [**Trợ Lý Ảo GenAI & Cơ Chế Spring AI Tool Calling**](docs/14-spring-ai-agent-and-support-ticketing.md) | On-Premise LLM với Ollama (`qwen2.5:7b`), Spring AI Tool Calling tra cứu đơn/tính cước và vòng đời ticket khiếu nại. |
| **15** | [**Đếm Ngược SLA RabbitMQ & Xử Lý Hủy Đơn Liên Dịch Vụ**](docs/15-rabbitmq-priority-queue-and-sla-dead-letter-patterns.md) | Polyglot Messaging, bộ đếm ngược SLA 120s bằng RabbitMQ TTL + DLX, hủy đơn liên dịch vụ qua OpenFeign. |
| **16** | [**Lưu Trữ Đối Tượng MinIO & S3 Boilerplate**](docs/16-minio-object-storage-and-s3-boilerplate.md) | Lưu trữ chứng từ với MinIO S3 API, cơ chế tự tạo bucket (`MinioBucketSupport`), Presigned URLs và Distroless container. |
| **17** | [**Cổng Thanh Toán VietQR & Đối Soát Tài Chính Tức Thời**](docs/17-vietqr-payment-gateway-and-realtime-reconciliation.md) | Cổng VietQR NAPAS 247 động, xác thực Webhook, Kafka event, thông báo chuông WebSocket và chống thanh toán đúp. |
| **18** | [**Đánh Giá Bưu Phẩm 2 Tầng & Đối Soát KPI Bưu Tá Lũy Kế**](docs/18-shipment-rating-and-shipper-kpi.md) | Đánh giá 2 tầng (Dịch vụ & Bưu tá), xác thực số điện thoại, tính điểm KPI tự động qua Kafka và gợi ý mở ticket. |
| **19** | [**Transactional Outbox & Saga Compensation**](docs/19-transactional-outbox-and-saga-compensation.md) | Xử lý Dual-Write với Outbox Pattern, Saga bù trừ hủy đơn, Redis Tombstone, gỡ kiện và giải phóng tải xe. |
| **20** | [**Động Cơ ETA Động & Dự Báo Sản Lượng Giao Hàng**](docs/20-dynamic-eta-engine-and-delivery-forecast.md) | Ước tính ETA đa chặng theo Cut-off và vận tốc, dự báo sản lượng ngày mai từ 3 nguồn và cân đối tải bưu tá. |
| **21** | [**Quản Trị Đội Xe Vận Tải & Tương Tác Bưu Tá Telegram Bot**](docs/21-fleet-vehicle-management-and-shipper-bot-actions.md) | Quản lý 3 phân khúc đội xe qua `/fleet`, Telegram Bot 2 chiều cho bưu tá cập nhật trạng thái đơn và nộp COD. |
| **22** | [**Vận Hành GitOps Với ArgoCD & Giám Sát Toàn Diện**](docs/22-gitops-argocd-and-prometheus-grafana-monitoring.md) | Đồng bộ GitOps tự động với ArgoCD, giám sát Prometheus & 3 Grafana Dashboards (Nghiệp vụ, Hạ tầng, JVM). |

---

## 5. Hướng Dẫn Khởi Chạy Nhanh (Quickstart)

Hệ thống được chuẩn hóa triển khai khép kín trên **Kubernetes (Docker Desktop)** kết hợp cơ chế **GitOps tự động với ArgoCD**, hệ thống giám sát phân tầng **Prometheus & Grafana**, và bảo mật truyền thông **SSL/TLS Wildcard (HTTPS)**.

---

### 5.1. Chuẩn Bị Môi Trường (Chỉ cần làm 1 lần ban đầu)

#### Bước 1: Kích hoạt Kubernetes trong Docker Desktop
* Mở **Docker Desktop** $\rightarrow$ Cài đặt ⚙️ (**Settings**) $\rightarrow$ Mục **Kubernetes**.
* Tích chọn **Enable Kubernetes** $\rightarrow$ Bấm **Apply & restart** (Đợi thanh trạng thái Kubernetes chuyển sang màu xanh).

#### Bước 2: Sinh Cặp Chứng Chỉ SSL Wildcard với `mkcert` (Bắt buộc cho HTTPS & Google OAuth)
```powershell
# Cài đặt CA gốc tin cậy vào Windows Certificate Store (chỉ cần chạy 1 lần duy nhất)
mkcert -install

# Sinh cặp chứng chỉ Wildcard cho toàn bộ domain nội bộ
mkcert "waybill.vn" "*.waybill.vn" "localhost" 127.0.0.1
Copy-Item "waybill.vn+3.pem" "waybill.vn+1.pem" -Force -ErrorAction SilentlyContinue
Copy-Item "waybill.vn+3-key.pem" "waybill.vn+1-key.pem" -Force -ErrorAction SilentlyContinue
```

#### Bước 3: Cấu hình phân giải DNS cục bộ trên Windows (`hosts` file)
Mở PowerShell bằng quyền **Administrator** và thêm các domain vào file `hosts`:
```powershell
@"
127.0.0.1 waybill.vn api.waybill.vn storage.waybill.vn
127.0.0.1 dashboard.waybill.vn
127.0.0.1 grafana.waybill.vn
127.0.0.1 prometheus.waybill.vn
"@ | Out-File -FilePath C:\Windows\System32\drivers\etc\hosts -Append -Encoding ascii
```

---

### 5.2. Triển Khai Toàn Trình Với 1 Script Duy Nhất (Automated 1-Click Deploy)

Chỉ cần chạy một script duy nhất, toàn bộ hệ thống sẽ tự động cấu hình từ A-Z:
* Cài đặt **Ingress NGINX Controller** & cấu hình Zero-Trust Webhook.
* Cài đặt **Metrics-Server** (hỗ trợ Auto-scaling HPA).
* Khởi tạo Namespaces (`waybill`, `monitor`, `argocd`, `kubernetes-dashboard`).
* Tự động nạp Runtime Secrets, ConfigMaps và chứng chỉ SSL TLS.
* Triển khai Cụm hạ tầng HA (SQL Server 2022, Kafka KRaft, Redis, Eureka HA, RabbitMQ, MinIO S3).
* Khởi chạy tự động Job `sqlserver-init-db` tạo sẵn 12 CSDL nghiệp vụ.
* Triển khai 13 Microservices nghiệp vụ + Web Portal Frontend SPA.
* Thiết lập Ingress Rules và hệ thống giám sát phân tầng Prometheus & Grafana.
* Cài đặt **ArgoCD Controller** và kích hoạt GitOps Application `waybill-microservices`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-standardized-k8s.ps1
```

---

### 5.3. Đồng Bộ Dữ Liệu CSDL Từ Local Lên K8s (Tùy chọn - Optional)

Nếu bạn có sẵn dữ liệu nghiệp vụ trên SQL Server máy host (cổng `1433`) và muốn đồng bộ lên Pod `sqlserver-replica` trên K8s (cổng `2433`):

```powershell
# Nếu mật khẩu sa máy host là 'sa' (mặc định)
powershell -ExecutionPolicy Bypass -File .\scripts\sync-db-to-k8s.ps1

# Nếu mật khẩu sa máy host khác, truyền tham số -SourcePass
powershell -ExecutionPolicy Bypass -File .\scripts\sync-db-to-k8s.ps1 -SourcePass "mat_khau_sa_cua_ban"
```
> **Cơ chế:** Script sẽ tự động backup 12 database thành các file `.bak`, copy trực tiếp vào Pod K8s, thực thi `RESTORE WITH REPLACE` và tự động dọn dẹp file tạm.

---

### 5.4. Bảng Tra Cứu Cổng & Địa Chỉ Dịch Vụ Chuẩn Hóa

| Dịch Vụ / Thành Phần | Địa Chỉ Truy Cập / URL | Thông Tin Đăng Nhập & Ghi Chú |
| :--- | :--- | :--- |
| **Web Portal (Frontend SPA)** | [https://waybill.vn](https://waybill.vn) *(hoặc [http://waybill.vn](http://waybill.vn))* | Đăng nhập tài khoản demo hoặc Google OAuth2 |
| **API Gateway Trung Tâm** | [https://api.waybill.vn](https://api.waybill.vn) | Cổng định tuyến API HA (Actuator / Health) |
| **ArgoCD GitOps Console** | [https://localhost:8443](https://localhost:8443) | Xem lệnh Port-forward & lấy Password bên dưới |
| **Grafana Monitoring** | [https://grafana.waybill.vn](https://grafana.waybill.vn) | Tài khoản: `admin` / `admin` (3 Dashboards nạp sẵn) |
| **Prometheus TSDB** | [http://prometheus.waybill.vn](http://prometheus.waybill.vn) | Giao diện cào metrics và truy vấn PromQL |
| **Kubernetes Dashboard** | [https://dashboard.waybill.vn](https://dashboard.waybill.vn) | Đăng nhập bằng Token (lệnh lấy token bên dưới) |
| **MinIO Object Storage Console** | [http://localhost:9001](http://localhost:9001) | Cần port-forward; Tài khoản: `minioadmin` / `minioadmin` |
| **MinIO S3 Public Endpoint** | [https://storage.waybill.vn](https://storage.waybill.vn) | Lưu trữ chứng từ, ảnh đính kèm ticket |
| **SQL Server 2022 Replica** | `localhost:2433` (kết nối SSMS / DBeaver) | User: `sa` / Pass: `Replica@123456` |
| **Eureka Service Registry** | [http://localhost:8761](http://localhost:8761) | Cần port-forward; giám sát 13 microservices đăng ký |

---

### 5.5. Bí Kíp Vận Hành & Xử Lý Sự Cố Nhanh (Tips & FAQ)

#### 1. Mẹo xử lý cảnh báo SSL trên trình duyệt:
* Vì đây là môi trường local, nếu trình duyệt Chrome/Edge hiển thị cảnh báo đỏ *"Your connection is not private"* do cache SSL cũ:
  * Nhấp chuột vào vị trí bất kỳ trên màn hình cảnh báo và gõ trực tiếp dãy chữ: **`thisisunsafe`** (Trình duyệt sẽ ngay lập tức mở trang web).
  * Hoặc truy cập trực tiếp qua cổng HTTP không mã hóa: [http://waybill.vn](http://waybill.vn).

#### 2. Mở cổng & lấy mật khẩu đăng nhập ArgoCD Web:
* **Mở cổng kết nối:**
  ```powershell
  kubectl port-forward svc/argocd-server -n argocd 8443:443
  ```
* **Lấy mật khẩu tài khoản `admin` của ArgoCD:**
  ```powershell
  [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}")))
  ```

#### 3. Lấy Token đăng nhập Kubernetes Dashboard:
```powershell
kubectl -n kubernetes-dashboard create token kubernetes-dashboard
```
Copy chuỗi token hiển thị và dán vào ô **Token** trên trang [https://dashboard.waybill.vn](https://dashboard.waybill.vn).

#### 4. Mở cổng MinIO Web Console & Eureka Registry:
* Mở giao diện MinIO: `kubectl port-forward svc/minio 9001:9001 -n waybill` $\rightarrow$ truy cập [http://localhost:9001](http://localhost:9001).
* Mở giao diện Eureka: `kubectl port-forward svc/eureka-peer1 8761:8761 -n waybill` $\rightarrow$ truy cập [http://localhost:8761](http://localhost:8761).

#### 5. Kiểm tra sức khỏe, tải CPU/RAM của hệ thống:
```powershell
# Xem trạng thái tất cả các Pods trong hệ thống
kubectl get pods -n waybill
kubectl get pods -n monitor
kubectl get pods -n argocd

# Kiểm tra mức độ tiêu thụ CPU và RAM theo thời gian thực (nhờ Metrics-Server)
kubectl top nodes
kubectl top pods -n waybill

# Kiểm tra trạng thái đồng bộ GitOps của ArgoCD
kubectl get application -n argocd
```

---

### 5.6. Khởi Chạy Toàn Bộ Bằng Docker Thuần (Docker Compose Pre-built Images)

Phương án này dành cho môi trường không sử dụng Kubernetes, muốn khởi chạy nhanh chóng toàn bộ nền tảng (Hạ tầng HA, 13 Microservices nghiệp vụ, Nginx Edge và Frontend SPA) trực tiếp từ các Docker images đã đóng gói sẵn:

```bash
# Khởi động toàn bộ 100% hệ thống từ Docker Hub images
docker compose up -d
```

> **Cơ chế:** Docker Compose sẽ tự động kéo các image `khanhnv26/*:1.0` từ Docker Hub, tạo mạng bridge nội bộ `mini-waybill-platform_default` và kết nối toàn bộ 13 microservices khép kín trong Docker.

**Bảng cổng truy cập trực tiếp trên `localhost`:**
* **Web Portal (Frontend qua Nginx):** [http://localhost](http://localhost) (Port 80)
* **Frontend Node Instances:** [http://localhost:3000](http://localhost:3000) và [http://localhost:3001](http://localhost:3001)
* **Kafka UI:** [http://localhost:8090](http://localhost:8090) (Quản trị 3 Brokers Kafka KRaft)
* **RabbitMQ Management:** [http://localhost:15672](http://localhost:15672) (`admin` / `admin`)
* **MinIO Web Console:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`)
* **MinIO S3 API:** `http://localhost:9000` (Bucket: `support-tickets`)
* **Eureka Service Registry:** [http://localhost:8761](http://localhost:8761) và [http://localhost:8762](http://localhost:8762)
* **SQL Server Replica:** `localhost:2433` (`sa` / `Replica@123456`)
* **Redis Cache:** `localhost:6379`

Lệnh dừng toàn bộ hệ thống:
```bash
docker compose down
```

---

### 5.7. Khởi Chạy Kết Hợp Để Lập Trình & Debug Code (Docker Hạ Tầng + Local Spring Boot)

Dành cho lập trình viên muốn chỉnh sửa source code Java/Vue và debug trực tiếp bằng IDE hoặc Maven:

#### Bước 1: Khởi động Hạ tầng Docker HA (Chỉ chạy các container phụ trợ)
```bash
docker compose up -d kafka-1 kafka-2 kafka-3 kafka-ui redis rabbitmq minio sqlserver-replica rating-db-init
```
* **Kafka UI:** [http://localhost:8090](http://localhost:8090) (Kiểm tra 3 Brokers online).
* **RabbitMQ Management:** [http://localhost:15672](http://localhost:15672) (`admin` / `admin`).
* **MinIO Web Console:** [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadmin`).
* **MinIO S3 API:** `http://localhost:9000` (Bucket: `support-tickets`).
* **Nginx Load Balancer:** [http://localhost:80](http://localhost:80).
* **Redis:** Port `6379`.
* **SQL Server Replica:** Port `2433` (`sa` / `Replica@123456`).

#### Bước 2: Chuẩn bị CSDL Primary (SQL Server Port 1433)
1. Tạo 12 database: `auth_db`, `customer_db`, `shipment_db`, `routing_db`, `tracking_db`, `notification_db`, `audit_db`, `shipper_db`, `report_db`, `rating_db`, `support_db`, `payment_db`. SQL Server không tự tạo database từ chuỗi JDBC. `support-service`, `rating-service` và `payment-service` dùng Flyway để tự động khởi tạo bảng.
2. Chạy 2 script seed dữ liệu nền trong thư mục `database/`:
   * [`database/HubSeed.sql`](database/HubSeed.sql) (Nạp 5 Siêu Hub vào `routing_db`).
   * [`database/seed_rbac_data.sql`](database/seed_rbac_data.sql) (Nạp vai trò, quyền hạn vào `auth_db`).

#### Bước 3: Biên dịch Backend & Khởi chạy Microservices
```bash
mvn clean install -DskipTests

# Khởi động Eureka Registry & API Gateway
cd service-registry && ./mvnw spring-boot:run -Dspring-boot.run.profiles=peer1
cd api-gateway && ./mvnw spring-boot:run

# Khởi động các Core Services
cd auth-service && ./mvnw spring-boot:run
cd customer-service && ./mvnw spring-boot:run
cd shipment-service && ./mvnw spring-boot:run
cd routing-service && ./mvnw spring-boot:run
cd tracking-service && ./mvnw spring-boot:run
cd notification-service && ./mvnw spring-boot:run
cd audit-service && ./mvnw spring-boot:run
cd shipper-service && ./mvnw spring-boot:run
cd report-service && ./mvnw spring-boot:run
cd rating-service && ./mvnw spring-boot:run
cd support-service && ./mvnw spring-boot:run
cd payment-service && ./mvnw spring-boot:run
```

#### Bước 4: Khởi chạy Frontend Portal
```bash
node server.js
```

---

## 6. Tài Khoản Kiểm Thử Mẫu (Demo Accounts)

Mật khẩu chuẩn hóa cho toàn bộ tài khoản nghiệp vụ: **`Admin@123456`** *(hoặc `123456` đối với môi trường dev cũ)*:

| Vai Trò | Email Đăng Nhập | Nghiệp Vụ & Quyền Hạn Trọng Tâm |
| :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | `admin@waybill.vn` | Quản trị toàn quyền hệ thống, RBAC, Audit Trail, xem tất cả vận đơn. |
| **Thủ Kho Hub (Hub Operator)** | `hub.operator@waybill.vn` | Khai thác Hub, quét mã nhập/xuất kho, niêm phong chuyến xe liên tỉnh. |
| **Giao Dịch Viên Bưu Cục** | `post.operator@waybill.vn` | Khai thác trạm bưu cục, đóng túi thư gom hàng lên Siêu Hub. |
| **Bưu Tá (Shipper)** | `shipper@waybill.vn` | Nhận đơn đi phát chặng cuối, cập nhật phát thành công / hẹn lại. |
| **Khách Hàng Shop (Customer)** | `customer@waybill.vn` | Tạo vận đơn B2B, theo dõi hành trình và đối soát tiền COD. |

---

## 7. Cấu Trúc Thư Mục Dự Án (Project Structure)

```plaintext
mini-waybill-platform/
├── docker-compose.yaml        # Cụm hạ tầng HA: Kafka 3-Broker, Nginx LB, Redis, SQL Server Replica
├── pom.xml                    # Maven Parent POM quản lý đa module
├── server.js                  # Máy chủ Frontend (Port 3000 / 3001)
│
├── docs/                      # TÀI LIỆU KỸ THUẬT CHUYÊN SÂU & BOILERPLATE TEMPLATES
│   ├── 01-high-availability-and-nginx.md
│   ├── 02-database-read-write-splitting-boilerplate.md
│   ├── 03-kafka-kraft-cluster-and-event-streaming.md
│   ├── 04-logistics-domain-and-rbac-station-context.md
│   ├── 05-redis-caching-and-distributed-patterns.md
│   ├── 06-microservices-security-jwt-and-rbac.md
│   ├── 07-telegram-bot-and-realtime-notifications.md
│   ├── 08-shipper-service-identity-and-idempotency.md
│   ├── 09-cod-settlement-and-financial-reconciliation.md
│   ├── 10-docker-containerization-and-ha-orchestration.md
│   ├── 11-cicd-github-actions-automation.md
│   ├── 12-kubernetes-orchestration-and-deployment.md
│   ├── 13-pricing-engine-and-tariff-matrix.md
│   ├── 14-spring-ai-agent-and-support-ticketing.md
│   ├── 15-rabbitmq-priority-queue-and-sla-dead-letter-patterns.md
│   ├── 16-minio-object-storage-and-s3-boilerplate.md
│   ├── 17-vietqr-payment-gateway-and-realtime-reconciliation.md
│   ├── 18-shipment-rating-and-shipper-kpi.md
│   ├── 19-transactional-outbox-and-saga-compensation.md
│   ├── 20-dynamic-eta-engine-and-delivery-forecast.md
│   ├── 21-fleet-vehicle-management-and-shipper-bot-actions.md
│   └── 22-gitops-argocd-and-prometheus-grafana-monitoring.md
│
├── k8s/                       # Kubernetes manifests, ArgoCD GitOps & Prometheus/Grafana monitoring stack
├── scripts/                   # Script Minikube và đồng bộ dữ liệu DB
├── nginx/                     # Cấu hình Nginx Edge Load Balancer (nginx.conf)
├── api-gateway/               # Spring Cloud Gateway HA (Port 8080 & 8088)
├── service-registry/          # Netflix Eureka Server Peer-to-Peer (Port 8761 & 8762)
├── auth-service/              # Xác thực, RBAC & Station Context (Port 8087, auth_db)
├── customer-service/          # Quản lý hồ sơ đối tác B2B (Port 8081, customer_db)
├── shipment-service/          # Quản lý bưu gửi, tính cước độc lập (Port 8082, shipment_db)
├── routing-service/           # Quản lý Chuyến xe (Trips), Inventory Hub/Bưu cục (Port 8083, routing_db)
├── tracking-service/          # Máy trạng thái, CSDL Read-Write Splitting (Port 8084 & 8094)
├── notification-service/      # Lắng nghe Kafka gửi Email HTML & Telegram (Port 8085, notification_db)
├── audit-service/             # Nhật ký kiểm toán toàn mạng (Port 8086, audit_db)
├── shipper-service/           # Quản lý bưu tá, phân trạm & liên kết Telegram (Port 8089, shipper_db)
├── report-service/            # Phân tích đối soát COD, KPI tài chính & xuất Excel (Port 8091, report_db)
├── rating-service/            # Đánh giá dịch vụ bưu chính, chất lượng bưu phẩm (Port 8092, rating_db)
├── support-service/           # Khiếu nại, hỗ trợ bưu gửi & Trợ lý ảo Spring AI (Port 8093, support_db)
├── payment-service/           # Cổng thanh toán VietQR động & đối soát tự động (Port 8095, payment_db)
├── shared-events/             # DTO Event Contracts dùng chung giữa các microservice
├── database/                  # Script khởi tạo 5 Siêu Hub và ma trận RBAC
└── frontend/                  # Giao diện Web SPA (Vue 3 + Tailwind CSS + Leaflet Maps)
```

---

## 8. Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)
Dự án được xây dựng và phát triển với mục đích học tập, nghiên cứu và mô phỏng kiến trúc hệ thống Microservices (Simulation / Pet Project). Mọi thông tin thương hiệu, tên gọi bưu cục và dữ liệu vận đơn trong dự án đều mang tính chất minh họa kỹ thuật và phi thương mại.
