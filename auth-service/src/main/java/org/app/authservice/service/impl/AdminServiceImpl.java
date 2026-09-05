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
import org.app.authservice.service.AdminService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService {
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
                        .description(p.getDescription())
                        .module(p.getModule())
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
                        .permissions(r.getPermissions() != null ? r.getPermissions().stream().map(Permission::getCode).toList() : List.of())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public RoleDetailResponse updateRolePermissions(Long roleId, UpdateRolePermissionsRequest request) {
        Role role = roleRepository.findById(roleId).orElseThrow(() -> new RuntimeException("Không tìm thấy vai trò với ID: " + roleId));

        if ("ROLE_ADMIN".equalsIgnoreCase(role.getName())) {
            throw new RuntimeException("Không được phép sửa quyền của Quản trị viên tối cao !");
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
    public UserAdminResponse updateUserRoles(Long userId, UpdateUserRolesRequest request) {
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("Không tìm thấy tài khoản với ID: " + userId));

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
                .roles(savedUser.getRoles() != null ? savedUser.getRoles().stream().map(Role::getName).toList() : List.of())
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
