/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRUNG TÂM ĐIỀU PHỐI & MÔ PHỎNG LỘ TRÌNH (CONTROL TOWER)
 * Phong Cách B2B Tối Giản, Dữ Liệu Thật 100% Từ CSDL & Kafka Event Stream
 * Phân quyền: ROLE_ADMIN / Điều Phối Viên Toàn Tuyến
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

    const DispatchSimulationView = {
        name: 'DispatchSimulationView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const isLoading = ref(false);
            const isSimulating = ref(false);
            const simSpeedMultiplier = ref(1); // 1x | 2x | 4x
            let simTimer = null;

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const selectedTrackingCode = ref('');
            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const kafkaAuditList = ref([]);
            const routeInfo = ref(null);

            // Bảng chuỗi bước chuyển trạng thái chuẩn State Machine
            const STATE_FLOW = [
                { status: 'PENDING_ROUTING', loc: 'HUB-HN-01', note: 'Khởi tạo bưu gửi, chờ phân tuyến liên bưu cục' },
                { status: 'ROUTE_ASSIGNED', loc: 'HUB-HN-01', note: 'Hệ thống đã tự động thiết lập tuyến luân chuyển qua các Hub' },
                { status: 'PICKED_UP', loc: 'HUB-HN-01', note: 'Bưu cục tiếp nhận đã hoàn tất gom bưu phẩm về kho chia chọn' },
                { status: 'IN_TRANSIT', loc: 'TRANSIT_CORRIDOR', note: 'Đóng chuyến xe container, lưu thông trên Quốc lộ 1A' },
                { status: 'OUT_FOR_DELIVERY', loc: 'DELIVERY_OFFICE', note: 'Kho Tổng đích đã bàn giao bưu gửi cho Bưu cục phát con, bưu tá đang đi phát' },
                { status: 'DELIVERED', loc: 'CUSTOMER_DEST', note: 'Bưu tá phát tận nơi thành công và thu tiền COD' }
            ];

            // 1. Tải danh sách đơn hàng thật từ database để đưa vào dropdown
            const loadShipments = async () => {
                isLoading.value = true;
                try {
                    const list = await ShipmentService.getAll();
                    shipmentsList.value = Array.isArray(list) ? list : [];
                    if (shipmentsList.value.length > 0 && !selectedTrackingCode.value) {
                        selectedTrackingCode.value = shipmentsList.value[0].trackingCode;
                        await selectShipment(selectedTrackingCode.value);
                    }
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi tải đơn hàng:', err);
                } finally {
                    isLoading.value = false;
                }
            };

            // 2. Chọn một bưu gửi thật và nạp dữ liệu chi tiết
            const selectShipment = async (code) => {
                if (!code) return;
                selectedTrackingCode.value = code;
                try {
                    const [detail, trackingData, auditData] = await Promise.all([
                        ShipmentService.getByCode(code).catch(() => null),
                        TrackingService.getFullTracking(code).catch(() => ({ currentStatus: 'PENDING_ROUTING', history: [] })),
                        AuditService.getByTrackingCode(code).catch(() => [])
                    ]);

                    currentShipment.value = {
                        ...(detail || {}),
                        trackingCode: code,
                        status: trackingData.currentStatus || detail?.currentStatus || 'PENDING_ROUTING'
                    };
                    trackingHistory.value = trackingData.history || [];
                    kafkaAuditList.value = Array.isArray(auditData) ? auditData : [];

                    // Vẽ lại bản đồ OSRM
                    await nextTick();
                    if (window.MapManager) {
                        window.MapManager.init('dispatch-sim-map');
                        routeInfo.value = await window.MapManager.renderRoute(
                            trackingHistory.value,
                            currentShipment.value.status,
                            true
                        );
                    }
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi nạp chi tiết đơn:', err);
                }
            };

            // 3. Tải lại Kafka audit logs thật từ CSDL
            const refreshKafkaLogs = async (code) => {
                if (!code) return;
                try {
                    const logs = await AuditService.getByTrackingCode(code);
                    kafkaAuditList.value = Array.isArray(logs) ? logs : [];
                } catch (e) {}
            };

            // 4. Bước chuyển trạng thái đơn (Step-by-step)
            const advanceOneStep = async () => {
                if (!currentShipment.value) return;
                const currentStatus = currentShipment.value.status;
                const currentIdx = STATE_FLOW.findIndex(s => s.status === currentStatus);

                if (currentIdx === -1 || currentIdx >= STATE_FLOW.length - 1) {
                    Utils.showToast('Thông Báo', 'Bưu gửi đã ở trạng thái hoàn tất (DELIVERED)', 'warning');
                    return;
                }

                const nextStep = STATE_FLOW[currentIdx + 1];
                try {
                    await TrackingService.updateStatus(
                        currentShipment.value.trackingCode,
                        nextStep.status,
                        nextStep.loc,
                        nextStep.note
                    );

                    currentShipment.value.status = nextStep.status;
                    if (window.MapManager) {
                        window.MapManager.updateProgress(nextStep.status, nextStep.note);
                    }

                    Utils.showToast('Chuyển Trạng Thái', `${currentShipment.value.trackingCode} ➔ ${Utils.formatStatusText(nextStep.status)}`);
                    await refreshKafkaLogs(currentShipment.value.trackingCode);
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi chuyển bước:', err);
                    Utils.showToast('Lỗi State Machine', err.message || 'Không thể chuyển trạng thái', 'error');
                    throw err;
                }
            };

            // 5. Chạy mô phỏng tự động liên tục (Play / Pause)
            const togglePlaySimulation = () => {
                if (isSimulating.value) {
                    stopSimulation();
                    Utils.showToast('Tạm Dừng', 'Đã tạm dừng mô phỏng tiến trình xe chạy');
                    return;
                }

                if (!currentShipment.value) return;
                if (currentShipment.value.status === 'DELIVERED') {
                    Utils.showToast('Thông Báo', 'Bưu gửi đã hoàn thành toàn trình. Vui lòng chọn đơn khác hoặc Reset để chạy lại', 'warning');
                    return;
                }

                isSimulating.value = true;
                Utils.showToast('Bắt Đầu Mô Phỏng', `Đang tự động mô phỏng luân chuyển bưu gửi trên Quốc lộ 1A (Tốc độ: ${simSpeedMultiplier.value}x)...`);

                const baseInterval = 3500;
                const stepDelay = baseInterval / simSpeedMultiplier.value;

                const runNext = async () => {
                    if (!isSimulating.value) return;
                    if (currentShipment.value.status === 'DELIVERED') {
                        stopSimulation();
                        Utils.showToast('Hoàn Tất', 'Bưu gửi đã phát thành công đến người nhận!');
                        return;
                    }

                    try {
                        await advanceOneStep();
                        if (isSimulating.value && currentShipment.value.status !== 'DELIVERED') {
                            simTimer = setTimeout(runNext, stepDelay);
                        } else {
                            stopSimulation();
                        }
                    } catch (e) {
                        stopSimulation();
                    }
                };

                runNext();
            };

            const stopSimulation = () => {
                isSimulating.value = false;
                if (simTimer) {
                    clearTimeout(simTimer);
                    simTimer = null;
                }
            };

            const setSpeed = (spd) => {
                simSpeedMultiplier.value = spd;
            };

            watch(selectedTrackingCode, (newCode) => {
                if (newCode) {
                    stopSimulation();
                    selectShipment(newCode);
                }
            });

            onMounted(() => {
                loadShipments();
            });

            onUnmounted(() => {
                stopSimulation();
            });

            // Mở chi tiết hành trình & bản đồ tại TrackingView
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'dispatch-simulation');
                }
            };

            return {
                isLoading,
                isSimulating,
                simSpeedMultiplier,
                shipmentsList,
                selectedTrackingCode,
                currentShipment,
                kafkaAuditList,
                routeInfo,
                selectShipment,
                advanceOneStep,
                togglePlaySimulation,
                setSpeed,
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
                                System Control Tower
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Trung Tâm Giám Sát Điều Phối &amp; Mô Phỏng Lộ Trình
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Giám sát toàn cảnh hành lang giao thông 5 Hubs toàn quốc, mô phỏng luân chuyển đa chặng và thu nhận luồng sự kiện Kafka thời gian thực.
                        </p>
                    </div>

                    <!-- KPI Thống kê -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">5</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kho Tổng Hub</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ shipmentsList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đơn Trong DB</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kafkaAuditList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kafka Events</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. THANH CÔNG CỤ ĐIỀU KHIỂN MÔ PHỎNG NÂNG CAO (SIMULATION CONTROL TOOLBAR) -->
            <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <!-- Chọn mã bưu gửi THẬT từ CSDL -->
                <div class="flex items-center space-x-2">
                    <span class="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Bưu Gửi Khảo Sát:</span>
                    <select 
                        v-model="selectedTrackingCode"
                        class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 outline-none focus:bg-white focus:border-blue-600"
                    >
                        <option v-for="s in shipmentsList" :key="s.trackingCode" :value="s.trackingCode">
                            {{ s.trackingCode }} - {{ s.receiverName || 'Khách nhận' }} ({{ Utils.formatStatusText(s.currentStatus) }})
                        </option>
                    </select>
                </div>

                <!-- Cụm nút Play / Pause / Step-by-step -->
                <div class="flex flex-wrap items-center gap-2">
                    <div class="flex items-center space-x-1.5">
                        <button 
                            @click="togglePlaySimulation()"
                            :class="[
                                'px-3.5 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center space-x-1.5',
                                isSimulating 
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            ]"
                        >
                            <span>{{ isSimulating ? 'Tạm Dừng Mô Phỏng' : 'Chạy Mô Phỏng' }}</span>
                        </button>

                        <button 
                            @click="advanceOneStep()"
                            :disabled="isSimulating"
                            class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 disabled:opacity-50 transition"
                        >
                            Bước Kế Tiếp
                        </button>
                    </div>

                    <!-- Bộ nút chọn tốc độ -->
                    <div class="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 font-bold text-[11px]">
                        <span class="text-slate-400 px-1.5">Tốc độ:</span>
                        <button 
                            @click="setSpeed(1)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 1 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            1x
                        </button>
                        <button 
                            @click="setSpeed(2)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 2 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            2x
                        </button>
                        <button 
                            @click="setSpeed(4)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 4 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            4x
                        </button>
                    </div>

                    <!-- Badge trạng thái hiện tại -->
                    <div v-if="currentShipment" class="flex items-center space-x-1.5">
                        <span class="text-slate-400 font-medium">Trạng thái:</span>
                        <span :class="['px-2.5 py-1 rounded-md font-bold text-xs border inline-block', Utils.getStatusBadgeClass(currentShipment.status)]">
                            {{ Utils.formatStatusText(currentShipment.status) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- 3. KHU VỰC BẢN ĐỒ TOÀN QUỐC (TRÁI) & KAFKA LIVE EVENT STREAM (PHẢI) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Cột trái (2/3): Bản đồ Leaflet OSRM -->
                <div class="lg:col-span-2 b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                        <div class="flex items-center space-x-2">
                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Tuyến Luân Chuyển Đường Bộ OSRM Toàn Quốc
                            </span>
                        </div>
                        <span v-if="routeInfo" class="text-[11px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {{ routeInfo.sourceHub }} ➔ {{ routeInfo.destHub }} ({{ routeInfo.distanceKm }} km)
                        </span>
                    </div>

                    <div class="flex-1 min-h-[460px] rounded-lg overflow-hidden border border-slate-200">
                        <div id="dispatch-sim-map" style="height: 460px; width: 100%;"></div>
                    </div>
                </div>

                <!-- Cột phải (1/3): Bảng thông số & Live Kafka Event Stream -->
                <div class="space-y-4">
                    <!-- Thẻ thông số bưu gửi thật -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs space-y-2.5">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Chi Tiết Bưu Gửi</span>
                            <button 
                                type="button"
                                v-if="currentShipment?.trackingCode"
                                @click="viewTrackingDetail(currentShipment.trackingCode)"
                                class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group transition-colors"
                                title="Click để xem chi tiết toàn trình & bản đồ tại trang Tra Cứu"
                            >
                                <span>{{ currentShipment.trackingCode }}</span>
                                <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                            </button>
                            <span v-else class="font-mono text-slate-400">--</span>
                        </div>

                        <div class="space-y-2">
                            <div class="flex justify-between"><span class="text-slate-500">Người gửi:</span><span class="font-bold text-slate-800">{{ currentShipment?.senderName || 'N/A' }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Người nhận:</span><span class="font-bold text-slate-800">{{ currentShipment?.receiverName || 'N/A' }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Tiền COD:</span><span class="font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(currentShipment?.codAmount) }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Khối lượng:</span><span class="font-mono text-slate-700">{{ currentShipment?.weight ? currentShipment.weight + ' kg' : '0 kg' }}</span></div>
                            <div>
                                <span class="text-slate-500 block mb-0.5">Địa chỉ giao:</span>
                                <p class="text-slate-800 font-medium text-[11px] leading-snug">{{ currentShipment?.receiverAddress || 'N/A' }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Bảng Luồng Sự Kiện Kafka THẬT Từ CSDL audit_events -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span class="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                                    Kafka Event Stream (Audit Logs)
                                </span>
                            </div>
                            <span class="font-mono text-[10px] text-slate-400">audit_db</span>
                        </div>

                        <div class="space-y-2 overflow-y-auto max-h-[280px] font-mono text-[10.5px]">
                            <div v-if="kafkaAuditList.length === 0" class="text-slate-400 text-center py-6">
                                Chưa có sự kiện Kafka nào được ghi nhận cho bưu gửi này.
                            </div>

                            <div 
                                v-for="evt in kafkaAuditList" 
                                :key="evt.id" 
                                class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 hover:bg-blue-50/20 transition"
                            >
                                <div class="flex justify-between font-bold text-slate-800">
                                    <span class="text-blue-700">topic: {{ evt.eventType || evt.topic || 'tracking-status' }}</span>
                                    <span class="text-slate-400 text-[10px] font-normal">{{ evt.occurredAt ? evt.occurredAt.substring(11, 19) : '' }}</span>
                                </div>
                                <p class="text-slate-600 truncate text-[10px]">{{ evt.payload || evt.eventData || 'Event Data' }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.DispatchSimulationView = DispatchSimulationView;
})();
