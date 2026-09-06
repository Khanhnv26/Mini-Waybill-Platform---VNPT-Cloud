/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRA CỨU BƯU GỬI & THEO DÕI HÀNH TRÌNH (TRACKING VIEW)
 * Phong cách B2B Enterprise Blue, Đồng Bộ Hero Banner & Phân Quyền Nút Tác Nghiệp
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

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
            const isLiveTracking = ref(true);
            const isSimulating = ref(false);

            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const notificationList = ref([]);
            const auditList = ref([]);
            const routeInfo = ref(null);
            const lastRenderedCode = ref(null);

            let livePollTimer = null;
            let simTimer = null;

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

            // 2. Hub động theo tuyến thực tế của đơn hàng
            const currentSourceHub = computed(() => {
                return routeInfo.value?.sourceHub || 'HUB-HN-01';
            });

            const currentDestHub = computed(() => {
                return routeInfo.value?.destHub || 'HUB-HP-01';
            });

            // 3. Tính toán chặng hiện tại cho Stepper (1 đến 4)
            const currentStageIndex = computed(() => {
                const s = currentShipment.value?.status || currentShipment.value?.currentStatus;
                if (!s || s === 'CREATED' || s === 'PENDING_ROUTING' || s === 'ROUTE_ASSIGNED') return 1;
                if (s === 'PICKED_UP' || s === 'IN_TRANSIT') return 2;
                if (s === 'ARRIVED_DEST_HUB') return 3;
                if (s === 'OUT_FOR_DELIVERY' || s === 'DELIVERING' || s === 'DELIVERED') return 4;
                return 1;
            });

            // 4. Tra cứu thông tin bưu gửi
            const fetchTrackingData = async (codeToSearch, isBackground = false) => {
                const code = (codeToSearch || searchCode.value || '').trim();
                if (!code) {
                    if (!isBackground) Utils.showToast('Thông Báo', 'Vui lòng nhập mã số bưu gửi để tra cứu hành trình', 'warning');
                    return;
                }

                if (!isBackground) isLoading.value = true;
                try {
                    const data = await TrackingService.getTracking(code);
                    const oldStatus = currentShipment.value?.status || currentShipment.value?.currentStatus;
                    currentShipment.value = data;
                    trackingHistory.value = data.history || [];

                    // Vẽ bản đồ lộ trình & cập nhật tiến độ pin radar (Không refresh map nếu cùng mã đơn)
                    nextTick(async () => {
                        if (!window.MapManager) return;
                        window.MapManager.init('tracking-map');
                        const status = data.status || data.currentStatus;

                        // Nếu là cùng mã bưu gửi đang xem, chỉ cập nhật tiến độ mượt mà (không reload map, không giật góc nhìn)
                        if (lastRenderedCode.value === code) {
                            window.MapManager.updateProgress(status);
                        } else {
                            // Đổi sang mã vận đơn khác hoặc lần nạp đầu tiên: Vẽ tuyến và căn chỉnh khung hình
                            routeInfo.value = await window.MapManager.renderRoute(trackingHistory.value, status, true);
                            lastRenderedCode.value = code;
                        }
                    });

                    // Tải thông báo gửi khách
                    NotificationService.getByTrackingCode(code).then(res => { notificationList.value = res || []; }).catch(() => {});

                    // Tải Nhật ký tác nghiệp (Audit)
                    if (canReadAudit.value) {
                        AuditService.getByTrackingCode(code).then(res => { auditList.value = res || []; }).catch(() => {});
                    } else {
                        auditList.value = [];
                    }

                    if (isBackground && oldStatus && oldStatus !== (data.status || data.currentStatus)) {
                        Utils.showToast('Cập Nhật Real-Time', `Bưu gửi vừa chuyển sang: ${Utils.formatStatusText(data.status || data.currentStatus)}`);
                    } else if (!isBackground) {
                        Utils.showToast('Thành Công', `Đã nạp dữ liệu hành trình bưu gửi ${code}`);
                    }
                } catch (err) {
                    if (!isBackground) {
                        Utils.showToast('Không Tìm Thấy', err.message || 'Mã vận đơn không tồn tại', 'error');
                        currentShipment.value = null;
                        trackingHistory.value = [];
                    }
                } finally {
                    if (!isBackground) isLoading.value = false;
                }
            };

            // 5. Smart Polling Timer (3 giây một lần khi bật Live Tracking)
            const startLivePolling = () => {
                stopLivePolling();
                livePollTimer = setInterval(() => {
                    if (isLiveTracking.value && currentShipment.value?.trackingCode && !isUpdating.value && !isSimulating.value) {
                        fetchTrackingData(currentShipment.value.trackingCode, true);
                    }
                }, 3000);
            };

            const stopLivePolling = () => {
                if (livePollTimer) {
                    clearInterval(livePollTimer);
                    livePollTimer = null;
                }
            };

            // 6. Cập nhật nghiệp vụ nhanh
            const updateOperationalStatus = async (newStatus, locationCode, note) => {
                if (!currentShipment.value || !currentShipment.value.trackingCode) return;
                const code = currentShipment.value.trackingCode;

                isUpdating.value = true;
                try {
                    await TrackingService.updateStatus(code, newStatus, locationCode, note);
                    Utils.showToast('Thành Công', `Đã cập nhật trạng thái: ${Utils.formatStatusText(newStatus)}`);
                    
                    // Cập nhật ngay lập tức UI bưu gửi và vị trí beacon trên bản đồ mà không chờ server
                    if (currentShipment.value) {
                        currentShipment.value.status = newStatus;
                    }
                    if (window.MapManager) {
                        window.MapManager.updateProgress(newStatus, note);
                    }

                    // Tải lại ngầm lịch sử và thông báo sau 600ms (không làm gián đoạn bản đồ)
                    setTimeout(() => {
                        fetchTrackingData(code, true);
                    }, 600);
                } catch (err) {
                    Utils.showToast('Lỗi Cập Nhật', err.message, 'error');
                    throw err;
                } finally {
                    isUpdating.value = false;
                }
            };

            // 7. Chế độ Mô Phỏng Tự Động (Auto-Play Demo Simulation)
            const toggleAutoPlaySimulation = async () => {
                if (isSimulating.value) {
                    if (simTimer) clearTimeout(simTimer);
                    isSimulating.value = false;
                    Utils.showToast('Dừng Mô Phỏng', 'Đã tạm dừng mô phỏng lộ trình bưu gửi');
                    return;
                }

                if (!currentShipment.value) {
                    Utils.showToast('Chưa Có Đơn Hàng', 'Vui lòng chọn hoặc tra cứu mã vận đơn trước khi chạy thử', 'warning');
                    return;
                }

                isSimulating.value = true;
                Utils.showToast('Bắt Đầu Mô Phỏng', 'Đang tự động di chuyển bưu gửi qua từng chặng OSRM (3.5s/chặng)...');

                const simulationSteps = [
                    { status: 'PICKED_UP', loc: currentSourceHub.value, note: 'Bưu tá tiếp nhận tại kho nguồn' },
                    { status: 'IN_TRANSIT', loc: currentSourceHub.value, note: 'Rời kho xuất phát, đang lưu thông trên cao tốc' },
                    { status: 'ARRIVED_DEST_HUB', loc: currentDestHub.value, note: 'Nhập bưu cục trung chuyển đích' },
                    { status: 'OUT_FOR_DELIVERY', loc: currentDestHub.value, note: 'Bưu tá mang hàng đi phát cho người nhận' },
                    { status: 'DELIVERED', loc: 'CUSTOMER_ADDRESS', note: 'Giao hàng thành công tận tay người nhận' }
                ];

                let stepIdx = 0;
                const runStep = async () => {
                    if (!isSimulating.value) return;
                    if (stepIdx >= simulationSteps.length) {
                        isSimulating.value = false;
                        Utils.showToast('Hoàn Tất Mô Phỏng', 'Bưu kiện đã hoàn thành toàn bộ hành trình!');
                        return;
                    }

                    const st = simulationSteps[stepIdx++];
                    try {
                        await updateOperationalStatus(st.status, st.loc, st.note);
                        if (isSimulating.value && stepIdx < simulationSteps.length) {
                            simTimer = setTimeout(runStep, 3500);
                        } else {
                            isSimulating.value = false;
                        }
                    } catch (e) {
                        isSimulating.value = false;
                    }
                };

                runStep();
            };

            // Quan sát prop nếu có mã truyền từ màn hình Tạo Đơn sang
            watch(() => props.trackingCode, (newCode) => {
                if (newCode) {
                    searchCode.value = newCode;
                    fetchTrackingData(newCode);
                }
            });

            watch(isLiveTracking, (val) => {
                if (val) startLivePolling();
                else stopLivePolling();
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
                startLivePolling();
            });

            onUnmounted(() => {
                stopLivePolling();
                if (simTimer) clearTimeout(simTimer);
            });

            const fitVietnamView = () => {
                if (window.MapManager) {
                    window.MapManager.fitVietnamView();
                }
            };

            const fitRouteView = () => {
                if (window.MapManager) {
                    window.MapManager.fitRouteView();
                }
            };

            return {
                searchCode,
                isLoading,
                isUpdating,
                isLiveTracking,
                isSimulating,
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
                currentSourceHub,
                currentDestHub,
                currentStageIndex,
                fetchTrackingData,
                updateOperationalStatus,
                toggleAutoPlaySimulation,
                fitVietnamView,
                fitRouteView,
                Utils
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <!-- 1. HERO BANNER: CHUẨN VNPT GRADIENT ĐỒNG BỘ RBAC -->
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Tracking &amp; Tracing
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Định Vị &amp; Theo Dõi Hành Trình Bưu Gửi Toàn Trình
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Giám sát chuyển phát thời gian thực, trực quan hóa tuyến đường bộ OSRM và quản lý lịch sử giao dịch minh bạch.
                            </p>
                        </div>

                        <!-- Thống kê nhanh KPI -->
                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                                <div class="text-xs sm:text-sm font-bold leading-tight truncate max-w-[100px]" :title="currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu'">
                                    {{ currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu' }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Trạng Thái</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ trackingHistory.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chặng Quét</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ notificationList.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Thông Báo</div>
                            </div>
                            <div v-if="canReadAudit" class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ auditList.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kiểm Toán</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. TOOLBAR TRA CỨU BƯU GỬI B2B -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg">
                        <div class="relative w-full">
                            <input 
                                v-model="searchCode" 
                                @keyup.enter="fetchTrackingData()"
                                type="text" 
                                placeholder="Nhập mã số bưu gửi / vận đơn (VD: WB-...)" 
                                class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <button 
                                v-if="searchCode" 
                                @click="searchCode = ''" 
                                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <button 
                            @click="fetchTrackingData()"
                            :disabled="isLoading"
                            class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-sm shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                        >
                            <span v-if="isLoading" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                            <span>{{ isLoading ? 'Đang Tra Cứu...' : 'Tra Cứu' }}</span>
                        </button>
                    </div>

                    <!-- Badge Trạng thái hiện tại -->
                    <div v-if="currentShipment" class="flex items-center space-x-2 text-xs">
                        <span class="text-slate-500 font-medium">Trạng thái bưu gửi:</span>
                        <span :class="['px-3 py-1 rounded-full font-bold border text-xs inline-flex items-center space-x-1.5', Utils.getStatusBadgeClass(currentShipment.status)]">
                            <span class="w-2 h-2 rounded-full bg-current"></span>
                            <span>{{ Utils.formatStatusText(currentShipment.status) }}</span>
                        </span>
                    </div>
                </div>

                <!-- 3. KHU VỰC CHÍNH: BẢN ĐỒ LỘ TRÌNH (TRÁI) & CHI TIẾT BƯU GỬI (PHẢI) -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Cột Trái (2/3): Bản đồ định vị lộ trình Leaflet -->
                    <div class="lg:col-span-2 b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                        <div class="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                    Sơ Đồ Tuyến Luân Chuyển Bưu Cục
                                </span>
                                <!-- Live Sync Toggle Badge -->
                                <button 
                                    @click="isLiveTracking = !isLiveTracking" 
                                    :class="['px-2 py-0.5 rounded-md text-[10.5px] font-bold border transition flex items-center space-x-1.5', isLiveTracking ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-slate-100 text-slate-500 border-slate-200']"
                                    title="Tự động đồng bộ lộ trình bưu gửi sau mỗi 3 giây"
                                >
                                    <span :class="['w-2 h-2 rounded-full', isLiveTracking ? 'bg-emerald-500 live-pulse-dot' : 'bg-slate-400']"></span>
                                    <span>LIVE SYNC (3s)</span>
                                </button>
                            </div>
                            <div class="flex items-center space-x-2">
                                <div v-if="routeInfo" class="text-[11px] font-mono text-blue-700 font-bold flex items-center space-x-2 mr-1">
                                    <span>{{ routeInfo.sourceHub }} ➔ {{ routeInfo.destHub }}</span>
                                    <span v-if="routeInfo.distanceKm" class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                        {{ routeInfo.distanceKm }} km (~{{ routeInfo.durationHours }}h)
                                    </span>
                                </div>
                                <button 
                                    @click="fitVietnamView()" 
                                    type="button" 
                                    title="Xem toàn cảnh bản đồ Việt Nam (Hoàng Sa & Trường Sa)"
                                    class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                                >
                                    <span>Toàn Cảnh VN</span>
                                </button>
                                <button 
                                    v-if="routeInfo"
                                    @click="fitRouteView()" 
                                    type="button" 
                                    title="Xem ôm sát tuyến xe luân chuyển bưu kiện"
                                    class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                                >
                                    <span>Tuyến Xe Chạy</span>
                                </button>
                            </div>
                        </div>

                        <!-- 4-STEP STEPPER PROGRESS BAR (THEO CHẶNG HÀNH TRÌNH) -->
                        <div class="mb-3.5 bg-slate-50 border border-slate-200 rounded-xl p-3">
                            <div class="grid grid-cols-4 relative">
                                <!-- Đường kết nối nền -->
                                <div class="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 z-0 hidden sm:block"></div>
                                <div class="absolute top-1/2 left-0 h-0.5 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500 hidden sm:block"
                                     :style="{ width: ((currentStageIndex - 1) / 3 * 100) + '%' }"></div>

                                <!-- Step 1: Tiếp nhận -->
                                <div class="relative z-10 flex flex-col items-center text-center px-1">
                                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 transition shadow-sm', 
                                                  currentStageIndex >= 1 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-500']">
                                        1
                                    </div>
                                    <div class="mt-1 font-bold text-[11px] leading-tight" :class="currentStageIndex >= 1 ? 'text-blue-700' : 'text-slate-500'">
                                        Tiếp Nhận
                                    </div>
                                    <div class="text-[9.5px] text-slate-400 truncate max-w-full font-mono mt-0.5">
                                        {{ currentSourceHub || 'Kho Gửi' }}
                                    </div>
                                </div>

                                <!-- Step 2: Luân chuyển -->
                                <div class="relative z-10 flex flex-col items-center text-center px-1">
                                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 transition shadow-sm', 
                                                  currentStageIndex >= 2 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-500']">
                                        2
                                    </div>
                                    <div class="mt-1 font-bold text-[11px] leading-tight" :class="currentStageIndex >= 2 ? 'text-blue-700' : 'text-slate-500'">
                                        Luân Chuyển
                                    </div>
                                    <div class="text-[9.5px] text-slate-400 truncate max-w-full font-mono mt-0.5">
                                        Cao Tốc / Tuyến
                                    </div>
                                </div>

                                <!-- Step 3: Đến kho đích -->
                                <div class="relative z-10 flex flex-col items-center text-center px-1">
                                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 transition shadow-sm', 
                                                  currentStageIndex >= 3 ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-500']">
                                        3
                                    </div>
                                    <div class="mt-1 font-bold text-[11px] leading-tight" :class="currentStageIndex >= 3 ? 'text-blue-700' : 'text-slate-500'">
                                        Đến Kho Đích
                                    </div>
                                    <div class="text-[9.5px] text-slate-400 truncate max-w-full font-mono mt-0.5">
                                        {{ currentDestHub || 'Kho Phát' }}
                                    </div>
                                </div>

                                <!-- Step 4: Phát thành công -->
                                <div class="relative z-10 flex flex-col items-center text-center px-1">
                                    <div :class="['w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs border-2 transition shadow-sm', 
                                                  currentStageIndex >= 4 ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-500']">
                                        4
                                    </div>
                                    <div class="mt-1 font-bold text-[11px] leading-tight" :class="currentStageIndex >= 4 ? 'text-emerald-700' : 'text-slate-500'">
                                        Thành Công
                                    </div>
                                    <div class="text-[9.5px] text-slate-400 truncate max-w-full font-mono mt-0.5">
                                        Khách Nhận
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 min-h-[460px] relative rounded-lg overflow-hidden border border-slate-200">
                            <div id="tracking-map" style="height: 460px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Cột Phải (1/3): Thẻ thông tin bưu gửi & Tác nghiệp theo phân quyền -->
                    <div class="space-y-4">
                        <!-- Chi tiết bưu gửi -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3 text-xs">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                    Thông Tin Bưu Gửi
                                </span>
                                <span v-if="currentShipment" class="font-mono text-[11px] text-slate-400">#{{ currentShipment.id }}</span>
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
                                    <span class="font-mono font-bold text-slate-800">{{ currentShipment.weight || 0 }} kg</span>
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

                            <div v-else class="text-slate-400 py-10 text-center">
                                <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span>Chưa có dữ liệu. Vui lòng nhập mã bưu gửi để tra cứu.</span>
                            </div>
                        </div>

                        <!-- Khu vực thao tác nghiệp vụ bưu cục (Bảo vệ theo RBAC) -->
                        <div v-if="currentShipment && canOperate" class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3 text-xs">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                    Tác Nghiệp Bưu Cục
                                </span>
                                <span class="px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    Phân Quyền Nội Bộ
                                </span>
                            </div>

                            <!-- Nút Mô phỏng tự động lộ trình Demo -->
                            <button 
                                @click="toggleAutoPlaySimulation()"
                                :class="['w-full py-2 px-3 rounded-lg font-bold text-xs border transition flex items-center justify-center space-x-2 shadow-sm',
                                         isSimulating ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 animate-pulse' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200']"
                                title="Tự động mô phỏng luân chuyển qua từng chặng (3.5s/chặng) trên bản đồ"
                            >
                                <span v-if="isSimulating" class="w-2 h-2 rounded-full bg-white animate-ping"></span>
                                <span>{{ isSimulating ? 'Đang Mô Phỏng Tuyến... (Nhấn để dừng)' : 'Mô Phỏng Tuyến Real-Time' }}</span>
                            </button>

                            <div class="grid grid-cols-2 gap-2 pt-1">
                                <!-- Nút thuộc quyền Thủ Kho Hub (tracking:update_hub) -->
                                <button 
                                    @click="updateOperationalStatus('PICKED_UP', currentSourceHub, 'Bưu tá tiếp nhận tại kho gửi')" 
                                    :disabled="isUpdating || isSimulating || !canUpdateHub" 
                                    class="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đã Lấy Hàng
                                </button>
                                <button 
                                    @click="updateOperationalStatus('IN_TRANSIT', currentSourceHub, 'Rời kho xuất phát, đang vận chuyển')" 
                                    :disabled="isUpdating || isSimulating || !canUpdateHub" 
                                    class="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đang Vận Chuyển
                                </button>
                                <button 
                                    @click="updateOperationalStatus('ARRIVED_DEST_HUB', currentDestHub, 'Đã nhập kho trung chuyển đích')" 
                                    :disabled="isUpdating || isSimulating || !canUpdateHub" 
                                    class="px-2.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-40"
                                    title="Dành cho Thủ kho Hub"
                                >
                                    Đến Bưu Cục Phát
                                </button>

                                <!-- Nút thuộc quyền Bưu Tá Giao Hàng (tracking:update_delivery) -->
                                <button 
                                    @click="updateOperationalStatus('OUT_FOR_DELIVERY', currentDestHub, 'Bưu tá đang đi phát hàng')" 
                                    :disabled="isUpdating || isSimulating || !canUpdateDelivery" 
                                    class="px-2.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition disabled:opacity-40"
                                    title="Dành cho Bưu tá Shipper"
                                >
                                    Đang Chuyển Phát
                                </button>
                                <button 
                                    @click="updateOperationalStatus('DELIVERED', 'CUSTOMER_ADDRESS', 'Người nhận đã nhận hàng và ký nhận')" 
                                    :disabled="isUpdating || isSimulating || !canUpdateDelivery" 
                                    class="col-span-2 px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition shadow-sm shadow-emerald-500/20 disabled:opacity-40"
                                    title="Dành cho Bưu tá Shipper"
                                >
                                    Phát Thành Công (Ký Nhận)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. KHU VỰC SUBTABS ĐỒNG BỘ: LỘ TRÌNH | THÔNG BÁO | NHẬT KÝ KIỂM TOÁN (AUDIT) -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <!-- Subtab Navigation Bar -->
                    <div class="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-1.5 space-x-3">
                        <button 
                            @click="activeSubtab = 'history'" 
                            :class="[
                                'pb-2.5 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5', 
                                activeSubtab === 'history' 
                                    ? 'border-blue-600 text-blue-700' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>LỊCH SỬ LUÂN CHUYỂN BƯU CỤC</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">{{ trackingHistory.length }}</span>
                        </button>

                        <button 
                            @click="activeSubtab = 'notification'" 
                            :class="[
                                'pb-2.5 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5', 
                                activeSubtab === 'notification' 
                                    ? 'border-blue-600 text-blue-700' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span>THÔNG BÁO GỬI KHÁCH HÀNG</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">{{ notificationList.length }}</span>
                        </button>

                        <button 
                            v-if="canReadAudit"
                            @click="activeSubtab = 'audit'" 
                            :class="[
                                'pb-2.5 pt-1 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-1.5', 
                                activeSubtab === 'audit' 
                                    ? 'border-blue-600 text-blue-700' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                            ]"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>NHẬT KÝ TÁC NGHIỆP KIỂM TOÁN (AUDIT)</span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">{{ auditList.length }}</span>
                        </button>
                    </div>

                    <!-- Subtab 1: Lịch sử luân chuyển (Timeline Table) -->
                    <div v-if="activeSubtab === 'history'" class="p-4">
                        <div v-if="trackingHistory.length > 0" class="overflow-x-auto">
                            <table class="w-full text-left table-b2b">
                                <thead>
                                    <tr>
                                        <th class="w-44">THỜI GIAN QUÉT</th>
                                        <th class="w-44">TRẠNG THÁI LUÂN CHUYỂN</th>
                                        <th class="w-48">ĐIỂM QUÉT / BƯU CỤC</th>
                                        <th>GHI CHÚ NGHIỆP VỤ &amp; ĐỊNH VỊ ĐOẠN ĐƯỜNG</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(h, idx) in trackingHistory" :key="idx" class="hover:bg-slate-50/80 transition">
                                        <td class="font-mono text-slate-500 whitespace-nowrap text-xs font-semibold">
                                            {{ Utils.formatTime(h.timestamp) }}
                                        </td>
                                        <td>
                                            <span :class="['px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center space-x-1.5', Utils.getStatusBadgeClass(h.status)]">
                                                <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                <span>{{ Utils.formatStatusText(h.status) }}</span>
                                            </span>
                                        </td>
                                        <td class="font-bold text-slate-800 text-xs">{{ h.locationCode || 'Bưu cục trung tâm' }}</td>
                                        <td class="text-slate-600 text-xs">{{ Utils.formatNodeText(h.node, h.status) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-10 text-xs text-slate-400">
                            Chưa có lịch sử luân chuyển nào cho mã bưu gửi này.
                        </div>
                    </div>

                    <!-- Subtab 2: Thông báo gửi khách hàng -->
                    <div v-if="activeSubtab === 'notification'" class="p-4">
                        <div v-if="notificationList.length > 0" class="space-y-2.5">
                            <div v-for="n in notificationList" :key="n.id" class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between items-start">
                                <div class="space-y-1">
                                    <div class="flex items-center space-x-2">
                                        <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px] uppercase">
                                            {{ n.channel || 'SMS/Zalo' }}
                                        </span>
                                        <span class="font-bold text-slate-800 text-xs">{{ n.title || 'Thông báo bưu gửi' }}</span>
                                    </div>
                                    <p class="text-slate-600 leading-relaxed">{{ n.message }}</p>
                                </div>
                                <span class="font-mono text-[11px] text-slate-400 whitespace-nowrap ml-4">{{ Utils.formatTime(n.createdAt) }}</span>
                            </div>
                        </div>
                        <div v-else class="text-center py-10 text-xs text-slate-400">
                            Chưa có bản ghi thông báo nào được gửi đến khách hàng.
                        </div>
                    </div>

                    <!-- Subtab 3: Nhật ký kiểm toán tác nghiệp (Audit Trail - RBAC Only) -->
                    <div v-if="activeSubtab === 'audit' && canReadAudit" class="p-4">
                        <div v-if="auditList.length > 0" class="overflow-x-auto">
                            <table class="w-full text-left table-b2b">
                                <thead>
                                    <tr>
                                        <th class="w-44">THỜI GIAN GHI NHẬN</th>
                                        <th class="w-44">HÀNH ĐỘNG TÁC NGHIỆP</th>
                                        <th class="w-48">CHUYỂN ĐỔI TRẠNG THÁI</th>
                                        <th>PAYLOAD DỮ LIỆU TÁC NGHIỆP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="a in auditList" :key="a.id" class="hover:bg-slate-50/80 transition">
                                        <td class="font-mono text-slate-500 whitespace-nowrap text-xs font-semibold">
                                            {{ Utils.formatTime(a.createdAt) }}
                                        </td>
                                        <td class="font-bold text-slate-800 text-xs">{{ a.action }}</td>
                                        <td class="font-mono text-xs">
                                            <span class="text-slate-400">{{ a.oldStatus || 'NONE' }}</span>
                                            <span class="mx-1.5 text-blue-600 font-bold">➔</span>
                                            <span class="text-emerald-700 font-bold">{{ a.newStatus }}</span>
                                        </td>
                                        <td class="font-mono text-[11px] text-slate-500 max-w-xs truncate" :title="a.payload">
                                            {{ a.payload }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div v-else class="text-center py-10 text-xs text-slate-400">
                            Chưa có bản ghi kiểm toán tác nghiệp nào cho đơn hàng này.
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.TrackingView = TrackingView;
})();

