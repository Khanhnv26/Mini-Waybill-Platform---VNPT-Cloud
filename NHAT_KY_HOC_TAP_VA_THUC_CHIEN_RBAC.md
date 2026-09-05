# 📘 NHẬT KÝ HỌC TẬP & ĐÚC KẾT THỰC CHIẾN: RBAC, JWT & SPRING SECURITY 6

> **Dự án:** Mini Waybill Platform (Hệ thống Quản lý Vận đơn Phân tán)  
> **Người thực hiện:** Intern Backend  
> **Mentor:** Senior Tech Lead  
> **Ngày hoàn thành:** 05/09/2026  

---

## I. TỔNG QUAN THÀNH QUẢ HÔM NAY

Từ một người chưa học gì về Spring Security và chưa nắm rõ JWT, hôm nay bạn đã tự tay hoàn thành:
1. **Thiết kế cơ sở dữ liệu RBAC chuẩn 3 tầng** (Users $\leftrightarrow$ Roles $\leftrightarrow$ Permissions) trên SQL Server.
2. **Viết script SQL khởi tạo dữ liệu mẫu (`seed_rbac_data.sql`)**: 15 Permissions, 5 Roles, 37 mappings, 1 tài khoản Quản trị viên tối cao `admin@waybill.vn`.
3. **Nâng cấp `JwtServiceImpl` tại `auth-service`**: Dùng Stream API `flatMap` bóc tách toàn bộ quyền hạn chi tiết nạp vào Token JWT.
4. **Xây dựng tầng bảo mật Gateway tại `api-gateway`**:
   - Tích hợp **Spring Security 6** ở chế độ `Stateless`.
   - Viết `JwtAuthenticationFilter` để giải mã JWT và nạp `SecurityContextHolder`.
   - Viết `HeaderMapRequestWrapper` (Decorator Pattern) để cấy 4 HTTP Headers định danh (`X-User-Id`, `X-User-Email`, `X-User-Roles`, `X-User-Permissions`) đẩy xuống các microservice nghiệp vụ.
   - Biên dịch thành công 100% (`BUILD SUCCESS`).

---

## II. BẢN CHẤT KIẾN TRÚC & CÁC CÂU CHUYỆN HÌNH TƯỢNG DỄ NHỚ

### 1. Tại sao phải tách riêng `Role` và `Permission`?
- **Permission (Quyền hạn):** Là hành động kỹ thuật cụ thể gắn với API (VD: `shipment:create`, `tracking:update_delivery`).
- **Role (Vai trò):** Là một chiếc túi (Container) gom một nhóm các permissions lại.
- **Lợi ích lớn nhất:** Khi công ty thay đổi quyền hạn hoặc thêm chức danh mới, Admin chỉ cần sửa bảng liên kết trong Database mà **không cần sửa một dòng code nào**!

### 2. Sự khác biệt giữa Bưu tá (Shipper) và Nhân viên kho (Hub Operator)
- **Bưu tá (`ROLE_SHIPPER`):** Đi ngoài đường, giao hàng tận nhà người nhận, tiếp xúc tiền mặt COD $\rightarrow$ Có quyền báo phát kết quả chặng cuối: `tracking:update_delivery` (`DELIVERED`, `DELIVERY_FAILED`).
- **Nhân viên kho (`ROLE_HUB_OPERATOR`):** Làm việc tại kho Hub, dùng máy quét barcode trạm $\rightarrow$ Có quyền quét nhập/xuất kho: `tracking:update_hub` (`PICKED_UP`, `IN_TRANSIT`).
- **Nếu 1 người kiêm cả 2 việc:** Chỉ cần gán cả 2 Role cho tài khoản đó trên Database, hệ thống xử lý mượt mà.

### 3. Google ID Token vs Token JWT Hệ Thống (Hộ chiếu vs Thẻ nhân viên)
- **Google ID Token:** Giống như **"Hộ chiếu quốc tế"**, chỉ dùng đúng 1 lần khi đăng nhập tại `auth-service` để chứng minh bạn là ai mà không cần mật khẩu.
- **Token JWT của Mini Waybill:** Giống như **"Thẻ nhân viên nội bộ"** do `auth-service` cấp, có ghi rõ `userId`, `roles`, `permissions`.
- **Nguyên lý hoạt động:** Cầm Hộ chiếu Google đến phòng Nhân sự (`auth-service`) đổi lấy Thẻ nhân viên nội bộ $\rightarrow$ Sau đó hủy token Google, các microservice và Gateway chỉ làm việc với Thẻ nội bộ này!

### 4. `HeaderMapRequestWrapper` là cái gì?
- Trong Java Servlet, đối tượng `HttpServletRequest` là **READ-ONLY** (không có hàm `setHeader`).
- `HeaderMapRequestWrapper` là **"chiếc kẹp hồ sơ dán giấy ghi chú"**: Bọc lấy request cũ và nhồi thêm các header mới (`X-User-Id`, `X-User-Permissions`) trước khi chuyển tiếp sang microservice khác.

### 5. JWT Token hoạt động như thế nào với `app.jwt.secret`?
- Token gồm 3 phần: `Header . Payload . Signature`.
- Chuỗi `app.jwt.secret` **không nằm trong token**, nó được giấu trong server.
- Khi Gateway nhận token, nó lấy `Header` + `Payload` kết hợp với `secret` để **tự tính lại chữ ký mới**, rồi so sánh với **chữ ký cũ in trên vé**:
  - Khớp 100% $\rightarrow$ Vé thật, nội dung không bị sửa đổi $\rightarrow$ Cho qua!
  - Lệch $\rightarrow$ Vé giả mạo $\rightarrow$ Chặn `401 Unauthorized`!

