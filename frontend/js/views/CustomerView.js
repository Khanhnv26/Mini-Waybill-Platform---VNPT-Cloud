/**
 * VNPT CLOUD - VIEW: QUẢN LÝ DANH BẠ KHÁCH HÀNG BƯU CHÍNH
 * Bảng dữ liệu khách hàng doanh nghiệp & thêm mới khách hàng
 */

(function () {
    const { ref, reactive, onMounted } = Vue;

    const CustomerView = {
        name: 'CustomerView',
        setup() {
            const customers = ref([]);
            const isLoading = ref(false);
            const showModal = ref(false);
            const isSaving = ref(false);

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
                    customers.value = data;
                } catch (err) {
                    Utils.showToast('Lỗi tải dữ liệu', err.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

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
                openCreateModal,
                handleCreateCustomer,
                loadCustomers
            };
        },
        template: `
            <div class="space-y-4">
                <!-- Header chức năng -->
                <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900">Danh Bạ Khách Hàng Bưu Chính</h2>
                        <p class="text-xs text-slate-500 mt-0.5">Quản lý hồ sơ đối tác và khách hàng ký gửi vận đơn</p>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button 
                            @click="loadCustomers()" 
                            :disabled="isLoading"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold transition"
                        >
                            Làm Mới
                        </button>
                        <button 
                            @click="openCreateModal()" 
                            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition"
                        >
                            + Thêm Khách Hàng
                        </button>
                    </div>
                </div>

                <!-- Bảng danh sách khách hàng -->
                <div class="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left table-b2b">
                            <thead>
                                <tr>
                                    <th>Mã Khách Hàng</th>
                                    <th>Họ Và Tên</th>
                                    <th>Số Điện Thoại</th>
                                    <th>Email</th>
                                    <th>Địa Chỉ Đăng Ký</th>
                                    <th>Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="c in customers" :key="c.id">
                                    <td class="font-mono font-bold text-blue-600">{{ c.customerCode || 'CUST-' + c.id }}</td>
                                    <td class="font-semibold text-slate-800">{{ c.fullName }}</td>
                                    <td class="font-mono text-slate-600">{{ c.phoneNumber }}</td>
                                    <td class="text-slate-600">{{ c.email || 'N/A' }}</td>
                                    <td class="text-slate-700">{{ c.address }}</td>
                                    <td>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {{ c.status || 'ACTIVE' }}
                                        </span>
                                    </td>
                                </tr>
                                <tr v-if="customers.length === 0">
                                    <td colspan="6" class="text-center py-8 text-slate-400">
                                        {{ isLoading ? 'Đang nạp danh bạ khách hàng...' : 'Chưa có dữ liệu khách hàng' }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Modal Thêm Khách Hàng Mới -->
                <div v-if="showModal" class="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div class="bg-white border border-slate-200 rounded-xl p-5 max-w-md w-full shadow-xl space-y-4">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-900">Thêm Mới Khách Hàng Bưu Chính</h3>
                            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 text-sm font-bold">&times;</button>
                        </div>

                        <form @submit.prevent="handleCreateCustomer" class="space-y-3 text-xs">
                            <div>
                                <label class="block text-slate-500 mb-1">Mã Khách Hàng (Hệ thống đề xuất)</label>
                                <input v-model="newCustomer.customerCode" type="text" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono" />
                            </div>
                            <div>
                                <label class="block text-slate-500 mb-1">Họ và tên khách hàng</label>
                                <input v-model="newCustomer.fullName" type="text" required placeholder="Nguyễn Văn A" class="w-full px-3 py-1.5 border border-slate-200 rounded" />
                            </div>
                            <div>
                                <label class="block text-slate-500 mb-1">Số điện thoại</label>
                                <input v-model="newCustomer.phoneNumber" type="text" required placeholder="0988xxxxxx" class="w-full px-3 py-1.5 border border-slate-200 rounded font-mono" />
                            </div>
                            <div>
                                <label class="block text-slate-500 mb-1">Email</label>
                                <input v-model="newCustomer.email" type="email" placeholder="customer@vnpt.vn" class="w-full px-3 py-1.5 border border-slate-200 rounded" />
                            </div>
                            <div>
                                <label class="block text-slate-500 mb-1">Địa chỉ đăng ký</label>
                                <input v-model="newCustomer.address" type="text" required placeholder="Số nhà, phố, tỉnh thành..." class="w-full px-3 py-1.5 border border-slate-200 rounded" />
                            </div>

                            <div class="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                                <button type="button" @click="showModal = false" class="px-3 py-1.5 border border-slate-200 rounded font-semibold text-slate-600 hover:bg-slate-50">
                                    Hủy Bỏ
                                </button>
                                <button type="submit" :disabled="isSaving" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold disabled:opacity-50">
                                    {{ isSaving ? 'Đang Lưu...' : 'Lưu Khách Hàng' }}
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
