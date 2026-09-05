package org.app.authservice.service;

import org.app.authservice.dto.admin.*;

import java.util.List;

public interface AdminService {
    List<PermissionResponse> getAllPermissions();
    List<RoleDetailResponse> getAllRoles();
    RoleDetailResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request);
    List<UserAdminResponse> getAllUsers();
    UserAdminResponse updateUserRoles(Long userId, UpdateUserRolesRequest request);
    UserAdminResponse updateUserStatus(Long userId, UpdateUserStatusRequest request);

}
