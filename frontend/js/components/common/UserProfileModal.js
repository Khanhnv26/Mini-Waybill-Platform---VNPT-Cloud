/**
 * VNPT CLOUD - USER PROFILE MODAL COMPONENT
 * Modal quản lý hồ sơ cá nhân, phân định quyền hạn nhân sự (Staff) vs thông tin Shop (Customer).
 * Tuân thủ cơ chế Station Context Binding: Trạm công tác và chức danh bảo vệ theo JWT server.
 * Angular-Ready Standalone Component.
 */
(function () {
    const template = `
    <Transition name="modal">
        <div 
            v-if="show" 
            class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            @click.self="$emit('close')"
        >
            <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
                <!-- Header chuẩn VNPT Gradient -->
                <div class="vnpt-gradient text-white p-4 sm:p-5 flex items-center justify-between relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 14px 14px;"></div>
                    <div class="relative z-10 flex items-center space-x-3">
                        <div class="w-10 h-10 rounded-xl overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center font-black text-sm shadow-inner">
                            <img 
                                v-if="currentUser?.avatarUrl" 
                                :src="currentUser.avatarUrl" 
                                :alt="currentUser.fullName || 'Avatar'" 
                                class="w-full h-full object-cover"
                                referrerpolicy="no-referrer"
                                @error="currentUser.avatarUrl = null"
                            />
                            <span v-else>
                                {{ (profileFormData.fullName || currentUser?.fullName || 'U').charAt(0).toUpperCase() }}
                            </span>
                        </div>
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">
                                {{ isStaffUser ? 'Hồ Sơ Cán Bộ & Vị Trí Vận Hành' : 'Hồ Sơ & Thông Tin Shop' }}
                            </h3>
                            <p class="text-[11px] text-blue-100 font-medium">
                                {{ isStaffUser ? 'Nhân Sự Nội Bộ VNPT Post' : 'Bưu chính Viễn thông VNPT' }}
                            </p>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        @click="$emit('close')" 
                        class="relative z-10 w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                        title="Đóng"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Loading State -->
                <div v-if="isLoading" class="p-8 text-center space-y-3">
                    <div class="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div class="text-xs text-slate-500 font-medium">Đang tải hồ sơ bưu chính...</div>
                </div>

                <!-- Profile Form -->
                <form v-else @submit.prevent="$emit('save')" class="p-5 space-y-4 text-xs text-slate-800">
                    <!-- Thẻ Tóm Tắt Định Danh Dành Cho Nhân Viên Nội Bộ -->
                    <div v-if="isStaffUser" class="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2.5">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-[10px] uppercase font-bold text-slate-500">Mã Cán Bộ / Nhân Viên</div>
                                <div class="text-xs font-mono font-bold text-blue-700 mt-0.5">
                                    NV-{{ String(currentUser?.userId || currentUser?.id || 1).padStart(5, '0') }}
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-[10px] uppercase font-bold text-slate-500">Chức Danh Vận Hành</div>
                                <span class="inline-block mt-0.5 px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                                    {{ getRoleTitle ? getRoleTitle(currentUser?.roles?.[0]) : (currentUser?.roles?.[0] || 'NHÂN VIÊN') }}
                                </span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-blue-100 flex items-center justify-between text-[11px]">
                            <span class="text-slate-600 font-semibold flex items-center space-x-1.5">
                                <svg class="w-3.5 h-3.5 text-blue-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                <span>Trạm công tác trực thuộc:</span>
                            </span>
                            <span class="font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-xs">
                                {{ currentUser?.locationCode || 'Chưa phân công trạm' }}
                            </span>
                        </div>
                    </div>

                    <!-- Thẻ Tóm Tắt Định Danh Dành Cho Khách Hàng / Đối Tác -->
                    <div v-else class="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                        <div>
                            <div class="text-[10px] uppercase font-bold text-slate-400">Mã Đối Tác / Khách Hàng</div>
                            <div class="text-xs font-mono font-bold text-blue-700 mt-0.5">
                                {{ userProfile?.customerCode || ('KH-' + (currentUser?.userId || 'VNPT')) }}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-[10px] uppercase font-bold text-slate-400">Vai Trò Hệ Thống</div>
                            <span class="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                {{ currentUser?.roles?.[0] ? currentUser.roles[0].replace('ROLE_', '') : 'CUSTOMER' }}
                            </span>
                        </div>
                    </div>

                    <!-- Email & Google Link -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-[11px] font-bold text-slate-700">
                                {{ isStaffUser ? 'Email Công Vụ' : 'Email Tài Khoản' }}
                            </label>
                            <span v-if="currentUser?.googleLinked || currentUser?.avatarUrl" class="text-[10px] text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                                Đã liên kết Google
                            </span>
                            <button 
                                v-else 
                                type="button" 
                                @click="$emit('trigger-google-link')" 
                                :disabled="isLinkingGoogle"
                                class="text-[10px] font-semibold text-blue-700 hover:text-blue-800 underline hover:no-underline cursor-pointer disabled:opacity-50"
                            >
                                {{ isLinkingGoogle ? 'Đang liên kết...' : 'Liên kết tài khoản Google' }}
                            </button>
                        </div>
                        <input 
                            type="email" 
                            :value="currentUser?.email" 
                            disabled 
                            class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-500 cursor-not-allowed"
                        />
                        <div id="googleLinkModalBtn" class="mt-2 hidden flex justify-center"></div>
                    </div>

                    <!-- Họ tên / Tên Shop -->
                    <div>
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                            {{ isStaffUser ? 'Họ Và Tên Cán Bộ / Nhân Viên' : 'Họ Và Tên / Tên Cửa Hàng (Shop)' }} <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            v-model="profileFormData.fullName" 
                            type="text" 
                            required 
                            :placeholder="isStaffUser ? 'VD: Nguyễn Văn A' : 'VD: Shop Thời Trang Mai Anh'"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        />
                    </div>

                    <!-- Số điện thoại (Bắt buộc cho khách hàng, tùy chọn/ẩn cho nhân sự) -->
                    <div v-if="!isStaffUser">
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                            Số Điện Thoại Liên Hệ <span class="text-rose-500">*</span>
                        </label>
                        <input 
                            v-model="profileFormData.phoneNumber" 
                            type="tel" 
                            required 
                            placeholder="VD: 0912345678"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        />
                    </div>

                    <!-- Địa chỉ lấy hàng mặc định (Khách hàng / Shop) -->
                    <div v-if="!isStaffUser">
                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                            Địa Chỉ Kho Hàng / Địa Chỉ Lấy Hàng Mặc Định <span class="text-rose-500">*</span>
                        </label>
                        <textarea 
                            v-model="profileFormData.address" 
                            rows="2" 
                            required 
                            placeholder="VD: Số 57 Huỳnh Thúc Kháng, Láng Hạ, Đống Đa, Hà Nội"
                            class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        ></textarea>
                    </div>

                    <!-- Ghi chú nguyên tắc Station Context Binding -->
                    <div v-if="isStaffUser" class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 leading-relaxed">
                        <span class="font-bold text-slate-700">Lưu ý nghiệp vụ:</span> Trạm công tác và chức danh vận hành được bảo vệ và cấu hình bởi Quản trị viên hệ thống theo nguyên tắc Station Context Binding.
                    </div>

                    <!-- Actions -->
                    <div class="pt-2 flex items-center justify-end space-x-2 border-t border-slate-100">
                        <button 
                            type="button" 
                            @click="$emit('close')" 
                            class="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition text-xs cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button 
                            type="submit" 
                            :disabled="isSaving" 
                            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md shadow-blue-600/20 transition text-xs flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            <span v-if="isSaving" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                            <span>{{ isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi' }}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </Transition>
    `;

    const UserProfileModal = {
        name: 'UserProfileModal',
        template,
        props: {
            show: { type: Boolean, default: false },
            currentUser: { type: Object, default: null },
            userProfile: { type: Object, default: null },
            isStaffUser: { type: Boolean, default: false },
            isLoading: { type: Boolean, default: false },
            isSaving: { type: Boolean, default: false },
            isLinkingGoogle: { type: Boolean, default: false },
            profileFormData: {
                type: Object,
                default: () => ({ fullName: '', phoneNumber: '', address: '' })
            },
            getRoleTitle: { type: Function, default: null }
        },
        emits: ['close', 'save', 'trigger-google-link']
    };

    window.UserProfileModal = UserProfileModal;
})();
