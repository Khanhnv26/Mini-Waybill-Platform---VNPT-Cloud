# 🚀 GIÁO TRÌNH THỰC CHIẾN: HƯỚNG DẪN TỰ TAY CODE BACKEND RBAC CHO INTERN

> **Dành cho:** Intern Backend - Mini Waybill Platform  
> **Mentor:** Senior Tech Lead  
> **Mục tiêu:** Tự tay viết trọn bộ Backend CRUD Quản trị Phân quyền (Permissions, Roles, User Roles) trong `auth-service` và cấu hình Gateway `api-gateway`.  
> **Trạng thái Frontend:** Đã hoàn thiện 100% giao diện `AdminRbacView`, `adminService.js`, `auth.js`, `api.js` sẵn sàng kết nối với Backend của bạn!

---

## I. BẢN ĐỒ LUỒNG DỮ LIỆU & KIẾN TRÚC TỔNG THỂ

```
[ Frontend: AdminRbacView ]
           │
           ▼ (Gọi API với Bearer Token)
[ Node.js Proxy :3000 ] ──/api/admin/**──► [ API Gateway :8080 ]
                                                  │
                                                  │ 1. JwtAuthenticationFilter kiểm tra chữ ký token
                                                  │ 2. SecurityConfig: Kiểm tra hasRole("ADMIN")
                                                  │ 3. Forward request + Header sang auth-service
                                                  ▼
                                           [ Auth Service :8087 ]
                                                  │
                                                  │ AdminRbacController ──► AdminRbacService
                                                  │                                  │
                                                  ▼                                  ▼
                                        [ SQL Server: auth_db ] ◄────────────────────┘
                                        (permissions, roles, role_permissions, users, user_roles)
```

---

## II. BƯỚC 1: CẤU HÌNH ROUTE TRÊN API GATEWAY (`api-gateway`)

### 1. File cần sửa: `api-gateway/src/main/resources/application.properties`
Tìm đến route số 5 (`auth-service`) và mở rộng thêm các đường dẫn `/api/admin` và `/api/admin/**`:

```properties
spring.cloud.gateway.server.webmvc.routes[5].id=auth-service
spring.cloud.gateway.server.webmvc.routes[5].uri=lb://auth-service
spring.cloud.gateway.server.webmvc.routes[5].predicates[0]=Path=/api/auth,/api/auth/**,/api/admin,/api/admin/**
```

### 💡 Câu hỏi Mentor: *Tại sao không cần sửa `SecurityConfig.java` ở Gateway?*
> **Trả lời:** Vì ở buổi trước chúng ta đã cấu hình sẵn dòng:
> ```java
> .requestMatchers("/api/admin/**").hasRole("ADMIN")
> ```
> Điều này có nghĩa: Bất kỳ request nào vào `/api/admin/**` mà không có Token hoặc Token không chứa `ROLE_ADMIN` đều bị Gateway chặn đứng ngay lập tức với mã lỗi **`403 Forbidden`**! Microservice phía sau được bảo vệ an toàn 100%.

---

## III. BƯỚC 2: TẠO CÁC DTO TRONG `auth-service`

Hãy tạo package mới: `org.app.authservice.dto.admin` trong `auth-service/src/main/java/`.

### 1. `PermissionResponse.java` (Trả về thông tin quyền)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class PermissionResponse {
    private Long id;
    private String code;
    private String name;
    private String module;
    private String description;
}
```

### 2. `RoleDetailResponse.java` (Trả về vai trò kèm danh sách quyền đã gán)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RoleDetailResponse {
    private Long id;
    private String name;
    private String description;
    private List<String> permissions; // Danh sách mã quyền, ví dụ: ["shipment:create", "tracking:update_hub"]
}
```

### 3. `UpdateRolePermissionsRequest.java` (Admin gửi danh sách quyền muốn cập nhật cho Role)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateRolePermissionsRequest {
    private Set<String> permissionCodes;
}
```

### 4. `UserAdminResponse.java` (Trả về thông tin user trong bảng quản trị)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserAdminResponse {
    private Long id;
    private String email;
    private String fullName;
    private String status;
    private List<String> roles;
    private LocalDateTime createdAt;
}
```

