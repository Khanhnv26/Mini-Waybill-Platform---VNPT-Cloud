# CẨM NANG KỸ SƯ: QUY TRÌNH DÙNG AI & LÀM CHỦ SOURCE CODE
> **Dành cho Lập trình viên Backend / Kỹ sư phần mềm**  
> *Nguyên tắc cốt lõi: Bạn là Kiến trúc sư trưởng (Captain). AI là trợ lý lập trình và gia sư cá nhân.*

---

## 1. TRIẾT LÝ & ĐIỀU RĂN TỐI THƯỢNG

> **"Không bao giờ đưa bất kỳ dòng code nào vào dự án nếu bản thân bạn không thể đứng lên bảng giải thích cơ chế hoạt động của nó trong vòng 60 giây."**

Khi làm việc với AI, ranh giới giữa **"Kỹ sư siêu tốc"** và **"Thợ gõ phụ thuộc"** nằm ở việc:
- **Người phụ thuộc:** Bấm nút nhờ AI code hộ $\rightarrow$ Copy/Paste $\rightarrow$ Thấy chạy được là xong $\rightarrow$ Khi bị hỏi "Tại sao?" thì hoàn toàn ấm ớ.
- **Kỹ sư làm chủ:** Dùng AI để khảo sát phương án $\rightarrow$ Tự ra quyết định kiến trúc $\rightarrow$ Yêu cầu AI giải thích cơ chế ngầm (Under-the-hood) $\rightarrow$ Thẩm vấn ngược chính mình trước khi bàn giao.

---

## 2. QUY TẮC 3 KHÔNG & 3 PHẢI

### 3 KHÔNG (Chấm dứt thói quen cũ)
1. **KHÔNG** bao giờ copy-paste code khi chưa đọc hiểu 100% từng dòng, từng annotation (`@Transactional`, `@RequestParam`, `@FeignClient`...).
2. **KHÔNG** yêu cầu AI: *"Viết hộ tôi toàn bộ tính năng này từ A đến Z"* (tạo ra mã nguồn hộp đen không kiểm soát).
3. **KHÔNG** vứt mỗi dòng log lỗi cho AI rồi bảo *"Sửa hộ tôi"* mà không bắt AI giải thích nguyên nhân gốc rễ (Root cause).

### 3 PHẢI (Kỷ luật của kỹ sư chuyên nghiệp)
1. **PHẢI** yêu cầu AI phân tích cơ chế bên dưới của Framework và Database trước khi viết mã.
2. **PHẢI** tự tóm tắt lại bản chất kỹ thuật bằng lời văn của chính mình vào sổ tay/file ghi chú.
3. **PHẢI** ép AI đặt câu hỏi "phỏng vấn/chất vấn" ngược lại mình sau khi hoàn thành mỗi tính năng.

---

## 3. QUY TRÌNH 4 BƯỚC KIỂM SOÁT SOURCE CODE (4-STEP WORKFLOW)

```
  [Bước 1: Khảo Sát Kiến Trúc] 
            │
            ▼
  [Bước 2: Triển Khai Phân Tầng] 
            │
            ▼
  [Bước 3: Mổ Xẻ Gốc Rễ Khi Gặp Lỗi] 
            │
            ▼
  [Bước 4: Thẩm Vấn Ngược (Reverse Grill)]
```

### Bước 1: Khảo sát kiến trúc & Đánh đổi (Architecture & Trade-offs)
Trước khi viết bất kỳ dòng code nào, hãy thảo luận với AI về các phương án:
- *"Tôi muốn giải quyết bài toán X. Có những cách tiếp cận nào?"*
- *"Ưu và nhược điểm của Phương án A so với Phương án B là gì?"*
- Bạn là người đưa ra quyết định cuối cùng dựa trên bối cảnh hệ thống.

