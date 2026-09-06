/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: BƯU TÁ GIAO VẬN & QUYẾT TOÁN COD (SHIPPER VIEW)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_SHIPPER / ROLE_ADMIN (Quyền: tracking:update_delivery)
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const ShipperView = {
        name: 'ShipperView',
        setup() {
            const currentSubtab = ref('active'); // 'active' | 'cod'
            const isLoading = ref(false);
            const isActionRunning = ref(false);

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);

            // Modal Báo Phát Thất Bại
            const showFailedModal = ref(false);
            const failedTargetShipment = ref(null);
            const failedReason = ref('KHONG_NGHE_MAY');
            const failedNote = ref('');

            // 1. Tải dữ liệu bưu gửi thật từ backend
            const loadShipmentsData = async () => {
                isLoading.value = true;
                try {
                    const data = await ShipmentService.getAll();
                    shipmentsList.value = Array.isArray(data) ? data : [];
                } catch (err) {
                    console.error('[ShipperView] Lỗi nạp danh sách:', err);
                    Utils.showToast('Lỗi Tải Dữ Liệu', err.message || 'Không thể nạp danh sách bưu gửi', 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            // 2. Lọc danh sách bưu gửi của bưu tá
            const deliveryShipments = computed(() => {
                // Bưu tá quan tâm các đơn: Đang đi phát, Phát thất bại, Đã giao thành công, hoặc Đang luân chuyển đến
                let list = shipmentsList.value;

                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(s => s.currentStatus === selectedStatusFilter.value);
                }

                if (searchQuery.value.trim()) {
                    const q = searchQuery.value.trim().toLowerCase();
                    list = list.filter(s => 
                        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                        (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                        (s.receiverPhone && s.receiverPhone.toLowerCase().includes(q)) ||
                        (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                    );
                }

                return list;
            });

            // 3. Phân trang
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(deliveryShipments.value.length / pageSize.value) || 1;
            });

            const paginatedShipments = computed(() => {
                if (pageSize.value === -1) return deliveryShipments.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return deliveryShipments.value.slice(start, start + pageSize.value);
            });

            watch([selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
            });

            // 4. Thống kê KPI bưu tá
            const kpiOutForDelivery = computed(() => {
                return shipmentsList.value.filter(s => s.currentStatus === 'OUT_FOR_DELIVERY').length;
            });

            const kpiDeliveredCount = computed(() => {
                return shipmentsList.value.filter(s => s.currentStatus === 'DELIVERED').length;
            });

            // Tổng tiền COD đã thu từ các đơn DELIVERED
            const kpiTotalDeliveredCod = computed(() => {
                return shipmentsList.value
                    .filter(s => s.currentStatus === 'DELIVERED')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            // Tổng tiền COD cần thu từ các đơn OUT_FOR_DELIVERY
            const kpiPendingCod = computed(() => {
                return shipmentsList.value
                    .filter(s => s.currentStatus === 'OUT_FOR_DELIVERY')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            // 5. Thao tác phát thành công (DELIVERED)
            const handleDeliverSuccess = async (shipment) => {
                const codText = shipment.codAmount && shipment.codAmount > 0 
                    ? `kèm xác nhận thu tiền mặt COD: ${Utils.formatCurrency(shipment.codAmount)}`
                    : 'không có tiền COD';

                if (!confirm(`Xác nhận bưu gửi ${shipment.trackingCode} đã phát thành công đến người nhận ${codText}?`)) {
                    return;
                }

                isActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'DELIVERED',
                        'DELIVERY_OFFICE',
                        `Bưu tá phát thành công tận nơi cho ${shipment.receiverName || 'người nhận'}`
                    );

                    Utils.showToast('Thành Công', `Đã ghi nhận phát thành công cho bưu gửi ${shipment.trackingCode}`);
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo phát:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Mở modal báo phát không thành công
            const openFailedModal = (shipment) => {
                failedTargetShipment.value = shipment;
                failedReason.value = 'KHONG_NGHE_MAY';
                failedNote.value = '';
                showFailedModal.value = true;
            };

            // Xác nhận báo phát thất bại (DELIVERY_FAILED)
            const handleDeliverFailed = async () => {
                if (!failedTargetShipment.value) return;

                const code = failedTargetShipment.value.trackingCode;
                const reasonLabels = {
                    'KHONG_NGHE_MAY': 'Khách không nghe máy / Thuê bao',
                    'SAI_DIA_CHI': 'Sai địa chỉ / Không tìm thấy nhà',
                    'HEN_LAI_NGAY': 'Người nhận hẹn giao lại vào ngày sau',
                    'TU_CHOI_NHAN': 'Người nhận từ chối nhận hàng'
                };

                const reasonText = reasonLabels[failedReason.value] || failedReason.value;
                const note = failedNote.value.trim() 
                    ? `Phát không thành công: ${reasonText} (${failedNote.value.trim()})`
                    : `Phát không thành công: ${reasonText}`;

                isActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(
                        code,
                        'DELIVERY_FAILED',
                        'DELIVERY_OFFICE',
                        note
                    );

                    Utils.showToast('Đã Ghi Nhận', `Bưu gửi ${code} đã chuyển trạng thái Phát không thành công`);
                    showFailedModal.value = false;
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo thất bại:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Nhận đơn đi phát lại (Chuyển từ DELIVERY_FAILED hoặc IN_TRANSIT sang OUT_FOR_DELIVERY)
            const handleReDispatch = async (shipment) => {
                isActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'OUT_FOR_DELIVERY',
                        'DELIVERY_OFFICE',
                        'Bưu tá tiếp nhận bưu gửi đi phát chặng cuối'
                    );

                    Utils.showToast('Thành Công', `Đã tiếp nhận bưu gửi ${shipment.trackingCode} đi phát`);
                    await loadShipmentsData();
                } catch (err) {
                    Utils.showToast('Lỗi Tác Nghiệp', err.message, 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            onMounted(() => {
                loadShipmentsData();
            });

            return {
                currentSubtab,
                isLoading,
                isActionRunning,
                shipmentsList,
                searchQuery,
                selectedStatusFilter,
                currentPage,
                pageSize,
                totalPages,
                deliveryShipments,
                paginatedShipments,
                kpiOutForDelivery,
                kpiDeliveredCount,
                kpiTotalDeliveredCod,
                kpiPendingCod,
                loadShipmentsData,
                handleDeliverSuccess,
                openFailedModal,
                showFailedModal,
                failedTargetShipment,
                failedReason,
                failedNote,
                handleDeliverFailed,
                handleReDispatch,
                Utils
            };
        },
        template: `
        <div class="space-y-3.5 pb-8 text-slate-800">
            <!-- 1. HERO BANNER: THIẾT KẾ VNPT GRADIENT CHUẨN RBAC VIEW -->
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                Courier Delivery
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Bàn Tác Nghiệp Bưu Tá Phát Hàng &amp; Quyết Toán COD
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Quản lý các bưu gửi chặng cuối, xác nhận phát tận tay người nhận, thu tiền hộ COD và quyết toán nộp quỹ bưu cục.
                        </p>
                    </div>

                    <!-- Thống kê nhanh KPI theo phong cách RBAC -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiOutForDelivery }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Đi Phát</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiDeliveredCount }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đã Giao Xong</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[84px]">
                            <div class="text-xs sm:text-sm font-bold leading-tight font-mono text-emerald-300">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">COD Đã Thu</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG GẠCH CHÂN CHUẨN RBAC -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto pb-px">
                    <button 
                        @click="currentSubtab = 'active'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'active' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>DANH SÁCH BƯU GỬI PHÁT HÔM NAY</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'cod'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'cod' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUYẾT TOÁN TIỀN THU HỘ (COD) CUỐI CA</span>
                    </button>
                </div>

                <button 
                    @click="loadShipmentsData()" 
                    :disabled="isLoading"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 border border-slate-200"
                >
                    <span :class="{'animate-spin': isLoading}">↻</span>
                    <span>Làm Mới</span>
                </button>
            </div>

            <!-- =============================================================== -->
            <!-- SUBTAB 1: DANH SÁCH BƯU GỬI PHÁT HÔM NAY -->
            <!-- =============================================================== -->
            <div v-if="currentSubtab === 'active'" class="space-y-3">
                <!-- THANH TOOLBAR TÌM KIẾM & LỌC -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-56 sm:w-64">
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Tìm người nhận, SĐT, địa chỉ phát..."
                                class="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                        </div>

                        <select 
                            v-model="selectedStatusFilter"
                            class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY (Đang Đi Phát)</option>
                            <option value="DELIVERED">DELIVERED (Phát Thành Công)</option>
                            <option value="DELIVERY_FAILED">DELIVERY_FAILED (Phát Không Thành Công)</option>
                            <option value="IN_TRANSIT">IN_TRANSIT (Đang Đến Bưu Cục)</option>
                        </select>

                        <select 
                            v-model.number="pageSize"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                        >
                            <option :value="10">10 bản ghi / trang</option>
                            <option :value="25">25 bản ghi / trang</option>
                            <option :value="-1">Tất cả bản ghi</option>
                        </select>
                    </div>

                    <div class="text-[11px] text-slate-500 font-medium">
                        Tổng số: <strong class="text-slate-800">{{ deliveryShipments.length }}</strong> bưu gửi
                    </div>
                </div>

                <!-- BẢNG BƯU GỬI PHÁT HÀNG TẬN NƠI -->
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <div v-if="isLoading" class="p-8 text-center text-slate-400">
                        <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <span>Đang nạp danh sách bưu gửi phát...</span>
                    </div>

                    <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                        <span>Không tìm thấy bưu gửi nào cần xử lý.</span>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <th class="py-2.5 px-3">Số Hiệu Bưu Gửi</th>
                                    <th class="py-2.5 px-3">Người Nhận &amp; Điện Thoại</th>
                                    <th class="py-2.5 px-3">Địa Chỉ Phát Tận Nơi</th>
                                    <th class="py-2.5 px-3">Tiền Thu Hộ COD</th>
                                    <th class="py-2.5 px-3">Trạng Thái</th>
                                    <th class="py-2.5 px-3 text-right">Tác Nghiệp Bưu Tá</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-blue-50/30 transition">
                                    <td class="py-2.5 px-3 font-mono font-bold text-blue-700">
                                        {{ item.trackingCode }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <div class="font-bold text-slate-800">{{ item.receiverName || 'N/A' }}</div>
                                        <div class="text-[10.5px] font-mono text-slate-500">{{ item.receiverPhone || 'Chưa có SĐT' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                                        {{ item.receiverAddress || 'Chưa có địa chỉ' }}
                                    </td>
                                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                        {{ Utils.formatCurrency(item.codAmount) }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <span :class="['px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border inline-block', Utils.getStatusBadgeClass(item.currentStatus)]">
                                            {{ Utils.formatStatusText(item.currentStatus) }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                                        <!-- Đơn OUT_FOR_DELIVERY: Nút Phát Thành Công hoặc Báo Thất Bại -->
                                        <template v-if="item.currentStatus === 'OUT_FOR_DELIVERY'">
                                            <button 
                                                @click="handleDeliverSuccess(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition shadow-sm"
                                            >
                                                Phát Thành Công
                                            </button>
                                            <button 
                                                @click="openFailedModal(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md font-bold transition"
                                            >
                                                Báo Thất Bại
                                            </button>
                                        </template>

                                        <!-- Đơn DELIVERY_FAILED: Có nút Phát Lại -->
                                        <template v-else-if="item.currentStatus === 'DELIVERY_FAILED'">
                                            <button 
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md font-bold transition"
                                            >
                                                Nhận Đi Phát Lại
                                            </button>
                                        </template>

                                        <!-- Đơn IN_TRANSIT: Bưu tá bấm Nhận Phát -->
                                        <template v-else-if="item.currentStatus === 'IN_TRANSIT'">
                                            <button 
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-md font-bold transition"
                                            >
                                                Nhận Hàng Đi Phát
                                            </button>
                                        </template>

                                        <span v-else class="text-slate-400 text-xs italic">
                                            Đã hoàn tất
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Phân trang bưu tá -->
                    <div class="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang {{ currentPage }} / {{ totalPages }} (Tổng số {{ deliveryShipments.length }} kết quả)
                        </div>
                        <div class="flex items-center space-x-1">
                            <button 
                                @click="currentPage--"
                                :disabled="currentPage <= 1"
                                class="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <button 
                                v-for="p in totalPages" 
                                :key="p"
                                @click="currentPage = p"
                                :class="[
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition',
                                    currentPage === p 
                                        ? 'bg-blue-600 text-white border border-blue-600 shadow-sm' 
                                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                ]"
                            >
                                {{ p }}
                            </button>
                            <button 
                                @click="currentPage++"
                                :disabled="currentPage >= totalPages"
                                class="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- =============================================================== -->
            <!-- SUBTAB 2: QUYẾT TOÁN TIỀN THU HỘ COD CUỐI CA -->
            <!-- =============================================================== -->
            <div v-if="currentSubtab === 'cod'" class="space-y-3">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                        <h2 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Quyết Toán Tiền Mặt Thu Hộ (COD)</h2>
                        <p class="text-slate-500 text-[11px] mt-0.5">Bảng kê chi tiết các khoản tiền mặt đã thu từ người nhận cần nộp lại bưu cục</p>
                    </div>

                    <div class="flex items-center space-x-3 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <span class="text-emerald-800 font-bold">Tổng tiền COD trong ca:</span>
                        <span class="font-mono text-base font-extrabold text-emerald-700">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</span>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận Trả Tiền</th>
                                <th class="py-2.5 px-3">Địa Chỉ Giao</th>
                                <th class="py-2.5 px-3">Số Tiền COD Đã Thu</th>
                                <th class="py-2.5 px-3 text-right">Tình Trạng Quyết Toán</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in shipmentsList.filter(s => s.currentStatus === 'DELIVERED')" :key="item.id" class="hover:bg-blue-50/30">
                                <td class="py-2.5 px-3 font-mono font-bold text-blue-700">{{ item.trackingCode }}</td>
                                <td class="py-2.5 px-3 font-bold text-slate-800">{{ item.receiverName }}</td>
                                <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate">{{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(item.codAmount) }}</td>
                                <td class="py-2.5 px-3 text-right">
                                    <span class="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Chưa Nộp Quỹ Bưu Cục
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="shipmentsList.filter(s => s.currentStatus === 'DELIVERED').length === 0">
                                <td colspan="5" class="py-8 text-center text-slate-400">
                                    Chưa có đơn hàng nào phát thành công trong ca để quyết toán.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- MODAL BÁO PHÁT THẤT BẠI -->
            <div v-if="showFailedModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in duration-150">
                    <div class="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-slate-900 text-sm">Ghi Nhận Phát Không Thành Công</h3>
                            <p class="text-slate-500 font-mono text-[11px] mt-0.5">Bưu gửi: {{ failedTargetShipment?.trackingCode }}</p>
                        </div>
                        <button @click="showFailedModal = false" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Lý do phát không thành công:</label>
                            <select v-model="failedReason" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-blue-600">
                                <option value="KHONG_NGHE_MAY">Khách không nghe máy / Thuê bao</option>
                                <option value="SAI_DIA_CHI">Sai địa chỉ / Không tìm thấy nhà người nhận</option>
                                <option value="HEN_LAI_NGAY">Người nhận hẹn giao lại vào ngày sau</option>
                                <option value="TU_CHOI_NHAN">Người nhận từ chối nhận hàng (Hoàn đơn)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Ghi chú bổ sung (nếu có):</label>
                            <textarea v-model="failedNote" rows="2" placeholder="Nhập ghi chú chi tiết từ cuộc gọi hoặc địa chỉ..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-blue-600"></textarea>
                        </div>
                    </div>

                    <div class="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                        <button @click="showFailedModal = false" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition">
                            Hủy Bỏ
                        </button>
                        <button @click="handleDeliverFailed()" :disabled="isActionRunning" class="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition disabled:opacity-50">
                            Xác Nhận Báo Thất Bại
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.ShipperView = ShipperView;
})();
