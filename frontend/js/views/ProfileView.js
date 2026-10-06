
(function () {
    const { ref, reactive, computed, onMounted } = Vue;

    const PERMISSION_DESCRIPTIONS = {
        'tracking:update_hub': 'Quét bưu phẩm nhập và xuất kho Hub chia chọn',
        'tracking:update_post_office': 'Tiếp nhận và xử lý bưu phẩm tại bưu cục giao dịch',
        'tracking:update_delivery': 'Cập nhật trạng thái phát hàng chặng cuối (Bưu tá)',
        'routing:trip_manage': 'Quản lý lộ trình và điều phối chuyến xe tải Bắc - Nam',
        'shipment:create': 'Khởi tạo vận đơn bưu gửi tại quầy tiếp nhận',
        'reports:view': 'Xem báo cáo doanh thu & đối soát sản lượng bưu chính',
        'user:read': 'Tra cứu danh bạ và hồ sơ đối tác khách hàng',
        'user:assign_role': 'Quản trị hệ thống & phân quyền vai trò người dùng'
    };

    const ROLE_TITLES = {
        'ROLE_ADMIN': 'Quản Trị Viên Toàn Hệ Thống',
        'ROLE_POST_OPERATOR': 'Giao Dịch Viên Bưu Cục',
        'ROLE_POST_OFFICE_OPERATOR': 'Giao Dịch Viên Bưu Cục',
        'ROLE_HUB_OPERATOR': 'Điều Phối Viên Kho Hub',
        'ROLE_SHIPPER': 'Bưu Tá Giao Vận Chặng Cuối',
        'ROLE_DISPATCHER': 'Điều Phối Đội Xe Vận Tải',
        'ROLE_CS': 'Chăm Sóc Khách Hàng (CS)',
        'ROLE_CUSTOMER': 'Khách Hàng Doanh Nghiệp / Chủ Shop'
    };

    const ProfileView = {
        name: 'ProfileView',
        emits: ['user-updated', 'back-home'],
        setup(props, { emit }) {
            const currentSubTab = ref('info');
            const currentUser = ref(window.Auth ? window.Auth.getUser() : null);
            const userProfile = ref(null);
            const isLoading = ref(false);

            const isSavingProfile = ref(false);
            const isSavingPassword = ref(false);
            const isSavingSettings = ref(false);
            const showAvatarModal = ref(false);
            const avatarInputUrl = ref('');

            const profileForm = reactive({
                fullName: '',
                phoneNumber: '',
                address: '',
                shopBrandName: ''
            });

            const passwordForm = reactive({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });

            const shopSettings = reactive({
                bankName: 'Vietcombank',
                bankAccount: '',
                bankAccountName: '',
                feePayer: 'RECEIVER',
                inspectionRule: 'ALLOW_VIEW_NO_TRY',
                driverNote: 'Vui lòng gọi trước khi giao hàng'
            });

            const isStaffUser = computed(() => {
                return window.Auth && window.Auth.isInternalStaff();
            });

            const roleTitle = computed(() => {
                const role = currentUser.value?.roles?.[0];
                return ROLE_TITLES[role] || (role ? role.replace('ROLE_', '') : 'Thành Viên');
            });

            const uniqueCode = computed(() => {
                const u = currentUser.value;
                if (!u) return 'VNPT';
                if (isStaffUser.value) {
                    const id = u.userId || u.id || 1;
                    return 'NV-' + String(id).padStart(5, '0');
                }
                return userProfile.value?.customerCode || ('KH-' + String(u.userId || u.id || 'VNPT'));
            });

            const passwordStrength = computed(() => {
                const pwd = passwordForm.newPassword;
                if (!pwd) {
                    return { width: '0%', color: 'bg-rose-500', text: 'Chưa nhập', textClass: 'text-slate-400' };
                }
                if (pwd.length < 6) {
                    return { width: '33%', color: 'bg-rose-500', text: 'Yếu (<6)', textClass: 'text-rose-500 font-bold' };
                }
                if (pwd.length < 10) {
                    return { width: '66%', color: 'bg-amber-500', text: 'Trung bình', textClass: 'text-amber-600 font-bold' };
                }
                return { width: '100%', color: 'bg-emerald-500', text: 'Mạnh', textClass: 'text-emerald-600 font-bold' };
            });

            const accountStats = reactive({
                orders: null,
                successRate: null
            });

            const formatStatNumber = (value) => {
                const num = Number(value);
                if (!Number.isFinite(num)) return '—';
                return new Intl.NumberFormat('vi-VN').format(num);
            };

            const normalizePhone = (value) => String(value || '').replace(/[\s.\-]/g, '');

            const parsedPermissions = computed(() => {
                const perms = currentUser.value?.permissions || [];
                if (!Array.isArray(perms) || perms.length === 0) return [];
                return perms.map(p => ({
                    code: p,
                    desc: PERMISSION_DESCRIPTIONS[p] || 'Quyền tác nghiệp bưu chính chuyên biệt'
                }));
            });

            const loadAccountData = async () => {
                if (!window.Auth || !window.Auth.isAuthenticated()) return;
                isLoading.value = true;
                try {
                    currentUser.value = window.Auth.getUser() || {};
                    profileForm.fullName = currentUser.value.fullName || '';
                    profileForm.phoneNumber = currentUser.value.phoneNumber || '';

                    if (isStaffUser.value) {
                        const prof = await window.Auth.getMyProfile().catch(() => null);
                        if (prof) {
                            userProfile.value = prof;
                            currentUser.value = { ...currentUser.value, ...prof };
                            profileForm.fullName = prof.fullName || profileForm.fullName;
                            profileForm.phoneNumber = prof.phoneNumber || profileForm.phoneNumber;
                        }
                    } else if (window.CustomerService) {
                        const prof = await window.CustomerService.getMyProfile().catch(() => null);
                        if (prof) {
                            userProfile.value = prof;
                            profileForm.fullName = prof.fullName || profileForm.fullName;
                            profileForm.phoneNumber = prof.phoneNumber || profileForm.phoneNumber;
                            profileForm.address = prof.address || '';
                        }
                    }

                            const userId = currentUser.value.userId || currentUser.value.id || 'default';
                    const savedSettings = localStorage.getItem('waybill_shop_settings_' + userId);
                    if (savedSettings) {
                        try {
                            const parsed = JSON.parse(savedSettings);
                            Object.assign(shopSettings, parsed);
                            if (parsed.shopBrandName) {
                                profileForm.shopBrandName = parsed.shopBrandName;
                            }
                        } catch {}
                    }
                    if (window.ReportService) {
                        const today = new Date();
                        const toDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        const summary = await window.ReportService.getSummary({
                            fromDate: '2020-01-01',
                            toDate,
                            status: 'ALL',
                            page: 0,
                            size: 1
                        }).catch(() => null);
                        if (summary) {
                            accountStats.orders = Number(summary.totalOrders) || 0;
                            accountStats.successRate = Number(summary.successRate) || 0;
                        }
                    }
                } catch (err) {
                    console.warn('[ProfileView] Lỗi nạp thông tin:', err);
                } finally {
                    isLoading.value = false;
                }
            };

            const handleSaveProfile = async () => {
                if (!profileForm.fullName.trim()) {
                    if (window.Utils) {
                        window.Utils.showToast('Thiếu Thông Tin', 'Vui lòng nhập họ và tên hoặc tên đơn vị', 'warning');
                    }
                    return;
                }

                isSavingProfile.value = true;
                try {
                    if (isStaffUser.value) {
                        const updated = await window.Auth.updateMyProfile({
                            fullName: profileForm.fullName.trim(),
                            phoneNumber: normalizePhone(profileForm.phoneNumber)
                        });
                        currentUser.value = { ...currentUser.value, ...updated, fullName: profileForm.fullName.trim() };
                    } else if (window.CustomerService) {
                        const updated = await window.CustomerService.updateMyProfile({
                            fullName: profileForm.fullName.trim(),
                            phoneNumber: normalizePhone(profileForm.phoneNumber),
                            address: profileForm.address.trim()
                        });
                        userProfile.value = updated;
                        currentUser.value = {
                            ...currentUser.value,
                            fullName: profileForm.fullName.trim(),
                            phoneNumber: normalizePhone(profileForm.phoneNumber)
                        };
                        if (window.Auth && window.Auth.getToken()) {
                            window.Auth.setSession(window.Auth.getToken(), currentUser.value);
                        }

                                    const userId = currentUser.value.userId || currentUser.value.id || 'default';
                        shopSettings.shopBrandName = profileForm.shopBrandName.trim();
                        localStorage.setItem('waybill_shop_settings_' + userId, JSON.stringify(shopSettings));
                    }

                    if (window.Utils) {
                        window.Utils.showToast('Thành Công', 'Đã lưu thay đổi hồ sơ tài khoản');
                    }
                    emit('user-updated', currentUser.value);
                } catch (err) {
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi Cập Nhật', err.message || 'Không thể lưu hồ sơ', 'error');
                    }
                } finally {
                    isSavingProfile.value = false;
                }
            };

            const handleChangePassword = async () => {
                if (passwordForm.newPassword.length < 6) {
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi Mật Khẩu', 'Mật khẩu mới phải có tối thiểu 6 ký tự', 'warning');
                    }
                    return;
                }

                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi Mật Khẩu', 'Xác nhận mật khẩu mới không khớp', 'error');
                    }
                    return;
                }

                isSavingPassword.value = true;
                try {
                    await window.Auth.changePassword({
                        currentPassword: passwordForm.currentPassword,
                        newPassword: passwordForm.newPassword,
                        confirmPassword: passwordForm.confirmPassword
                    });

                    passwordForm.currentPassword = '';
                    passwordForm.newPassword = '';
                    passwordForm.confirmPassword = '';

                    if (window.Utils) {
                        window.Utils.showToast('Thành Công', 'Đã đổi mật khẩu tài khoản thành công!');
                    }
                } catch (err) {
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi Đổi Mật Khẩu', err.message || 'Không thể đổi mật khẩu', 'error');
                    }
                } finally {
                    isSavingPassword.value = false;
                }
            };

            const handleSaveShopSettings = () => {
                isSavingSettings.value = true;
                try {
                    const userId = currentUser.value.userId || currentUser.value.id || 'default';
                    shopSettings.shopBrandName = profileForm.shopBrandName;
                    localStorage.setItem('waybill_shop_settings_' + userId, JSON.stringify(shopSettings));
                    
                    setTimeout(() => {
                        isSavingSettings.value = false;
                        if (window.Utils) {
                            window.Utils.showToast('Thành Công', 'Đã lưu cấu hình tài khoản COD và vận đơn mặc định');
                        }
                    }, 400);
                } catch (err) {
                    isSavingSettings.value = false;
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi', 'Không thể lưu cấu hình', 'error');
                    }
                }
            };

            const saveAvatarFromUrl = async () => {
                const url = avatarInputUrl.value.trim();
                if (!url) return;
                try {
                    await window.Auth.updateMyProfile({
                        fullName: profileForm.fullName || currentUser.value.fullName,
                        avatarUrl: url
                    });
                    currentUser.value.avatarUrl = url;
                    showAvatarModal.value = false;
                    avatarInputUrl.value = '';
                    if (window.Utils) {
                        window.Utils.showToast('Thành Công', 'Đã cập nhật ảnh đại diện mới');
                    }
                    emit('user-updated', currentUser.value);
                } catch (err) {
                    if (window.Utils) {
                        window.Utils.showToast('Lỗi', err.message || 'Không thể lưu ảnh đại diện', 'error');
                    }
                }
            };

            const selectPresetColor = async (bgClass) => {
                showAvatarModal.value = false;
                currentUser.value.avatarBg = bgClass;
                const userId = currentUser.value.userId || currentUser.value.id || 'default';
                localStorage.setItem('waybill_avatar_bg_' + userId, bgClass);
                if (window.Utils) {
                    window.Utils.showToast('Cập Nhật', 'Đã thay đổi phong cách hiển thị avatar');
                }
            };

            onMounted(() => {
                loadAccountData();
            });

            return {
                currentSubTab,
                currentUser,
                userProfile,
                isLoading,
                isStaffUser,
                roleTitle,
                uniqueCode,
                profileForm,
                accountStats,
                formatStatNumber,
                passwordForm,
                shopSettings,
                passwordStrength,
                parsedPermissions,
                isSavingProfile,
                isSavingPassword,
                isSavingSettings,
                showAvatarModal,
                avatarInputUrl,
                handleSaveProfile,
                handleChangePassword,
                handleSaveShopSettings,
                saveAvatarFromUrl,
                selectPresetColor
            };
        },
        template: `
            <div class="space-y-4 pb-8 text-slate-800">
                <div class="rounded-2xl vnpt-gradient text-white p-5 sm:p-6 shadow-md shadow-blue-900/10 relative overflow-hidden transition-all duration-300">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1.2px, transparent 1.2px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div class="flex items-center space-x-4">
                            <div class="relative group cursor-pointer" @click="showAvatarModal = true" title="Bấm để đổi ảnh đại diện">
                                <div class="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl overflow-hidden bg-white/15 border-2 border-white/30 shadow-inner flex items-center justify-center font-black text-xl text-white transition-transform duration-200 group-hover:scale-105">
                                    <img 
                                        v-if="currentUser?.avatarUrl" 
                                        :src="currentUser.avatarUrl" 
                                        :alt="currentUser.fullName || 'Avatar'" 
                                        class="w-full h-full object-cover"
                                        referrerpolicy="no-referrer"
                                        @error="currentUser.avatarUrl = null"
                                    />
                                    <span v-else>
                                        {{ (profileForm.fullName || currentUser?.fullName || 'U').charAt(0).toUpperCase() }}
                                    </span>
                                </div>
                                <div class="absolute inset-0 bg-slate-900/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-[10px] font-bold text-white backdrop-blur-[1px]">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    Đổi ảnh
                                </div>
                                <span class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-xs" title="Tài khoản đang kết nối trực tuyến"></span>
                            </div>

                            <div class="space-y-1">
                                <div class="flex items-center space-x-2 flex-wrap gap-y-1">
                                    <h1 class="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                                        {{ profileForm.fullName || currentUser?.fullName || currentUser?.email }}
                                    </h1>
                                    <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-white/20 text-white text-[10.5px] font-bold tracking-wide border border-white/25">
                                        Đã Xác Thực
                                    </span>
                                </div>
                                <p class="text-xs text-blue-100 font-mono">{{ currentUser?.email }}</p>
                                <div class="flex flex-wrap items-center gap-2 pt-0.5">
                                    <span class="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white text-blue-800 shadow-xs">
                                        {{ roleTitle }}
                                    </span>
                                    <span class="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-blue-900/60 text-blue-200 border border-blue-400/30">
                                        {{ uniqueCode }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center space-x-2 self-start md:self-auto">
                            <div class="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px] transition-transform hover:scale-105">
                                <div class="text-sm sm:text-base font-bold leading-tight font-mono text-white">
                                    {{ formatStatNumber(accountStats.orders) }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">
                                    Đơn đã ghi nhận
                                </div>
                            </div>

                            <div class="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px] transition-transform hover:scale-105">
                                <div class="text-sm sm:text-base font-bold leading-tight font-mono text-emerald-300">
                                    {{ accountStats.successRate === null ? '—' : Number(accountStats.successRate).toFixed(1) + '%' }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">
                                    Giao thành công
                                </div>
                            </div>

                            <div class="px-3.5 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[88px] transition-transform hover:scale-105">
                                <div class="text-xs font-bold leading-tight font-mono text-amber-300 mt-0.5 truncate">
                                    {{ isStaffUser ? (currentUser?.locationCode || 'Chưa gán') : (shopSettings.bankAccount ? 'Đã Cài Đặt' : 'Chưa Cài Đặt') }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">
                                    {{ isStaffUser ? 'Trạm Công Tác' : 'Tài Khoản COD' }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="b2b-card bg-white p-1.5 flex flex-wrap gap-1.5">
                    <button 
                        @click="currentSubTab = 'info'" 
                        :class="[
                            'px-4 py-2 rounded-lg text-xs transition-all duration-200 flex items-center space-x-2 cursor-pointer',
                            currentSubTab === 'info' 
                                ? 'font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs' 
                                : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        ]"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        <span>Thông Tin Cá Nhân &amp; Liên Hệ</span>
                    </button>

                    <button 
                        @click="currentSubTab = 'security'" 
                        :class="[
                            'px-4 py-2 rounded-lg text-xs transition-all duration-200 flex items-center space-x-2 cursor-pointer',
                            currentSubTab === 'security' 
                                ? 'font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs' 
                                : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        ]"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                        <span>Bảo Mật &amp; Đổi Mật Khẩu</span>
                    </button>

                    <button 
                        @click="currentSubTab = 'operations'" 
                        :class="[
                            'px-4 py-2 rounded-lg text-xs transition-all duration-200 flex items-center space-x-2 cursor-pointer',
                            currentSubTab === 'operations' 
                                ? 'font-bold bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs' 
                                : 'font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        ]"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        <span>{{ isStaffUser ? 'Phân Quyền & Vị Trí Vận Hành' : 'Tài Khoản COD & Vận Đơn Mặc Định' }}</span>
                    </button>
                </div>


                <div v-show="currentSubTab === 'info'" class="b2b-card p-5 sm:p-6 space-y-5">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 class="text-xs sm:text-sm font-bold text-slate-800">Thông Tin Hồ Sơ &amp; Điểm Liên Hệ</h3>
                            <p class="text-[11px] text-slate-500">Cập nhật họ tên hiển thị và địa chỉ liên lạc trên hệ thống bưu chính</p>
                        </div>
                        <span class="text-[10.5px] text-slate-400 font-mono">Đồng bộ: Tự động</span>
                    </div>

                    <form @submit.prevent="handleSaveProfile" class="space-y-4 text-xs text-slate-800">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">
                                    {{ isStaffUser ? 'Họ và tên cán bộ / nhân viên' : 'Họ và tên / Tên đơn vị' }} <span class="text-rose-500">*</span>
                                </label>
                                <input 
                                    v-model="profileForm.fullName" 
                                    type="text" 
                                    required
                                    maxlength="100"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>

                            <div>
                                <label class="block font-bold text-slate-700 mb-1">
                                    Số điện thoại liên hệ <span class="text-rose-500" v-if="!isStaffUser">*</span>
                                </label>
                                <input 
                                    v-model="profileForm.phoneNumber" 
                                    type="tel" 
                                    :required="!isStaffUser"
                                    maxlength="15"
                                    placeholder="0912 345 678"
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Email đăng nhập &amp; nhận thông báo</label>
                                <input 
                                    type="email" 
                                    :value="currentUser?.email" 
                                    disabled 
                                    class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-500 cursor-not-allowed text-xs"
                                />
                                <span class="text-[10px] text-slate-400 mt-1 block">Email được gán cố định cho định danh tài khoản bưu chính</span>
                            </div>

                            <div>
                                <label class="block font-bold text-slate-700 mb-1">
                                    {{ isStaffUser ? 'Trạm công tác trực thuộc' : 'Bưu cục giao dịch phụ trách' }}
                                </label>
                                <input 
                                    type="text" 
                                    :value="currentUser?.locationCode || 'Chưa phân bổ'" 
                                    disabled 
                                    class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-semibold text-slate-600 cursor-not-allowed text-xs"
                                />
                                <span class="text-[10px] text-slate-400 mt-1 block">
                                    {{ isStaffUser ? 'Cấu hình bởi Quản trị viên (Station Context Binding)' : 'Điểm tiếp nhận bưu gửi và hỗ trợ lấy hàng' }}
                                </span>
                            </div>
                        </div>

                        <div v-if="!isStaffUser" class="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-3.5 transition-all">
                            <div class="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                                <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                                <span>Thiết Lập Thông Tin Cửa Hàng &amp; Kho Hàng</span>
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Tên thương hiệu Shop (In trên tem bưu gửi)</label>
                                <input 
                                    v-model="profileForm.shopBrandName" 
                                    type="text" 
                                    maxlength="100"
                                    placeholder="VD: Shop Thời Trang Mai Anh"
                                    class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-xs focus:border-blue-600 outline-none"
                                />
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Địa chỉ kho bãi / Điểm lấy hàng mặc định <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="profileForm.address" 
                                    type="text" 
                                    required
                                    maxlength="255"
                                    placeholder="Số 57 Huỳnh Thúc Kháng, Láng Hạ, Đống Đa, Hà Nội"
                                    class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>

                        <div class="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                            <button 
                                type="submit" 
                                :disabled="isSavingProfile"
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                <span v-if="isSavingProfile" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isSavingProfile ? 'Đang Lưu...' : 'Lưu Thay Đổi Hồ Sơ' }}</span>
                            </button>
                        </div>
                    </form>
                </div>

                <div v-show="currentSubTab === 'security'" class="b2b-card p-5 sm:p-6 space-y-5">
                    <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                            <h3 class="text-xs sm:text-sm font-bold text-slate-800">Đổi Mật Khẩu Đăng Nhập</h3>
                            <p class="text-[11px] text-slate-500">Mật khẩu được mã hóa bảo vệ theo tiêu chuẩn bảo mật BCrypt</p>
                        </div>
                        <span class="text-[10.5px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                            Tối thiểu 6 ký tự
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 pt-1">
                        <form @submit.prevent="handleChangePassword" class="md:col-span-7 space-y-3.5 text-xs">
                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Mật khẩu hiện tại <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="passwordForm.currentPassword" 
                                    type="password" 
                                    required 
                                    maxlength="100"
                                    placeholder="Nhập mật khẩu đang dùng" 
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>

                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Mật khẩu mới <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="passwordForm.newPassword" 
                                    type="password" 
                                    required 
                                    maxlength="100"
                                    placeholder="Nhập tối thiểu 6 ký tự" 
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                                <div class="mt-1.5 flex items-center space-x-1.5">
                                    <div class="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                            class="h-full transition-all duration-300"
                                            :class="passwordStrength.color"
                                            :style="{ width: passwordStrength.width }"
                                        ></div>
                                    </div>
                                    <span :class="['text-[10px] min-w-[55px] text-right', passwordStrength.textClass]">
                                        {{ passwordStrength.text }}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Xác nhận mật khẩu mới <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="passwordForm.confirmPassword" 
                                    type="password" 
                                    required 
                                    maxlength="100"
                                    placeholder="Nhập lại mật khẩu mới vừa gõ" 
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                            </div>

                            <div class="pt-1">
                                <button 
                                    type="submit" 
                                    :disabled="isSavingPassword"
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    <span v-if="isSavingPassword" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>{{ isSavingPassword ? 'Đang Xử Lý...' : 'Cập Nhật Mật Khẩu' }}</span>
                                </button>
                            </div>
                        </form>

                        <div class="md:col-span-5 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-3 text-xs flex flex-col justify-between">
                            <div>
                                <div class="font-bold text-slate-800 text-xs flex items-center space-x-1.5 mb-2">
                                    <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                    <span>Tiêu Chuẩn Bảo Mật Mật Khẩu</span>
                                </div>
                                <ul class="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                                    <li class="flex items-start space-x-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                                        <span>Độ dài mật khẩu tối thiểu <strong>6 ký tự</strong> (khuyến nghị từ 8 ký tự).</span>
                                    </li>
                                    <li class="flex items-start space-x-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                                        <span>Nên kết hợp đồng thời chữ hoa, chữ thường và chữ số.</span>
                                    </li>
                                    <li class="flex items-start space-x-2">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0"></span>
                                        <span>Không sử dụng mật khẩu trùng với tài khoản email cá nhân.</span>
                                    </li>
                                </ul>
                            </div>

                            <div class="pt-2.5 border-t border-slate-200/60 text-[10.5px] text-slate-500">
                                Mật khẩu được lưu trữ dưới dạng băm một chiều BCrypt an toàn. Tuyệt đối không chia sẻ mật khẩu tài khoản cho người khác.
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                        <div class="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                            <div class="flex items-center justify-between">
                                <div class="font-bold text-slate-800">Liên Kết Google SSO</div>
                                <span v-if="currentUser?.googleLinked" class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Đã Liên Kết
                                </span>
                                <span v-else class="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200">
                                    Chưa Liên Kết
                                </span>
                            </div>
                            <p v-if="currentUser?.googleLinked" class="text-[11px] text-slate-500 leading-relaxed">
                                Tài khoản đã liên kết Google, có thể đăng nhập bằng Google.
                            </p>
                            <p v-else class="text-[11px] text-slate-500 leading-relaxed">
                                Tài khoản chưa liên kết Google. Ảnh đại diện không đồng nghĩa đã liên kết.
                            </p>
                        </div>

                        <div class="p-3.5 rounded-xl border border-slate-200 bg-white space-y-1.5">
                            <div class="flex items-center justify-between">
                                <div class="font-bold text-slate-800">Phiên Đăng Nhập Hiện Tại</div>
                                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 text-blue-700">
                                    ACTIVE
                                </span>
                            </div>
                            <p class="text-[11px] text-slate-500 leading-relaxed font-mono">
                                Web Browser • JWT HMAC-SHA256
                            </p>
                        </div>
                    </div>
                </div>

                <div v-show="currentSubTab === 'operations'" class="space-y-4">
                    <div v-if="isStaffUser" class="space-y-4">
                        <div class="b2b-card p-5 sm:p-6 space-y-3.5">
                            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <div>
                                    <h3 class="text-xs sm:text-sm font-bold text-slate-800">Bảng Tra Cứu Quyền Hạn Nghiệp Vụ (Permissions Matrix)</h3>
                                    <p class="text-[11px] text-slate-500">Danh sách các quyền hạn được phân bổ trong Token xác thực của tài khoản này</p>
                                </div>
                                <span class="px-2.5 py-0.5 rounded text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    {{ parsedPermissions.length }} Quyền Được Phép
                                </span>
                            </div>

                            <div v-if="parsedPermissions.length === 0" class="text-xs text-slate-500 py-3">
                                Tài khoản chưa được gán quyền tác nghiệp.
                            </div>
                            <div v-else class="divide-y divide-slate-100 text-xs">
                                <div 
                                    v-for="perm in parsedPermissions" 
                                    :key="perm.code" 
                                    class="py-2.5 flex items-center justify-between hover:bg-slate-50/50 px-2 rounded-lg transition"
                                >
                                    <div class="flex items-center space-x-3">
                                        <span class="font-mono font-bold text-blue-700">{{ perm.code }}</span>
                                        <span class="text-slate-600">{{ perm.desc }}</span>
                                    </div>
                                    <span class="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Kích hoạt</span>
                                </div>
                            </div>
                        </div>

                        <div class="b2b-card p-4 sm:p-5 text-xs text-slate-600 leading-relaxed bg-slate-50/50">
                            <div class="font-bold text-slate-800 mb-1 flex items-center space-x-1.5">
                                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                <span>Quy định vận hành trạm công tác:</span>
                            </div>
                            Mã trạm trực thuộc (<span class="font-mono font-bold text-blue-700">{{ currentUser?.locationCode || 'Chưa phân công' }}</span>) quyết định phạm vi dữ liệu bưu gửi mà cán bộ được quyền truy xuất và cập nhật trạng thái theo nguyên tắc Station Context Binding.
                        </div>
                    </div>

                    <div v-else class="space-y-4">
                        <div class="b2b-card p-5 sm:p-6 space-y-4 text-xs">
                            <div class="border-b border-slate-100 pb-3 flex items-center justify-between">
                                <div>
                                    <h3 class="text-xs sm:text-sm font-bold text-slate-800">Tài Khoản Ngân Hàng Nhận Tiền Thu Hộ COD</h3>
                                    <p class="text-[11px] text-slate-500">VNPT Post tự động đối soát và thanh toán tiền thu hộ vào tài khoản này</p>
                                </div>
                                <span v-if="shopSettings.bankAccount" class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Đã Cấu Hình
                                </span>
                                <span v-else class="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200">
                                    Chưa Cài Đặt
                                </span>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Ngân hàng thụ hưởng</label>
                                    <select v-model="shopSettings.bankName" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs focus:bg-white focus:border-blue-600 outline-none">
                                        <option>Vietcombank (Ngoại Thương Việt Nam)</option>
                                        <option>BIDV (Đầu Tư &amp; Phát Triển)</option>
                                        <option>Techcombank</option>
                                        <option>MBBank (Quân Đội)</option>
                                        <option>VietinBank</option>
                                        <option>Agribank</option>
                                        <option>ACB</option>
                                        <option>VPBank</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Số tài khoản</label>
                                    <input 
                                        v-model="shopSettings.bankAccount" 
                                        type="text" 
                                        maxlength="35"
                                        placeholder="VD: 001100428888" 
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 text-xs focus:bg-white focus:border-blue-600 outline-none"
                                    />
                                </div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Tên chủ tài khoản</label>
                                    <input 
                                        v-model="shopSettings.bankAccountName" 
                                        type="text" 
                                        maxlength="100"
                                        placeholder="VD: NGUYEN VAN A" 
                                        class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 uppercase text-xs focus:bg-white focus:border-blue-600 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="b2b-card p-5 sm:p-6 space-y-4 text-xs">
                            <div class="border-b border-slate-100 pb-3">
                                <h3 class="text-xs sm:text-sm font-bold text-slate-800">Cấu Hình Vận Đơn Gửi Hàng Mặc Định</h3>
                                <p class="text-[11px] text-slate-500">Tên shop được điền vào người gửi khi tạo đơn trên trình duyệt này. Tài khoản ngân hàng và ghi chú được lưu trên máy bạn.</p>
                            </div>

                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Bên chịu cước vận chuyển mặc định</label>
                                    <select v-model="shopSettings.feePayer" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs focus:bg-white focus:border-blue-600 outline-none">
                                        <option value="SENDER">Người gửi thanh toán cước (Shop trả)</option>
                                        <option value="RECEIVER">Người nhận thanh toán cước (Thu khi phát hàng)</option>
                                    </select>
                                </div>

                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">Yêu cầu xem hàng khi giao</label>
                                    <select v-model="shopSettings.inspectionRule" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-xs focus:bg-white focus:border-blue-600 outline-none">
                                        <option value="ALLOW_VIEW_NO_TRY">Cho xem hàng, không cho thử</option>
                                        <option value="ALLOW_TRY">Cho thử hàng</option>
                                        <option value="NO_VIEW">Không cho xem hàng</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label class="block font-bold text-slate-700 mb-1">Ghi chú cố định cho bưu tá giao hàng</label>
                                <input 
                                    v-model="shopSettings.driverNote" 
                                    type="text" 
                                    maxlength="255"
                                    placeholder="VD: Hàng dễ vỡ, vui lòng gọi điện trước khi giao" 
                                    class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:border-blue-600 outline-none"
                                />
                            </div>

                            <div class="pt-2 flex justify-end">
                                <button 
                                    type="button" 
                                    @click="handleSaveShopSettings" 
                                    :disabled="isSavingSettings"
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
                                >
                                    <span v-if="isSavingSettings" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>{{ isSavingSettings ? 'Đang Lưu...' : 'Lưu Cấu Hình Mặc Định' }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <teleport to="body">
                    <div v-if="showAvatarModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div class="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl border border-slate-200">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <h4 class="font-bold text-xs text-slate-800 uppercase tracking-wide">Cập Nhật Ảnh Đại Diện</h4>
                                <button @click="showAvatarModal = false" class="w-6 h-6 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-sm font-bold cursor-pointer">&times;</button>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Dán liên kết ảnh trực tuyến (URL):</label>
                                <input 
                                    v-model="avatarInputUrl" 
                                    type="url" 
                                    maxlength="500" 
                                    placeholder="https://domain.com/avatar.jpg" 
                                    class="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 outline-none focus:border-blue-600" 
                                />
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1.5">Hoặc chọn phong cách nhận diện VNPT:</label>
                                <div class="grid grid-cols-4 gap-2">
                                    <div @click="selectPresetColor('bg-blue-600')" class="h-10 rounded-lg bg-blue-600 cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition shadow-xs">Xanh</div>
                                    <div @click="selectPresetColor('bg-slate-800')" class="h-10 rounded-lg bg-slate-800 cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition shadow-xs">Đen</div>
                                    <div @click="selectPresetColor('bg-emerald-600')" class="h-10 rounded-lg bg-emerald-600 cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition shadow-xs">Lá</div>
                                    <div @click="selectPresetColor('bg-indigo-600')" class="h-10 rounded-lg bg-indigo-600 cursor-pointer flex items-center justify-center text-white text-xs font-bold hover:scale-105 transition shadow-xs">Tím</div>
                                </div>
                            </div>
                            <div class="pt-2 flex justify-end space-x-2">
                                <button @click="showAvatarModal = false" class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer">Đóng</button>
                                <button @click="saveAvatarFromUrl" class="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer">Áp Dụng</button>
                            </div>
                        </div>
                    </div>
                </teleport>
            </div>
        `
    };

    window.ProfileView = ProfileView;
})();
