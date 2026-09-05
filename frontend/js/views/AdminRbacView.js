/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: QUẢN TRỊ PHÂN QUYỀN (RBAC ADMIN VIEW)
 * Phong Cách Thiết Kế: VNPT B2B Enterprise Blue (Lấy cảm hứng từ login.html)
 * Bao Gồm:
 *   1. Ma Trận Phân Quyền Tương Tác (Role - Permission Matrix)
 *   2. Quản Lý Tài Khoản & Cấp Phát Vai Trò (User Role Assignment)
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, onMounted } = Vue;

    const AdminRbacView = {
        name: 'AdminRbacView',
        setup() {
            const currentSubtab = ref('matrix'); // 'matrix' | 'users'
            const isLoading = ref(false);
            const isSaving = ref(false);

            // Dữ liệu Phân quyền
            const permissionsList = ref([]);
            const rolesList = ref([]);
            const selectedModule = ref('ALL');

            // Ma trận trạng thái Checkbox: { roleId: Set([permissionCode, ...]) }
            const matrixState = reactive({});

            // Dữ liệu Người dùng
            const usersList = ref([]);
            const userSearchQuery = ref('');
            const editingUser = ref(null);
            const userRolesForm = reactive({
                roles: []
            });
            const showRoleModal = ref(false);

            // 1. Tải toàn bộ dữ liệu Ma trận RBAC
            const loadMatrixData = async () => {
                isLoading.value = true;
                try {
                    const [perms, roles] = await Promise.all([
                        AdminService.getAllPermissions(),
                        AdminService.getAllRoles()
                    ]);

                    permissionsList.value = perms;
                    rolesList.value = roles;

                    // Khởi tạo map ma trận
                    roles.forEach(role => {
                        matrixState[role.id] = new Set(role.permissions || []);
                    });
                } catch (err) {
                    console.error('[AdminRbacView] Lỗi nạp ma trận:', err);
                    Utils.showToast('Lỗi Tải Dữ Liệu', 'Không thể nạp ma trận phân quyền', 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // 2. Tải danh sách tài khoản
            const loadUsersData = async () => {
                isLoading.value = true;
                try {
                    const users = await AdminService.getAllUsers();
                    usersList.value = users;
                } catch (err) {
                    console.error('[AdminRbacView] Lỗi nạp danh sách user:', err);
                    Utils.showToast('Lỗi Tải Dữ Liệu', 'Không thể nạp danh sách tài khoản', 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // Danh sách các modules để filter
            const availableModules = computed(() => {
                const mods = new Set(permissionsList.value.map(p => p.module));
                return ['ALL', ...Array.from(mods)];
            });

            // Lọc permissions theo module
            const filteredPermissions = computed(() => {
                if (selectedModule.value === 'ALL') {
                    return permissionsList.value;
                }
                return permissionsList.value.filter(p => p.module === selectedModule.value);
            });

            // Kiểm tra xem ô [roleId, permCode] có được tích hay không
            const isChecked = (roleId, permCode) => {
                if (!matrixState[roleId]) return false;
                return matrixState[roleId].has(permCode);
            };

            // Toggle ô checkbox trong ma trận
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

            // Lưu phân quyền cho một Role cụ thể
            const saveRolePermissions = async (role) => {
                const permsToSave = Array.from(matrixState[role.id] || []);
                isSaving.value = true;
                try {
                    await AdminService.updateRolePermissions(role.id, permsToSave);
                    Utils.showToast('Thành Công', `Đã cập nhật phân quyền cho vai trò ${role.name}`);
                } catch (err) {
                    Utils.showToast('Lỗi Lưu Phân Quyền', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            // Lưu toàn bộ ma trận
            const saveAllMatrix = async () => {
                isSaving.value = true;
                try {
                    for (const role of rolesList.value) {
                        const permsToSave = Array.from(matrixState[role.id] || []);
                        await AdminService.updateRolePermissions(role.id, permsToSave);
                    }
                    Utils.showToast('Thành Công', 'Đã lưu toàn bộ cấu hình ma trận phân quyền hệ thống');
                } catch (err) {
                    Utils.showToast('Lỗi', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            // Lọc danh sách user theo tìm kiếm
            const filteredUsers = computed(() => {
                const q = userSearchQuery.value.trim().toLowerCase();
                if (!q) return usersList.value;
                return usersList.value.filter(u => 
                    (u.email && u.email.toLowerCase().includes(q)) ||
                    (u.fullName && u.fullName.toLowerCase().includes(q))
                );
            });

            // Mở modal gán vai trò cho User
            const openEditRolesModal = (user) => {
                editingUser.value = user;
                userRolesForm.roles = [...(user.roles || [])];
                showRoleModal.value = true;
            };

            const toggleUserRole = (roleName) => {
                const idx = userRolesForm.roles.indexOf(roleName);
                if (idx >= 0) {
                    userRolesForm.roles.splice(idx, 1);
                } else {
                    userRolesForm.roles.push(roleName);
                }
            };

            // Lưu vai trò cho User
            const handleSaveUserRoles = async () => {
                if (!editingUser.value) return;
                isSaving.value = true;
                try {
                    await AdminService.updateUserRoles(editingUser.value.id, userRolesForm.roles);
                    editingUser.value.roles = [...userRolesForm.roles];
                    Utils.showToast('Thành Công', `Đã cập nhật vai trò cho tài khoản ${editingUser.value.email}`);
                    showRoleModal.value = false;
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            // Toggle Khóa / Kích hoạt tài khoản
            const toggleUserStatus = async (user) => {
                const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
                const actionText = newStatus === 'ACTIVE' ? 'mở khóa' : 'khóa';
                if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản ${user.email}?`)) {
                    return;
                }
                try {
                    await AdminService.updateUserStatus(user.id, newStatus);
                    user.status = newStatus;
                    Utils.showToast('Thành Công', `Đã ${actionText} tài khoản ${user.email}`);
                } catch (err) {
                    Utils.showToast('Lỗi', err.message, 'error');
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
                filteredPermissions,
                matrixState,
                isChecked,
                togglePermission,
                saveRolePermissions,
                saveAllMatrix,
                usersList,
                userSearchQuery,
                filteredUsers,
                editingUser,
                userRolesForm,
                showRoleModal,
                openEditRolesModal,
                toggleUserRole,
                handleSaveUserRoles,
                toggleUserStatus,
                getRoleBadgeInfo: Utils.getRoleBadgeInfo
            };
        },
        template: `
        <div class="space-y-6 pb-12">
            <!-- 1. HERO BANNER: THIẾT KẾ VNPT B2B LOGISTICS -->
            <div class="rounded-2xl vnpt-gradient text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>
                <div class="absolute -right-16 -top-16 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] uppercase font-bold tracking-wider border border-white/30">
                                RBAC Security Engine
                            </span>
                            <span class="text-blue-200 text-xs font-medium">VNPT Enterprise Cloud</span>
                        </div>
                        <h1 class="text-xl sm:text-2xl font-bold tracking-tight mt-1.5">
                            Quản Trị Hệ Thống &amp; Phân Quyền Vận Hành
                        </h1>
                        <p class="text-xs sm:text-sm text-blue-100/90 mt-1 max-w-2xl">
                            Cấu hình ma trận quyền hạn chi tiết (Role-Permission Matrix) và điều phối phân quyền tài khoản người dùng theo chuẩn bảo mật đa tầng.
                        </p>
                    </div>

                    <!-- Thống kê nhanh (KPI Badges) -->
                    <div class="flex items-center space-x-3">
                        <div class="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                            <div class="text-base font-extrabold font-mono text-white">{{ rolesList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase tracking-wider">Vai Trò (Roles)</div>
                        </div>
                        <div class="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                            <div class="text-base font-extrabold font-mono text-white">{{ permissionsList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase tracking-wider">Quyền (Permissions)</div>
                        </div>
                        <div class="px-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center">
                            <div class="text-base font-extrabold font-mono text-white">{{ usersList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase tracking-wider">Tài Khoản</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG QUẢN TRỊ -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-6">
                    <button 
                        @click="currentSubtab = 'matrix'"
                        :class="[
                            'pb-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2',
                            currentSubtab === 'matrix' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>MA TRẬN PHÂN QUYỀN (ROLE - PERMISSION)</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'users'"
                        :class="[
                            'pb-3 text-xs font-bold transition-all border-b-2 flex items-center space-x-2',
                            currentSubtab === 'users' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>DANH SÁCH NGƯỜI DÙNG &amp; CẤP VAI TRÒ</span>
                    </button>
                </div>

                <!-- Nút Lưu chung khi ở tab ma trận -->
                <div v-if="currentSubtab === 'matrix'" class="pb-2">
                    <button 
                        @click="saveAllMatrix" 
                        :disabled="isSaving"
                        class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center space-x-2 disabled:opacity-50"
                    >
                        <span v-if="isSaving" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                        <span>{{ isSaving ? 'ĐANG LƯU HỆ THỐNG...' : 'LƯU TẤT CẢ MA TRẬN' }}</span>
                    </button>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- TAB CON 1: MA TRẬN PHÂN QUYỀN (ROLE-PERMISSION MATRIX) -->
            <!-- =================================================================== -->
            <div v-if="currentSubtab === 'matrix'" class="space-y-4">
                <!-- Bộ lọc theo Module nghiệp vụ -->
                <div class="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
                    <span class="text-slate-400 font-semibold uppercase text-[10px] mr-1">Lọc Module:</span>
                    <button 
                        v-for="mod in availableModules" 
                        :key="mod"
                        @click="selectedModule = mod"
                        :class="[
                            'px-3 py-1 rounded-lg font-semibold text-xs transition-all',
                            selectedModule === mod 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        ]"
                    >
                        {{ mod === 'ALL' ? 'Tất cả Modules' : mod }}
                    </button>
                </div>

                <!-- Bảng Ma Trận Checkbox -->
                <div class="b2b-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-80 min-w-[280px]">MÃ QUYỀN HẠN (PERMISSION)</th>
                                    <th v-for="role in rolesList" :key="role.id" class="text-center min-w-[130px]">
                                        <div class="flex flex-col items-center">
                                            <span class="font-bold text-[11px]">{{ role.name.replace('ROLE_', '') }}</span>
                                            <span class="text-[9px] text-slate-400 font-normal truncate max-w-[120px]" :title="role.description">{{ role.description }}</span>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="perm in filteredPermissions" :key="perm.id" class="hover:bg-blue-50/40 transition">
                                    <!-- Cột thông tin quyền -->
                                    <td class="py-3 px-4">
                                        <div class="flex items-center space-x-2 mb-0.5">
                                            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                {{ perm.module }}
                                            </span>
                                            <span class="font-mono text-xs font-bold text-blue-700">{{ perm.code }}</span>
                                        </div>
                                        <div class="text-xs font-semibold text-slate-800">{{ perm.name }}</div>
                                        <div class="text-[11px] text-slate-400 leading-tight mt-0.5">{{ perm.description }}</div>
                                    </td>

                                    <!-- Các cột Checkbox từng Role -->
                                    <td v-for="role in rolesList" :key="role.id" class="text-center py-3 px-2">
                                        <label class="inline-flex items-center justify-center cursor-pointer p-1">
                                            <input 
                                                type="checkbox" 
                                                :checked="isChecked(role.id, perm.code)"
                                                @change="togglePermission(role.id, perm.code)"
                                                :disabled="role.name === 'ROLE_ADMIN'" 
                                                class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition cursor-pointer disabled:opacity-60"
                                            />
                                        </label>
                                    </td>
                                </tr>
                            </tbody>

                            <!-- Footer Bảng: Nút lưu từng cột Role -->
                            <tfoot>
                                <tr class="bg-slate-50 border-t border-slate-200">
                                    <td class="py-3 px-4 text-xs font-bold text-slate-500">
                                        LƯU CẤU HÌNH THEO TỪNG VAI TRÒ:
                                    </td>
                                    <td v-for="role in rolesList" :key="role.id" class="text-center py-3 px-2">
                                        <button 
                                            @click="saveRolePermissions(role)"
                                            :disabled="isSaving || role.name === 'ROLE_ADMIN'"
                                            class="px-2.5 py-1 rounded bg-white hover:bg-blue-50 border border-slate-300 text-[10px] font-bold text-slate-700 hover:text-blue-700 shadow-sm transition disabled:opacity-40"
                                        >
                                            Lưu {{ role.name.replace('ROLE_', '') }}
                                        </button>
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- TAB CON 2: DANH SÁCH NGƯỜI DÙNG & CẤP VAI TRÒ -->
            <!-- =================================================================== -->
            <div v-if="currentSubtab === 'users'" class="space-y-4">
                <!-- Thanh công cụ tìm kiếm -->
                <div class="flex items-center justify-between gap-4">
                    <div class="relative flex-1 max-w-md">
                        <input 
                            v-model="userSearchQuery"
                            type="text" 
                            placeholder="Tìm kiếm theo email, họ tên người dùng..."
                            class="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-sm outline-none transition"
                        />
                        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div class="text-xs text-slate-500">
                        Hiển thị <b>{{ filteredUsers.length }}</b> tài khoản
                    </div>
                </div>

                <!-- Bảng người dùng -->
                <div class="b2b-card overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-16">ID</th>
                                    <th>NGƯỜI DÙNG / EMAIL</th>
                                    <th>TRẠNG THÁI</th>
                                    <th>VAI TRÒ ĐƯỢC GÁN (ROLES)</th>
                                    <th class="text-right">THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="user in filteredUsers" :key="user.id" class="hover:bg-slate-50/80 transition">
                                    <td class="font-mono text-xs font-bold text-slate-500">#{{ user.id }}</td>
                                    
                                    <td>
                                        <div class="flex items-center space-x-3">
                                            <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                                                {{ (user.fullName || user.email || 'U').charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <div class="font-semibold text-xs text-slate-800">{{ user.fullName || 'Chưa đặt tên' }}</div>
                                                <div class="text-[11px] font-mono text-slate-500">{{ user.email }}</div>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <span 
                                            :class="[
                                                'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase inline-flex items-center space-x-1 border',
                                                user.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                                            ]"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full" :class="user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                                            <span>{{ user.status === 'ACTIVE' ? 'Hoạt động' : 'Đã khóa' }}</span>
                                        </span>
                                    </td>

                                    <td>
                                        <div class="flex flex-wrap gap-1.5">
                                            <span 
                                                v-for="role in (user.roles || [])" 
                                                :key="role"
                                                :class="[
                                                    'px-2 py-0.5 rounded text-[10px] font-mono font-bold border',
                                                    getRoleBadgeInfo(role).class
                                                ]"
                                            >
                                                {{ getRoleBadgeInfo(role).label }}
                                            </span>
                                        </div>
                                    </td>

                                    <td class="text-right">
                                        <div class="flex items-center justify-end space-x-2">
                                            <button 
                                                @click="openEditRolesModal(user)"
                                                class="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200 shadow-sm"
                                                title="Cấp vai trò"
                                            >
                                                Phân Vai Trò
                                            </button>
                                            <button 
                                                @click="toggleUserStatus(user)"
                                                :class="[
                                                    'px-2.5 py-1 rounded text-xs font-bold transition border shadow-sm',
                                                    user.status === 'ACTIVE' 
                                                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                ]"
                                            >
                                                {{ user.status === 'ACTIVE' ? 'Khóa' : 'Mở Khóa' }}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- =================================================================== -->
            <!-- MODAL PHÂN VAI TRÒ (USER ROLE ASSIGNMENT MODAL) -->
            <!-- =================================================================== -->
            <div v-if="showRoleModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 class="font-bold text-sm text-slate-800">Cấp Phát Vai Trò Người Dùng</h3>
                            <p class="text-[11px] text-slate-400 font-mono">{{ editingUser?.email }}</p>
                        </div>
                        <button @click="showRoleModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
                    </div>

                    <div class="py-4 space-y-2.5">
                        <div class="text-xs font-semibold text-slate-700 mb-1">Chọn vai trò áp dụng cho tài khoản:</div>
                        
                        <div 
                            v-for="role in rolesList" 
                            :key="role.id"
                            @click="toggleUserRole(role.name)"
                            :class="[
                                'p-3 rounded-xl border cursor-pointer transition flex items-center justify-between',
                                userRolesForm.roles.includes(role.name) 
                                    ? 'bg-blue-50/70 border-blue-500 shadow-sm' 
                                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            ]"
                        >
                            <div>
                                <div class="text-xs font-bold text-slate-800">{{ role.name }}</div>
                                <div class="text-[11px] text-slate-500">{{ role.description }}</div>
                            </div>
                            <input 
                                type="checkbox" 
                                :checked="userRolesForm.roles.includes(role.name)" 
                                class="w-4 h-4 text-blue-600 rounded border-slate-300 pointer-events-none"
                            />
                        </div>
                    </div>

                    <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                        <button 
                            @click="showRoleModal = false"
                            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                            Hủy Bỏ
                        </button>
                        <button 
                            @click="handleSaveUserRoles"
                            :disabled="isSaving"
                            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
                        >
                            {{ isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi' }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.AdminRbacView = AdminRbacView;
})();
