# VNPT Waybill Platform - Nền Tảng Điều Phối & Quản Trị Vận Đơn Bưu Chính Toàn Trình

[![Java](https://img.shields.io/badge/Java-21%20LTS-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x%20%2F%204.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Spring Cloud](https://img.shields.io/badge/Spring%20Cloud-2025.1.3-6DB33F?style=for-the-badge&logo=spring&logoColor=white)](https://spring.io/projects/spring-cloud)
[![Apache Kafka](https://img.shields.io/badge/Apache%20Kafka-KRaft%20HA%20Cluster-231F20?style=for-the-badge&logo=apachekafka&logoColor=white)](https://kafka.apache.org/)
[![Nginx](https://img.shields.io/badge/Nginx-Edge%20Load%20Balancer-009639?style=for-the-badge&logo=nginx&logoColor=white)](https://nginx.org/)
[![Redis](https://img.shields.io/badge/Redis-7.x%20Cache%20%26%20RateLimit-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![SQL Server](https://img.shields.io/badge/SQL%20Server-Primary%20%26%20Replica%20HA-CC292B?style=for-the-badge&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/sql-server)
[![Flyway](https://img.shields.io/badge/Flyway-Database%20Migration-CC0202?style=for-the-badge&logo=flyway&logoColor=white)](https://flywaydb.org/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.x%20Enterprise%20UI-4FC08D?style=for-the-badge&logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-B2B%20Logistics%20Design-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

---

## 1. Giới Thiệu Tổng Quan

**VNPT Waybill Platform** là hệ thống Microservices chuẩn Enterprise mô phỏng chuỗi cung ứng chuyển phát bưu chính toàn trình: từ tiếp nhận bưu phẩm tại quầy / Shop B2B, quản lý chuyến xe trục liên tỉnh (Trips Management), phân luồng tại 5 Siêu Hub trọng điểm toàn quốc (Hà Nội, Hải Phòng, Đà Nẵng, TP.HCM, Cần Thơ), cho đến điều phối bưu tá phát hàng chặng cuối và quyết toán tiền thu hộ COD.

Hệ thống được thiết kế theo tiêu chuẩn **High Availability (HA - Tính sẵn sàng cao)** đa tầng, sẵn sàng chịu lỗi và tự phục hồi khi có sự cố phần cứng, mạng hoặc máy chủ dữ liệu.

---

## 2. Bối Cảnh Vận Hành & Nghiệp Vụ Bưu Chính Toàn Trình (Core Business Domain)

Khác với các ứng dụng giao hàng nội thành đơn chặng, hệ thống bưu chính quy mô quốc gia vận hành theo mô hình phân tầng đa chặng với mạng lưới kho bãi phức tạp. Nền tảng mô phỏng và giải quyết triệt để 4 trụ cột nghiệp vụ trọng yếu:

### 2.1. Mô Hình Mạng Lưới Hub-and-Spoke & 5 Siêu Hub Toàn Quốc
* **Quy trình luân chuyển đa tầng:** Bưu gửi từ Người gửi tại quầy hoặc Shop B2B được tiếp nhận tại **Bưu cục gửi (Origin Post Office)** -> xe gom Feeder chở về **Siêu Hub gửi** -> xe tải trục liên tỉnh (**Trunk Trip**) chạy đường dài tới **Siêu Hub nhận** -> xe gom Feeder chuyển về **Bưu cục phát (Dest Post Office)** -> **Bưu tá (Shipper) phát hàng tận nơi (Last-Mile)** tới Người nhận.
* **Mạng lưới 5 Siêu Hub trọng điểm:** Phân bổ chiến lược trên toàn quốc gồm Hà Nội (`HUB_HAN`), Hải Phòng (`HUB_HPH`), Đà Nẵng (`HUB_DAD`), TP.HCM (`HUB_SGN`), và Cần Thơ (`HUB_VCA`), đóng vai trò cửa ngõ gom tải và định tuyến hàng hóa liên vùng.
* *Tài liệu chi tiết:* Xem sơ đồ phân cấp mạng lưới bưu chính tại [Cẩm nang 04 - Mô Hình Hub-and-Spoke](docs/04-logistics-domain-and-rbac-station-context.md#1-bản-đồ-nghiệp-vụ-vận-tải-bưu-chính-thực-tế).

### 2.2. Vòng Đời Vận Đơn & Máy Trạng Thái 11 Bước (State Machine)
* **Luân chuyển trạng thái tuần tự:** Vận đơn trải qua 11 mốc trạng thái chuẩn: `CREATED` -> `PENDING_ROUTING` -> `ROUTE_ASSIGNED` -> `PICKED_UP` -> `IN_TRANSIT` -> `ARRIVED_DEST_HUB` -> `OUT_FOR_DELIVERY` -> `DELIVERED`.
* **Cơ chế Tự động Chuyển hoàn (Auto-Returning):** Khi bưu tá báo phát thất bại (`DELIVERY_FAILED` do khách hẹn lại hoặc sai địa chỉ), hệ thống cho phép phát lại tối đa 3 lần. Khi phát hiện số lần thất bại đạt mốc 3, hệ thống tự động kích hoạt trạng thái `RETURNING` để chuyển hoàn bưu phẩm về người gửi, giải phóng sức chứa kho bãi.
* **Tính Bất Biến (Immutable Terminal States):** Các trạng thái kết thúc gồm `DELIVERED` (Giao thành công & Thu tiền COD), `RETURNED` (Đã hoàn hàng về Shop) và `CANCELLED` (Hủy hợp lệ) là bất biến tuyệt đối nhằm bảo đảm tính toàn vẹn chứng từ tài chính và kế toán.
* *Tài liệu chi tiết:* Xem mã nguồn Java State Machine và logic tự động chuyển hoàn tại [Cẩm nang 04 - Máy Trạng Thái Bưu Gửi](docs/04-logistics-domain-and-rbac-station-context.md#3-máy-trạng-thái-bưu-gửi-11-bước--tự-động-chuyển-hoàn-auto-returning) và kiến trúc phát sự kiện bất đồng bộ tại [Cẩm nang 03 - Kafka KRaft Cluster](docs/03-kafka-kraft-cluster-and-event-streaming.md).

### 2.3. Điều Phối Chuyến Xe Trục (Trips), Kiểm Soát Tải Trọng & Niêm Phong Seal
* **Kiểm soát tải trọng theo thời gian thực (Load Capacity Bar):** Hệ thống tự động cộng dồn khối lượng thực tế và thể tích quy đổi của từng kiện hàng khi xếp lên chuyến xe. Giao diện trực quan hóa mức tải xe (Xanh lá < 80%, Vàng 80-99%, Đỏ >= 100% cảnh báo/chặn xếp thêm đơn) giúp doanh nghiệp tuân thủ nghiêm ngặt quy định tải trọng đường bộ.
* **Niêm phong bảo an (Seal Number):** Trước khi xe tải xuất bến rời Hub, điều phối viên bắt buộc phải chốt mã số niêm chì (Seal). Khi xe cập bến Hub đích, thủ kho bắt buộc đối soát mã Seal thực tế trùng khớp với bảng kê điện tử (Manifest) mới được phép dỡ hàng.
* **Chống xung đột đa luồng:** Áp dụng khóa phân tán Redis (`SETNX`) đảm bảo khi 2 bưu tá cùng quét một kiện hàng trên thiết bị cầm tay, chỉ duy nhất 1 người giành được quyền xử lý, tránh race condition trong môi trường đồng thời cao.
* *Tài liệu chi tiết:* Xem thuật toán tính tải và quy trình niêm phong tại [Cẩm nang 04 - Quản Lý Chuyến Xe Trục](docs/04-logistics-domain-and-rbac-station-context.md#2-quản-lý-chuyến-xe-trục-đa-chặng-multi-leg-trips--manifests) và boilerplate khóa phân tán tại [Cẩm nang 05 - Redis Distributed Lock](docs/05-redis-caching-and-distributed-patterns.md#23-luồng-khóa-phân-tán-redis-distributed-lock---tránh-race-condition).

### 2.4. Quyết Toán Tài Chính COD & Bảo Mật Ngữ Cảnh Trạm (Station Context Binding)
* **Quản trị dòng tiền COD minh bạch:** Tách biệt rõ ranh giới giữa tiền thu hộ COD và tiền cước vận chuyển B2B. Khi bưu tá hoàn tất ca phát, tiền mặt được nộp về quỹ trạm, hệ thống kích hoạt luồng đối soát và gửi thông báo biến động số dư.
* **Ràng buộc ngữ cảnh trạm làm việc (Station Context Binding):** Ngăn chặn triệt để lỗ hổng nhân viên có vai trò `ROLE_POST_OFFICE_STAFF` tại trạm Hà Nội cố tình hoặc vô ý thao tác đơn hàng thuộc địa bàn TP.HCM. Thông tin trạm (`X-User-Station-Id`) được Gateway trích xuất từ JWT và kiểm tra chéo tại tầng Business Service.
* **Thu hồi quyền tức thời qua Redis Blacklist:** Khi phát hiện nhân viên vi phạm hoặc đăng xuất, Gateway kiểm tra Redis Blacklist trong thời gian < 0.5ms để chặn đứng truy cập ngay lập tức mà không cần chờ JWT hết hạn.
* *Tài liệu chi tiết:* Xem giải pháp Station Context Binding tại [Cẩm nang 04 - Bảo Mật Ngữ Cảnh Trạm](docs/04-logistics-domain-and-rbac-station-context.md#4-bảo-mật-ngữ-cảnh-trạm-station-context-rbac) và kiến trúc bảo mật Gateway tại [Cẩm nang 06 - Microservices Security & Redis Blacklist](docs/06-microservices-security-jwt-and-rbac.md).

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
        ShipSvc["shipment-service (8082)\n• Quản lý vận đơn\n• Tính cước phí B2B"]
        RouteSvc["routing-service (8083)\n• Multi-leg Trips Management\n• Inventory Operations & Hub Dispatch"]
        TrackSvc["tracking-service (8084 / 8094)\n• Dynamic RoutingDataSource\n• State Machine & Quét barcode"]
        NotiSvc["notification-service (8085)\n• Email / SMS / In-app"]
        AuditSvc["audit-service (8086)\n• Nhật ký kiểm toán toàn mạng"]
    end

    subgraph EventAndCache [" Message Broker HA & Caching Layer "]
        KafkaCluster[("Apache Kafka 3-Broker KRaft Cluster (Quorum)\n• kafka-1 (9092), kafka-2 (9094), kafka-3 (9096)\n• RF=3, MinISR=2\n• Quorum Voters (Broker 1, 2, 3)")]
        Redis[("Redis In-Memory (Port 6379)\n• shipment-status Cache\n• Rate Limit Buckets (Bucket4j)\n• OTP & Station Cache")]
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
    end

    UI & Scanner -->|"HTTP Port 80"| Nginx
    Nginx -->|"Upstream /api/"| GW1 & GW2
    Nginx -->|"Upstream /"| UI
    GW1 & GW2 --> Eureka1 & Eureka2
    GW1 & GW2 --> AuthSvc & CustSvc & ShipSvc & RouteSvc & TrackSvc & NotiSvc & AuditSvc

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
    KafkaCluster --> RouteSvc & TrackSvc & ShipSvc & NotiSvc & AuditSvc
    KafkaCluster -.-> KafkaUI

    AuthSvc --> DB_Auth
    CustSvc --> DB_Cust
    ShipSvc --> DB_Ship
    RouteSvc --> DB_Route
    NotiSvc --> DB_Noti
    AuditSvc --> DB_Audit
```

---

## 4. Cẩm Nang Kỹ Thuật Chuyên Sâu & Boilerplate (Documentation Deep-Dive)

Toàn bộ chi tiết triển khai kiến trúc, cú pháp cấu hình mẫu, mã nguồn boilerplate Java và checklist câu hỏi phỏng vấn được lưu trữ trong thư mục [`docs/`](docs/):

| STT | Tài Liệu Chuyên Sâu | Nội Dung Trọng Tâm & Boilerplate Code |
| :---: | :--- | :--- |
| **01** | [**Kiến Trúc HA & Nginx Load Balancing**](docs/01-high-availability-and-nginx.md) | Cấu hình Nginx Edge Reverse Proxy Upstream Failover, thiết lập cụm Eureka Server Peer-to-Peer Replication (`peer1`/`peer2`) và template `docker-compose` mẫu. |
| **02** | [**Database Read-Write Splitting & Boilerplate**](docs/02-database-read-write-splitting-boilerplate.md) | Kỹ thuật tách luồng Đọc/Ghi qua Spring `AbstractRoutingDataSource`, xử lý `ThreadLocal`, cấu hình Hikari Pool, đồng bộ ngầm qua Kafka và **Bộ Template Generic độc lập** để copy vào dự án công ty. |
| **03** | [**Kafka KRaft Cluster & Event Streaming HA**](docs/03-kafka-kraft-cluster-and-event-streaming.md) | Sơ đồ luồng Kafka toàn trình, KRaft Quorum, Producer bất đồng bộ (`whenComplete`), Consumer Error Handling & Dead Letter Topic (`.DLT`), Idempotent Producer. |
| **04** | [**Nghiệp Vụ Logistics & Station Context RBAC**](docs/04-logistics-domain-and-rbac-station-context.md) | Logic Chuyến xe trục (Trips), thanh tải trọng (Load Bar), niêm phong Seal, dỡ hàng tại cổng Hub, tự động chuyển hoàn lần thứ 3 và bảo mật ngữ cảnh trạm làm việc. |
| **05** | [**Redis Caching, Rate Limiter & Distributed Lock**](docs/05-redis-caching-and-distributed-patterns.md) | Sơ đồ luồng Cache-Aside (< 2ms), Token Bucket chống DDoS (Bucket4j), Distributed Lock (`SETNX`) chống race condition và Generic `RedisCacheService` độc lập. |
| **06** | [**Bảo Mật Microservices: Stateless JWT & RBAC**](docs/06-microservices-security-jwt-and-rbac.md) | Sơ đồ luồng Gateway Auth, Blacklist tức thời qua Redis (< 0.5ms), chống Header Spoofing (`HeaderMapRequestWrapper`), Spring Security 6.x và `UserContextHolder` boilerplate. |

---

## 5. Hướng Dẫn Khởi Chạy Nhanh (Quickstart - 5 Phút)

### Bước 1: Khởi động Hạ tầng Docker HA
```bash
docker compose up -d
```
* **Kafka UI:** [http://localhost:8090](http://localhost:8090) (Kiểm tra 3 Brokers online).
* **Nginx Load Balancer:** [http://localhost:80](http://localhost:80).
* **Redis:** Port `6379`.
* **SQL Server Replica:** Port `2433` (`sa` / `Replica@123456`).

### Bước 2: Chuẩn bị CSDL Primary (SQL Server Port 1433)
1. Tạo 7 database: `auth_db`, `customer_db`, `shipment_db`, `routing_db`, `tracking_db`, `notification_db`, `audit_db`.
2. Chạy 2 script seed dữ liệu nền trong thư mục `database/`:
   * [`database/HubSeed.sql`](database/HubSeed.sql) (Nạp 5 Siêu Hub vào `routing_db`).
   * [`database/seed_rbac_data.sql`](database/seed_rbac_data.sql) (Nạp vai trò, quyền hạn vào `auth_db`).

### Bước 3: Biên dịch Backend
```bash
mvn clean install -DskipTests
```

### Bước 4: Khởi chạy các Microservices
```bash
# 1. Khởi động Eureka Registry (2 nodes HA)
cd service-registry && ./mvnw spring-boot:run -Dspring-boot.run.profiles=peer1
# (Mở terminal khác) cd service-registry && ./mvnw spring-boot:run -Dspring-boot.run.profiles=peer2

# 2. Khởi động API Gateway (2 instances HA)
cd api-gateway && ./mvnw spring-boot:run
# (Mở terminal khác) cd api-gateway && ./mvnw spring-boot:run -Dspring-boot.run.arguments=--server.port=8088

# 3. Khởi động các Core Services
cd auth-service && ./mvnw spring-boot:run
cd customer-service && ./mvnw spring-boot:run
cd shipment-service && ./mvnw spring-boot:run
cd routing-service && ./mvnw spring-boot:run
cd tracking-service && ./mvnw spring-boot:run
cd notification-service && ./mvnw spring-boot:run
cd audit-service && ./mvnw spring-boot:run
```

### Bước 5: Khởi chạy Frontend Portal
```bash
node server.js
```
* Truy cập qua Nginx Load Balancer: **[http://localhost](http://localhost)**
* Cổng Đăng Nhập: **[http://localhost/login.html](http://localhost/login.html)**

---

## 6. Tài Khoản Kiểm Thử Mẫu (Demo Accounts)

Mật khẩu mặc định cho toàn bộ tài khoản: `123456`

| Vai Trò | Email Đăng Nhập | Nghiệp Vụ & Quyền Hạn Trọng Tâm |
| :--- | :--- | :--- |
| **Quản Trị Viên (Admin)** | `vankhanhak54@gmail.com` | Quản trị RBAC, Audit Trail, gán vị trí trạm làm việc. |
| **Giao Dịch Viên (CS)** | `cs_quyet@vnpt.vn` | Tiếp nhận đơn tại quầy bưu cục, tạo hộ khách hàng. |
| **Thủ Kho Hub (Hub Operator)** | `hub_hn_staff@vnpt.vn` | Dỡ hàng tại cổng (Unload Gate), đóng chuyến xe liên tỉnh. |
| **Bưu Tá (Shipper)** | `shipper_nam@vnpt.vn` | Xuất phát giao hàng, báo phát thất bại, tự động chuyển hoàn. |
| **Khách Hàng Shop (Customer)** | `shop_hoangmai@gmail.com` | Tạo đơn số lượng lớn, theo dõi đối soát tiền COD. |

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
│   └── 06-microservices-security-jwt-and-rbac.md
│
├── nginx/                     # Cấu hình Nginx Edge Load Balancer (nginx.conf)
├── api-gateway/               # Spring Cloud Gateway HA (Port 8080 & 8088)
├── service-registry/          # Netflix Eureka Server Peer-to-Peer (Port 8761 & 8762)
├── auth-service/              # Xác thực, RBAC & Station Context (Port 8087, auth_db)
├── customer-service/          # Quản lý hồ sơ đối tác B2B (Port 8081, customer_db)
├── shipment-service/          # Quản lý bưu gửi, tính cước độc lập (Port 8082, shipment_db)
├── routing-service/           # Quản lý Chuyến xe (Trips), Inventory Hub/Bưu cục (Port 8083, routing_db)
├── tracking-service/          # Máy trạng thái, CSDL Read-Write Splitting (Port 8084 & 8094)
├── notification-service/      # Lắng nghe Kafka gửi Email HTML (Port 8085, notification_db)
├── audit-service/             # Nhật ký kiểm toán toàn mạng (Port 8086, audit_db)
├── database/                  # Script khởi tạo 5 Siêu Hub và ma trận RBAC
└── frontend/                  # Giao diện Web SPA (Vue 3 + Tailwind CSS + Leaflet Maps)
```

---

## 8. Tuyên Bố Miễn Trừ Trách Nhiệm (Disclaimer)
Dự án được xây dựng và phát triển với mục đích học tập, nghiên cứu và mô phỏng kiến trúc hệ thống Microservices (Simulation / Pet Project). Mọi thông tin thương hiệu, tên gọi bưu cục và dữ liệu vận đơn trong dự án đều mang tính chất minh họa kỹ thuật và phi thương mại.
