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
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');
            const currentPage = ref(1);
            const pageSize = ref(5);
            const newCustomer = reactive({
                id: null,
                customerCode: '',
                fullName: '',
                phoneNumber: '',
                email: '',
                address: ''
            });
            const loadCustomers = async () => {
                isLoading.value = true;
                try {
                    const data = await CustomerService.getAllCustomers();
                    customers.value = (data || []).slice().sort((a, b) => (b.id || 0) - (a.id || 0));
                } catch (err) {
                    Utils.showToast('Lỗi Tải Dữ Liệu', err.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };
            const activeCustomersCount = computed(() => {
                return customers.value.filter(c => c.status === 'ACTIVE').length;
            });
            const corpKeywords = ['công ty', 'tnhh', 'cp', 'tập đoàn', 'chi nhánh', 'doanh nghiệp', 'waybill', 'bưu điện'];
            const isCorporate = (c) => {
                if (!c || c.customerCode === 'CUS_RETAIL') return false;
                const name = (c.fullName || '').toLowerCase();
                return corpKeywords.some(kw => name.includes(kw));
            };
            const corporateCount = computed(() => {
                return customers.value.filter(c => isCorporate(c)).length;
            });
            const filteredCustomers = computed(() => {
                let list = customers.value;
                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(c => c.status === selectedStatusFilter.value);
                }
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
            const openCreateModal = () => {
                newCustomer.id = null;
                newCustomer.customerCode = 'CUST-' + Math.floor(100000 + Math.random() * 900000);
                newCustomer.fullName = '';
                newCustomer.phoneNumber = '';
                newCustomer.email = '';
                newCustomer.address = '';
                showModal.value = true;
            };
            const openEditModal = (c) => {
                if (!c) return;
                newCustomer.id = c.id;
                newCustomer.customerCode = c.customerCode || '';
                newCustomer.fullName = c.fullName || '';
                newCustomer.phoneNumber = c.phoneNumber || '';
                newCustomer.email = c.email || '';
                newCustomer.address = c.address || '';
                showModal.value = true;
            };
            const normalizePhone = (raw) => {
                let phone = String(raw || '').replace(/[\s.\-()]/g, '').trim();
                if (phone.startsWith('+84')) {
                    phone = '0' + phone.slice(3);
                } else if (/^84(3|5|7|8|9)\d{8}$/.test(phone)) {
                    phone = '0' + phone.slice(2);
                }
                return phone;
            };
            const handleCreateCustomer = async () => {
                const fullName = (newCustomer.fullName || '').trim();
                const phoneNumber = normalizePhone(newCustomer.phoneNumber);
                const email = (newCustomer.email || '').trim();
                const address = (newCustomer.address || '').trim();
                if (!fullName) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Vui lòng nhập họ tên hoặc tên doanh nghiệp', 'error');
                    return;
                }
                if (!phoneNumber) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Vui lòng nhập số điện thoại liên hệ', 'error');
                    return;
                }
                const vnPhoneRegex = /^0(3|5|7|8|9)[0-9]{8}$/;
                if (!vnPhoneRegex.test(phoneNumber)) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số, ví dụ 0912345678)', 'error');
                    return;
                }
                const samePhone = customers.value.find(c => normalizePhone(c.phoneNumber) === phoneNumber && c.id !== newCustomer.id);
                if (samePhone) {
                    Utils.showToast('Thất Bại', `Số điện thoại này đã thuộc về khách hàng ${samePhone.fullName}`, 'error');
                    return;
                }
                if (!email) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Email không được để trống (bắt buộc cho tài khoản bưu chính)', 'error');
                    return;
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    Utils.showToast('Lỗi Nhập Liệu', 'Định dạng email không hợp lệ (ví dụ: name@company.com)', 'error');
                    return;
                }
                const sameEmail = customers.value.find(c => (c.email || '').trim().toLowerCase() === email.toLowerCase() && c.id !== newCustomer.id);
                if (sameEmail) {
                    Utils.showToast('Thất Bại', `Email này đã thuộc về khách hàng ${sameEmail.fullName}`, 'error');
                    return;
                }
                isSaving.value = true;
                try {
                    if (newCustomer.id) {
                        await CustomerService.updateCustomer(newCustomer.id, {
                            fullName,
                            phoneNumber,
                            email,
                            address: address || 'Chưa cập nhật địa chỉ'
                        });
                        Utils.showToast('Thành Công', `Đã cập nhật thông tin đối tác ${fullName}`);
                    } else {
                        await CustomerService.createCustomer({
                            customerCode: newCustomer.customerCode,
                            fullName,
                            phoneNumber,
                            email,
                            address: address || 'Chưa cập nhật địa chỉ'
                        });
                        Utils.showToast('Thành Công', 'Đã lưu thông tin khách hàng bưu chính');
                        searchQuery.value = '';
                        selectedStatusFilter.value = 'ALL';
                        currentPage.value = 1;
                    }
                    showModal.value = false;
                    await loadCustomers();
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };
            const toggleCustomerStatus = async (customer) => {
                const newStatus = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                const actionText = newStatus === 'ACTIVE' ? 'Kích hoạt' : 'Tạm dừng';
                try {
                    await CustomerService.updateCustomerStatus(customer.id, newStatus, customer);
                    customer.status = newStatus;
                    Utils.showToast('Thành Công', `Đã ${actionText.toLowerCase()} đối tác ${customer.fullName}`);
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                }
            };
            const handleCreateShipmentFor = (customer) => {
                if (!customer || customer.status !== 'ACTIVE') {
                    Utils.showToast('Không Khả Dụng', 'Khách hàng đang ở trạng thái Tạm Dừng, không thể tạo vận đơn.', 'warning');
                    return;
                }
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
                openEditModal,
                handleCreateCustomer,
                toggleCustomerStatus,
                handleCreateShipmentFor,
                loadCustomers,
                isCorporate,
                Utils
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>
                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="text-xs font-medium text-blue-100">
                                Hệ Thống Quản Lý Khách Hàng (CRM)
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Lý Danh Bạ &amp; Hồ Sơ Khách Hàng Bưu Chính
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Quản lý tập trung hồ sơ đối tác doanh nghiệp, phân loại khách hàng ký gửi và hỗ trợ tạo vận đơn nhanh toàn trình.
                            </p>
                        </div>
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
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-full sm:w-72">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                maxlength="100"
                                placeholder="Tìm theo tên, SĐT, mã KH, địa chỉ..." 
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                            <button 
                                v-if="searchQuery" 
                                @click="searchQuery = ''" 
                                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                                aria-label="Xóa tìm kiếm"
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <select 
                            v-model="selectedStatusFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Tạm dừng hoạt động</option>
                        </select>
                        <button 
                            v-if="hasActiveFilter" 
                            @click="resetFilters" 
                            class="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition flex items-center space-x-1"
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            <span>Xóa lọc</span>
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button 
                            @click="loadCustomers()" 
                            :disabled="isLoading"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
                            title="Tải lại dữ liệu danh bạ"
                        >
                            {{ isLoading ? 'Đang Tải...' : 'Làm Mới' }}
                        </button>
                        <button 
                            @click="openCreateModal()" 
                            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition"
                        >
                            + Thêm Đối Tác
                        </button>
                    </div>
                </div>
                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    <div class="md:hidden divide-y divide-slate-100 text-xs">
                        <div v-for="c in paginatedCustomers" :key="'mob-cus-' + c.id" class="p-3.5 space-y-3 bg-white">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <div class="w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                                        {{ (c.fullName || 'K').charAt(0).toUpperCase() }}
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-slate-900 leading-tight truncate">
                                            {{ c.fullName }}
                                        </div>
                                        <div class="text-[10.5px] text-slate-400 font-normal">
                                            {{ c.customerCode === 'CUS_RETAIL' ? 'Khách Vãng lai' : (isCorporate(c) ? 'Doanh nghiệp (B2B)' : 'Khách Cá nhân') }}
                                        </div>
                                    </div>
                                </div>
                                <span class="status-indicator shrink-0" :class="c.status === 'ACTIVE' ? 'status-indicator-emerald' : 'status-indicator-slate'">
                                    <span class="status-dot" :class="c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                                    <span>{{ c.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng' }}</span>
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-[11px]">
                                <div>
                                    <span class="text-slate-400 block text-[10px] uppercase">Mã Khách Hàng</span>
                                    <span class="font-mono font-bold text-blue-700">{{ c.customerCode }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 block text-[10px] uppercase">Số Điện Thoại</span>
                                    <a v-if="c.phoneNumber" :href="'tel:' + c.phoneNumber" class="font-mono font-bold text-emerald-600 hover:underline">
                                        {{ c.phoneNumber }}
                                    </a>
                                    <span v-else class="text-slate-400 italic">Chưa có SĐT</span>
                                </div>
                                <div class="col-span-2" v-if="c.email">
                                    <span class="text-slate-400 block text-[10px] uppercase">Email</span>
                                    <a :href="'mailto:' + c.email" class="text-slate-700 hover:text-blue-600 truncate block">
                                        {{ c.email }}
                                    </a>
                                </div>
                                <div class="col-span-2" v-if="c.address">
                                    <span class="text-slate-400 block text-[10px] uppercase">Địa Chỉ</span>
                                    <span class="text-slate-600 leading-tight line-clamp-2">{{ c.address }}</span>
                                </div>
                            </div>

                            <div class="flex items-center gap-2 pt-1">
                                <button 
                                    v-if="c.status === 'ACTIVE'"
                                    @click="handleCreateShipmentFor(c)"
                                    type="button"
                                    class="flex-1 min-h-[44px] py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-bold transition flex items-center justify-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                                    <span>Tạo Đơn Hàng</span>
                                </button>
                                <button 
                                    v-if="c.customerCode !== 'CUS_RETAIL'"
                                    @click="openEditModal(c)" 
                                    type="button"
                                    class="min-h-[44px] px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition flex items-center justify-center cursor-pointer"
                                    title="Sửa thông tin"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                </button>
                                <button 
                                    v-if="c.customerCode !== 'CUS_RETAIL'"
                                    @click="toggleCustomerStatus(c)"
                                    type="button"
                                    :class="[
                                        'min-h-[44px] px-3.5 rounded-xl font-semibold transition border cursor-pointer flex items-center justify-center',
                                        c.status === 'ACTIVE' 
                                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' 
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    ]"
                                    :title="c.status === 'ACTIVE' ? 'Tạm dừng đối tác' : 'Kích hoạt lại'"
                                >
                                    <span>{{ c.status === 'ACTIVE' ? 'Khóa' : 'Mở' }}</span>
                                </button>
                            </div>
                        </div>
                        <div v-if="filteredCustomers.length === 0" class="text-center py-10 text-slate-400 text-xs">
                            <span class="font-bold text-slate-600 block">Không tìm thấy khách hàng nào.</span>
                            <button v-if="hasActiveFilter" @click="resetFilters" class="text-blue-600 hover:underline font-bold text-xs mt-1">
                                Xóa tất cả điều kiện lọc
                            </button>
                        </div>
                    </div>
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th class="py-2.5 px-3.5 w-72">MÃ &amp; HỌ TÊN KHÁCH HÀNG</th>
                                    <th class="py-2.5 px-3.5 w-52">LIÊN HỆ (EMAIL)</th>
                                    <th class="py-2.5 px-3.5">ĐỊA CHỈ TRỤ SỞ / KHO HÀNG</th>
                                    <th class="py-2.5 px-3.5 text-center w-36">TRẠNG THÁI</th>
                                    <th class="py-2.5 px-3.5 text-right w-44">TÁC NGHIỆP</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs">
                                <tr v-for="c in paginatedCustomers" :key="c.id" class="hover:bg-slate-50/80 transition">
                                    <td class="py-2.5 px-3.5">
                                        <div class="flex items-center gap-2.5">
                                            <div class="w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-xs shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                                                {{ (c.fullName || 'K').charAt(0).toUpperCase() }}
                                            </div>
                                            <div class="min-w-0 max-w-[220px]">
                                                <div class="flex items-center gap-1.5 flex-wrap">
                                                    <span class="font-bold text-slate-900 leading-tight truncate" :title="c.fullName">
                                                        {{ c.fullName }}
                                                    </span>
                                                    <span class="text-[11px] text-slate-400 font-normal shrink-0">
                                                        • {{ c.customerCode === 'CUS_RETAIL' ? 'Vãng lai' : (isCorporate(c) ? 'Doanh nghiệp' : 'Cá nhân') }}
                                                    </span>
                                                </div>
                                                <div class="text-[10px] text-blue-700 font-mono font-bold mt-0.5 truncate">
                                                    {{ c.customerCode }} • {{ c.phoneNumber || 'Chưa SĐT' }}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3.5">
                                        <div class="text-xs text-slate-700 font-medium truncate max-w-[190px]" :title="c.email || ''">
                                            {{ c.email || 'Chưa cập nhật email' }}
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3.5">
                                        <div class="text-xs text-slate-600 max-w-xs line-clamp-2" :title="c.address || ''">
                                            {{ c.address || 'Chưa có địa chỉ chi tiết' }}
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3.5 text-center">
                                        <span class="status-indicator" :class="c.status === 'ACTIVE' ? 'status-indicator-emerald' : 'status-indicator-slate'">
                                            <span class="status-dot" :class="c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                                            <span>{{ c.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng' }}</span>
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
                                        <div class="flex items-center justify-end space-x-1.5">
                                            <button 
                                                v-if="c.status === 'ACTIVE'"
                                                @click="handleCreateShipmentFor(c)"
                                                type="button"
                                                class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition flex items-center space-x-1 shadow-xs cursor-pointer"
                                                title="Tạo vận đơn bưu chính điền sẵn thông tin khách hàng này"
                                            >
                                                <span>Tạo Đơn</span>
                                            </button>
                                            <button 
                                                v-if="c.customerCode !== 'CUS_RETAIL'"
                                                @click="openEditModal(c)" 
                                                type="button"
                                                class="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                                title="Chỉnh sửa thông tin đối tác"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>
                                            <button 
                                                v-if="c.customerCode !== 'CUS_RETAIL'"
                                                @click="toggleCustomerStatus(c)"
                                                type="button"
                                                :class="[
                                                    'px-2 py-1 rounded-lg text-xs font-semibold transition border shadow-xs cursor-pointer',
                                                    c.status === 'ACTIVE' 
                                                        ? 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200' 
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                ]"
                                                :title="c.status === 'ACTIVE' ? 'Tạm dừng đối tác này' : 'Kích hoạt lại đối tác'"
                                            >
                                                <span>{{ c.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt' }}</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                <tr v-if="filteredCustomers.length === 0">
                                    <td colspan="5" class="text-center py-10 text-slate-400 text-xs">
                                        <div class="flex flex-col items-center justify-center space-y-1.5">
                                            <span class="font-bold text-slate-600">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</span>
                                            <button v-if="hasActiveFilter" @click="resetFilters" class="text-blue-600 hover:underline font-bold text-xs">
                                                Xóa tất cả điều kiện lọc
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
                <teleport to="body">
                <Transition name="modal">
                <div v-if="showModal" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
                        <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <h3 class="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                                    {{ newCustomer.id ? 'Cập Nhật Hồ Sơ Đối Tác' : 'Thêm Mới Đối Tác Bưu Chính' }}
                                </h3>
                            </div>
                            <button @click="showModal = false" class="text-slate-400 hover:text-slate-700 text-lg font-bold">×</button>
                        </div>
                        <form @submit.prevent="handleCreateCustomer" class="p-5 space-y-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã Khách Hàng</label>
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
                                    maxlength="100"
                                    placeholder="VD: Công ty CP Vận Chuyển Waybill..." 
                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                />
                            </div>
                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại <span class="text-rose-500">*</span></label>
                                    <input 
                                        v-model="newCustomer.phoneNumber" 
                                        type="tel" 
                                        required 
                                        maxlength="15"
                                        placeholder="09... (10 số)" 
                                        class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                    />
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Email Liên Hệ <span class="text-rose-500">*</span></label>
                                    <input 
                                        v-model="newCustomer.email" 
                                        type="email" 
                                        required
                                        maxlength="100"
                                        placeholder="name@company.com" 
                                        class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                    />
                                </div>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-[11px] font-bold text-slate-700">Địa Chỉ Trụ Sở / Kho Hàng</label>
                                    <span class="text-[10px] text-slate-400 font-mono">{{ (newCustomer.address || '').length }}/255</span>
                                </div>
                                <textarea 
                                    v-model="newCustomer.address" 
                                    rows="2" 
                                    maxlength="255"
                                    placeholder="Số nhà, đường, phường/xã, tỉnh/thành (để trống sẽ lưu: Chưa cập nhật địa chỉ)..." 
                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition resize-none"
                                ></textarea>
                            </div>
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
                                    <span>{{ isSaving ? 'Đang Lưu...' : (newCustomer.id ? 'Cập Nhật' : 'Xác Nhận Lưu') }}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                </Transition>
                </teleport>
            </div>
        `
    };
    window.CustomerView = CustomerView;
})();