### 5. `UpdateUserRolesRequest.java` (Gán vai trò mới cho User)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Set;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserRolesRequest {
    private Set<String> roleNames; // Ví dụ: ["ROLE_SHIPPER", "ROLE_CUSTOMER"]
}
```

### 6. `UpdateUserStatusRequest.java` (Khóa / Mở khóa tài khoản)
```java
package org.app.authservice.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UpdateUserStatusRequest {
    private String status; // "ACTIVE" hoặc "BLOCKED"
}
```

---

## IV. BƯỚC 3: CẬP NHẬT REPOSITORIES TRONG `auth-service`

### 1. `RoleRepository.java`
Mở `org.app.authservice.repository.RoleRepository.java` và thêm method:
```java
package org.app.authservice.repository;

import org.app.authservice.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(String name);
    List<Role> findByNameIn(Set<String> names); // THÊM DÒNG NÀY ĐỂ TÌM NHIỀU ROLES CÙNG LÚC
}
```

---

## V. BƯỚC 4: VIẾT SERVICE LAYER (`auth-service`)

### 1. Interface `AdminRbacService.java`
Tạo tại: `org.app.authservice.service.AdminRbacService.java`:
```java
package org.app.authservice.service;

import org.app.authservice.dto.admin.*;
import java.util.List;

public interface AdminRbacService {
    List<PermissionResponse> getAllPermissions();
    List<RoleDetailResponse> getAllRoles();
    RoleDetailResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request);
    List<UserAdminResponse> getAllUsers();
    UserAdminResponse updateUserRoles(Long userId, UpdateUserRolesRequest request);
    UserAdminResponse updateUserStatus(Long userId, UpdateUserStatusRequest request);
}
```

### 2. Implementation `AdminRbacServiceImpl.java`
Tạo tại: `org.app.authservice.service.impl.AdminRbacServiceImpl.java`:
```java
package org.app.authservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.authservice.dto.admin.*;
import org.app.authservice.entity.Permission;
import org.app.authservice.entity.Role;
import org.app.authservice.entity.User;
import org.app.authservice.repository.PermissionRepository;
import org.app.authservice.repository.RoleRepository;
import org.app.authservice.repository.UserRepository;
import org.app.authservice.service.AdminRbacService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminRbacServiceImpl implements AdminRbacService {

    private final PermissionRepository permissionRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;

    @Override
    public List<PermissionResponse> getAllPermissions() {
        return permissionRepository.findAll().stream()
                .map(p -> PermissionResponse.builder()
                        .id(p.getId())
                        .code(p.getCode())
                        .name(p.getName())
                        .module(p.getModule())
                        .description(p.getDescription())
                        .build())
                .toList();
    }

    @Override
    public List<RoleDetailResponse> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(r -> RoleDetailResponse.builder()
                        .id(r.getId())
                        .name(r.getName())
                        .description(r.getDescription())
                        .permissions(r.getPermissions() != null 
                                ? r.getPermissions().stream().map(Permission::getCode).toList() 
                                : List.of())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public RoleDetailResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + roleId));

        if ("ROLE_ADMIN".equalsIgnoreCase(role.getName())) {
            throw new RuntimeException("Không được phép sửa quyền của Quản trị viên tối cao (ROLE_ADMIN)!");
        }

        Set<String> codes = request.getPermissionCodes() != null ? request.getPermissionCodes() : Set.of();
        List<Permission> matchedPermissions = permissionRepository.findByCodeIn(codes);

        role.setPermissions(new HashSet<>(matchedPermissions));
        Role savedRole = roleRepository.save(role);

        log.info("Admin đã cập nhật phân quyền cho Role: {} với {} quyền", role.getName(), matchedPermissions.size());

        return RoleDetailResponse.builder()
                .id(savedRole.getId())
                .name(savedRole.getName())
                .description(savedRole.getDescription())
                .permissions(savedRole.getPermissions().stream().map(Permission::getCode).toList())
                .build();
    }

    @Override
    public List<UserAdminResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> UserAdminResponse.builder()
                        .id(u.getId())
                        .email(u.getEmail())
                        .fullName(u.getFullName())
                        .status(u.getStatus())
                        .roles(u.getRoles() != null 
                                ? u.getRoles().stream().map(Role::getName).toList() 
                                : List.of())
                        .createdAt(u.getCreatedAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public UserAdminResponse updateUserRoles(Long userId, UpdateUserRolesRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + userId));

        Set<String> roleNames = request.getRoleNames() != null ? request.getRoleNames() : Set.of();
        List<Role> matchedRoles = roleRepository.findByNameIn(roleNames);

        user.setRoles(new HashSet<>(matchedRoles));
        User savedUser = userRepository.save(user);

        log.info("Admin đã cập nhật vai trò cho tài khoản {}: {}", user.getEmail(), roleNames);

        return UserAdminResponse.builder()
                .id(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .status(savedUser.getStatus())
                .roles(savedUser.getRoles().stream().map(Role::getName).toList())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }

    @Override
    @Transactional
    public UserAdminResponse updateUserStatus(Long userId, UpdateUserStatusRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + userId));

        user.setStatus(request.getStatus());
        User savedUser = userRepository.save(user);

        log.info("Admin đã đổi trạng thái tài khoản {} thành {}", user.getEmail(), request.getStatus());

        return UserAdminResponse.builder()
                .id(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .status(savedUser.getStatus())
                .roles(savedUser.getRoles().stream().map(Role::getName).toList())
                .createdAt(savedUser.getCreatedAt())
                .build();
    }
}
```

---

## VI. BƯỚC 5: VIẾT CONTROLLER (`auth-service`)

Tạo tại: `org.app.authservice.controller.AdminRbacController.java`:
```java
package org.app.authservice.controller;

