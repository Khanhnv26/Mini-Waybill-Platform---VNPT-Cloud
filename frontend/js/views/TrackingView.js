/**
 * VNPT CLOUD - VIEW: TRA CỨU BƯU GỬI & THEO DÕI HÀNH TRÌNH
 * Tích hợp Bản đồ Leaflet + Nhật ký tác nghiệp + Thông báo khách hàng
 */

(function () {
    const { ref, watch, onMounted, nextTick } = Vue;

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

            // Tra cứu thông tin bưu gửi
            const fetchTrackingData = async (codeToSearch) => {
                const code = (codeToSearch || searchCode.value || '').trim();
                if (!code) {
                    Utils.showToast('Thông báo', 'Vui lòng nhập mã bưu gửi để tra cứu', 'error');
                    return;
                }

                isLoading.value = true;
                try {
                    // 1. Lấy dữ liệu tracking
                    const data = await TrackingService.getTracking(code);
                    currentShipment.value = data;
                    trackingHistory.value = data.history || [];

                    // 2. Vẽ bản đồ lộ trình
                    nextTick(async () => {
                        if (window.MapManager) {
                            window.MapManager.init('tracking-map');
                            routeInfo.value = await window.MapManager.renderRoute(trackingHistory.value);
                        }
                    });

                    // 3. Tải đồng thời Nhật ký tác nghiệp và Thông báo
                    AuditService.getByTrackingCode(code).then(res => { auditList.value = res; });
                    NotificationService.getByTrackingCode(code).then(res => { notificationList.value = res; });

                    Utils.showToast('Thành công', `Đã tìm thấy bưu gửi ${code}`);
                } catch (err) {
                    Utils.showToast('Không tìm thấy', err.message, 'error');
                    currentShipment.value = null;
                    trackingHistory.value = [];
                } finally {
                    isLoading.value = false;
                }
            };

            // Cập nhật nghiệp vụ nhanh (Bưu tá / Khai thác bưu cục)
            const updateOperationalStatus = async (newStatus, locationCode, note) => {
                if (!currentShipment.value || !currentShipment.value.trackingCode) return;
                const code = currentShipment.value.trackingCode;

                isUpdating.value = true;
                try {
                    await TrackingService.updateStatus(code, newStatus, locationCode, note);
                    Utils.showToast('Thành công', `Cập nhật trạng thái: ${Utils.formatStatusText(newStatus)}`);
                    // Tải lại dữ liệu sau khi cập nhật
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
                fetchTrackingData,
                updateOperationalStatus,
                Utils
            };
        },
        template: `
            <div class="space-y-4">
                <!-- 1. Thanh tìm kiếm mã bưu gửi -->
                <div class="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div class="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg">
                        <input 
                            v-model="searchCode" 
                            @keyup.enter="fetchTrackingData()"
                            type="text" 
                            placeholder="Nhập mã số bưu gửi / vận đơn (VD: WB-...)" 
                            class="w-full px-3 py-2 border border-slate-200 rounded text-xs font-mono focus:outline-none focus:border-blue-600 transition"
                        />
                        <button 
                            @click="fetchTrackingData()"
                            :disabled="isLoading"
                            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold whitespace-nowrap transition disabled:opacity-50"
                        >
                            <span v-if="isLoading">Đang Tra Cứu...</span>
                            <span v-else>Tra Cứu</span>
                        </button>
                    </div>

                    <div v-if="currentShipment" class="flex items-center space-x-2 text-xs">
                        <span class="text-slate-500">Trạng thái hiện tại:</span>
                        <span :class="['px-2.5 py-1 rounded font-semibold border text-[11px]', Utils.getStatusBadgeClass(currentShipment.status)]">
                            {{ Utils.formatStatusText(currentShipment.status) }}
                        </span>
                    </div>
                </div>

                <!-- 2. Khung Nội Dung Chính: Bản đồ (Trái) & Thông Tin Vận Đơn (Phải) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Cột Trái: Bản đồ định vị lộ trình Leaflet -->
                    <div class="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                Sơ Đồ Tuyến Luân Chuyển Bưu Cục
                            </div>
                            <div v-if="routeInfo" class="text-[10px] font-mono text-blue-600 font-semibold flex items-center space-x-2">
                                <span>Tuyến: {{ routeInfo.sourceHub }} ➔ {{ routeInfo.destHub }}</span>
                                <span v-if="routeInfo.distanceKm" class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                                    {{ routeInfo.distanceKm }} km (~{{ routeInfo.durationHours }}h)
                                </span>
                            </div>
                        </div>
                        <div class="flex-1 min-h-[480px] relative">
                            <div id="tracking-map" style="height: 480px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Cột Phải: Thẻ thông tin bưu gửi & Cập nhật nghiệp vụ -->
                    <div class="space-y-4">
                        <!-- Chi tiết bưu gửi -->
                        <div class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-3 text-xs">
                            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                                Thông Tin Bưu Gửi
                            </div>

                            <div v-if="currentShipment" class="space-y-2">
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500">Mã bưu gửi:</span>
                                    <span class="font-mono font-bold text-blue-600">{{ currentShipment.trackingCode }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500">Dịch vụ:</span>
                                    <span class="font-semibold">{{ currentShipment.serviceType || 'EXPRESS' }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500">Khối lượng tính cước:</span>
                                    <span class="font-mono">{{ currentShipment.weight || 0 }} kg</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500">Tiền thu hộ COD:</span>
                                    <span class="font-mono font-semibold text-slate-800">{{ Utils.formatCurrency(currentShipment.codAmount) }}</span>
                                </div>
                                <div class="py-1 border-b border-slate-50">
                                    <span class="text-slate-500 block mb-0.5">Địa chỉ gửi:</span>
                                    <span class="text-slate-800 font-medium">{{ currentShipment.senderAddress || 'N/A' }}</span>
                                </div>
                                <div class="py-1">
                                    <span class="text-slate-500 block mb-0.5">Địa chỉ nhận:</span>
                                    <span class="text-slate-800 font-medium">{{ currentShipment.receiverAddress || 'N/A' }}</span>
                                </div>
                            </div>

                            <div v-else class="text-slate-400 py-8 text-center">
                                Chưa có dữ liệu. Vui lòng nhập mã bưu gửi để tra cứu.
                            </div>
                        </div>

                        <!-- Khu vực thao tác nghiệp vụ bưu cục (Mô phỏng quét mã) -->
                        <div v-if="currentShipment" class="bg-white border border-slate-200 rounded-lg p-4 shadow-sm space-y-2.5 text-xs">
                            <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
                                Tác Nghiệp Bưu Cục (Cập Nhật Trạng Thái)
                            </div>
                            <div class="grid grid-cols-2 gap-2 pt-1">
                                <button 
                                    @click="updateOperationalStatus('PICKED_UP', 'WAREHOUSE', 'Đã lấy hàng tại địa chỉ gửi')" 
                                    :disabled="isUpdating" 
                                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-medium transition"
                                >
                                    Đã Lấy Hàng
                                </button>
                                <button 
                                    @click="updateOperationalStatus('IN_TRANSIT', 'HUB-HN-01', 'Rời kho xuất phát, đang vận chuyển')" 
                                    :disabled="isUpdating" 
                                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-medium transition"
                                >
                                    Đang Vận Chuyển
                                </button>
                                <button 
                                    @click="updateOperationalStatus('ARRIVED_DEST_HUB', 'HUB-HCM-01', 'Đã nhập kho trung chuyển đích')" 
                                    :disabled="isUpdating" 
                                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-medium transition"
                                >
                                    Đến Bưu Cục Phát
                                </button>
                                <button 
                                    @click="updateOperationalStatus('OUT_FOR_DELIVERY', 'WAREHOUSE_DEST', 'Bưu tá đang đi phát hàng')" 
                                    :disabled="isUpdating" 
                                    class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[11px] font-medium transition"
                                >
                                    Đang Chuyển Phát
                                </button>
                                <button 
                                    @click="updateOperationalStatus('DELIVERED', 'CUSTOMER_ADDRESS', 'Người nhận đã nhận hàng và ký nhận')" 
                                    :disabled="isUpdating" 
                                    class="col-span-2 px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold uppercase tracking-wider transition"
                                >
                                    Phát Thành Công
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Khu vực Chi tiết gộp: Lịch sử luân chuyển | Nhật ký tác nghiệp | Thông báo -->
                <div class="bg-white border border-slate-200 rounded-lg shadow-sm">
                    <!-- Subtab Headers -->
                    <div class="flex border-b border-slate-200 bg-slate-50 px-4">
                        <button 
                            @click="activeSubtab = 'history'" 
                            :class="['py-2.5 px-4 text-xs font-semibold border-b-2 transition', activeSubtab === 'history' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800']"
                        >
                            1. Lịch Sử Luân Chuyển ({{ trackingHistory.length }})
                        </button>
                        <button 
                            @click="activeSubtab = 'audit'" 
                            :class="['py-2.5 px-4 text-xs font-semibold border-b-2 transition', activeSubtab === 'audit' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800']"
                        >
                            2. Nhật Ký Tác Nghiệp Kho ({{ auditList.length }})
                        </button>
                        <button 
                            @click="activeSubtab = 'notification'" 
                            :class="['py-2.5 px-4 text-xs font-semibold border-b-2 transition', activeSubtab === 'notification' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-800']"
                        >
                            3. Thông Báo Gửi Khách ({{ notificationList.length }})
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
                                        <td class="font-mono text-slate-500 whitespace-nowrap">{{ Utils.formatTime(h.timestamp) }}</td>
                                        <td>
                                            <span :class="['px-2 py-0.5 rounded text-[10px] font-semibold border', Utils.getStatusBadgeClass(h.status)]">
                                                {{ Utils.formatStatusText(h.status) }}
                                            </span>
                                        </td>
                                        <td class="font-medium text-slate-700">{{ h.locationCode || 'Bưu cục trung tâm' }}</td>
                                        <td class="text-slate-600">{{ Utils.formatNodeText(h.node, h.status) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-6 text-xs text-slate-400">
                            Chưa có lịch sử luân chuyển cho bưu gửi này.
                        </div>
                    </div>

                    <!-- Subtab 2: Nhật ký tác nghiệp (Audit) -->
                    <div v-if="activeSubtab === 'audit'" class="p-4">
                        <div v-if="auditList.length > 0" class="overflow-x-auto">
                            <table class="w-full text-left table-b2b">
                                <thead>
                                    <tr>
                                        <th>Thời gian ghi nhận</th>
                                        <th>Hành động tác nghiệp</th>
                                        <th>Dịch vụ phát sinh</th>
                                        <th>Dữ liệu chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in auditList" :key="item.id">
                                        <td class="font-mono text-slate-500 whitespace-nowrap">{{ Utils.formatTime(item.timestamp) }}</td>
                                        <td class="font-semibold text-slate-800">{{ item.action }}</td>
                                        <td class="font-mono text-slate-600">{{ item.serviceName || 'Hệ Thống' }}</td>
                                        <td>
                                            <pre class="text-[10px] font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-700 max-h-24 overflow-y-auto">{{ Utils.formatJson(item.details) }}</pre>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-6 text-xs text-slate-400">
                            Chưa có nhật ký tác nghiệp nào được ghi nhận.
                        </div>
                    </div>

                    <!-- Subtab 3: Thông báo gửi khách -->
                    <div v-if="activeSubtab === 'notification'" class="p-4">
                        <div v-if="notificationList.length > 0" class="space-y-2">
                            <div v-for="n in notificationList" :key="n.id" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-slate-800">{{ n.title || 'Thông báo bưu gửi' }}</span>
                                    <span class="font-mono text-slate-400 text-[10px]">{{ Utils.formatTime(n.sentAt) }}</span>
                                </div>
                                <p class="text-slate-600">{{ n.message }}</p>
                            </div>
                        </div>
                        <div v-else class="text-center py-6 text-xs text-slate-400">
                            Chưa có thông báo nào được phát đi.
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.TrackingView = TrackingView;
})();
