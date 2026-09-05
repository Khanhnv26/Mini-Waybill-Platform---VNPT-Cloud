/**
 * VNPT CLOUD - VIEW: KHỞI TẠO BƯU GỬI (TẠO VẬN ĐƠN)
 * Giao diện 2 cột B2B tinh gọn, tự động nạp Hubs từ Database vào Dropdown Tỉnh/Thành
 */

(function () {
    const { ref, reactive, onMounted } = Vue;

    const ShipmentView = {
        name: 'ShipmentView',
        emits: ['created-shipment'],
        setup(props, { emit }) {
            const isSubmitting = ref(false);
            const hubsList = ref([]);

            const form = reactive({
                customerId: 1,
                serviceType: 'EXPRESS',
                weight: 2.0,
                codAmount: 350000,
                
                // Người gửi (Điểm tiếp nhận)
                senderName: 'Công ty Cổ phần Viễn thông VNPT',
                senderPhone: '02438888999',
                senderProvince: 'Hà Nội',
                senderDetail: 'Số 57 Huỳnh Thúc Kháng, Đống Đa',

                // Người nhận (Điểm phát trả)
                receiverName: 'Chi nhánh VNPT TP. Hồ Chí Minh',
                receiverPhone: '02839999111',
                receiverProvince: 'Hồ Chí Minh',
                receiverDetail: 'Số 121 Pasteur, Phường 6, Quận 3'
            });

            // Tải danh bạ bưu cục / Hubs từ database
            const loadHubs = async () => {
                try {
                    const hubs = await RoutingService.getAllHubs();
                    hubsList.value = hubs;
                    if (window.MapManager) {
                        window.MapManager.updateHubs(hubs);
                    }
                } catch (err) {
                    console.error('[ShipmentView] Lỗi tải Hubs:', err);
                    Utils.showToast('Cảnh báo', 'Không tải được danh bạ bưu cục từ máy chủ', 'error');
                }
            };

            const handleSubmit = async () => {
                if (!form.senderDetail || !form.receiverDetail) {
                    Utils.showToast('Lỗi nhập liệu', 'Vui lòng nhập đầy đủ địa chỉ cụ thể', 'error');
                    return;
                }

                isSubmitting.value = true;
                try {
                    const payload = {
                        requestId: 'REQ-' + Date.now(),
                        customerId: Number(form.customerId),
                        senderName: form.senderName,
                        senderPhone: form.senderPhone,
                        senderAddress: `${form.senderDetail}, ${form.senderProvince}`,
                        receiverName: form.receiverName,
                        receiverPhone: form.receiverPhone,
                        receiverAddress: `${form.receiverDetail}, ${form.receiverProvince}`,
                        serviceType: form.serviceType,
                        weight: Number(form.weight),
                        codAmount: Number(form.codAmount)
                    };

                    const res = await ShipmentService.createShipment(payload);
                    Utils.showToast('Thành công', `Đã khởi tạo vận đơn: ${res.trackingCode}`);
                    
                    // Bắn sự kiện lên Master Layout để chuyển sang Tab Tra Cứu
                    emit('created-shipment', res.trackingCode);
                } catch (err) {
                    Utils.showToast('Thất bại', err.message, 'error');
                } finally {
                    isSubmitting.value = false;
                }
            };

            onMounted(() => {
                loadHubs();
            });

            return {
                form,
                hubsList,
                isSubmitting,
                handleSubmit
            };
        },
        template: `
            <div class="max-w-5xl mx-auto space-y-4">
                <!-- Tiêu đề nghiệp vụ -->
                <div class="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-slate-900">Khởi Tạo Bưu Gửi / Vận Đơn Mới</h2>
                        <p class="text-xs text-slate-500 mt-0.5">Tiếp nhận thông tin giao dịch và định tuyến bưu cục luân chuyển</p>
                    </div>
                </div>

                <form @submit.prevent="handleSubmit" class="space-y-4">
                    <!-- 1. Dịch Vụ & Thông Số Bưu Gửi -->
                    <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                        <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                            1. Thông Số Dịch Vụ & Cước Phí
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Mã Khách Hàng Gửi</label>
                                <input v-model.number="form.customerId" type="number" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 transition" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Dịch Vụ Chuyển Phát</label>
                                <select v-model="form.serviceType" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-600 transition">
                                    <option value="STANDARD">Chuyển phát tiêu chuẩn</option>
                                    <option value="EXPRESS">Chuyển phát hỏa tốc</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Khối Lượng Tính Cước (kg)</label>
                                <input v-model.number="form.weight" type="number" step="0.1" min="0.1" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 transition" />
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tiền Thu Hộ COD (VNĐ)</label>
                                <input v-model.number="form.codAmount" type="number" step="1000" min="0" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-600 transition" />
                            </div>
                        </div>
                    </div>

                    <!-- 2. Điểm Gửi & Điểm Nhận (2 Cột Bưu Chính) -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <!-- Điểm Gửi -->
                        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                                2. Điểm Gửi Hàng (Bưu Cục Tiếp Nhận)
                            </div>
                            <div class="space-y-2.5">
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Họ tên người gửi</label>
                                    <input v-model="form.senderName" type="text" required placeholder="Tên cá nhân / Đơn vị gửi hàng" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-600 transition" />
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Số điện thoại liên hệ</label>
                                    <input v-model="form.senderPhone" type="text" required placeholder="Số điện thoại người gửi" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:border-blue-600 transition" />
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Tỉnh / Thành phố tiếp nhận</label>
                                    <select v-model="form.senderProvince" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-600 transition">
                                        <option v-for="h in hubsList" :key="h.id" :value="h.province">
                                            {{ h.province }} - {{ h.hubName }} ({{ h.hubCode }})
                                        </option>
                                        <option v-if="hubsList.length === 0" value="Hà Nội">Hà Nội (Mặc định)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Địa chỉ cụ thể (Số nhà, đường, phường/xã)</label>
                                    <input v-model="form.senderDetail" type="text" required placeholder="VD: Số 57 Huỳnh Thúc Kháng, Đống Đa" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-600 transition" />
                                </div>
                            </div>
                        </div>

                        <!-- Điểm Nhận -->
                        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3">
                            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                                3. Điểm Nhận Hàng (Bưu Cục Phát Trả)
                            </div>
                            <div class="space-y-2.5">
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Họ tên người nhận</label>
                                    <input v-model="form.receiverName" type="text" required placeholder="Tên cá nhân / Đơn vị nhận hàng" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-600 transition" />
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Số điện thoại liên hệ</label>
                                    <input v-model="form.receiverPhone" type="text" required placeholder="Số điện thoại người nhận" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:border-blue-600 transition" />
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Tỉnh / Thành phố phát trả</label>
                                    <select v-model="form.receiverProvince" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:bg-white focus:outline-none focus:border-blue-600 transition">
                                        <option v-for="h in hubsList" :key="h.id" :value="h.province">
                                            {{ h.province }} - {{ h.hubName }} ({{ h.hubCode }})
                                        </option>
                                        <option v-if="hubsList.length === 0" value="Hồ Chí Minh">TP. Hồ Chí Minh (Mặc định)</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] text-slate-500 mb-1">Địa chỉ cụ thể (Số nhà, đường, phường/xã)</label>
                                    <input v-model="form.receiverDetail" type="text" required placeholder="VD: Số 121 Pasteur, Phường 6, Quận 3" class="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-600 transition" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Nút Xác Nhận Tạo Vận Đơn -->
                    <div class="flex items-center justify-end space-x-3 pt-2">
                        <button 
                            type="submit" 
                            :disabled="isSubmitting"
                            class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
                        >
                            <span v-if="isSubmitting">Đang Tiếp Nhận & Định Tuyến...</span>
                            <span v-else>Xác Nhận Tạo Vận Đơn</span>
                        </button>
                    </div>
                </form>
            </div>
        `
    };

    window.ShipmentView = ShipmentView;
})();
