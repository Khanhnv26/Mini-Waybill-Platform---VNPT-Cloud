/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: QUẢN LÝ DANH BẠ KHÁCH HÀNG BƯU CHÍNH
 * Phong Cách B2B Enterprise Blue, Bảng Dữ Liệu Khách Hàng Doanh Nghiệp
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, onMounted } = Vue;

    const CustomerView = {
        name: 'CustomerView',
        setup() {
            const customers = ref([]);
            const isLoading = ref(false);
            const showModal = ref(false);
            const isSaving = ref(false);
            const searchQuery = ref('');

            const newCustomer = reactive({
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
                    customers.value = data || [];
                } catch (err) {
                    Utils.showToast('Lỗi tải dữ liệu', err.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            const filteredCustomers = computed(() => {
                const q = searchQuery.value.trim().toLowerCase();
                if (!q) return customers.value;
                return customers.value.filter(c => 
                    (c.fullName && c.fullName.toLowerCase().includes(q)) ||
                    (c.phoneNumber && c.phoneNumber.includes(q)) ||
                    (c.customerCode && c.customerCode.toLowerCase().includes(q))
                );
            });

            const openCreateModal = () => {
                newCustomer.customerCode = 'CUST-' + Math.floor(1000 + Math.random() * 9000);
                newCustomer.fullName = '';
                newCustomer.phoneNumber = '';
                newCustomer.email = '';
                newCustomer.address = '';
                showModal.value = true;
            };

            const handleCreateCustomer = async () => {
                if (!newCustomer.fullName || !newCustomer.phoneNumber) {
                    Utils.showToast('Lỗi nhập liệu', 'Vui lòng nhập họ tên và số điện thoại', 'error');
                    return;
                }

                isSaving.value = true;
                try {
                    await CustomerService.createCustomer({ ...newCustomer });
                    Utils.showToast('Thành công', 'Đã thêm mới khách hàng bưu chính');
                    showModal.value = false;
                    loadCustomers();
                } catch (err) {
                    Utils.showToast('Thất bại', err.message, 'error');
                } finally {
                    isSaving.value = false;
                }
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
                filteredCustomers,
                openCreateModal,
                handleCreateCustomer,
                loadCustomers
            };
        },
        template: `
            <div class="space-y-4 pb-10">
                <!-- Header chức năng -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                            <h2 class="text-sm font-extrabold uppercase tracking-wider text-slate-900">Danh Bạ Khách Hàng Bưu Chính</h2>
                        </div>
                        <p class="text-xs text-slate-500 mt-0.5">Quản lý hồ sơ đối tác doanh nghiệp và khách hàng ký gửi bưu phẩm</p>
                    </div>

                    <div class="flex items-center space-x-2.5">
                        <button 
                            @click="loadCustomers()" 
                            :disabled="isLoading"
                            class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        >
                            Làm Mới
                        </button>
                        <button 
                            @click="openCreateModal()" 
                            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition flex items-center space-x-1.5"
                        >
                            <span>+ Thêm Khách Hàng</span>
                        </button>
                    </div>
                </div>

                <!-- Thanh tìm kiếm -->
                <div class="flex items-center justify-between gap-4">
                    <div class="relative flex-1 max-w-md">
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Tìm theo họ tên, số điện thoại, mã khách hàng..."
                            class="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-sm outline-none transition"
                        />
                        <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <div class="text-xs text-slate-500">
                        Tổng cộng <b>{{ filteredCustomers.length }}</b> đối tác
                    </div>
                </div>

                <!-- Bảng dữ liệu Khách Hàng -->
                <div class="b2b-card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-16">ID</th>
                                    <th>MÃ KHÁCH HÀNG</th>
                                    <th>HỌ TÊN ĐỐI TÁC</th>
                                    <th>SỐ ĐIỆN THOẠI</th>
                                    <th>EMAIL</th>
                                    <th>ĐỊA CHỈ TRỤ SỞ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="c in filteredCustomers" :key="c.id" class="hover:bg-slate-50/80 transition">
                                    <td class="font-mono text-xs font-bold text-slate-400">#{{ c.id }}</td>
                                    <td>
                                        <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                                            {{ c.customerCode }}
                                        </span>
                                    </td>
                                    <td>
                                        <div class="flex items-center space-x-2.5">
                                            <div class="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                                                {{ (c.fullName || 'K').charAt(0).toUpperCase() }}
                                            </div>
                                            <span class="font-bold text-slate-800 text-xs">{{ c.fullName }}</span>
                                        </div>
                                    </td>
                                    <td class="font-mono font-semibold text-slate-600 text-xs">{{ c.phoneNumber }}</td>
                                    <td class="text-slate-500 text-xs">{{ c.email || 'N/A' }}</td>
                                    <td class="text-slate-600 text-xs max-w-xs truncate">{{ c.address || 'N/A' }}</td>
                                </tr>
                                <tr v-if="filteredCustomers.length === 0">
                                    <td colspan="6" class="text-center py-10 text-slate-400 text-xs">
                                        Không tìm thấy khách hàng nào trong hệ thống.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Modal thêm khách hàng mới -->
                <div v-if="showModal" class="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in duration-200">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 class="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Thêm Mới Khách Hàng Bưu Chính</h3>
                            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
                        </div>

                        <form @submit.prevent="handleCreateCustomer" class="space-y-3 pt-4">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã Khách Hàng</label>
                                <input v-model="newCustomer.customerCode" type="text" readonly class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-600" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Họ và Tên / Đơn vị</label>
                                <input v-model="newCustomer.fullName" type="text" required placeholder="Tên khách hàng" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                                <input v-model="newCustomer.phoneNumber" type="text" required placeholder="09..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                                <input v-model="newCustomer.email" type="email" placeholder="email@domain.com" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Địa Chỉ</label>
                                <textarea v-model="newCustomer.address" rows="2" placeholder="Địa chỉ chi tiết..." class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"></textarea>
                            </div>

                            <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                                <button type="button" @click="showModal = false" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                                    Hủy
                                </button>
                                <button type="submit" :disabled="isSaving" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition disabled:opacity-50">
                                    {{ isSaving ? 'Đang Lưu...' : 'Xác Nhận Lưu' }}
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
