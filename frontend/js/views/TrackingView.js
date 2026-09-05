/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRA CỨU BƯU GỬI & THEO DÕI HÀNH TRÌNH
 * Phong cách B2B Enterprise Blue, Tích hợp Bản đồ Leaflet + Phân Quyền Nút Tác Nghiệp
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted, nextTick } = Vue;

    const TrackingView = {
        name: 'TrackingView',
        props: {
            trackingCode: {
                type: String,
                default: ''
            }
        },
        setup(props) {
            const searchCode = ref(props.trackingCode || '');
            const isLoading = ref(false);
            const isUpdating = ref(false);

            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const notificationList = ref([]);
            const auditList = ref([]);
            const routeInfo = ref(null);

            // Subtab chi tiết phía dưới: 'history' | 'audit' | 'notification'
            const activeSubtab = ref('history');

            // 1. Phân quyền cấp độ Giao diện (Component-Level RBAC)
            const canOperate = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasAnyPermission(['tracking:update_hub', 'tracking:update_delivery']) || Auth.hasRole('ROLE_ADMIN');
            });

            const canUpdateHub = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasPermission('tracking:update_hub') || Auth.hasRole('ROLE_ADMIN');
            });

            const canUpdateDelivery = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasPermission('tracking:update_delivery') || Auth.hasRole('ROLE_ADMIN');
            });

            const canReadAudit = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasPermission('audit:read') || Auth.hasRole('ROLE_ADMIN');
            });

            // 2. Tra cứu thông tin bưu gửi
            const fetchTrackingData = async (codeToSearch) => {
                const code = (codeToSearch || searchCode.value || '').trim();
                if (!code) {
                    Utils.showToast('Thông báo', 'Vui lòng nhập mã bưu gửi để tra cứu', 'warning');
                    return;
                }

                isLoading.value = true;
                try {
                    // 2.1. Lấy dữ liệu tracking
                    const data = await TrackingService.getTracking(code);
                    currentShipment.value = data;
                    trackingHistory.value = data.history || [];

                    // 2.2. Vẽ bản đồ lộ trình
                    nextTick(async () => {
                        if (window.MapManager) {
                            window.MapManager.init('tracking-map');
                            routeInfo.value = await window.MapManager.renderRoute(trackingHistory.value);
                        }
                    });

                    // 2.3. Tải thông báo gửi khách
                    NotificationService.getByTrackingCode(code).then(res => { notificationList.value = res || []; }).catch(() => {});

                    // 2.4. Chỉ tải Nhật ký tác nghiệp (Audit) nếu User có quyền audit:read
                    if (canReadAudit.value) {
                        AuditService.getByTrackingCode(code).then(res => { auditList.value = res || []; }).catch(() => {});
                    } else {
                        auditList.value = [];
                    }

                    Utils.showToast('Thành công', `Đã nạp dữ liệu bưu gửi ${code}`);
                } catch (err) {
                    Utils.showToast('Không tìm thấy', err.message || 'Mã vận đơn không tồn tại', 'error');
                    currentShipment.value = null;
                    trackingHistory.value = [];
                } finally {
                    isLoading.value = false;
                }
            };

            // 3. Cập nhật nghiệp vụ nhanh (Bưu tá / Khai thác bưu cục)
            const updateOperationalStatus = async (newStatus, locationCode, note) => {
                if (!currentShipment.value || !currentShipment.value.trackingCode) return;
                const code = currentShipment.value.trackingCode;

                isUpdating.value = true;
                try {
                    await TrackingService.updateStatus(code, newStatus, locationCode, note);
                    Utils.showToast('Thành công', `Đã cập nhật trạng thái: ${Utils.formatStatusText(newStatus)}`);
                    setTimeout(() => {
                        fetchTrackingData(code);
                    }, 600);
                } catch (err) {
                    Utils.showToast('Lỗi cập nhật', err.message, 'error');
                } finally {
                    isUpdating.value = false;
                }
            };

            // Quan sát prop nếu có mã truyền từ màn hình Tạo Đơn sang
            watch(() => props.trackingCode, (newCode) => {
                if (newCode) {
                    searchCode.value = newCode;
                    fetchTrackingData(newCode);
                }
            });

            onMounted(() => {
                nextTick(() => {
                    if (window.MapManager) {
                        window.MapManager.init('tracking-map');
                    }
                    if (searchCode.value) {
                        fetchTrackingData(searchCode.value);
                    }
                });
            });

            return {
                searchCode,
                isLoading,
                isUpdating,
                currentShipment,
                trackingHistory,
                notificationList,
                auditList,
                routeInfo,
                activeSubtab,
                canOperate,
                canUpdateHub,
                canUpdateDelivery,
                canReadAudit,
                fetchTrackingData,
                updateOperationalStatus,
                Utils
            };
        },
        template: `
            <div class="space-y-4">
                <!-- 1. Thanh tìm kiếm mã bưu gửi (Style VNPT B2B) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg">
                        <div class="relative w-full">
                            <input 
                                v-model="searchCode" 
                                @keyup.enter="fetchTrackingData()"
                                type="text" 
                                placeholder="Nhập mã số bưu gửi / vận đơn (VD: WB-...)" 
                                class="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                            <svg class="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button 
                            @click="fetchTrackingData()"
                            :disabled="isLoading"
                            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold whitespace-nowrap shadow-sm shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                        >
                            <span v-if="isLoading" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                            <span>{{ isLoading ? 'Đang Tra Cứu...' : 'Tra Cứu' }}</span>
                        </button>
                    </div>

                    <div v-if="currentShipment" class="flex items-center space-x-2 text-sm">
                        <span class="text-slate-500 font-medium">Trạng thái:</span>
                        <span :class="['px-3 py-1 rounded-full font-semibold border text-xs inline-flex items-center space-x-1.5', Utils.getStatusBadgeClass(currentShipment.status)]">
                            <span class="w-2 h-2 rounded-full bg-current"></span>
                            <span>{{ Utils.formatStatusText(currentShipment.status) }}</span>
                        </span>
                    </div>
                </div>

                <!-- 2. Khung Nội Dung Chính: Bản đồ (Trái) & Thông Tin Vận Đơn (Phải) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Cột Trái: Bản đồ định vị lộ trình Leaflet -->
                    <div class="lg:col-span-2 b2b-card bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                <span class="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                                    Sơ Đồ Tuyến Luân Chuyển Bưu Cục
                                </span>
                            </div>
                            <div v-if="routeInfo" class="text-[10px] font-mono text-blue-700 font-bold flex items-center space-x-2">
                                <span>{{ routeInfo.sourceHub }} ➔ {{ routeInfo.destHub }}</span>
                                <span v-if="routeInfo.distanceKm" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                    {{ routeInfo.distanceKm }} km (~{{ routeInfo.durationHours }}h)
                                </span>
                            </div>
                        </div>
                        <div class="flex-1 min-h-[480px] relative rounded-xl overflow-hidden border border-slate-200">
                            <div id="tracking-map" style="height: 480px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Cột Phải: Thẻ thông tin bưu gửi & Tác nghiệp theo phân quyền -->
                    <div class="space-y-4">
                        <!-- Chi tiết bưu gửi -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-xs">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span class="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider">
                                    Thông Tin Bưu Gửi
                                </span>
                                <span v-if="currentShipment" class="font-mono text-[10px] text-slate-400">#{{ currentShipment.id }}</span>
                            </div>

                            <div v-if="currentShipment" class="space-y-2.5">
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Mã bưu gửi:</span>
                                    <span class="font-mono font-extrabold text-blue-700">{{ currentShipment.trackingCode }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Dịch vụ:</span>
                                    <span class="font-bold text-slate-700">{{ currentShipment.serviceType || 'EXPRESS' }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Khối lượng tính cước:</span>
                                    <span class="font-mono font-semibold">{{ currentShipment.weight || 0 }} kg</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Tiền thu hộ COD:</span>
                                    <span class="font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(currentShipment.codAmount) }}</span>
                                </div>
                                <div class="py-1 border-b border-slate-50">
                                    <span class="text-slate-500 block mb-0.5 font-medium">Địa chỉ người gửi:</span>
                                    <span class="text-slate-800 font-semibold">{{ currentShipment.senderAddress || 'N/A' }}</span>
                                </div>
                                <div class="py-1">
                                    <span class="text-slate-500 block mb-0.5 font-medium">Địa chỉ người nhận:</span>
                                    <span class="text-slate-800 font-semibold">{{ currentShipment.receiverAddress || 'N/A' }}</span>
                                </div>
                            </div>

                            <div v-else class="text-slate-400 py-8 text-center">
                                Chưa có dữ liệu. Vui lòng nhập mã bưu gửi để tra cứu.
                            </div>
                        </div>

                        <!-- Khu vực thao tác nghiệp vụ bưu cục (Được bảo vệ nghiêm ngặt bằng RBAC) -->
                        <div v-if="currentShipment && canOperate" class="b2b-card bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 text-xs sm:text-sm">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    Tác Nghiệp Bưu Cục
                                </span>
                                <span class="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                    Nghiệp Vụ Nội Bộ
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-2 pt-1">
                                <!-- Nút thuộc quyền Thủ Kho Hub (tracking:update_hub) -->
                                <button 
                                    @click="updateOperationalStatus('PICKED_UP', 'WAREHOUSE', 'Đã lấy hàng tại địa chỉ gửi')" 
                                    :disabled="isUpdating || !canUpdateHub" 
                                    class="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đã Lấy Hàng
                                </button>
                                <button 
                                    @click="updateOperationalStatus('IN_TRANSIT', 'HUB-HN-01', 'Rời kho xuất phát, đang vận chuyển')" 
                                    :disabled="isUpdating || !canUpdateHub" 
                                    class="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đang Vận Chuyển
                                </button>
                                <button 
                                    @click="updateOperationalStatus('ARRIVED_DEST_HUB', 'HUB-HCM-01', 'Đã nhập kho trung chuyển đích')" 
                                    :disabled="isUpdating || !canUpdateHub" 
                                    class="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-semibold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đến Bưu Cục Phát
                                </button>

                                <!-- Nút thuộc quyền Bưu Tá Giao Hàng (tracking:update_delivery) -->
                                <button 
                                    @click="updateOperationalStatus('OUT_FOR_DELIVERY', 'WAREHOUSE_DEST', 'Bưu tá đang đi phát hàng')" 
                                    :disabled="isUpdating || !canUpdateDelivery" 
                                    class="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-semibold transition disabled:opacity-40"
                                    title="Dành cho Bưu tá Shipper"
                                >
                                    Đang Chuyển Phát
                                </button>
                                <button 
                                    @click="updateOperationalStatus('DELIVERED', 'CUSTOMER_ADDRESS', 'Người nhận đã nhận hàng và ký nhận')" 
                                    :disabled="isUpdating || !canUpdateDelivery" 
                                    class="col-span-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition shadow-sm shadow-emerald-500/20 disabled:opacity-40"
                                    title="Dành cho Bưu tá Shipper"
                                >
                                    Phát Thành Công
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Khu vực Chi tiết gộp: Lịch sử luân chuyển | Nhật ký tác nghiệp (Admin) | Thông báo -->
                <div class="b2b-card bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <!-- Subtab Headers -->
                    <div class="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-1">
                        <button 
                            @click="activeSubtab = 'history'" 
                            :class="[
                                'py-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2', 
                                activeSubtab === 'history' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <span>Lịch Sử Luân Chuyển</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{{ trackingHistory.length }}</span>
                        </button>

                        <button 
                            v-if="canReadAudit"
                            @click="activeSubtab = 'audit'" 
                            :class="[
                                'py-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2', 
                                activeSubtab === 'audit' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <span>Nhật Ký Tác Nghiệp (Audit)</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">{{ auditList.length }}</span>
                        </button>

                        <button 
                            @click="activeSubtab = 'notification'" 
                            :class="[
                                'py-3 px-4 text-sm font-bold border-b-2 transition flex items-center space-x-2', 
                                activeSubtab === 'notification' ? 'border-blue-600 text-blue-600 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <span>Thông Báo Gửi Khách</span>
                            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">{{ notificationList.length }}</span>
                        </button>
                    </div>

                    <!-- Subtab 1: Lịch sử luân chuyển -->
                    <div v-if="activeSubtab === 'history'" class="p-4">
                        <div v-if="trackingHistory.length > 0" class="overflow-x-auto">
                            <table class="w-full text-left table-b2b">
                                <thead>
                                    <tr>
                                        <th>Thời gian</th>
                                        <th>Trạng thái luân chuyển</th>
                                        <th>Điểm quét / Bưu cục</th>
                                        <th>Ghi chú nghiệp vụ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(h, idx) in trackingHistory" :key="idx">
                                        <td class="font-mono text-slate-500 whitespace-nowrap text-xs">{{ Utils.formatTime(h.timestamp) }}</td>
                                        <td>
                                            <span :class="['px-2.5 py-1 rounded-full text-xs font-semibold border', Utils.getStatusBadgeClass(h.status)]">
                                                {{ Utils.formatStatusText(h.status) }}
                                            </span>
                                        </td>
                                        <td class="font-bold text-slate-800">{{ h.locationCode || 'Bưu cục trung tâm' }}</td>
                                        <td class="text-slate-600">{{ Utils.formatNodeText(h.node, h.status) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-8 text-xs text-slate-400">
                            Chưa có lịch sử luân chuyển cho bưu gửi này.
                        </div>
                    </div>

                    <!-- Subtab 2: Nhật ký tác nghiệp (Audit) - Chỉ Admin / Quyền audit:read -->
                    <div v-if="activeSubtab === 'audit' && canReadAudit" class="p-4">
                        <div v-if="auditList.length > 0" class="overflow-x-auto">
                            <table class="w-full text-left table-b2b">
                                <thead>
                                    <tr>
                                        <th>Thời gian ghi nhận</th>
                                        <th>Hành động tác nghiệp</th>
                                        <th>Trạng thái cũ ➔ mới</th>
                                        <th>Dữ liệu chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="a in auditList" :key="a.id">
                                        <td class="font-mono text-slate-500 whitespace-nowrap text-xs">{{ Utils.formatTime(a.createdAt) }}</td>
                                        <td class="font-bold text-slate-800">{{ a.action }}</td>
                                        <td class="font-mono text-xs">
                                            <span class="text-slate-400">{{ a.oldStatus || 'NONE' }}</span>
                                            <span class="mx-1 text-blue-600">➔</span>
                                            <span class="text-emerald-700 font-bold">{{ a.newStatus }}</span>
                                        </td>
                                        <td class="font-mono text-[11px] text-slate-500 max-w-xs truncate">{{ a.payload }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-8 text-xs text-slate-400">
                            Chưa có bản ghi kiểm toán tác nghiệp cho đơn này.
                        </div>
                    </div>

                    <!-- Subtab 3: Thông báo khách hàng -->
                    <div v-if="activeSubtab === 'notification'" class="p-4">
                        <div v-if="notificationList.length > 0" class="space-y-2">
                            <div v-for="n in notificationList" :key="n.id" class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-center">
                                <div>
                                    <span class="font-bold text-slate-800">{{ n.title || 'Thông báo bưu gửi' }}</span>
                                    <p class="text-slate-600 mt-0.5">{{ n.message }}</p>
                                </div>
                                <span class="font-mono text-[11px] text-slate-400">{{ Utils.formatTime(n.createdAt) }}</span>
                            </div>
                        </div>
                        <div v-else class="text-center py-8 text-xs text-slate-400">
                            Chưa có thông báo nào được gửi.
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.TrackingView = TrackingView;
})();
