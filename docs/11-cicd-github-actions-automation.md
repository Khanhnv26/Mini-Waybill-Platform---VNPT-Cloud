# CẨM NANG 11: CI/CD TỰ ĐỘNG HÓA VỚI GITHUB ACTIONS TRONG KIẾN TRÚC MICROSERVICES MONOREPO

---

## 1. Lý Thuyết Nền Tảng: CI/CD & DevOps Là Gì?

### 1.1. Nỗi Đau Quá Khứ Trước Khi Có CI/CD ("Địa Ngục Tích Hợp - Merge Hell")
Trước khi văn hóa DevOps và CI/CD ra đời, các đội ngũ phát triển phần mềm làm việc theo chu kỳ dài (Waterfall hoặc phát triển phân tán):
* Mỗi lập trình viên ôm một nhánh code (branch) riêng trên máy tính cá nhân trong nhiều tuần hoặc nhiều tháng.
* Đến sát ngày bàn giao sản phẩm (**Release Date**), cả đội mới bắt đầu gộp chung code vào một nhánh chính.
* **Hậu quả thảm khốc ("Merge Hell"):** Hàng trăm xung đột code (Git conflicts), logic của người này ghi đè lên tính năng của người kia, mã nguồn không biên dịch được, thư viện bị lệch phiên bản. Đội ngũ kỹ sư phải thức trắng đêm để sửa lỗi thủ công.

> 💡 **Triết lý cốt lõi của CI/CD:** *"If it hurts, do it more often"* (Nếu việc gì gây đau đớn, hãy làm nó thường xuyên hơn). Thay vì gom cục nợ tích hợp vào cuối tháng, lập trình viên chia nhỏ tính năng và tích hợp code **nhiều lần mỗi ngày**.

---

### 1.2. CI (Continuous Integration - Tích Hợp Liên Tục)
**Continuous Integration (CI)** là phương pháp thực hành phát triển phần mềm trong đó các thành viên trong nhóm tích hợp mã nguồn của họ vào một kho lưu trữ chung (Git) với tần suất cao (thường là nhiều lần trong ngày). 

Mỗi lần push code, hệ thống tự động hóa sẽ kích hoạt quy trình xác thực độc lập gồm 3 chốt chặn:
1. **Kiểm tra biên dịch (Compilation / Syntax Check):** Đảm bảo mã nguồn gõ đúng cú pháp và có thể biên dịch thành công.
2. **Kiểm thử tự động (Automated Testing - Quality Gate):** Tự động kích hoạt hàng loạt bài kiểm thử đơn vị (Unit Tests) và kiểm thử tích hợp (Integration Tests). Nếu chỉ cần 1 bài test bị fail, toàn bộ quá trình dừng lại ngay lập tức.
3. **Đóng gói sản phẩm (Packaging / Artifact Creation):** Đóng gói mã nguồn thành file thực thi (file `.jar` với Java Spring Boot) hoặc đóng gói thành **Docker Image**.

* **Mục tiêu tối thượng của CI:** Phát hiện lỗi sớm nhất có thể (**Fail Fast**). Lập trình viên biết code của mình có lỗi chỉ sau **2–3 phút** kể từ lúc gõ `git push`, thay vì phát hiện ra bug sau vài tuần khi sản phẩm đã chuyển giao cho khách hàng.

---

### 1.3. CD: Phân Biệt Giữa Continuous Delivery và Continuous Deployment
Rất nhiều kỹ sư nhầm lẫn giữa hai khái niệm này. Điểm khác biệt mấu chốt nằm ở **"Nút bấm phê duyệt thủ công (Manual Approval Gate)"**:

```
[ Code ] ──> [ Build & Test (CI) ] ──> [ Đóng gói Artifact / Docker Hub ]
                                                        │
                   ┌────────────────────────────────────┴────────────────────────────────────┐
                   ▼                                                                         ▼
     [ CONTINUOUS DELIVERY ]                                                   [ CONTINUOUS DEPLOYMENT ]
   (Chuyển giao liên tục - Bán tự động)                                      (Triển khai liên tục - Tự động 100%)
                   │                                                                         │
    Có chốt chặn DUYỆT THỦ CÔNG (Manual Gate)                                Không có con người can thiệp!
   Tech Lead / QA kiểm tra -> Bấm nút "Deploy"                               Code vượt qua hết bài test là tự động
                   │                                                         chạy thẳng lên Production phục vụ khách hàng!
                   ▼                                                                         ▼
     [ Triển khai lên Production ]                                             [ Triển khai lên Production ]
```

