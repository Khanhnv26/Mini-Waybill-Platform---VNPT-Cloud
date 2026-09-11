/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: KHAI THÁC & CHIA CHỌN BƯU GỬI TẠI HUB (HUB OPERATIONS)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_HUB_OPERATOR / ROLE_ADMIN (Quyền: tracking:update_hub)
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const HubOpsView = {
        name: 'HubOpsView',
        emits: ['view-tracking'],
        components: {
            TripsView: window.TripsView
        },
        setup(props, { emit }) {
            const currentSubtab = ref('scan'); // 'scan' | 'inventory' | 'manifest'
            const isLoading = ref(false);
            const isActionRunning = ref(false);

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const scanInputCode = ref('');
            const selectedHub = ref('ALL');
            const selectedStatusFilter = ref('ALL');
            const searchQuery = ref('');


            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);

            // Thống kê nhanh KPI
            const kpiTotalInHub = computed(() => {
                return shipmentsList.value.filter(s => s.currentStatus === 'PICKED_UP' || s.currentStatus === 'ARRIVED_DEST_HUB').length;
            });

            const kpiAwaitingIntake = computed(() => {
                return shipmentsList.value.filter(s => s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING').length;
            });

            const kpiInTransit = computed(() => {
                return shipmentsList.value.filter(s => s.currentStatus === 'IN_TRANSIT').length;
            });

            const getDestPostOfficeInfo = (item) => {
                if (!item) return { code: 'POST-DN-HC', name: 'Bưu Cục Phát' };
                if (item.destPostOffice) {
                    const name = window.MapManager?.hubCoordinates?.[item.destPostOffice]?.name || item.destPostOffice;
                    return { code: item.destPostOffice, name };
                }
                if (item.receiverAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.receiverAddress);
                    if (found) return { code: found.code, name: found.name };
                }
                return { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu' };
            };

            const isAtPostOffice = (item) => {
                if (!item) return false;
                const loc = (item.locationCode || '').toUpperCase();
                return loc.startsWith('POST-') || loc === 'DELIVERY_OFFICE';
            };

            const getOriginPostOfficeInfo = (item) => {
                if (!item) return { code: 'POST-HN-CG', name: 'Bưu Cục Gốc' };
                if (item.originPostOffice) {
                    const name = window.MapManager?.hubCoordinates?.[item.originPostOffice]?.name || item.originPostOffice;
                    return { code: item.originPostOffice, name };
                }
                if (item.senderAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.senderAddress);
                    if (found) return { code: found.code, name: found.name };
                }
                return { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy' };
            };

            const isCurrentStationCentralHub = computed(() => {
                return selectedHub.value === 'ALL' || selectedHub.value.startsWith('HUB-');
            });

            const isCurrentStationPostOffice = computed(() => {
                return selectedHub.value && selectedHub.value.startsWith('POST-');
            });

            // 1. Tải danh sách bưu gửi thật từ backend (Hỗ trợ nạp ngầm không nháy màn hình)
            const loadShipmentsData = async (silent = false) => {
                if (!silent) isLoading.value = true;
                try {
                    const data = await ShipmentService.getAll();
                    if (Array.isArray(data)) {
                        // Bảo vệ trạng thái vừa cập nhật lạc quan trong vòng 4s phòng trường hợp Kafka consumer chưa commit kịp
                        shipmentsList.value = data.map(newItem => {
                            const existing = shipmentsList.value.find(s => s.trackingCode === newItem.trackingCode);
                            if (existing && existing._optimisticTimestamp && (Date.now() - existing._optimisticTimestamp < 4000)) {
                                return {
                                    ...newItem,
                                    currentStatus: existing.currentStatus,
                                    status: existing.status,
                                    locationCode: existing.locationCode,
                                    _optimisticTimestamp: existing._optimisticTimestamp
                                };
                            }
                            return {
                                ...newItem,
                                locationCode: existing?.locationCode || newItem.locationCode
                            };
                        });

                        // Nạp ngầm locationCode cho các đơn ARRIVED_DEST_HUB để phân biệt Kho Tổng vs Bưu Cục Con
                        const arrivedItems = shipmentsList.value.filter(s => s.currentStatus === 'ARRIVED_DEST_HUB');
                        if (arrivedItems.length > 0) {
                            arrivedItems.forEach(async item => {
                                try {
                                    const tr = await TrackingService.getTracking(item.trackingCode);
                                    if (tr && tr.locationCode) {
                                        item.locationCode = tr.locationCode;
                                    }
                                } catch (e) {
                                    // ignore
                                }
                            });
                        }
                    } else {
                        shipmentsList.value = [];
                    }
                } catch (err) {
                    console.error('[HubOpsView] Lỗi tải bưu gửi:', err);
                    if (!silent) {
                        Utils.showToast('Lỗi Tải Dữ Liệu', err.message || 'Không thể tải danh sách bưu gửi từ máy chủ', 'error');
                    }
                } finally {
                    if (!silent) isLoading.value = false;
                }
            };

            // 2. Lọc danh sách bưu gửi đa điều kiện
            const filteredShipments = computed(() => {
                let list = shipmentsList.value;

                if (selectedHub.value !== 'ALL') {
                    const st = selectedHub.value;
                    list = list.filter(s => {
                        if (s.locationCode === st) return true;
                        if (st.startsWith('POST-')) {
                            if (s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING') {
                                return getOriginPostOfficeInfo(s).code === st;
                            }
                            if (s.currentStatus === 'ARRIVED_DEST_HUB') {
                                return getDestPostOfficeInfo(s).code === st;
                            }
                        }
                        if (st.startsWith('HUB-')) {
                            if (s.currentStatus === 'IN_TRANSIT') {
                                return s.sourceHub === st || s.destinationHub === st;
                            }
                            if (s.currentStatus === 'ARRIVED_DEST_HUB' && !isAtPostOffice(s)) {
                                return s.destinationHub === st;
                            }
                            if (s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING') {
                                return s.sourceHub === st;
                            }
                        }
                        return false;
                    });
                }

                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(s => s.currentStatus === selectedStatusFilter.value);
                }

                if (searchQuery.value.trim()) {
                    const q = searchQuery.value.trim().toLowerCase();
                    list = list.filter(s => 
                        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                        (s.senderName && s.senderName.toLowerCase().includes(q)) ||
                        (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                        (s.senderAddress && s.senderAddress.toLowerCase().includes(q)) ||
                        (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                    );
                }

                return list;
            });

            // 3. Phân trang
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredShipments.value.length / pageSize.value) || 1;
            });

            const paginatedShipments = computed(() => {
                if (pageSize.value === -1) return filteredShipments.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredShipments.value.slice(start, start + pageSize.value);
            });

            watch([selectedHub, selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
            });

            // 4. Thao tác nghiệp vụ: Tiếp nhận vào kho (PICKED_UP), Đóng chuyến xuất bến (IN_TRANSIT), Giao bưu tá (OUT_FOR_DELIVERY)
            const handleUpdateStatus = async (trackingCode, targetStatus, noteMessage) => {
                if (!trackingCode || !trackingCode.trim()) {
                    Utils.showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }

                const cleanCode = trackingCode.trim();
                const targetShipment = shipmentsList.value.find(s => s.trackingCode === cleanCode);

                // Quy định nghiệp vụ: Kho Tổng không tiếp nhận tạo đơn
                if (targetStatus === 'PICKED_UP' && isCurrentStationCentralHub.value && selectedHub.value !== 'ALL') {
                    Utils.showToast('Quy Định Bưu Chính', 'Kho Tổng không tiếp nhận tạo đơn! Đơn mới chỉ được tiếp nhận tại Bưu Cục gốc.', 'warning');
                    return;
                }

                let hubLocation = selectedHub.value !== 'ALL' ? selectedHub.value : null;
                if (!hubLocation) {
                    if (targetStatus === 'PICKED_UP' && targetShipment) {
                        hubLocation = getOriginPostOfficeInfo(targetShipment).code;
                    } else {
                        hubLocation = targetShipment?.locationCode || 'HUB-HN-01';
                    }
                }

                isActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(
                        cleanCode,
                        targetStatus,
                        hubLocation,
                        noteMessage || `Khai thác tại trạm ${hubLocation}: Chuyển trạng thái ${targetStatus}`
                    );

                    // 1. Cập nhật lạc quan (Optimistic UI Update) ngay tại bộ nhớ (0ms latency)
                    if (targetShipment) {
                        targetShipment.currentStatus = targetStatus;
                        targetShipment.status = targetStatus;
                        targetShipment.locationCode = hubLocation;
                        targetShipment._optimisticTimestamp = Date.now();
                    }

                    Utils.showToast('Thành Công', `Bưu gửi ${cleanCode} đã chuyển sang: ${Utils.formatStatusText(targetStatus)}`);
                    scanInputCode.value = '';

                    // 2. Đồng bộ ngầm sau 600ms để Kafka Consumer phía shipment-service kịp commit CSDL
                    setTimeout(() => {
                        loadShipmentsData(true);
                    }, 600);
                } catch (err) {
                    console.error('[HubOpsView] Lỗi tác nghiệp:', err);
                    Utils.showToast('Thất Bại', err.message || 'Không thể cập nhật trạng thái bưu gửi', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Quét mã nhanh từ ô Input
            const handleQuickScan = (targetStatus) => {
                if (!scanInputCode.value.trim()) {
                    Utils.showToast('Yêu Cầu Nhập Mã', 'Vui lòng quét hoặc nhập mã vận đơn để thực hiện tác nghiệp', 'warning');
                    return;
                }
                let note = '';
                if (targetStatus === 'IN_TRANSIT') {
                    note = 'Kho Tổng đã đóng chuyến xe container xuất bến luân chuyển liên tỉnh';
                } else if (targetStatus === 'ARRIVED_DEST_HUB') {
                    note = 'Xe tải trục đã cập bến Kho Tổng đích, hoàn tất dỡ hàng vào bãi';
                } else {
                    note = `Khai thác tại trạm ${selectedHub.value !== 'ALL' ? selectedHub.value : 'Kho Tổng'}: Chuyển trạng thái ${targetStatus}`;
                }
                handleUpdateStatus(scanInputCode.value, targetStatus, note);
            };


            // Bảng kê chuyến xe luân chuyển (Tổng hợp từ danh sách đơn thật)
            const tripManifestSummary = computed(() => {
                const inTransitItems = shipmentsList.value.filter(s => s.currentStatus === 'IN_TRANSIT');
                const pickedUpItems = shipmentsList.value.filter(s => s.currentStatus === 'PICKED_UP');

                const totalInTransitWeight = inTransitItems.reduce((acc, cur) => acc + (cur.weight || 0), 0);
                const totalPickedUpWeight = pickedUpItems.reduce((acc, cur) => acc + (cur.weight || 0), 0);

                return [
                    {
                        tripCode: 'TRIP-HN-HCM-01',
                        vehiclePlate: '29C-889.12 (Container 15T)',
                        route: 'HUB-HN-01 ➔ HUB-HCM-01 (QL1A)',
                        itemCount: inTransitItems.length,
                        totalWeight: totalInTransitWeight.toFixed(1),
                        status: 'IN_TRANSIT',
                        statusText: 'Đang Lưu Thông Tuyến Bắc - Nam'
                    },
                    {
                        tripCode: 'TRIP-HN-DN-02',
                        vehiclePlate: '29C-455.78 (Tải 8T)',
                        route: 'HUB-HN-01 ➔ HUB-DN-01 (Cao Tốc)',
                        itemCount: pickedUpItems.length,
                        totalWeight: totalPickedUpWeight.toFixed(1),
                        status: 'STAGING',
                        statusText: 'Đang Tập Kết Chờ Xuất Bến'
                    }
                ];
            });

            // Mở chi tiết hành trình & bản đồ tại TrackingView
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'hub-ops');
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
                scanInputCode,
                selectedHub,
                selectedStatusFilter,
                searchQuery,
                currentPage,
                pageSize,
                totalPages,
                filteredShipments,
                paginatedShipments,
                kpiTotalInHub,
                kpiAwaitingIntake,
                kpiInTransit,
                getDestPostOfficeInfo,
                getOriginPostOfficeInfo,
                isAtPostOffice,
                isCurrentStationCentralHub,
                isCurrentStationPostOffice,
                loadShipmentsData,
                handleUpdateStatus,
                handleQuickScan,
                tripManifestSummary,
                viewTrackingDetail,
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
                                Kho Tổng Cấp 1 (Super Hub)
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Khai Thác Kho Tổng &amp; Luân Chuyển Tuyến Trục
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Bàn tác nghiệp thủ kho Hub: Quản lý hàng tồn bãi, điều phối bảng kê đóng chuyến xe container liên tỉnh (Trips) và tiếp nhận xe trung chuyển.
                        </p>
                    </div>

                    <!-- Thống kê nhanh KPI theo phong cách RBAC -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiTotalInHub }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tồn Kho Bãi</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiAwaitingIntake }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Nhập</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiInTransit }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Luân Chuyển</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG GẠCH CHÂN CHUẨN RBAC -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto pb-px">
                    <button 
                        @click="currentSubtab = 'scan'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'scan' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUÉT NHẬP &amp; XUẤT KHO TỔNG</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'inventory'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'inventory' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUẢN LÝ TỒN BÃI TẠI HUB</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'trips'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            (currentSubtab === 'trips' || currentSubtab === 'manifest') 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>ĐIỀU PHỐI CHUYẾN XE TRỤC</span>
                    </button>
                </div>

                <button 
                    v-if="currentSubtab !== 'trips' && currentSubtab !== 'manifest'"
                    @click="loadShipmentsData()" 
                    :disabled="isLoading"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 border border-slate-200"
                >
                    <span v-if="isLoading" class="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Làm Mới</span>
                </button>
            </div>

            <!-- =============================================================== -->
            <!-- TRANSITION CHUYỂN SUBTAB MƯỢT MÀ                             -->
            <!-- =============================================================== -->
            <transition name="subtab" mode="out-in">
                <!-- SUBTAB 1: QUÉT TIẾP NHẬN & XUẤT CHUYẾN -->
                <div v-if="currentSubtab === 'scan'" key="scan" class="space-y-3">
                <!-- THANH TÁC NGHIỆP QUÉT MÃ BARCODE -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div class="flex items-center space-x-2">
                        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Đầu Đọc Mã Vạch / Quét Bưu Gửi
                        </span>
                        <span class="text-slate-400 text-xs font-normal">(Quét từ máy quét mã vạch hoặc nhập mã)</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <input 
                            v-model="scanInputCode"
                            @keyup.enter="handleQuickScan('IN_TRANSIT')"
                            type="text" 
                            placeholder="Nhập hoặc quét mã bưu gửi..." 
                            class="pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none w-56 transition"
                        />
                        <button 
                            @click="handleQuickScan('IN_TRANSIT')"
                            :disabled="isActionRunning"
                            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 flex items-center space-x-1"
                            title="Đóng chuyến xe container xuất bến luân chuyển liên tỉnh"
                        >
                            <span>Đóng Chuyến Xe Trục</span>
                        </button>
                        <button 
                            @click="handleQuickScan('ARRIVED_DEST_HUB')"
                            :disabled="isActionRunning"
                            class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 flex items-center space-x-1"
                            title="Dỡ hàng xe container trục cập bến vào bãi Hub"
                        >
                            <span>Dỡ Hàng Xe Trục Đến</span>
                        </button>
                    </div>
                </div>

                <!-- THANH SEARCH & FILTER ĐA TIÊU CHÍ (CHUẨN RBAC TOOLBAR) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Ô tìm kiếm -->
                        <div class="relative w-52 sm:w-56">
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Tìm mã vận đơn, người nhận, địa chỉ..."
                                class="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                        </div>

                        <!-- Lựa chọn Kho Tổng Cấp 1 Làm Việc (Chỉ hiển thị các Hub cấp 1) -->
                        <select 
                            v-model="selectedHub"
                            class="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Toàn Mạng Lưới Kho Tổng (Tất Cả Siêu Hub)</option>
                            <option value="HUB-HN-01">HUB-HN-01 - Kho Tổng Hà Nội</option>
                            <option value="HUB-HP-01">HUB-HP-01 - Kho Tổng Hải Phòng</option>
                            <option value="HUB-DN-01">HUB-DN-01 - Kho Tổng Đà Nẵng</option>
                            <option value="HUB-HCM-01">HUB-HCM-01 - Kho Tổng TP. Hồ Chí Minh</option>
                            <option value="HUB-CT-01">HUB-CT-01 - Kho Tổng Cần Thơ</option>
                        </select>

                        <!-- Lọc trạng thái -->
                        <select 
                            v-model="selectedStatusFilter"
                            class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ROUTE_ASSIGNED">Chờ Tiếp Nhận</option>
                            <option value="PICKED_UP">Đã Nhập Kho</option>
                            <option value="IN_TRANSIT">Đang Luân Chuyển</option>
                            <option value="ARRIVED_DEST_HUB">Đã Về Bãi Đích</option>
                            <option value="OUT_FOR_DELIVERY">Đang Đi Phát</option>
                            <option value="DELIVERED">Phát Thành Công</option>
                        </select>

                        <!-- Lọc số bản ghi -->
                        <select 
                            v-model.number="pageSize"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                        >
                            <option :value="10">10 bản ghi / trang</option>
                            <option :value="25">25 bản ghi / trang</option>
                            <option :value="50">50 bản ghi / trang</option>
                            <option :value="-1">Tất cả bản ghi</option>
                        </select>
                    </div>

                    <div class="text-[11px] text-slate-500 font-medium">
                        Tổng số: <strong class="text-slate-800">{{ filteredShipments.length }}</strong> bưu gửi trong CSDL
                    </div>
                </div>

                <!-- BẢNG DANH SÁCH BƯU GỬI THẬT TỪ CSDL -->
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <div v-if="isLoading" class="p-8 text-center text-slate-400">
                        <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <span>Đang nạp dữ liệu bưu gửi từ CSDL...</span>
                    </div>

                    <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                        <span>Không tìm thấy bưu gửi nào phù hợp với bộ lọc.</span>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <th class="py-2.5 px-3">Số Hiệu Bưu Gửi</th>
                                    <th class="py-2.5 px-3">Người Gửi</th>
                                    <th class="py-2.5 px-3">Người Nhận &amp; Địa Chỉ</th>
                                    <th class="py-2.5 px-3">Khối Lượng</th>
                                    <th class="py-2.5 px-3">Tiền COD</th>
                                    <th class="py-2.5 px-3">Trạng Thái Hiện Tại</th>
                                    <th class="py-2.5 px-3 text-right">Tác Nghiệp Kho Bãi</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-blue-50/30 transition">
                                    <td class="py-2.5 px-3">
                                        <button 
                                            type="button"
                                            @click="viewTrackingDetail(item.trackingCode)"
                                            class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                            title="Click để xem chi tiết hành trình & bản đồ"
                                        >
                                            <span>{{ item.trackingCode }}</span>
                                            <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                                        </button>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-700">
                                        {{ item.senderName || 'Chưa cập nhật' }}
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-800 max-w-xs truncate">
                                        <div class="font-bold">{{ item.receiverName || 'Chưa cập nhật' }}</div>
                                        <div class="text-[10.5px] text-slate-500 truncate">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 font-mono text-slate-700">
                                        {{ item.weight ? item.weight + ' kg' : '0 kg' }}
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
                                        <!-- Khi ROUTE_ASSIGNED hoặc PENDING_ROUTING: Đơn mới tạo tại bưu cục -->
                                        <template v-if="item.currentStatus === 'ROUTE_ASSIGNED' || item.currentStatus === 'PENDING_ROUTING'">
                                            <span 
                                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200"
                                                :title="'Đơn mới tạo thuộc Bưu Cục ' + getOriginPostOfficeInfo(item).name + ' (' + getOriginPostOfficeInfo(item).code + '). Bưu cục gốc sẽ tiếp nhận và gom xe trung chuyển lên Kho Tổng.'"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Tại Bưu Cục Gốc [{{ getOriginPostOfficeInfo(item).code }}] - Chờ Xe Gom
                                            </span>
                                        </template>

                                        <!-- Khi PICKED_UP: Đã tiếp nhận tại Hub hoặc đang gom lên Hub -->
                                        <template v-else-if="item.currentStatus === 'PICKED_UP'">
                                            <span 
                                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-800 bg-blue-50 border border-blue-200"
                                                :title="'Đang tại Kho Tổng ' + (item.sourceHub || 'HUB-HN-01') + '. Sẵn sàng ghép chuyến xe trục.'"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                Tại Hub [{{ item.sourceHub || 'HUB-HN-01' }}]
                                            </span>
                                            <button 
                                                @click="currentSubtab = 'trips'"
                                                class="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition shadow-sm"
                                                title="Mở Bảng Kê / Chuyến Xe Trục để ghép đơn vào chuyến xe container"
                                            >
                                                Ghép Xe Trục
                                            </button>
                                        </template>

                                        <!-- Khi IN_TRANSIT: Đang luân chuyển trên xe trục liên tỉnh -->
                                        <template v-else-if="item.currentStatus === 'IN_TRANSIT'">
                                            <span 
                                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200"
                                                title="Kiện hàng đang trên xe trục liên tỉnh. Chờ chuyến xe cập bến kho bãi đích để dỡ hàng."
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                Đang Trên Xe Trục
                                            </span>
                                            <button 
                                                @click="handleUpdateStatus(item.trackingCode, 'ARRIVED_DEST_HUB', 'Xe tải container trục đã cập bến Kho Tổng đích, dỡ hàng vào bãi')"
                                                :disabled="isActionRunning"
                                                class="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition shadow-sm"
                                                title="Dỡ hàng từ xe tải container trục vào bãi Kho Tổng đích"
                                            >
                                                Dỡ Hàng Cập Bến
                                            </button>
                                        </template>

                                        <!-- Khi ARRIVED_DEST_HUB: Đã đến Kho Tổng đích -->
                                        <template v-else-if="item.currentStatus === 'ARRIVED_DEST_HUB'">
                                            <span 
                                                class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200"
                                                :title="'Hàng đang tại Siêu Hub ' + (item.destinationHub || 'Kho Tổng') + '. Điều xe trung chuyển về bưu cục phát ' + getDestPostOfficeInfo(item).name"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Tại Hub ➔ Chờ Xe Về {{ getDestPostOfficeInfo(item).code }}
                                            </span>
                                            <button 
                                                @click="handleUpdateStatus(item.trackingCode, 'IN_TRANSIT', 'Xe trung chuyển xuất phát từ Kho Tổng về bưu cục phát')"
                                                :disabled="isActionRunning"
                                                class="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[11px] font-bold transition shadow-sm"
                                                title="Điều xe trung chuyển chở bưu gửi về bưu cục phát"
                                            >
                                                Điều Xe Về Bưu Cục
                                            </button>
                                        </template>

                                        <!-- Khi OUT_FOR_DELIVERY hoặc DELIVERED -->
                                        <template v-else-if="item.currentStatus === 'OUT_FOR_DELIVERY'">
                                            <span class="text-emerald-700 font-bold text-[11px]">Bưu Tá Đang Phát</span>
                                        </template>
                                        <template v-else-if="item.currentStatus === 'DELIVERED'">
                                            <span class="text-slate-400 font-medium text-[11px]">Phát Thành Công</span>
                                        </template>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- THANH PHÂN TRANG (PAGINATION BAR) -->
                    <div class="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang {{ currentPage }} / {{ totalPages }} (Tổng số {{ filteredShipments.length }} kết quả)
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
            <!-- SUBTAB 2: QUẢN LÝ TỒN BÃI TẠI TRẠM (HUB INVENTORY) -->
            <!-- =============================================================== -->
            <div v-else-if="currentSubtab === 'inventory'" key="inventory" class="space-y-3">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Kiểm Soát Bưu Gửi Tồn Bãi</h2>
                        <p class="text-slate-500 text-[11px] mt-0.5">Giám sát các kiện hàng đang lưu tại kho bãi chưa đóng chuyến luân chuyển</p>
                    </div>
                    <div class="flex items-center space-x-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div><span class="text-slate-500">Đang lưu kho:</span> <strong class="text-slate-800 font-bold">{{ kpiTotalInHub }} kiện</strong></div>
                        <div class="w-px h-4 bg-slate-300"></div>
                        <div><span class="text-slate-500">Chờ tiếp nhận:</span> <strong class="text-amber-700 font-bold">{{ kpiAwaitingIntake }} kiện</strong></div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Ngày Tạo Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận</th>
                                <th class="py-2.5 px-3">Địa Chỉ Giao</th>
                                <th class="py-2.5 px-3">Khối Lượng</th>
                                <th class="py-2.5 px-3 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in shipmentsList.filter(s => s.currentStatus === 'PICKED_UP' || s.currentStatus === 'ROUTE_ASSIGNED')" :key="item.id" class="hover:bg-blue-50/30">
                                <td class="py-2.5 px-3">
                                    <button 
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                        title="Click để xem chi tiết hành trình & bản đồ"
                                    >
                                        <span>{{ item.trackingCode }}</span>
                                        <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                                    </button>
                                </td>
                                <td class="py-2.5 px-3 font-mono text-slate-500">{{ item.createdAt ? item.createdAt.substring(0, 16) : 'Chưa có' }}</td>
                                <td class="py-2.5 px-3 font-bold text-slate-800">{{ item.receiverName }}</td>
                                <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate">{{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono">{{ item.weight || 0 }} kg</td>
                                <td class="py-2.5 px-3 text-right">
                                    <button 
                                        @click="handleUpdateStatus(item.trackingCode, 'IN_TRANSIT', 'Xuất chuyến xe')"
                                        class="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-bold hover:bg-blue-100"
                                    >
                                        Đóng Chuyến Đi
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- =============================================================== -->
            <!-- SUBTAB 3: ĐIỀU PHỐI CHUYẾN XE TRỤC (LINEHAUL TRIPS)           -->
            <!-- =============================================================== -->
            <div v-else-if="currentSubtab === 'trips' || currentSubtab === 'manifest'" key="trips" class="space-y-4 pt-1">
                <trips-view :embedded="true" @view-tracking="viewTrackingDetail"></trips-view>
            </div>
            </transition>
        </div>
        `
    };

    window.HubOpsView = HubOpsView;
})();