import lombok.RequiredArgsConstructor;
import org.app.authservice.dto.admin.*;
import org.app.authservice.service.AdminRbacService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRbacController {

    private final AdminRbacService adminRbacService;

    // 1. Lấy danh sách toàn bộ 15 permissions
    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(adminRbacService.getAllPermissions());
    }

    // 2. Lấy danh sách Roles kèm permissions
    @GetMapping("/roles")
    public ResponseEntity<List<RoleDetailResponse>> getAllRoles() {
        return ResponseEntity.ok(adminRbacService.getAllRoles());
    }

    // 3. Cập nhật phân quyền cho một Role
    @PutMapping("/roles/{roleId}/permissions")
    public ResponseEntity<RoleDetailResponse> updateRolePermissions(
            @PathVariable Long roleId,
            @RequestBody UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(adminRbacService.updateRolePermissions(roleId, request));
    }

    // 4. Lấy danh sách người dùng
    @GetMapping("/users")
    public ResponseEntity<List<UserAdminResponse>> getAllUsers() {
        return ResponseEntity.ok(adminRbacService.getAllUsers());
    }

    // 5. Cập nhật vai trò cho người dùng
    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<UserAdminResponse> updateUserRoles(
            @PathVariable Long userId,
            @RequestBody UpdateUserRolesRequest request) {
        return ResponseEntity.ok(adminRbacService.updateUserRoles(userId, request));
    }

    // 6. Cập nhật trạng thái người dùng (Khóa / Mở khóa)
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<UserAdminResponse> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(adminRbacService.updateUserStatus(userId, request));
    }
}
```

---

## VII. BƯỚC 6: BỔ SUNG PERMISSIONS VÀO `AuthResponse` KHI ĐĂNG NHẬP

Để Frontend nhận được quyền ngay khi vừa đăng nhập mà không cần giải mã JWT:

1. Mở `org.app.authservice.dto.response.AuthResponse.java`:
Thêm:
```java
private List<String> permissions;
```

2. Mở `org.app.authservice.controller.AuthController.java` (hàm `buildResponse` ở cuối file):
Sửa lại thành:
```java
    private AuthResponse buildResponse(User user, String jwt) {
        List<String> permissions = user.getRoles() != null
                ? user.getRoles().stream()
                    .filter(role -> role.getPermissions() != null)
                    .flatMap(role -> role.getPermissions().stream())
                    .map(Permission::getCode)
                    .distinct()
                    .toList()
                : List.of();

        return AuthResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .roles(user.getRoles().stream().map(Role::getName).toList())
                .permissions(permissions)
                .build();
    }
```

---

## VIII. BƯỚC 7: BIÊN DỊCH & KIỂM THỬ

1. **Biên dịch `auth-service`**:
   ```powershell
   cd c:\Users\LENOVO\Desktop\microservice\mini-waybill-platform\auth-service
   .\mvnw.cmd compile
   ```
2. **Khởi động hệ thống**:
   - Chạy `auth-service` (Port 8087)
   - Chạy `api-gateway` (Port 8080)
   - Chạy Frontend server: `node server.js`
3. **Mở trình duyệt kiểm tra tại `http://localhost:3000/`**:
   - Đăng nhập tài khoản Admin: `admin@waybill.vn` / `Admin@123456`.
   - Bấm vào Tab **"Quản Trị Phân Quyền"** mới xuất hiện trên thanh Navbar!
   - Thử tích chọn quyền, bấm Lưu và xem log DB cập nhật mượt mà!

Chúc bạn thực chiến thành công! Bất kỳ khi nào gặp lỗi biên dịch hoặc thắc mắc, hãy gửi câu hỏi để Mentor giải thích chi tiết nhé! 🚀