| Tiêu chí | Continuous Integration (CI) | Continuous Delivery (CD - Chuyển giao) | Continuous Deployment (CD - Triển khai) |
| :--- | :--- | :--- | :--- |
| **Đầu ra (Artifact)** | File `.jar`, Docker Image được test kỹ. | Docker Image được đẩy lên Registry (Docker Hub), sẵn sàng chạy. | Phiên bản mới đã chạy thực tế trên máy chủ Production. |
| **Can thiệp con người?**| Hoàn toàn tự động. | **Có** (Cần 1 cú click chuột phê duyệt của Lead/Release Manager). | **Không** (Tự động hóa 100% từ Git push đến Production). |
| **Mức độ rủi ro** | Rất thấp. | Thấp (Có con người kiểm soát thời điểm phát hành). | Đòi hỏi hệ thống Unit Test, Integration Test và Monitoring cực kỳ khắt khe. |

---

### 1.4. Pipeline Là Gì? Phân Cấp Các Thành Phần Trong GitHub Actions
**Pipeline** (Đường ống) là một chuỗi các công đoạn tự động hóa được thiết lập để đưa một dòng code từ môi trường phát triển (Dev) đến tay người dùng cuối (Production).

Trong GitHub Actions, một Pipeline được phân cấp theo cấu trúc hình cây như sau:

```
Workflow (.github/workflows/*.yml)
 ├── Trigger Event (on: push, pull_request, workflow_dispatch)
 └── Jobs (detect-changes, build-and-push, notify-telegram)
      ├── Runner (runs-on: ubuntu-latest - Máy ảo riêng biệt)
      └── Steps (Các bước tuần tự trong 1 máy ảo)
           ├── uses: actions/checkout@v4 (Action tái sử dụng)
           └── run: mvn clean package (Lệnh shell thực thi)
```

1. **Workflow (Luồng công việc):** Định nghĩa toàn bộ quy trình tự động hóa trong 1 file YAML.
2. **Event (Sự kiện kích hoạt):** Hành động làm kích hoạt workflow (ví dụ `git push`, mở Pull Request, hoặc hẹn giờ cron).
3. **Job (Công việc):** Một tập hợp các bước thực thi chạy trên **cùng một máy ảo (Runner)**. Mặc định các Job độc lập sẽ chạy **song song (Parallel)**, trừ khi bạn chỉ định phụ thuộc bằng `needs: [job_truoc]`.
4. **Step (Bước):** Một tác vụ đơn lẻ bên trong Job, thực thi tuần tự từ trên xuống dưới (chạy lệnh shell hoặc dùng Action bên thứ ba).
5. **Action (Hành động tái sử dụng):** Một khối lệnh được cộng đồng đóng gói sẵn (ví dụ `actions/checkout@v4`, `docker/build-push-action@v5`).

---

### 1.5. Bốn Nguyên Lý Vàng Của CI/CD Doanh Nghiệp Hiện Đại
1. **Single Source of Truth (Git là nguồn chân lý duy nhất):** Mọi cấu hình hạ tầng, mã nguồn, script triển khai đều phải nằm trong Git (mô hình GitOps). Không ai được SSH trực tiếp vào server để sửa code hay chỉnh cấu hình thủ công.
2. **Build Once, Deploy Anywhere (Đóng gói một lần, triển khai muôn nơi):** 
   * Một Docker Image chỉ được đóng gói **duy nhất 1 lần** kèm mã Git Commit SHA tại khâu CI.
   * Mang chính xác Image đó đi kiểm thử ở môi trường Dev -> Staging -> Production. Tuyệt đối không build lại image cho từng môi trường vì có thể sinh ra sự sai lệch phiên bản phụ thuộc.
3. **Cấu hình độc lập với mã nguồn (Environment Agnostic):** Các thông số bí mật (Database password, API key, Port) được nạp động thông qua **Biến môi trường (Environment Variables)** thay vì hardcode trong code.
4. **Phản hồi tức thì (Fast Feedback Loop):** Pipeline phải đủ nhanh (dưới 5–10 phút). Nếu pipeline mất 1 tiếng mới chạy xong, lập trình viên sẽ chuyển sang làm việc khác và mất tập trung khi nhận được thông báo lỗi.

---

## 2. Bối Cảnh Thực Tế & Thách Thức Của Microservices Monorepo

Trong các dự án phần mềm doanh nghiệp sử dụng kiến trúc **Microservices Monorepo** (gom toàn bộ 11 microservices, thư viện dùng chung `shared-events`, và Frontend vào chung một Git repository), việc xây dựng hệ thống **CI/CD** đối mặt với 4 thách thức cốt tử:

