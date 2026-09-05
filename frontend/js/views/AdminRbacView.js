/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: QUẢN TRỊ HỆ THỐNG & PHÂN QUYỀN VẬN HÀNH (RBAC ADMIN VIEW)
 * Thiết Kế B2B Tinh Gọn, Chuẩn Hóa Font Chữ Tiếng Việt & Thanh Lọc Gọn Gàng
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const AdminRbacView = {
        name: 'AdminRbacView',
        setup() {
            const currentSubtab = ref('matrix'); // 'matrix' | 'users'
            const isLoading = ref(false);
            const isSaving = ref(false);

            // ==================================================================
            // DỮ LIỆU & BỘ LỌC MA TRẬN PHÂN QUYỀN
            // ==================================================================
            const permissionsList = ref([]);
            const rolesList = ref([]);
            const selectedModule = ref('ALL');
            const permissionSearchQuery = ref('');
            const permPageSize = ref(15);
            const permCurrentPage = ref(1);

            // Trạng thái Checkbox: { roleId: Set([permissionCode, ...]) }
            const matrixState = reactive({});

            // ==================================================================
            // DỮ LIỆU & BỘ LỌC QUẢN TRỊ NGƯỜI DÙNG
            // ==================================================================
            const usersList = ref([]);
            const userSearchQuery = ref('');
            const selectedRoleFilter = ref('ALL');
            const selectedStatusFilter = ref('ALL');
            const userCurrentPage = ref(1);
            const userPageSize = ref(5);

            // Modal Cấp phát vai trò
            const editingUser = ref(null);
            const userRolesForm = reactive({
                roles: []
            });
            const showRoleModal = ref(false);

            // 1. Tải danh mục quyền và vai trò
            const loadMatrixData = async () => {
                isLoading.value = true;
                try {
                    const [perms, roles] = await Promise.all([
                        AdminService.getAllPermissions(),
                        AdminService.getAllRoles()
                    ]);

                    permissionsList.value = perms || [];
                    rolesList.value = roles || [];

                    roles.forEach(role => {
                        matrixState[role.id] = new Set(role.permissions || []);
                    });
                } catch (err) {
                    console.error('[AdminRbacView] Lỗi tải ma trận:', err);
                    Utils.showToast('Lỗi Hệ Thống', 'Không thể nạp danh mục ma trận quyền hạn', 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // 2. Tải danh sách người dùng
            const loadUsersData = async () => {
                isLoading.value = true;
                try {
                    const users = await AdminService.getAllUsers();
                    usersList.value = users || [];
                } catch (err) {
                    console.error('[AdminRbacView] Lỗi nạp tài khoản:', err);
                    Utils.showToast('Lỗi Hệ Thống', 'Không thể nạp danh sách người dùng', 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // Danh sách các Modules nghiệp vụ
            const availableModules = computed(() => {
                const map = {};
                permissionsList.value.forEach(p => {
                    map[p.module] = (map[p.module] || 0) + 1;
                });
                const list = Object.keys(map).map(mod => ({
                    code: mod,
                    name: Utils.formatModuleName(mod),
                    count: map[mod]
                }));
                return [
                    { code: 'ALL', name: 'Tất cả phân hệ (' + permissionsList.value.length + ')', count: permissionsList.value.length },
                    ...list.map(m => ({ ...m, name: `${m.name} (${m.count})` }))
                ];
            });

            // Lọc danh sách quyền
            const filteredPermissions = computed(() => {
                let list = permissionsList.value;
                if (selectedModule.value !== 'ALL') {
                    list = list.filter(p => p.module === selectedModule.value);
                }
                const q = permissionSearchQuery.value.trim().toLowerCase();
                if (q) {
                    list = list.filter(p => 
                        p.code.toLowerCase().includes(q) ||
                        (p.name && p.name.toLowerCase().includes(q)) ||
                        (p.description && p.description.toLowerCase().includes(q)) ||
                        (p.module && p.module.toLowerCase().includes(q))
                    );
                }
                return list;
            });

            const permTotalPages = computed(() => {
                if (permPageSize.value === -1) return 1;
                return Math.ceil(filteredPermissions.value.length / permPageSize.value) || 1;
            });

            const paginatedPermissions = computed(() => {
                if (permPageSize.value === -1) return filteredPermissions.value;
                const start = (permCurrentPage.value - 1) * permPageSize.value;
                return filteredPermissions.value.slice(start, start + permPageSize.value);
            });

            watch([selectedModule, permissionSearchQuery, permPageSize], () => {
                permCurrentPage.value = 1;
            });

            const isChecked = (roleId, permCode) => {
                if (!matrixState[roleId]) return false;
                return matrixState[roleId].has(permCode);
            };

            const togglePermission = (roleId, permCode) => {
                if (!matrixState[roleId]) {
                    matrixState[roleId] = new Set();
                }
                if (matrixState[roleId].has(permCode)) {
                    matrixState[roleId].delete(permCode);
                } else {
                    matrixState[roleId].add(permCode);
                }
            };

            const saveRolePermissions = async (role) => {
                const permsToSave = Array.from(matrixState[role.id] || []);
                isSaving.value = true;
                try {
                    await AdminService.updateRolePermissions(role.id, permsToSave);
                    Utils.showToast('Thành Công', `Đã cập nhật đặc quyền cho vai trò ${Utils.getRoleBadgeInfo(role.name).label}`);
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            const saveAllMatrix = async () => {
                isSaving.value = true;
                try {
                    for (const role of rolesList.value) {
                        if (role.name !== 'ROLE_ADMIN') {
                            const permsToSave = Array.from(matrixState[role.id] || []);
                            await AdminService.updateRolePermissions(role.id, permsToSave);
                        }
                    }
                    Utils.showToast('Thành Công', 'Đã lưu và áp dụng toàn bộ cấu hình phân quyền');
                } catch (err) {
                    Utils.showToast('Lỗi Áp Dụng', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            // ==================================================================
            // LỌC & PHÂN TRANG NGƯỜI DÙNG
            // ==================================================================
            const hasActiveUserFilter = computed(() => {
                return userSearchQuery.value.trim() !== '' || selectedRoleFilter.value !== 'ALL' || selectedStatusFilter.value !== 'ALL';
            });

            const resetUserFilters = () => {
                userSearchQuery.value = '';
                selectedRoleFilter.value = 'ALL';
                selectedStatusFilter.value = 'ALL';
            };

            const filteredUsers = computed(() => {
                let list = usersList.value;

                if (selectedRoleFilter.value !== 'ALL') {
                    list = list.filter(u => u.roles && u.roles.includes(selectedRoleFilter.value));
                }

                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(u => u.status === selectedStatusFilter.value);
                }

                const q = userSearchQuery.value.trim().toLowerCase();
                if (q) {
                    list = list.filter(u => 
                        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
                        (u.email && u.email.toLowerCase().includes(q)) ||
                        (u.roles && u.roles.some(r => r.toLowerCase().includes(q)))
                    );
                }
                return list;
            });

            const userTotalPages = computed(() => {
                return Math.ceil(filteredUsers.value.length / userPageSize.value) || 1;
            });

            const paginatedUsers = computed(() => {
                const start = (userCurrentPage.value - 1) * userPageSize.value;
                return filteredUsers.value.slice(start, start + userPageSize.value);
            });

            const userStartIndex = computed(() => {
                if (filteredUsers.value.length === 0) return 0;
                return (userCurrentPage.value - 1) * userPageSize.value + 1;
            });

            const userEndIndex = computed(() => {
                return Math.min(userCurrentPage.value * userPageSize.value, filteredUsers.value.length);
            });

            watch([userSearchQuery, selectedRoleFilter, selectedStatusFilter, userPageSize], () => {
                userCurrentPage.value = 1;
            });

            const goToUserPage = (p) => {
                if (p >= 1 && p <= userTotalPages.value) {
                    userCurrentPage.value = p;
                }
            };

            const openEditRolesModal = (user) => {
                editingUser.value = user;
                userRolesForm.roles = [...(user.roles || [])];
                showRoleModal.value = true;
            };

            const toggleUserRole = (roleName) => {
                // An toàn hệ thống: Không thể gỡ bỏ vai trò Quản trị viên (ROLE_ADMIN) khỏi tài khoản Admin
                if (editingUser.value?.roles?.includes('ROLE_ADMIN') && roleName === 'ROLE_ADMIN') {
                    Utils.showToast('Bảo Vệ Hệ Thống', 'Không thể tước quyền Quản trị hệ thống của tài khoản này!', 'warning');
                    return;
                }

                const idx = userRolesForm.roles.indexOf(roleName);
                if (idx >= 0) {
                    userRolesForm.roles.splice(idx, 1);
                } else {
                    userRolesForm.roles.push(roleName);
                }
            };

            const handleSaveUserRoles = async () => {
                if (!editingUser.value) return;

                // Tự động bảo toàn vai trò ROLE_ADMIN nếu tài khoản này vốn là Admin
                if (editingUser.value.roles?.includes('ROLE_ADMIN') && !userRolesForm.roles.includes('ROLE_ADMIN')) {
                    userRolesForm.roles.push('ROLE_ADMIN');
                }

                isSaving.value = true;
                try {
                    await AdminService.updateUserRoles(editingUser.value.id, userRolesForm.roles);
                    editingUser.value.roles = [...userRolesForm.roles];
                    Utils.showToast('Thành Công', `Đã cấp phát vai trò cho tài khoản ${editingUser.value.email}`);
                    showRoleModal.value = false;
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            const toggleUserStatus = async (user) => {
                // An toàn hệ thống: Không thể đình chỉ tài khoản Quản trị hệ thống
                if (user.roles && user.roles.includes('ROLE_ADMIN')) {
                    Utils.showToast('Bảo Vệ Hệ Thống', 'Không thể tạm đình chỉ tài khoản Quản trị hệ thống!', 'warning');
                    return;
                }

                const isCurrentlyActive = user.status === 'ACTIVE';
                const newStatus = isCurrentlyActive ? 'BLOCKED' : 'ACTIVE';
                const actionVerb = isCurrentlyActive ? 'tạm đình chỉ giao dịch' : 'khôi phục hoạt động';

                if (!confirm(`Xác nhận ${actionVerb} đối với tài khoản: ${user.email}?`)) {
                    return;
                }

                try {
                    await AdminService.updateUserStatus(user.id, newStatus);
                    user.status = newStatus;
                    Utils.showToast('Thành Công', `Đã ${actionVerb} cho tài khoản ${user.email}`);
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message, 'error');
                }
            };

            onMounted(() => {
                loadMatrixData();
                loadUsersData();
            });

            return {
                currentSubtab,
                isLoading,
                isSaving,
                permissionsList,
                rolesList,
                selectedModule,
                availableModules,
                permissionSearchQuery,
                permPageSize,
                permCurrentPage,
                permTotalPages,
                filteredPermissions,
                paginatedPermissions,
                matrixState,
                isChecked,
                togglePermission,
                saveRolePermissions,
                saveAllMatrix,
                usersList,
                userSearchQuery,
                selectedRoleFilter,
                selectedStatusFilter,
                hasActiveUserFilter,
                resetUserFilters,
                userCurrentPage,
                userPageSize,
                userTotalPages,
                userStartIndex,
                userEndIndex,
                filteredUsers,
                paginatedUsers,
                goToUserPage,
                editingUser,
                userRolesForm,
                showRoleModal,
                openEditRolesModal,
                toggleUserRole,
                handleSaveUserRoles,
                toggleUserStatus,
                Utils
            };
        },
        template: `
        <div class="space-y-3.5 pb-8 text-slate-800">
            <!-- 1. HERO BANNER: THIẾT KẾ GỌN GÀNG, CHUYÊN NGHIỆP -->
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                IAM Security
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Quản Trị Hệ Thống &amp; Cấu Hình Phân Quyền Vận Hành
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Thiết lập ma trận đặc quyền (RBAC) và kiểm soát tài khoản theo phân cấp an ninh toàn trình.
                        </p>
                    </div>

                    <!-- Thống kê nhanh gọn -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ rolesList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Vai Trò</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ permissionsList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đặc Quyền</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ usersList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tài Khoản</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG TINH GỌN -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6">
                    <button 
                        @click="currentSubtab = 'matrix'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5',
                            currentSubtab === 'matrix' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>MA TRẬN ĐẶC QUYỀN (VAI TRÒ - QUYỀN HẠN)</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'users'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5',
                            currentSubtab === 'users' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>HỒ SƠ NGƯỜI DÙNG &amp; CẤP PHÁT VAI TRÒ</span>
                    </button>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- PHÂN HỆ 1: MA TRẬN ĐẶC QUYỀN (ROLE - PERMISSION MATRIX) -->
            <!-- =================================================================== -->
            <div v-if="currentSubtab === 'matrix'" class="space-y-3">
                <!-- THANH CÔNG CỤ TINH GỌN (COMPACT TOOLBAR) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Ô Tìm Kiếm Quyền -->
                        <div class="relative w-56 sm:w-64">
                            <input 
                                v-model="permissionSearchQuery"
                                type="text" 
                                placeholder="Tìm mã quyền, tên quyền..."
                                class="w-full pl-8 pr-6 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button 
                                v-if="permissionSearchQuery" 
                                @click="permissionSearchQuery = ''"
                                class="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- Dropdown Lọc Phân Hệ -->
                        <select 
                            v-model="selectedModule"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option v-for="mod in availableModules" :key="mod.code" :value="mod.code">
                                {{ mod.name }}
                            </option>
                        </select>
                    </div>

                    <!-- Nút Áp Dụng Toàn Bộ Ma Trận -->
                    <button 
                        @click="saveAllMatrix" 
                        :disabled="isSaving"
                        class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5 disabled:opacity-50 whitespace-nowrap"
                    >
                        <span v-if="isSaving" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                        <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{{ isSaving ? 'Đang lưu...' : 'Áp Dụng' }}</span>
                    </button>
                </div>

                <!-- Bảng Ma Trận Checkbox Phân Quyền -->
                <div class="b2b-card overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="min-w-[220px] sm:min-w-[260px] py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">ĐẶC QUYỀN NGHIỆP VỤ</th>
                                    <th v-for="role in rolesList" :key="role.id" class="text-center min-w-[110px] py-2.5 px-2">
                                        <div class="flex flex-col items-center">
                                            <span 
                                                :class="[
                                                    'px-2 py-0.5 rounded-md text-xs font-bold border tracking-tight',
                                                    Utils.getRoleBadgeInfo(role.name).class
                                                ]"
                                            >
                                                {{ Utils.getRoleBadgeInfo(role.name).label }}
                                            </span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="perm in paginatedPermissions" :key="perm.id" class="hover:bg-blue-50/30 transition">
                                    <!-- Cột Thông Tin Quyền -->
                                    <td class="py-2.5 px-3">
                                        <div class="text-xs font-bold text-slate-900 leading-snug">{{ perm.name }}</div>
                                        <div class="text-[11px] text-slate-500 leading-normal mt-0.5">{{ perm.description }}</div>
                                    </td>

                                    <!-- Các Cột Checkbox Từng Vai Trò -->
                                    <td v-for="role in rolesList" :key="role.id" class="text-center py-2.5 px-2">
                                        <label class="inline-flex items-center justify-center cursor-pointer p-0.5">
                                            <input 
                                                type="checkbox" 
                                                :checked="isChecked(role.id, perm.code)"
                                                @change="togglePermission(role.id, perm.code)"
                                                :disabled="role.name === 'ROLE_ADMIN'" 
                                                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                :title="role.name === 'ROLE_ADMIN' ? 'Quản trị viên tối cao luôn có toàn quyền (Bất biến)' : 'Nhấp để bật/tắt quyền'"
                                            />
                                        </label>
                                    </td>
                                </tr>

                                <tr v-if="filteredPermissions.length === 0">
                                    <td :colspan="rolesList.length + 1" class="text-center py-10 text-slate-400 text-xs">
                                        Không tìm thấy đặc quyền nào phù hợp với từ khóa.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Phân Trang Cho Bảng Quyền Hạn (Gọn gàng) -->
                    <div v-if="permTotalPages > 1" class="px-3 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span class="text-slate-500">
                            Trang <b>{{ permCurrentPage }}</b> / <b>{{ permTotalPages }}</b> (Tổng {{ filteredPermissions.length }} quyền)
                        </span>
                        <div class="flex items-center space-x-1">
                            <button 
                                @click="permCurrentPage--" 
                                :disabled="permCurrentPage <= 1"
                                class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold"
                            >
                                ◄ Trước
                            </button>
                            <button 
                                @click="permCurrentPage++" 
                                :disabled="permCurrentPage >= permTotalPages"
                                class="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold"
                            >
                                Sau ►
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- PHÂN HỆ 2: DANH SÁCH NGƯỜI DÙNG & CẤP VAI TRÒ (USER MANAGEMENT) -->
            <!-- =================================================================== -->
            <div v-if="currentSubtab === 'users'" class="space-y-3">
                <!-- THANH CÔNG CỤ TÌM KIẾM & BỘ LỌC (SINGLE-LINE COMPACT TOOLBAR) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Ô Tìm Kiếm -->
                        <div class="relative w-52 sm:w-60">
                            <input 
                                v-model="userSearchQuery"
                                type="text" 
                                placeholder="Tìm theo email, họ tên..."
                                class="w-full pl-8 pr-6 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button 
                                v-if="userSearchQuery" 
                                @click="userSearchQuery = ''"
                                class="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- Dropdown Lọc Vai Trò -->
                        <select 
                            v-model="selectedRoleFilter"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option v-for="r in rolesList" :key="r.id" :value="r.name">
                                {{ Utils.getRoleBadgeInfo(r.name).label }}
                            </option>
                        </select>

                        <!-- Dropdown Lọc Trạng Thái -->
                        <select 
                            v-model="selectedStatusFilter"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang Hoạt Động</option>
                            <option value="BLOCKED">Tạm Đình Chỉ</option>
                        </select>

                        <!-- Nút Xóa Nhanh Bộ Lọc -->
                        <button 
                            v-if="hasActiveUserFilter"
                            @click="resetUserFilters"
                            class="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold transition flex items-center space-x-1"
                            title="Xóa bộ lọc"
                        >
                            <span>✕ Xóa lọc</span>
                        </button>
                    </div>

                    <!-- Hiển thị tổng số tài khoản -->
                    <div class="text-xs font-medium text-slate-500 whitespace-nowrap self-center">
                        Tổng cộng: <b class="text-slate-800">{{ filteredUsers.length }}</b> tài khoản
                    </div>
                </div>

                <!-- Bảng Danh Sách Người Dùng Tinh Gọn -->
                <div class="b2b-card overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-12 py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">ID</th>
                                    <th class="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">THÔNG TIN TÀI KHOẢN</th>
                                    <th class="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">TRẠNG THÁI</th>
                                    <th class="py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">VAI TRÒ NGHIỆP VỤ</th>
                                    <th class="text-right py-2.5 px-3 text-xs font-bold tracking-wider text-slate-600">THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="user in paginatedUsers" :key="user.id" class="hover:bg-slate-50/80 transition">
                                    <td class="font-mono text-xs font-bold text-slate-400 py-2.5 px-3">#{{ user.id }}</td>
                                    
                                    <td class="py-2.5 px-3">
                                        <div class="flex items-center space-x-2.5">
                                            <div class="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                                {{ (user.fullName || user.email || 'U').charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <div class="font-bold text-xs text-slate-900 leading-tight">{{ user.fullName || 'Chưa cập nhật họ tên' }}</div>
                                                <div class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ user.email }}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td class="py-2.5 px-3 whitespace-nowrap">
                                        <span 
                                            :class="[
                                                'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide inline-flex items-center space-x-1 border',
                                                user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                            ]"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full" :class="user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                                            <span>{{ user.status === 'ACTIVE' ? 'Hoạt Động' : 'Đình Chỉ' }}</span>
                                        </span>
                                    </td>

                                    <td class="py-2.5 px-3">
                                        <div class="flex flex-wrap gap-1">
                                            <span 
                                                v-for="role in (user.roles || [])" 
                                                :key="role"
                                                :class="[
                                                    'px-2 py-0.5 rounded-md text-[10px] font-semibold border tracking-tight',
                                                    Utils.getRoleBadgeInfo(role).class
                                                ]"
                                            >
                                                {{ Utils.getRoleBadgeInfo(role).label }}
                                            </span>
                                        </div>
                                    </td>

                                    <td class="text-right py-2.5 px-3 whitespace-nowrap">
                                        <div class="flex items-center justify-end space-x-1.5">
                                            <button 
                                                @click="openEditRolesModal(user)"
                                                class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200 shadow-sm"
                                                title="Cấp phát hoặc điều chỉnh vai trò"
                                            >
                                                Cấp Vai Trò
                                            </button>
                                            <button 
                                                @click="toggleUserStatus(user)"
                                                :disabled="user.roles && user.roles.includes('ROLE_ADMIN')"
                                                :class="[
                                                    'px-2.5 py-1 rounded-lg text-xs font-bold transition border shadow-sm',
                                                    user.roles && user.roles.includes('ROLE_ADMIN')
                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                                                        : user.status === 'ACTIVE' 
                                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                ]"
                                                :title="user.roles && user.roles.includes('ROLE_ADMIN') ? 'Không thể đình chỉ tài khoản Quản trị hệ thống' : (user.status === 'ACTIVE' ? 'Tạm đình chỉ tài khoản' : 'Khôi phục hoạt động')"
                                            >
                                                {{ user.status === 'ACTIVE' ? 'Đình Chỉ' : 'Kích Hoạt' }}
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                <tr v-if="filteredUsers.length === 0">
                                    <td colspan="5" class="text-center py-10 text-slate-400 text-xs">
                                        Không tìm thấy tài khoản người dùng nào phù hợp.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- THANH PHÂN TRANG GỌN GÀNG (COMPACT PAGINATION BAR) -->
                    <div class="px-3 py-2 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                        <div class="flex items-center space-x-2 text-slate-500">
                            <span>Hiển thị <b>{{ userStartIndex }}</b> - <b>{{ userEndIndex }}</b> / <b>{{ filteredUsers.length }}</b></span>
                            <span class="text-slate-300">|</span>
                            <div class="flex items-center space-x-1">
                                <span>Xem:</span>
                                <select 
                                    v-model.number="userPageSize"
                                    class="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs font-bold text-slate-700 outline-none"
                                >
                                    <option :value="5">5 dòng</option>
                                    <option :value="10">10 dòng</option>
                                    <option :value="20">20 dòng</option>
                                </select>
                            </div>
                        </div>

                        <!-- Các Nút Chuyển Trang Mini -->
                        <div class="flex items-center space-x-1">
                            <button 
                                @click="goToUserPage(userCurrentPage - 1)"
                                :disabled="userCurrentPage <= 1"
                                class="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                                title="Trang trước"
                            >
                                ◄
                            </button>

                            <button 
                                v-for="p in userTotalPages" 
                                :key="p"
                                @click="goToUserPage(p)"
                                :class="[
                                    'px-2.5 py-1 rounded-lg text-xs font-bold transition border min-w-[28px]',
                                    userCurrentPage === p 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                ]"
                            >
                                {{ p }}
                            </button>

                            <button 
                                @click="goToUserPage(userCurrentPage + 1)"
                                :disabled="userCurrentPage >= userTotalPages"
                                class="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                                title="Trang sau"
                            >
                                ►
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- MODAL CẤP PHÁT VAI TRÒ NGHIỆP VỤ -->
            <!-- =================================================================== -->
            <div v-if="showRoleModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 animate-in fade-in zoom-in duration-150">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div>
                            <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider">Cấp Phát &amp; Điều Chỉnh Vai Trò</h3>
                            <p class="text-xs text-slate-500 mt-0.5">{{ editingUser?.email }}</p>
                        </div>
                        <button @click="showRoleModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-sm p-1">✕</button>
                    </div>

                    <div class="py-3 space-y-2 max-h-[55vh] overflow-y-auto">
                        <div class="text-xs font-semibold text-slate-700 mb-1">
                            Chọn các vai trò áp dụng cho tài khoản này:
                        </div>
                        
                        <div 
                            v-for="role in rolesList" 
                            :key="role.id"
                            @click="toggleUserRole(role.name)"
                            :class="[
                                'p-2.5 rounded-lg border transition flex items-center justify-between',
                                editingUser?.roles?.includes('ROLE_ADMIN') && role.name === 'ROLE_ADMIN'
                                    ? 'bg-slate-100/90 border-slate-300 opacity-80 cursor-not-allowed'
                                    : 'cursor-pointer hover:bg-slate-100',
                                userRolesForm.roles.includes(role.name) && !(editingUser?.roles?.includes('ROLE_ADMIN') && role.name === 'ROLE_ADMIN')
                                    ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                                    : 'border-slate-200'
                            ]"
                        >
                            <div>
                                <div class="flex items-center space-x-2">
                                    <span :class="['px-2 py-0.5 rounded-md text-xs font-bold border tracking-tight', Utils.getRoleBadgeInfo(role.name).class]">
                                        {{ Utils.getRoleBadgeInfo(role.name).label }}
                                    </span>
                                    <span 
                                        v-if="editingUser?.roles?.includes('ROLE_ADMIN') && role.name === 'ROLE_ADMIN'"
                                        class="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 flex items-center space-x-1"
                                    >
                                        <span>🔒 Cố định</span>
                                    </span>
                                </div>
                                <div class="text-[11px] text-slate-500 mt-1 leading-normal">{{ role.description }}</div>
                            </div>
                            <input 
                                type="checkbox" 
                                :checked="userRolesForm.roles.includes(role.name)" 
                                :disabled="editingUser?.roles?.includes('ROLE_ADMIN') && role.name === 'ROLE_ADMIN'"
                                class="w-4 h-4 text-blue-600 rounded border-slate-300 pointer-events-none ml-2 disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                        <button 
                            @click="showRoleModal = false"
                            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                            Hủy
                        </button>
                        <button 
                            @click="handleSaveUserRoles"
                            :disabled="isSaving"
                            class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                        >
                            <span v-if="isSaving" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                            <span>{{ isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi' }}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.AdminRbacView = AdminRbacView;
})();