---

## III. BẢN ĐỒ LUỒNG ĐI DỮ LIỆU (DATA FLOW)

### Luồng 1: Đăng nhập (Cấp vé)
```text
Client ──(email + pass)──► Gateway (permitAll) ──► Auth Service
                                                      │ Kiểm tra BCrypt
                                                      │ Lấy Roles & Permissions
                                                      │ Ký số JWT bằng secret
Client ◄──────── Trả về AccessToken ──────────────────┘
```

### Luồng 2: Gọi API nghiệp vụ (Soát vé & Vào cửa)
```text
Client ──(Gửi Token: Bearer xxx)──► Gateway (8080)
                                       │ JwtAuthenticationFilter bắt lấy Token
                                       │ Dùng secret kiểm tra chữ ký số
                                       │ Nạp quyền vào SecurityContextHolder (Spring Security)
                                       │ Nhồi 4 Header: X-User-Id, X-User-Roles, X-User-Permissions
                                       ▼
                                    Shipment Service (8082)
                                       │ Đọc X-User-Id và X-User-Permissions
                                       │ Kiểm tra quyền sở hữu đơn hàng (Chống IDOR)
                                       ▼
                                    Trả kết quả cho Client
```

---

## IV. CÁC "BẪY THỰC CHIẾN" ĐÃ GẶP & CÁCH GIẢI QUYẾT

| STT | Vấn đề / Lỗi gặp phải | Nguyên nhân gốc rễ | Cách xử lý chuẩn |
| :---: | :--- | :--- | :--- |
| **1** | SQL Server báo lỗi: `Violation of UNIQUE KEY constraint (Cannot insert duplicate key NULL)` | Ở SQL Server, cột đánh dấu `UNIQUE` chỉ cho phép **tối đa 1 dòng mang giá trị `NULL`** (khác với MySQL). Khi insert user thứ 2 có `google_sub = NULL` sẽ bị văng lỗi. | Gán giá trị mặc định cho user local (`google_sub = 'ADMIN_LOCAL_SYSTEM'`) hoặc tạo Unique Filtered Index. |
| **2** | Lombok `@Builder` làm rỗng collection (`NullPointerException`) | Khi dùng `@Builder`, nếu không có `@Builder.Default`, Lombok sẽ bỏ qua `= new HashSet<>()` và gán trường đó thành `null`. | Thêm `@Builder.Default` phía trên `private Set<Permission> permissions = new HashSet<>();`. |
| **3** | Cạm bẫy `LazyInitializationException` | Dùng `FetchType.LAZY` mà truy cập collection ngoài phạm vi Transaction sẽ bị văng lỗi vì Session Hibernate đã đóng. | Đổi thành `FetchType.EAGER` cho bảng Role/Permission (vì dữ liệu rất nhỏ, ~15 dòng và luôn cần dùng khi tạo token). |
| **4** | Lỗi import nhầm package HttpMethod | IDE tự động import `jakarta.ws.rs.HttpMethod` thay vì `org.springframework.http.HttpMethod`. | Sửa lại import: `import org.springframework.http.HttpMethod;`. |
| **5** | Chuỗi bí mật `app.jwt.secret` | Dùng thuật toán HS256 thì secret **bắt buộc phải dài tối thiểu 256 bits (32 bytes / 64 ký tự Hex)**, nếu ngắn hơn sẽ bị lỗi `WeakKeyException`. | Sinh chuỗi 64 ký tự bằng `openssl rand -hex 32`. |

---

## V. KHO VŨ KHÍ CODE SNIPPETS (LƯU ĐỂ DÙNG LẠI CHO CÁC DỰ ÁN SAU)

### 1. Trích xuất Permissions bằng Stream API flatMap (`auth-service`)
```java
List<String> permissions = user.getRoles().stream()
        .filter(role -> role.getPermissions() != null)
        .flatMap(role -> role.getPermissions().stream())
        .map(Permission::getCode)
        .distinct()
        .toList();
```

### 2. Cấu hình Spring Security 6 Stateless cho API Gateway (`api-gateway`)
```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
    return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/tracking/**").permitAll()
                    .requestMatchers("/api/admin/**").hasRole("ADMIN")
                    .requestMatchers("/api/audits/**").hasAnyRole("CS", "ADMIN")
                    .anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
}
```

### 3. Nạp danh tính vào Spring Security trong Filter (`api-gateway`)
```java
List<SimpleGrantedAuthority> authorities = new ArrayList<>();
if (roles != null) {
    for (String role : roles) {
        authorities.add(new SimpleGrantedAuthority(role.startsWith("ROLE_") ? role : "ROLE_" + role));
    }
}
if (permissions != null) {
    for (String perm : permissions) {
        authorities.add(new SimpleGrantedAuthority(perm));
    }
}

UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(email, null, authorities);
SecurityContextHolder.getContext().setAuthentication(authentication);
```

---

## VI. LỜI KHUYÊN DÀNH CHO BẠN KHI ĐI PHỎNG VẤN
- **Đừng sợ nếu không nhớ từng dòng code:** Kỹ sư giỏi là người hiểu được **luồng đi của hệ thống** và **biết tại sao nó lại được thiết kế như vậy**.
- **Khi được hỏi về Phân quyền:** Hãy tự tin trình bày mô hình **RBAC 3 tầng**, cơ chế **Edge Security tại API Gateway**, và kỹ thuật **Header Forwarding** mà bạn đã tự tay xây dựng hôm nay. Đó là điểm cộng cực lớn giúp bạn vượt trội so với các ứng viên khác!