1. **Lãng phí tài nguyên & nghẽn Pipeline:** Nếu mỗi lần lập trình viên chỉ sửa 1 dòng code trong `customer-service` mà pipeline bắt đầu kéo cả 11 service ra build lại từ đầu, mỗi lần push sẽ mất **15–25 phút**, làm cạn kiệt giới hạn phút chạy miễn phí của GitHub Actions.
2. **Sự phụ thuộc thư viện dùng chung (`shared-events`):** Khi DTO hoặc Event Kafka trong `shared-events` thay đổi, hệ thống CI phải đủ thông minh để tự động nhận biết những microservices nào đang phụ thuộc vào nó để build lại đồng bộ.
3. **Chống sập dây chuyền (`fail-fast: false`):** Trong kiến trúc vi dịch vụ, các service có tính độc lập cao. Nếu một service bị lỗi compile hoặc lỗi test, các service khác trong cùng commit vẫn phải được build và đẩy lên Registry bình thường.
4. **Tính bất biến & khả năng Rollback (Immutable Tagging):** Không bao giờ chỉ dùng tag `:latest` trên môi trường Production. Mọi bản build phải được gắn kèm mã định danh commit **Git SHA (`:${{ github.sha }}`)** để phục vụ việc rollback tức thì khi xảy ra sự cố.

---

## 3. Kiến Trúc Pipeline 3 Giai Đoạn (3-Stage Workflow Architecture)

Pipeline được chuẩn hóa trong file `.github/workflows/docker_workflow.yml`, bao gồm 3 Jobs hoạt động theo cơ chế **Tuần tự có điều kiện (Sequential Gating)** kết hợp **Song song hóa ma trận (Dynamic Matrix Parallelism)**:

```mermaid
flowchart TD
    subgraph Trigger ["1. Trigger Stage"]
        Push["Developer Push Code (branches: main, business)"]
    end

    subgraph Job1 ["2. Job 1: detect-changes (Change Detection)"]
        Checkout1["Checkout code (fetch-depth: 0)"]
        Filter["dorny/paths-filter@v3 (base: ref_name)"]
        OutputJSON["Xuất mảng JSON: ['auth-service', 'customer-service', ...]"]
        Checkout1 --> Filter --> OutputJSON
    end

    subgraph Job2 ["3. Job 2: build-and-push (Dynamic Parallel Matrix)"]
        Decision{"service-changed != '[]'?"}
        Matrix["Khởi tạo máy ảo song song (fail-fast: false)"]
        
        Runner1["Runner A: auth-service"]
        Runner2["Runner B: customer-service"]
        RunnerN["Runner N: ...-service"]

        MvnPkg["mvn clean package -pl <service> -am -DskipTests"]
        Buildx["docker/build-push-action@v5 (cache: gha)"]
        PushHub["Docker Hub: :latest & :sha"]

        Decision -->|Có thay đổi| Matrix
        Decision -->|Không đổi (Skipped)| SkipJob["Bỏ qua Job 2 (0s wasted)"]
        Matrix --> Runner1 & Runner2 & RunnerN
        Runner1 & Runner2 & RunnerN --> MvnPkg --> Buildx --> PushHub
    end

    subgraph Job3 ["4. Job 3: notify-telegram (Realtime Alerting)"]
        Always{"if: always()"}
        Bot["appleboy/telegram-action@master"]
        Phone["Bắn tin nhắn thông báo về Telegram Dev"]

        Always --> Bot --> Phone
    end

    Trigger --> Job1
    OutputJSON --> Decision
    Job1 & Job2 -.-> Job3
```

---

## 4. Phân Tích Kỹ Thuật Chi Tiết Từng Job

### 4.1. Job 1: `detect-changes` — Bộ Lọc Đường Dẫn Thông Minh

Sử dụng action tiêu chuẩn công nghiệp `dorny/paths-filter@v3` để phân tích `git diff` giữa commit hiện tại và commit ngay trước đó trên cùng nhánh.

