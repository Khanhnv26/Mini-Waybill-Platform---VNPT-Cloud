package org.app.authservice.controller;
import lombok.RequiredArgsConstructor;
import org.app.authservice.dto.admin.*;
import org.app.authservice.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/permissions")
    public ResponseEntity<List<PermissionResponse>> getAllPermissions() {
        return ResponseEntity.ok(adminService.getAllPermissions());
    }
    @GetMapping("/roles")
    public ResponseEntity<List<RoleDetailResponse>> getAllRoles() {
        return ResponseEntity.ok(adminService.getAllRoles());
    }

    @PutMapping("/roles/{roleId}/permissions")
    public ResponseEntity<RoleDetailResponse> updateRolePermissions(
            @PathVariable("roleId") Long roleId,
            @RequestBody UpdateRolePermissionsRequest request) {
        return ResponseEntity.ok(adminService.updateRolePermissions(roleId, request));
    }
    @GetMapping("/users")
    public ResponseEntity<List<UserAdminResponse>> getAllUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }
    @PutMapping("/users/{userId}/roles")
    public ResponseEntity<UserAdminResponse> updateUserRoles(
            @PathVariable Long userId,
            @RequestBody UpdateUserRolesRequest request) {
        return ResponseEntity.ok(adminService.updateUserRoles(userId, request));
    }
    @PutMapping("/users/{userId}/status")
    public ResponseEntity<UserAdminResponse> updateUserStatus(
            @PathVariable Long userId,
            @RequestBody UpdateUserStatusRequest request) {
        return ResponseEntity.ok(adminService.updateUserStatus(userId, request));
    }
}