### Bước 2: Triển khai có kiểm soát (Layered Implementation)
Triển khai lần lượt theo từng tầng, kiểm soát chặt chẽ từng bước:
1. **Database Layer:** Thiết kế bảng, khóa chính, Foreign Key, Index (ví dụ: Filtered Index cho cột NULL).
2. **Domain/Entity Layer:** JPA Entity, nới lỏng hoặc thắt chặt ràng buộc dữ liệu.
3. **Repository Layer:** Các câu lệnh truy vấn JPA hoặc Query tùy biến.
4. **Service Layer:** Nghiệp vụ, kiểm tra quyền sở hữu (chống IDOR), Redis Cache, Idempotency.
5. **Controller Layer:** Kiểm tra Validation, HTTP Status Codes, Request/Response DTO.

### Bước 3: Phân tích nguyên nhân gốc rễ khi gặp Bug (Root Cause Analysis)
Khi xảy ra lỗi (như `400 Bad Request`, `500 Internal Server Error`, `Data truncation`):
1. **Hỏi AI:** *"Lỗi này xuất phát từ tầng nào (Gateway, Filter, Controller, Service hay DB)?"*
2. **Hỏi AI:** *"Tại sao Spring Boot lại ném ra ngoại lệ này? Cơ chế ngầm bên dưới dòng code lỗi là gì?"*
3. **Sau đó mới xem code sửa:** So sánh sự khác biệt và hiểu rõ vì sao đoạn sửa lại giải quyết được vấn đề.

### Bước 4: Thẩm vấn ngược (The Reverse Grill)
Sau khi tính năng đã chạy thành công, chạy prompt:
> *"Hãy đóng vai một Tech Lead khó tính, hãy hỏi tôi 3 câu hỏi phỏng vấn kỹ thuật hóc búa nhất về đoạn code tôi vừa viết."*  
Tự gõ câu trả lời của bạn, sau đó nhờ AI nhận xét xem câu trả lời đã chuẩn xác chưa.

---

## 4. CHECKLIST TỰ KIỂM TRA CODE TRƯỚC KHI COMMIT (SELF-REVIEW GATES)

Trước khi coi một task là hoàn thành, hãy tự rà soát qua 4 cánh cổng kiểm soát:

### Cổng 1: Bảo mật (Security Gate)
- [ ] **SQL Injection:** Có dòng nào nối chuỗi SQL thô (`"WHERE name = '" + name + "'"` ) không? Đã dùng Parameterized Query / Spring Data JPA 100% chưa?
- [ ] **IDOR / BOLA (Kiểm tra sở hữu):** Khách hàng A có thể đổi ID trên URL để xem/sửa đơn của khách hàng B không? Backend đã kiểm tra `userId/customerId` từ JWT chưa?
- [ ] **Phân quyền RBAC:** Endpoint đã được bảo vệ bằng `@PreAuthorize` hoặc Gateway Filter chưa?
- [ ] **Thông tin nhạy cảm:** Mật khẩu đã được mã hóa BCrypt chưa? Token có bị in lộ ra log không?

### Cổng 2: Cơ sở dữ liệu & Hiệu năng (Database & Performance)
- [ ] **Index:** Các cột thường xuyên `WHERE`, `JOIN`, `ORDER BY` đã được đánh Index chưa?
- [ ] **Vấn đề NULL (SQL Server):** Các cột Unique cho phép NULL đã được tạo `Filtered Unique Index` chưa?
- [ ] **N+1 Problem:** Trong vòng lặp `for` có gọi query DB liên tục không?
- [ ] **Transaction:** Các thao tác ghi đồng thời nhiều bảng có `@Transactional` để đảm bảo tính toàn vẹn (ACID) không?

### Cổng 3: Bộ nhớ đệm & Bất đồng bộ (Cache & Message Queue)
- [ ] **Redis TTL:** Key ghi vào Redis đã đặt thời gian hết hạn (TTL) chưa, hay để vĩnh viễn gây tràn RAM?
- [ ] **Idempotency (Chống trùng lặp):** API tạo đơn/thanh toán có cơ chế chống người dùng bấm đúp liên tục (Duplicate Request) chưa?
- [ ] **Kafka Semantics:** Producer gửi event có kèm Key để đảm bảo đúng thứ tự phân vùng (Partition) không?

