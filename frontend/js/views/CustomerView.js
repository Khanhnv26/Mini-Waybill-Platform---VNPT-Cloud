/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: QUẢN LÝ DANH BẠ KHÁCH HÀNG BƯU CHÍNH (CUSTOMER CRM VIEW)
 * Phong Cách B2B Enterprise Blue, Đồng Bộ Hero Banner & Bảng Phân Trang Chuẩn RBAC
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const CustomerView = {
        name: 'CustomerView',
        emits: ['create-shipment-for'],
        setup(props, { emit }) {
            const customers = ref([]);
            const isLoading = ref(false);
            const showModal = ref(false);
            const isSaving = ref(false);

            // Tìm kiếm & Bộ lọc
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');
            const currentPage = ref(1);
            const pageSize = ref(5);

            // Form Thêm mới khách hàng
            const newCustomer = reactive({
                customerCode: '',
                fullName: '',
                phoneNumber: '',
                email: '',
                address: ''
            });

            // Tải danh sách khách hàng từ backend
            const loadCustomers = async () => {
                isLoading.value = true;
                try {
                    const data = await CustomerService.getAllCustomers();
                    customers.value = data || [];
                } catch (err) {
                    Utils.showToast('Lỗi Tải Dữ Liệu', err.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // Thống kê nhanh KPI
            const activeCustomersCount = computed(() => {
                return customers.value.filter(c => c.status === 'ACTIVE').length;
            });

            const corporateCount = computed(() => {
                const corpKeywords = ['công ty', 'tnhh', 'cp', 'tập đoàn', 'chi nhánh', 'doanh nghiệp', 'vnpt', 'bưu điện'];
                return customers.value.filter(c => {
                    const name = (c.fullName || '').toLowerCase();
                    return corpKeywords.some(kw => name.includes(kw));
                }).length;
            });

            // Lọc danh sách theo từ khóa và trạng thái
            const filteredCustomers = computed(() => {
                let list = customers.value;

                // Lọc theo trạng thái
                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(c => c.status === selectedStatusFilter.value);
                }

                // Lọc theo từ khóa tìm kiếm
                const q = searchQuery.value.trim().toLowerCase();
                if (q) {
                    list = list.filter(c => 
                        (c.fullName && c.fullName.toLowerCase().includes(q)) ||
                        (c.phoneNumber && c.phoneNumber.includes(q)) ||
                        (c.customerCode && c.customerCode.toLowerCase().includes(q)) ||
                        (c.email && c.email.toLowerCase().includes(q)) ||
                        (c.address && c.address.toLowerCase().includes(q))
                    );
                }
                return list;
            });

            // Phân trang
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredCustomers.value.length / pageSize.value) || 1;
            });

            const startIndex = computed(() => {
                if (filteredCustomers.value.length === 0) return 0;
                return (currentPage.value - 1) * pageSize.value + 1;
            });

            const endIndex = computed(() => {
                if (pageSize.value === -1) return filteredCustomers.value.length;
                return Math.min(currentPage.value * pageSize.value, filteredCustomers.value.length);
            });

            const paginatedCustomers = computed(() => {
                if (pageSize.value === -1) return filteredCustomers.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredCustomers.value.slice(start, start + pageSize.value);
            });

            watch([searchQuery, selectedStatusFilter, pageSize], () => {
                currentPage.value = 1;
            });

            const goToPage = (page) => {
                if (page >= 1 && page <= totalPages.value) {
                    currentPage.value = page;
                }
            };

            const hasActiveFilter = computed(() => {
                return searchQuery.value.trim() !== '' || selectedStatusFilter.value !== 'ALL';
            });

            const resetFilters = () => {
                searchQuery.value = '';
                selectedStatusFilter.value = 'ALL';
                currentPage.value = 1;
            };

            // Mở Modal thêm mới đối tác
            const openCreateModal = () => {
                newCustomer.customerCode = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
                newCustomer.fullName = '';
                newCustomer.phoneNumber = '';
                newCustomer.email = '';
                newCustomer.address = '';
                showModal.value = true;
            };

            // Lưu tạo mới khách hàng
            const handleCreateCustomer = async () => {
                if (!newCustomer.fullName || !newCustomer.phoneNumber) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Vui lòng nhập họ tên và số điện thoại khách hàng', 'error');
                    return;
                }

                isSaving.value = true;
                try {
                    await CustomerService.createCustomer({ ...newCustomer });
                    Utils.showToast('Thành Công', 'Đã lưu thông tin khách hàng bưu chính');
                    showModal.value = false;
                    loadCustomers();
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            // Chuyển đổi trạng thái đối tác
            const toggleCustomerStatus = async (customer) => {
                const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                const actionText = newStatus === 'ACTIVE' ? 'Kích hoạt' : 'Tạm dừng';
                try {
                    await CustomerService.updateCustomerStatus(customer.id, newStatus);
                    customer.status = newStatus;
                    Utils.showToast('Thành Công', `Đã ${actionText.toLowerCase()} đối tác ${customer.fullName}`);
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                }
            };

            // Tác nghiệp nhanh: Tạo vận đơn cho khách hàng này
            const handleCreateShipmentFor = (customer) => {
                emit('create-shipment-for', customer);
                Utils.showToast('Điều Hướng', `Đang chuẩn bị vận đơn cho đối tác: ${customer.fullName}`);
            };

            onMounted(() => {
                loadCustomers();
            });

            return {
                customers,
                isLoading,
                showModal,
                isSaving,
                newCustomer,
                searchQuery,
                selectedStatusFilter,
                currentPage,
                pageSize,
                totalPages,
                startIndex,
                endIndex,
                hasActiveFilter,
                activeCustomersCount,
                corporateCount,
                filteredCustomers,
                paginatedCustomers,
                goToPage,
                resetFilters,
                openCreateModal,
                handleCreateCustomer,
                toggleCustomerStatus,
                handleCreateShipmentFor,
                loadCustomers,
                Utils
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <!-- 1. HERO BANNER: CHUẨN VNPT GRADIENT ĐỒNG BỘ VỚI RBAC -->
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    CRM Directory
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Lý Danh Bạ &amp; Hồ Sơ Khách Hàng Bưu Chính
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Quản lý tập trung hồ sơ đối tác doanh nghiệp, phân loại khách hàng ký gửi và hỗ trợ tạo vận đơn nhanh toàn trình.
                            </p>
                        </div>

                        <!-- Thống kê nhanh KPI -->
                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ customers.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tổng Đối Tác</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ activeCustomersCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Hoạt Động</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ corporateCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Doanh Nghiệp</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. TOOLBAR TÌM KIẾM & THAO TÁC B2B -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Ô tìm kiếm -->
                        <div class="relative w-full sm:w-72">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                placeholder="Tìm theo tên, SĐT, mã KH, địa chỉ..." 
                                class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button 
                                v-if="searchQuery" 
                                @click="searchQuery = ''" 
                                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <!-- Bộ lọc trạng thái -->
                        <select 
                            v-model="selectedStatusFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Tạm dừng hoạt động</option>
                        </select>

                        <!-- Nút Xóa Lọc -->
                        <button 
                            v-if="hasActiveFilter" 
                            @click="resetFilters" 
                            class="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition flex items-center space-x-1"
                        >
                            <span>✕ Xóa lọc</span>
                        </button>
                    </div>

                    <!-- Nút thao tác phải -->
                    <div class="flex items-center space-x-2">
                        <button 
                            @click="loadCustomers()" 
                            :disabled="isLoading"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center space-x-1"
                            title="Tải lại dữ liệu danh bạ"
                        >
                            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Làm Mới</span>
                        </button>

                        <button 
                            @click="openCreateModal()" 
                            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1.5"
                        >
                            <span>+ Thêm Đối Tác</span>
                        </button>
                    </div>
                </div>

                <!-- 3. BẢNG DỮ LIỆU ĐỐI TÁC KHÁCH HÀNG (TABLE-B2B) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-14 text-center">ID</th>
                                    <th class="w-32">MÃ ĐỐI TÁC</th>
                                    <th>THÔNG TIN KHÁCH HÀNG / DOANH NGHIỆP</th>
                                    <th class="w-44">LIÊN HỆ TRỰC TIẾP</th>
                                    <th>ĐỊA CHỈ TRỤ SỞ / KHO HÀNG</th>
                                    <th class="w-32 text-center">TRẠNG THÁI</th>
                                    <th class="w-48 text-right">TÁC NGHIỆP</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="c in paginatedCustomers" :key="c.id" class="hover:bg-slate-50/80 transition">
                                    <td class="font-mono text-xs font-bold text-slate-400 text-center">#{{ c.id }}</td>
                                    
                                    <td>
                                        <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs inline-block">
                                            {{ c.customerCode }}
                                        </span>
                                    </td>

                                    <td>
                                        <div class="flex items-center space-x-2.5">
                                            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                                                {{ (c.fullName || 'K').charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <div class="font-bold text-slate-800 text-xs leading-tight">
                                                    {{ c.fullName }}
                                                </div>
                                                <div class="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                    Khách hàng thành viên bưu chính
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div class="space-y-0.5">
                                            <div class="font-mono font-bold text-slate-700 text-xs flex items-center space-x-1">
                                                <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                                </svg>
                                                <span>{{ c.phoneNumber }}</span>
                                            </div>
                                            <div class="text-[11px] text-slate-500 truncate max-w-[160px]" :title="c.email || ''">
                                                {{ c.email || 'Chưa cập nhật email' }}
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <div class="text-xs text-slate-600 max-w-xs line-clamp-2" :title="c.address || ''">
                                            {{ c.address || 'Chưa có địa chỉ chi tiết' }}
                                        </div>
                                    </td>

                                    <td class="text-center">
                                        <span 
                                            :class="[
                                                'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold inline-flex items-center space-x-1 border',
                                                c.status === 'ACTIVE' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            ]"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full" :class="c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                                            <span>{{ c.status === 'ACTIVE' ? 'Hoạt Động' : 'Tạm Dừng' }}</span>
                                        </span>
                                    </td>

                                    <td class="text-right py-2.5 px-3 whitespace-nowrap">
                                        <div class="flex items-center justify-end space-x-1.5">
                                            <!-- Nút Tạo Đơn Nhanh -->
                                            <button 
                                                @click="handleCreateShipmentFor(c)"
                                                type="button"
                                                class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                                                title="Tạo vận đơn bưu chính điền sẵn thông tin khách hàng này"
                                            >
                                                <span>Tạo Đơn</span>
                                            </button>

                                            <!-- Nút Kích hoạt / Tạm dừng -->
                                            <button 
                                                @click="toggleCustomerStatus(c)"
                                                type="button"
                                                :class="[
                                                    'px-2 py-1 rounded-lg text-xs font-bold transition border shadow-xs',
                                                    c.status === 'ACTIVE' 
                                                        ? 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200' 
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                ]"
                                                :title="c.status === 'ACTIVE' ? 'Tạm dừng đối tác này' : 'Kích hoạt lại đối tác'"
                                            >
                                                {{ c.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt' }}
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Trạng thái rỗng -->
                                <tr v-if="filteredCustomers.length === 0">
                                    <td colspan="7" class="text-center py-12 text-slate-400 text-xs">
                                        <div class="flex flex-col items-center justify-center space-y-2">
                                            <svg class="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <span class="font-medium">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</span>
                                            <button v-if="hasActiveFilter" @click="resetFilters" class="text-blue-600 hover:underline font-bold text-xs">
                                                Xóa tất cả điều kiện lọc
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- 4. THANH PHÂN TRANG CHUẨN B2B (PAGINATION BAR) -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600 gap-2">
                        <div class="flex items-center space-x-2">
                            <span>Hiển thị <b>{{ startIndex }}</b> - <b>{{ endIndex }}</b> trên tổng <b>{{ filteredCustomers.length }}</b> đối tác</span>
                            <span class="text-slate-300">|</span>
                            <span>Số dòng:</span>
                            <select 
                                v-model.number="pageSize" 
                                class="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                            >
                                <option :value="5">5</option>
                                <option :value="10">10</option>
                                <option :value="20">20</option>
                                <option :value="-1">Tất cả</option>
                            </select>
                        </div>

                        <div v-if="totalPages > 1" class="flex items-center space-x-1 self-end sm:self-auto">
                            <button 
                                @click="goToPage(currentPage - 1)" 
                                :disabled="currentPage === 1"
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                            >
                                ‹
                            </button>
                            <button 
                                v-for="p in totalPages" 
                                :key="p"
                                @click="goToPage(p)"
                                :class="[
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition',
                                    currentPage === p 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                                ]"
                            >
                                {{ p }}
                            </button>
                            <button 
                                @click="goToPage(currentPage + 1)" 
                                :disabled="currentPage === totalPages"
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 5. MODAL THÊM MỚI KHÁCH HÀNG (ACRYLIC BLUR CHUẨN RBAC) -->
                <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
                        <!-- Modal Header -->
                        <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <h3 class="font-extrabold text-xs uppercase tracking-wider text-slate-800">Thêm Mới Đối Tác Bưu Chính</h3>
                            </div>
                            <button @click="showModal = false" class="text-slate-400 hover:text-slate-700 text-lg font-bold">×</button>
                        </div>

                        <!-- Modal Body -->
                        <form @submit.prevent="handleCreateCustomer" class="p-5 space-y-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã Khách Hàng (Tự sinh)</label>
                                <input 
                                    v-model="newCustomer.customerCode" 
                                    type="text" 
                                    readonly 
                                    class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600" 
                                />
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Họ và Tên / Tên Doanh Nghiệp <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="newCustomer.fullName" 
                                    type="text" 
                                    required 
                                    placeholder="VD: Công ty CP Viễn Thông VNPT..." 
                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                />
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại <span class="text-rose-500">*</span></label>
                                    <input 
                                        v-model="newCustomer.phoneNumber" 
                                        type="text" 
                                        required 
                                        placeholder="09..." 
                                        class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Email Liên Hệ</label>
                                    <input 
                                        v-model="newCustomer.email" 
                                        type="email" 
                                        placeholder="contact@domain.com" 
                                        class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                    />
                                </div>
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Địa Chỉ Trụ Sở / Kho Hàng</label>
                                <textarea 
                                    v-model="newCustomer.address" 
                                    rows="2" 
                                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành..." 
                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                ></textarea>
                            </div>

                            <!-- Modal Footer -->
                            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                                <button 
                                    type="button" 
                                    @click="showModal = false" 
                                    class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                                >
                                    Hủy Bỏ
                                </button>
                                <button 
                                    type="submit" 
                                    :disabled="isSaving" 
                                    class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-1"
                                >
                                    <span v-if="isSaving" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                                    <span>{{ isSaving ? 'Đang Lưu...' : 'Xác Nhận Lưu' }}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `
    };

    window.CustomerView = CustomerView;
})();

