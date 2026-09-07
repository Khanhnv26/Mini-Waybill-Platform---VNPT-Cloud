/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRA CỨU BƯU GỬI & THEO DÕI HÀNH TRÌNH (TRACKING VIEW)
 * Phong cách B2B Enterprise Blue, Thanh Tiến Trình Liên Tục & Timeline Thông Minh
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
            const isLiveTracking = ref(true);

            const validationError = ref('');
            const isNotFound = ref(false);
            const notFoundCode = ref('');

            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const routeInfo = ref(null);
            const lastRenderedCode = ref(null);

            let livePollTimer = null;

            // Tính toán chặng hiện tại (1 đến 4) - bám sát các trạng thái chuẩn của hệ thống
            const currentStageIndex = computed(() => {
                const s = currentShipment.value?.status;
                if (!s || s === 'CREATED' || s === 'PENDING_ROUTING' || s === 'ROUTE_ASSIGNED') return 1;
                if (s === 'PICKED_UP' || s === 'IN_TRANSIT') return 2;
                if (s === 'ARRIVED_DEST_HUB' || s === 'OUT_FOR_DELIVERY' || s === 'DELIVERY_FAILED') return 3;
                if (s === 'DELIVERED') return 4;
                return 1;
            });

            // Tỉ lệ thanh tiến trình và vị trí xe tải
            const stageProgress = computed(() => {
                switch (currentStageIndex.value) {
                    case 1:
                        return { width: '6%', left: 'calc(24px + (100% - 48px) * 0.06)' };
                    case 2:
                        return { width: '38%', left: 'calc(24px + (100% - 48px) * 0.38)' };
                    case 3:
                        return { width: '75%', left: 'calc(24px + (100% - 48px) * 0.75)' };
                    case 4:
                        return { width: '100%', left: 'calc(24px + (100% - 48px) * 1.0)' };
                    default:
                        return { width: '6%', left: 'calc(24px + (100% - 48px) * 0.06)' };
                }
            });

            // Hub nguồn & Hub phát đích
            const currentSourceHub = computed(() => {
                return routeInfo.value?.sourceHub || currentShipment.value?.originHub || 'HUB-HN-01';
            });

            const currentDestHub = computed(() => {
                return routeInfo.value?.destHub || currentShipment.value?.destinationHub || 'HUB-HCM-01';
            });

            // Sắp xếp lịch sử luân chuyển: Mốc mới nhất luôn đưa lên đầu
            const sortedHistory = computed(() => {
                if (!trackingHistory.value || trackingHistory.value.length === 0) return [];
                return [...trackingHistory.value].sort((a, b) => {
                    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return timeB - timeA;
                });
            });

            // Đơn đã kết thúc hành trình thì dừng polling
            const isFinalState = computed(() => currentShipment.value?.status === 'DELIVERED');

            // Định dạng thời gian tương đối
            const formatRelativeTime = (ts) => {
                if (!ts) return '';
                const now = Date.now();
                const diff = Math.floor((now - new Date(ts).getTime()) / 1000);
                if (diff < 60) return 'Vừa xong';
                if (diff < 3600) return `Cách đây ${Math.floor(diff / 60)} phút`;
                if (diff < 86400) return `Cách đây ${Math.floor(diff / 3600)} giờ`;
                return `Cách đây ${Math.floor(diff / 86400)} ngày`;
            };

            // Cấu hình icon theo trạng thái
            const getStatusIconConfig = (status) => {
                switch (status) {
                    case 'DELIVERED':
                        return { bg: 'bg-emerald-600', icon: 'check' };
                    case 'OUT_FOR_DELIVERY':
                        return { bg: 'bg-indigo-600', icon: 'courier' };
                    case 'ARRIVED_DEST_HUB':
                        return { bg: 'bg-blue-600', icon: 'warehouse' };
                    case 'IN_TRANSIT':
                        return { bg: 'bg-blue-600', icon: 'truck' };
                    case 'PICKED_UP':
                        return { bg: 'bg-amber-500', icon: 'package' };
                    case 'ROUTE_ASSIGNED':
                    case 'PENDING_ROUTING':
                        return { bg: 'bg-slate-600', icon: 'route' };
                    case 'FAILED':
                    case 'DELIVERY_FAILED':
                        return { bg: 'bg-rose-500', icon: 'alert' };
                    case 'CREATED':
                    default:
                        return { bg: 'bg-slate-400', icon: 'document' };
                }
            };

            // Tải dữ liệu lịch sử luân chuyển
            const loadSecondaryData = async (code) => {
                try {
                    const res = await TrackingService.getHistory(code);
                    trackingHistory.value = Array.isArray(res) ? res : [];
                } catch (e) {
                    // Im lặng nếu không tải được lịch sử phụ trợ
                }
            };

            // Cache thông tin chi tiết bưu gửi (sender, receiver, cod, weight)
            const shipmentDetailCache = {};
            const loadShipmentDetail = async (code) => {
                if (Object.prototype.hasOwnProperty.call(shipmentDetailCache, code)) {
                    return shipmentDetailCache[code];
                }
                const detail = await ShipmentService.getByCode(code);
                if (detail) {
                    shipmentDetailCache[code] = detail;
                }
                return detail;
            };

            // Che số điện thoại cho khách vãng lai
            const maskPhone = (phone) => {
                if (!phone) return 'N/A';
                if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
                    return phone;
                }
                const str = String(phone).trim();
                if (str.length <= 6) return str;
                return `${str.slice(0, 4)}***${str.slice(-3)}`;
            };

            const focusSearchInput = () => {
                const el = document.getElementById('tracking-search-input');
                if (el) {
                    el.focus();
                    el.select();
                }
            };

            // Tra cứu bưu gửi
            const fetchTrackingData = async (codeToSearch) => {
                validationError.value = '';
                const raw = (codeToSearch || searchCode.value || '').trim();
                if (!raw) {
                    validationError.value = 'Vui lòng nhập mã số bưu gửi cần tra cứu.';
                    return;
                }

                const code = raw.toUpperCase();
                searchCode.value = code;

                if (!code.startsWith('WB')) {
                    validationError.value = 'Mã bưu gửi không đúng định dạng. Mã chuẩn bắt đầu bằng "WB" (Ví dụ: WB1788...).';
                    return;
                }

                if (code.length < 6) {
                    validationError.value = 'Mã bưu gửi quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.';
                    return;
                }

                isLoading.value = true;
                isNotFound.value = false;
                notFoundCode.value = '';

                try {
                    const data = await TrackingService.getFullTracking(code);
                    const detail = await loadShipmentDetail(code);

                    currentShipment.value = {
                        ...(detail || {}),
                        trackingCode: code,
                        status: data.currentStatus,
                        source: data.source
                    };
                    trackingHistory.value = data.history || [];

                    // Vẽ bản đồ lộ trình dựa trên hành trình thật
                    await nextTick();
                    if (window.MapManager) {
                        window.MapManager.init('tracking-map');
                        if (lastRenderedCode.value === code) {
                            window.MapManager.updateProgress(data.currentStatus);
                        } else {
                            routeInfo.value = await window.MapManager.renderRoute(
                                trackingHistory.value,
                                data.currentStatus,
                                true
                            );
                            lastRenderedCode.value = code;
                        }
                    }

                    Utils.showToast('Thành Công', `Đã nạp dữ liệu hành trình bưu gửi ${code}`);
                } catch (err) {
                    currentShipment.value = null;
                    trackingHistory.value = [];
                    routeInfo.value = null;
                    lastRenderedCode.value = null;

                    if (err.isNotFound || err.status === 404 || (err.message && err.message.toLowerCase().includes('không tìm thấy'))) {
                        isNotFound.value = true;
                        notFoundCode.value = code;
                    } else {
                        Utils.showToast('Lỗi Tra Cứu', err.message || 'Không thể tải dữ liệu bưu gửi', 'error');
                    }
                } finally {
                    isLoading.value = false;
                }
            };

            // Đồng bộ trạng thái chạy ngầm (Silent Sync)
            const syncStatusInBackground = async () => {
                const code = currentShipment.value?.trackingCode;
                if (!code) return;

                try {
                    const st = await TrackingService.getTracking(code);
                    const newStatus = st.currentStatus;
                    if (!newStatus || newStatus === currentShipment.value.status) return;

                    currentShipment.value = { ...currentShipment.value, status: newStatus, source: st.source };

                    if (window.MapManager) {
                        window.MapManager.updateProgress(newStatus);
                    }

                    Utils.showToast('Cập Nhật Tự Động', `Bưu gửi vừa chuyển sang: ${Utils.formatStatusText(newStatus)}`);
                    await loadSecondaryData(code);
                } catch (err) {
                    // Lỗi đồng bộ ngầm thì bỏ qua
                }
            };

            const POLL_INTERVAL_MS = 5000;

            const startLivePolling = () => {
                stopLivePolling();
                livePollTimer = setInterval(() => {
                    if (!isLiveTracking.value) return;
                    if (document.hidden) return;
                    if (isFinalState.value) return;
                    if (!currentShipment.value?.trackingCode) return;
                    syncStatusInBackground();
                }, POLL_INTERVAL_MS);
            };

            const stopLivePolling = () => {
                if (livePollTimer) {
                    clearInterval(livePollTimer);
                    livePollTimer = null;
                }
            };

            watch(() => props.trackingCode, (newCode) => {
                if (newCode) {
                    searchCode.value = newCode;
                    fetchTrackingData(newCode);
                }
            });

            const handleVisibilityChange = () => {
                if (document.hidden) return;
                if (window.MapManager) window.MapManager.invalidateSize();
                if (isLiveTracking.value && !isFinalState.value && currentShipment.value?.trackingCode) {
                    syncStatusInBackground();
                }
            };

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
                document.addEventListener('visibilitychange', handleVisibilityChange);
            });

            onUnmounted(() => {
                stopLivePolling();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (window.MapManager) window.MapManager.cancelPendingRenders();
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
                validationError,
                isNotFound,
                notFoundCode,
                maskPhone,
                focusSearchInput,
                currentShipment,
                trackingHistory,
                sortedHistory,
                routeInfo,
                isFinalState,
                currentStageIndex,
                stageProgress,
                currentSourceHub,
                currentDestHub,
                getStatusIconConfig,
                formatRelativeTime,
                fetchTrackingData,
                fitVietnamView,
                fitRouteView,
                Utils
            };
        },
        template: `
            <div class="space-y-4 pb-10 text-slate-800">
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
                                Giám sát chuyển phát thời gian thực, trực quan hóa tuyến luân chuyển bưu cục và dòng thời gian xử lý minh bạch.
                            </p>
                        </div>

                        <!-- Thống kê nhanh KPI -->
                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[80px]">
                                <div class="text-xs sm:text-sm font-bold leading-tight truncate max-w-[120px]" :title="currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu'">
                                    {{ currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu' }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Trạng Thái</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ trackingHistory.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Mốc Quét</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. TOOLBAR TRA CỨU BƯU GỬI B2B -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg">
                            <div class="relative w-full">
                                <input 
                                    id="tracking-search-input"
                                    v-model="searchCode" 
                                    @keyup.enter="fetchTrackingData()"
                                    @input="validationError = ''"
                                    type="text" 
                                    placeholder="Nhập mã số bưu gửi (VD: WB...)" 
                                    class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <button 
                                    v-if="searchCode" 
                                    @click="searchCode = ''; validationError = ''" 
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

                    <!-- Lỗi Validation Inline -->
                    <div v-if="validationError" class="text-rose-600 text-[11.5px] font-semibold flex items-center space-x-1.5 pt-1 animate-pulse">
                        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ validationError }}</span>
                    </div>

                    <!-- Quy chuẩn định dạng mã hợp lệ -->
                    <div class="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Quy chuẩn mã bưu gửi VNPT: Bắt đầu bằng <strong>WB</strong>, theo sau là chuỗi số và chữ hoa không dấu (Ví dụ: <strong>WB1788...</strong>).</span>
                    </div>
                </div>

                <!-- 2.1 KHỐI GIAO DIỆN BÁO LỖI: KHÔNG TÌM THẤY BƯU GỬI -->
                <div v-if="isNotFound" class="b2b-card bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm text-center max-w-3xl mx-auto my-2">
                    <div class="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700 mb-2">
                        <span>Mã đã tra cứu:</span>
                        <span class="text-rose-600 font-extrabold">{{ notFoundCode }}</span>
                    </div>
                    <h2 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1">
                        Không Tìm Thấy Thông Tin Bưu Gửi
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                        Hệ thống không tìm thấy hành trình của mã bưu gửi này trong cơ sở dữ liệu phân tán. Vui lòng kiểm tra lại tính chính xác của mã vận đơn.
                    </p>
                    <div class="mt-5">
                        <button 
                            @click="focusSearchInput()" 
                            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                            Nhập Lại Mã Vận Đơn Khác
                        </button>
                    </div>
                </div>

                <!-- 3. KHU VỰC BẢN ĐỒ LỘ TRÌNH & THÔNG TIN BƯU GỬI (KHI CÓ DỮ LIỆU) -->
                <div v-show="!isNotFound && currentShipment" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Cột Trái (2/3): Bản đồ lộ trình & Thanh Tiến Trình Liên Tục Mới -->
                    <div class="lg:col-span-2 b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <!-- Map Card Header Tối Giản -->
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                            <div class="flex items-center space-x-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">
                                    Sơ Đồ Tuyến Luân Chuyển Bưu Cục
                                </span>
                            </div>
                            <div class="flex items-center space-x-2">
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

                        <!-- THANH TIẾN TRÌNH LIÊN TỤC KÈM PIN XE TẢI (CONTINUOUS PROGRESS BAR) -->
                        <div class="mb-3.5 bg-slate-50/70 border border-slate-200 rounded-xl p-3.5">
                            <!-- 1. Hàng trên: Tên 4 giai đoạn -->
                            <div class="grid grid-cols-4 text-center text-xs font-bold mb-2">
                                <div>
                                    <span :class="currentStageIndex >= 1 ? 'text-blue-700' : 'text-slate-400 font-medium'">1. Tiếp Nhận</span>
                                </div>
                                <div>
                                    <span :class="currentStageIndex >= 2 ? 'text-blue-700' : 'text-slate-400 font-medium'">2. Luân Chuyển</span>
                                </div>
                                <div>
                                    <span :class="currentStageIndex >= 3 ? 'text-blue-700' : 'text-slate-400 font-medium'">3. Đến Kho Đích</span>
                                </div>
                                <div>
                                    <span :class="currentStageIndex >= 4 ? 'text-emerald-700' : 'text-slate-400 font-medium'">4. Thành Công</span>
                                </div>
                            </div>

                            <!-- 2. Rãnh trượt Progress Bar kèm xe tải -->
                            <div class="relative px-6 py-2">
                                <div class="h-2.5 w-full bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden relative">
                                    <div class="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 rounded-full smooth-transition" 
                                         :style="{ width: stageProgress.width }"></div>
                                </div>

                                <!-- 4 Mốc Điểm Tròn Trên Thanh Bar -->
                                <div class="absolute inset-x-6 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                                    <div :class="['w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm -ml-1.5', currentStageIndex >= 1 ? 'bg-blue-600' : 'bg-slate-300']"></div>
                                    <div :class="['w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm -ml-1.5', currentStageIndex >= 2 ? 'bg-blue-600' : 'bg-slate-300']"></div>
                                    <div :class="['w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm -ml-1.5', currentStageIndex >= 3 ? 'bg-blue-600' : 'bg-slate-300']"></div>
                                    <div :class="['w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm -mr-1.5', currentStageIndex >= 4 ? 'bg-emerald-600' : 'bg-slate-300']"></div>
                                </div>

                                <!-- HUY HIỆU XE TẢI MINI DI CHUYỂN LIÊN TỤC -->
                                <div class="truck-pin absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none" 
                                     :style="{ left: stageProgress.left }" 
                                     title="Bưu kiện đang ở chặng này">
                                    <div :class="['w-8 h-8 rounded-full text-white border-2 border-white shadow-lg flex items-center justify-center pulse-active', currentStageIndex === 4 ? 'bg-emerald-600' : 'bg-blue-600']">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M18 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                            <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11-7h2.5l2 2.67V15H17v-5zm1 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            <!-- 3. Hàng dưới: Địa điểm bưu cục chi tiết -->
                            <div class="grid grid-cols-4 text-center text-[10.5px] font-mono text-slate-400 mt-2 select-none">
                                <div>
                                    <span class="font-semibold text-slate-600">{{ currentSourceHub }}</span>
                                    <div class="text-[9.5px] text-slate-400">Kho Gửi</div>
                                </div>
                                <div>
                                    <span class="font-semibold text-slate-600">Quốc Lộ 1A</span>
                                    <div class="text-[9.5px] text-slate-400">Liên Tỉnh</div>
                                </div>
                                <div>
                                    <span :class="currentStageIndex >= 3 ? 'font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200' : 'font-semibold text-slate-600'">{{ currentDestHub }}</span>
                                    <div class="text-[9.5px] text-blue-600 font-semibold">Kho Phát Đích</div>
                                </div>
                                <div>
                                    <span :class="currentStageIndex >= 4 ? 'font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : 'text-slate-400'">Khách Nhận</span>
                                    <div class="text-[9.5px] text-slate-300">Tận Nơi</div>
                                </div>
                            </div>
                        </div>

                        <!-- Khung Bản Đồ Leaflet -->
                        <div class="flex-1 min-h-[460px] relative rounded-lg overflow-hidden border border-slate-200">
                            <div id="tracking-map" style="height: 460px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- Cột Phải (1/3): Thẻ Thông Tin Bưu Gửi Chi Tiết -->
                    <div class="space-y-4">
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
                                    <span class="text-slate-500 block mb-0.5 font-medium">Người gửi:</span>
                                    <div class="text-slate-800 font-semibold flex items-center justify-between">
                                        <span>{{ currentShipment.senderName || 'N/A' }}</span>
                                        <span class="font-mono text-slate-500 font-medium text-[11px]" :title="currentShipment.senderPhone">{{ maskPhone(currentShipment.senderPhone) }}</span>
                                    </div>
                                    <span class="text-slate-600 text-[11px] block mt-0.5 leading-relaxed">{{ currentShipment.senderAddress || 'N/A' }}</span>
                                </div>
                                <div class="py-1">
                                    <span class="text-slate-500 block mb-0.5 font-medium">Người nhận:</span>
                                    <div class="text-slate-800 font-semibold flex items-center justify-between">
                                        <span>{{ currentShipment.receiverName || 'N/A' }}</span>
                                        <span class="font-mono text-slate-500 font-medium text-[11px]" :title="currentShipment.receiverPhone">{{ maskPhone(currentShipment.receiverPhone) }}</span>
                                    </div>
                                    <span class="text-slate-600 text-[11px] block mt-0.5 leading-relaxed">{{ currentShipment.receiverAddress || 'N/A' }}</span>
                                </div>
                            </div>

                            <div v-else class="text-slate-400 py-10 text-center">
                                <svg class="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span>Chưa có dữ liệu. Vui lòng nhập mã bưu gửi để tra cứu.</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. LỊCH SỬ LUÂN CHUYỂN BƯU CỤC (SMART ICON VERTICAL TIMELINE) -->
                <div v-show="!isNotFound && currentShipment" class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 text-xs">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                        <div class="flex items-center space-x-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">
                                Lịch Sử Luân Chuyển Bưu Cục
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ sortedHistory.length }} Mốc Quét
                            </span>
                        </div>
                    </div>

                    <!-- VERTICAL TIMELINE WITH SMART ICONS -->
                    <div v-if="sortedHistory.length > 0" class="relative pl-7 sm:pl-10 space-y-5 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-200">
                        <div v-for="(h, idx) in sortedHistory" :key="idx" class="relative flex items-start group">
                            <!-- Icon Thông Minh Tròn Theo Trạng Thái -->
                            <div :class="[
                                'absolute -left-[35px] sm:-left-[43px] mt-1 w-9 h-9 rounded-full text-white border-4 border-white shadow-md flex items-center justify-center z-10',
                                getStatusIconConfig(h.status).bg,
                                idx === 0 ? 'pulse-active ring-2 ring-blue-500/30' : 'shadow-sm'
                            ]">
                                <!-- 1. Truck / Luân Chuyển -->
                                <svg v-if="getStatusIconConfig(h.status).icon === 'truck'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                <!-- 2. Package / Đã Tiếp Nhận -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'package'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <!-- 3. Route / Phân Tuyến -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'route'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <!-- 4. Courier / Bưu Tá Phát -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'courier'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <!-- 5. Warehouse / Đến Kho Đích -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'warehouse'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <!-- 6. Check / Giao Thành Công -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'check'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <!-- 7. Alert / Thất Bại -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'alert'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <!-- 8. Document / Khởi Tạo Mặc Định -->
                                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>

                            <!-- Khung nội dung 3 tầng -->
                            <div :class="[
                                'flex-1 rounded-2xl p-4 transition smooth-transition',
                                idx === 0 
                                    ? 'bg-blue-50/40 border border-blue-200/80 shadow-sm hover:border-blue-300' 
                                    : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                            ]">
                                <!-- Tầng 1: Thời gian -->
                                <div class="flex items-center justify-between mb-1.5">
                                    <span :class="['font-mono text-xs font-bold', idx === 0 ? 'text-blue-700' : 'text-slate-500']">
                                        {{ Utils.formatTime(h.timestamp) }}
                                    </span>
                                    <span v-if="formatRelativeTime(h.timestamp)" :class="['text-[11px] font-mono', idx === 0 ? 'text-blue-600 font-semibold' : 'text-slate-400']">
                                        {{ formatRelativeTime(h.timestamp) }}
                                    </span>
                                </div>

                                <!-- Tầng 2: Trạng thái & Địa điểm bưu cục -->
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span :class="['px-2.5 py-0.5 rounded-lg text-xs font-bold border', Utils.getStatusBadgeClass(h.status)]">
                                        {{ Utils.formatStatusText(h.status) }}
                                    </span>
                                    <span class="text-xs font-bold text-slate-800">
                                        {{ h.locationCode || 'Bưu Cục Trung Tâm' }}
                                    </span>
                                </div>

                                <!-- Tầng 3: Ghi chú chi tiết hành trình -->
                                <p :class="['text-xs leading-relaxed', idx === 0 ? 'text-slate-700' : 'text-slate-500']">
                                    {{ Utils.formatNodeText(h.node, h.status) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-10 text-xs text-slate-400">
                        Chưa có lịch sử luân chuyển nào cho mã bưu gửi này.
                    </div>
                </div>
            </div>
        `
    };

    window.TrackingView = TrackingView;
})();