### Cổng 4: Chuẩn mực API & Xử lý lỗi (API Standards & Error Handling)
- [ ] **Mã trạng thái HTTP:** Trả về đúng ngữ nghĩa không? (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`).
- [ ] **Global Exception:** Lỗi trả về có dạng JSON chuẩn và thông báo thân thiện không, hay văng nguyên StackTrace ra ngoài?

---

## 5. THƯ VIỆN PROMPT CHUẨN ĐỂ KIỂM SOÁT AI

Hãy lưu các mẫu prompt này vào một công cụ ghi chú để tái sử dụng mỗi ngày:

#### Prompt 1: Khảo sát kiến trúc tính năng mới
```text
Tôi đang phát triển hệ thống Backend bằng Spring Boot và Microservices.
Tôi cần thực hiện tính năng: [MÔ TẢ TÍNH NĂNG].
Yêu cầu:
1. Đừng vội đưa code hoàn chỉnh. Hãy phân tích cho tôi 2-3 hướng tiếp cận khả thi.
2. Phân tích ưu và nhược điểm của từng hướng (về độ phức tạp, khả năng mở rộng, bảo mật).
3. Đề xuất kiến trúc luồng dữ liệu (Data flow) từ Frontend -> Gateway -> Service -> Database.
```

#### Prompt 2: Mổ xẻ bản chất khái niệm kỹ thuật (Học sâu)
```text
Giải thích cho tôi khái niệm kỹ thuật: [TÊN KHÁI NIỆM, vd: SQL Injection / Filtered Index / @Transactional].
Hãy trình bày theo cấu trúc:
1. Ẩn dụ đời thực trực quan, dễ nhớ nhất.
2. Bản chất trong code thực tế: Viết 1 ví dụ code sai/lỗ hổng và 1 ví dụ code chuẩn.
3. Hậu quả thực tế đối với hệ thống doanh nghiệp nếu làm sai.
4. Cơ chế hoạt động ngầm bên dưới của Java/Spring/Database.
5. Nếu người phỏng vấn hỏi câu này, câu trả lời 30 giây ấn tượng nhất là gì?
```

#### Prompt 3: Phân tích nguyên nhân lỗi (Không cho AI sửa vội)
```text
Đoạn code của tôi gặp lỗi sau:
[DÁN LOG LỖI VÀ ĐOẠN CODE LIÊN QUAN]
Yêu cầu:
1. Giải thích nguyên nhân gốc rễ (Root Cause) bằng tiếng Việt rõ ràng.
2. Lỗi này phát sinh ở tầng nào và tại sao Framework/DB lại chặn/ném ra lỗi này?
3. Đưa ra giải pháp sửa đổi chuẩn kèm theo giải thích từng dòng code được sửa.
```

#### Prompt 4: Đóng vai Senior phỏng vấn (Luyện phản xạ)
```text
Tôi vừa hoàn thành đoạn code / tính năng sau:
[DÁN ĐOẠN CODE HOẶC MÔ TẢ NGHIỆP VỤ]
Hãy đóng vai một Tech Lead / Senior Backend Engineer cực kỳ khó tính và giàu kinh nghiệm:
1. Đặt cho tôi 3 câu hỏi phỏng vấn hóc búa nhất về kiến trúc, hiệu năng và bảo mật của đoạn code này.
2. Đừng đưa đáp án vội, hãy chờ tôi trả lời từng câu rồi nhận xét và chấm điểm cho tôi.
```

---

## 6. LỘ TRÌNH 30 NGÀY BỔ SUNG KIẾN THỨC NỀN TẢNG (1 KHÁI NIỆM / NGÀY)

| Tuần | Trọng tâm | Danh mục 5 bài học cốt lõi cần làm chủ |
| :--- | :--- | :--- |
| **Tuần 1** | **Bảo Mật Web & Xác Thực** | • **Ngày 1:** SQL Injection & Parameterized Query<br>• **Ngày 2:** IDOR / BOLA & Kiểm tra quyền sở hữu dữ liệu<br>• **Ngày 3:** JWT: Cấu trúc Header, Payload, Chữ ký số HMAC<br>• **Ngày 4:** RBAC (Role-Based Access Control) vs ABAC<br>• **Ngày 5:** CORS, XSS và CSRF: Phân biệt bản chất và cách phòng vệ |
| **Tuần 2** | **Cơ Sở Dữ Liệu & ORM** | • **Ngày 6:** Index là gì? Cây B-Tree và khi nào KHÔNG nên đánh index?<br>• **Ngày 7:** Filtered Index & Xử lý giá trị NULL trong SQL Server<br>• **Ngày 8:** Transaction & Thuộc tính ACID trong Spring (`@Transactional`)<br>• **Ngày 9:** Hibernate N+1 Problem và giải pháp `JOIN FETCH`<br>• **Ngày 10:** Optimistic Locking (`@Version`) vs Pessimistic Locking |
| **Tuần 3** | **Spring Boot & Java Core** | • **Ngày 11:** Spring IoC Container & Dependency Injection hoạt động ra sao?<br>• **Ngày 12:** Vòng đời Request: Filter $\rightarrow$ Interceptor $\rightarrow$ Controller $\rightarrow$ Service<br>• **Ngày 13:** Tập trung xử lý lỗi với `@RestControllerAdvice`<br>• **Ngày 14:** Java Collection: Bản chất bên trong của `HashMap` và `ArrayList`<br>• **Ngày 15:** Checked Exception vs Unchecked Exception |
| **Tuần 4** | **Kiến Trúc Microservices** | • **Ngày 16:** API Gateway: Đóng vai trò gì trong định tuyến, bảo mật, rate limit?<br>• **Ngày 17:** Service Registry & Discovery (Eureka) hoạt động thế nào?<br>• **Ngày 18:** OpenFeign Client: Cơ chế gọi REST đồng bộ giữa các service<br>• **Ngày 19:** Redis Caching: Cache-Aside pattern, xử lý Cache Penetration & Stampede<br>• **Ngày 20:** Kafka Message Broker: Phân biệt Pub/Sub vs REST, cơ chế Event-Driven |

---

## 7. NHẬT KÝ HỌC TẬP HÀNG NGÀY (DAILY DEV LOG)

Mỗi ngày, hãy dành 5 phút ghi chép ngắn gọn vào mẫu dưới đây:

### Bài Học 1: SQL Injection (SQLi) & Cách Phòng Chống
- **Bản chất:** Kẻ tấn công lợi dụng việc nối chuỗi dữ liệu người dùng nhập vào câu lệnh SQL để chèn các ký tự độc hại (`'`, `--`, `OR 1=1`) nhằm bẻ lái logic truy vấn, đăng nhập không cần mật khẩu hoặc đánh cắp toàn bộ DB.
- **Cách phòng chống chuẩn:** Luôn sử dụng **PreparedStatement / Parameterized Query** hoặc các ORM chuẩn như Spring Data JPA để tách biệt hoàn toàn giữa Câu lệnh (Code) và Dữ liệu (Data).
- **Câu trả lời phỏng vấn 30s:** *"SQLi xảy ra khi nối chuỗi dữ liệu thô vào câu truy vấn. Hacker dùng ký tự đặc biệt để can thiệp câu lệnh. Giải pháp chuẩn là dùng Parameterized Query để ép DB coi mọi input là dữ liệu đơn thuần, không bao giờ thực thi nó."*

### Bài Học 2: `@RequestParam(required = true)` mặc định trong Spring MVC
- **Bản chất:** Trong Spring MVC, `@RequestParam` mặc định có thuộc tính `required = true`. Nếu request gửi lên không có tham số đó, Spring sẽ chặn ngay từ DispatcherServlet và ném ra `MissingServletRequestParameterException` dẫn đến lỗi `400 Bad Request`.
- **Cách phòng chống chuẩn:** Nếu tham số là tùy chọn (optional) hoặc có thể suy luận từ Token JWT (như `customerId`), bắt buộc phải khai báo rõ `@RequestParam(..., required = false)`.