```yaml
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      service-changed: ${{ steps.filter.outputs.changes }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0 # BẮT BUỘC: Kéo toàn bộ lịch sử commit để Git so sánh diff chính xác

      - name: Detect Changed Services
        uses: dorny/paths-filter@v3
        id: filter
        with:
          base: ${{ github.ref_name }} # BẮT BUỘC: So sánh với commit trước trên cùng nhánh
          filters: |
            auth-service:
              - 'auth-service/**'
              - 'shared-events/**'
            customer-service:
              - 'customer-service/**'
              - 'shared-events/**'
            shipment-service:
              - 'shipment-service/**'
              - 'shared-events/**'
            routing-service:
              - 'routing-service/**'
              - 'shared-events/**'
            tracking-service:
              - 'tracking-service/**'
              - 'shared-events/**'
            notification-service:
              - 'notification-service/**'
              - 'shared-events/**'
            audit-service:
              - 'audit-service/**'
              - 'shared-events/**'
            shipper-service:
              - 'shipper-service/**'
              - 'shared-events/**'
            report-service:
              - 'report-service/**'
              - 'shared-events/**'
            service-registry:
              - 'service-registry/**'
            api-gateway:
              - 'api-gateway/**'
```

#### Điểm Chốt Cấu Hình Quan Trọng:
* **`fetch-depth: 0`:** Mặc định GitHub checkout chỉ kéo về 1 commit duy nhất (`fetch-depth: 1`). Nếu không bật `fetch-depth: 0`, Git sẽ không tìm thấy commit cha để so sánh diff, dẫn đến lỗi hoặc lấy sai trạng thái.
* **`base: ${{ github.ref_name }}`:** Mặc định nếu không chỉ định `base`, thư viện sẽ so sánh nhánh hiện tại với nhánh `main`. Khi dev trên nhánh `business`, việc cấu hình `base: ${{ github.ref_name }}` đảm bảo hệ thống chỉ so sánh **những thay đổi phát sinh trong lần push hiện tại**, tránh việc build lại những service đã sửa ở commit cũ.

---

### 4.2. Job 2: `build-and-push` — Ma Trận Song Song & Tối Ưu Hóa Cache

```yaml
  build-and-push:
    needs: detect-changes
    if: ${{ needs.detect-changes.outputs.service-changed != '[]' && needs.detect-changes.outputs.service-changed != '' }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false # Service này lỗi không làm gián đoạn service khác
      matrix:
        service: ${{ fromJson(needs.detect-changes.outputs.service-changed) }}
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
          cache: maven # Tự động cache ~/.m2 dependencies

      - name: Build JAR with Maven
        run: |
          mvn clean package -pl ${{ matrix.service }} -am -DskipTests

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and Push Docker Image
        uses: docker/build-push-action@v5
        with:
          context: ./${{ matrix.service }}
          file: ./${{ matrix.service }}/Dockerfile
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/${{ matrix.service }}:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

#### Giải Thích Ý Nghĩa Kỹ Thuật:
1. **Cờ Maven `-pl` và `-am`:**
   * `-pl ${{ matrix.service }}` (**Project List**): Chỉ định Maven chỉ biên dịch duy nhất module mục tiêu, bỏ qua các module khác trong Monorepo.
   * `-am` (**Also Make**): Yêu cầu Maven tự động phân tích đồ thị phụ thuộc (`pom.xml`) để biên dịch trước các module con phụ thuộc (như `shared-events`). Nếu thiếu `-am`, build sẽ tạch vì không tìm thấy package `org.app.sharedevents`.
2. **`fail-fast: false`:**
   * Mặc định của GitHub Actions là `fail-fast: true` (nếu 1 job trong ma trận chết, hủy toàn bộ các job còn lại). Bật `fail-fast: false` bảo đảm tính cô lập độc lập của microservices.
3. **Cơ chế Cache 2 Lớp:**
   * Lớp 1 (`cache: maven`): Lưu trữ kho thư viện `.m2` giữa các lần build, giảm thời gian tải dependencies từ Maven Central.
   * Lớp 2 (`cache-from: type=gha`, `cache-to: type=gha,mode=max`): Cache các Docker layer trung gian trên bộ nhớ đệm GitHub Actions, giúp bước `docker build` hoàn thành chỉ trong vài giây nếu code logic không thay đổi layer nền tảng.

---

### 4.3. Job 3: `notify-telegram` — Báo Cáo Tự Động Thời Gian Thực

Được kích hoạt để gửi báo cáo trực tiếp về thiết bị của lập trình viên thông qua Telegram Bot API.

```yaml
  notify-telegram:
    needs: [detect-changes, build-and-push]
    if: always() # BẮT BUỘC: Luôn luôn chạy kể cả khi build thành công, thất bại hay bị skipped
    runs-on: ubuntu-latest
    steps:
      - name: Send Telegram Notification
        uses: appleboy/telegram-action@master
        with:
          to: ${{ secrets.TELEGRAM_CHAT_ID }}
          token: ${{ secrets.TELEGRAM_BOT_TOKEN }}
          format: html
          message: |
            <b>[CI/CD PIPELINE ALERT]</b>

            <b>Du an:</b> Mini-Waybill Platform
            <b>Developer:</b> ${{ github.actor }}
            <b>Nhanh:</b> <code>${{ github.ref_name }}</code>
            <b>Commit:</b> <code>${{ github.sha }}</code>

            <b>Dich vu thay doi:</b>
            <code>${{ needs.detect-changes.outputs.service-changed || 'Khong co (Skipped)' }}</code>

            <b>Trang thai Build:</b> <b>${{ needs.build-and-push.result }}</b>

            <a href="https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}">Xem chi tiet tren GitHub</a>
```

---

## 5. Bảng Ma Trận Secrets Cần Cấu Hình Trên GitHub

Để pipeline vận hành chính xác, các biến bí mật sau bắt buộc phải được khai báo tại **Settings -> Secrets and variables -> Actions -> Repository secrets**:

| Tên Secret | Mục Đích | Nguồn Giá Trị |
| :--- | :--- | :--- |
| `DOCKERHUB_USERNAME` | Username đăng nhập Docker Hub | `khanhnv26` |
| `DOCKERHUB_TOKEN` | Personal Access Token (PAT) cấp quyền Read/Write trên Docker Hub | Sinh tại *Docker Hub -> Account Settings -> Security* |
| `TELEGRAM_BOT_TOKEN` | Token điều khiển Telegram Bot gửi tin nhắn cảnh báo | Lấy từ `@BotFather` (đã khai báo trong `.env`) |
| `TELEGRAM_CHAT_ID` | Mã định danh người dùng / nhóm nhận thông báo | Lấy từ bot `@userinfobot` trên Telegram |

---

## 6. Kinh Nghiệm Thực Tế & Cẩm Nang Xử Lý Sự Cố (Troubleshooting)

### Sự cố 1: Docker Login báo lỗi `Password required`
* **Nguyên nhân:** Tên biến trong file `.yml` bị lệch so với tên khai báo trong GitHub Secrets (ví dụ khai báo `DOCKERHUB_TOKEN` nhưng code lại gọi `${{ secrets.DOCKERHUB_PASSWORD }}`).
* **Xử lý:** Kiểm tra chính xác tên secret tại tab Settings của Repo và cập nhật lại file YAML.

### Sự cố 2: `mvn test` thất bại do `@SpringBootTest` đòi Database thật
* **Hiện tượng:** Bước chạy Unit Test tạch với lỗi `Connection refused` hoặc Flyway Migration error.
* **Bản chất:** `@SpringBootTest` là bài test tích hợp (Integration Test) nạp toàn bộ Spring Context, cố gắng kết nối tới `localhost:1433` (SQL Server), Redis, Kafka. Máy ảo GitHub Actions là máy trắng, chưa có các container này chạy ngầm.
* **Xử lý chuẩn doanh nghiệp:**
  * Giải pháp ngắn hạn: Thêm cờ `-DskipTests` hoặc tạm thời comment bước `mvn test` trên CI cho đến khi thiết lập môi trường test ảo.
  * Giải pháp dài hạn: Cấu hình Test Profile sử dụng **H2 In-Memory Database** hoặc sử dụng **Testcontainers** (Docker-in-Docker) để tự động bật container database tạm thời trong quá trình chạy test.

### Sự cố 3: Pipeline luôn build lại các service cũ mặc dù chỉ sửa 1 service
* **Bản chất:** `dorny/paths-filter` mặc định so sánh với nhánh `main`. Nhánh tính năng (`business`) chứa lịch sử của nhiều commit trước đó.
* **Xử lý:** Bổ sung `base: ${{ github.ref_name }}` và bật `fetch-depth: 0` tại bước `actions/checkout@v4`.

---

## 7. Lộ Trình Nâng Cấp Kế Tiếp: Chuyển Giao Sang Kubernetes (CD)

| Mức Độ | Trạng Thái Hiện Tại | Mục Tiêu Kế Tiếp |
| :--- | :--- | :--- |
| **CI (Tích hợp)** | **Hoàn thành Level 2 Enterprise** (Path filtering, parallel matrix, caching, alerts) | Tích hợp SonarQube phân tích chất lượng code & SAST scan bảo mật container |
| **CD (Triển khai)** | Mới dừng ở mức **Continuous Delivery** (Đẩy ảnh lên Docker Hub) | **Continuous Deployment**: Triển khai tự động vào cụm **Kubernetes (K8s)** thông qua Helm Charts hoặc mô hình **GitOps (ArgoCD)** |
