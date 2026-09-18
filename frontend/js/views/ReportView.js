/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - VIEW: BÁO CÁO SẢN LƯỢNG & ĐỐI SOÁT DÒNG TIỀN COD
 * Phong Cách B2B Enterprise Blue, Chuẩn Hero Banner VNPT, Biểu Đồ 60fps & Xuất Excel
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const ReportView = {
        name: 'ReportView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            // 1. Khai báo Trạng Thái Cốt Lõi
            const isLoading = ref(false);
            const isExporting = ref(false);
            const activeSubtab = ref('summary'); // 'summary' | 'details'
            const liveClock = ref('');

            // Kiểm tra quyền Quản trị / Chăm sóc khách hàng
            const isAdminOrCs = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ADMIN') || Auth.hasRole('CS') || 
                       Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ROLE_CS');
            });

            // 2. Bộ lọc & Khoảng thời gian
            const activeQuickRange = ref('7days');
            const filters = reactive({
                fromDate: '',
                toDate: '',
                customerId: '',
                status: 'ALL'
            });

            // Phân trang
            const pagination = reactive({
                page: 0,
                size: 10,
                totalPages: 1,
                totalElements: 0
            });

            // Tìm kiếm cục bộ trong bảng chi tiết
            const tableSearchQuery = ref('');

            // 3. Dữ liệu Báo cáo từ Backend
            const reportData = reactive({
                totalOrders: 0,
                totalShippingFee: 0,
                totalCodAmount: 0,
                settledCodAmount: 0,
                pendingCodAmount: 0,
                deliveredCount: 0,
                returningCount: 0,
                successRate: 0,
                shipments: []
            });

            // Formatters
            const formatVnd = (val) => {
                const num = Number(val) || 0;
                return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
            };

            const formatNumber = (val) => {
                const num = Number(val) || 0;
                return new Intl.NumberFormat('vi-VN').format(num);
            };

            const formatDateStr = (date) => {
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Thiết lập khoảng ngày theo nút chọn nhanh
            const applyQuickRange = (rangeKey) => {
                activeQuickRange.value = rangeKey;
                const now = new Date();
                const toStr = formatDateStr(now);
                let fromDate = new Date();

                if (rangeKey === 'today') {
                    fromDate = now;
                } else if (rangeKey === '7days') {
                    fromDate.setDate(now.getDate() - 7);
                } else if (rangeKey === '30days') {
                    fromDate.setDate(now.getDate() - 30);
                } else if (rangeKey === 'month') {
                    fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                }

                filters.fromDate = formatDateStr(fromDate);
                filters.toDate = toStr;
                pagination.page = 0;
                loadReport();
            };

            // 4. Tải dữ liệu Báo cáo
            const loadReport = async () => {
                isLoading.value = true;
                try {
                    const res = await ReportService.getSummary({
                        fromDate: filters.fromDate,
                        toDate: filters.toDate,
                        customerId: filters.customerId ? filters.customerId : undefined,
                        status: filters.status,
                        page: pagination.page,
                        size: pagination.size
                    });

                    reportData.totalOrders = res.totalOrders || 0;
                    reportData.totalShippingFee = res.totalShippingFee || 0;
                    reportData.totalCodAmount = res.totalCodAmount || 0;
                    reportData.settledCodAmount = res.settledCodAmount || 0;
                    reportData.pendingCodAmount = res.pendingCodAmount || 0;
                    reportData.deliveredCount = res.deliveredCount || 0;
                    reportData.returningCount = res.returningCount || 0;
                    reportData.successRate = res.successRate || 0;
                    reportData.shipments = res.shipments || [];

                    pagination.totalPages = res.totalPages || 1;
                    pagination.totalElements = res.totalOrders || 0;
                    pagination.page = res.currentPage || 0;
                } catch (err) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Lỗi Tải Báo Cáo', err.message, 'error');
                    } else {
                        console.error('[ReportView] Lỗi:', err);
                    }
                } finally {
                    isLoading.value = false;
                }
            };

            // 5. Xuất File Excel
            const handleExportExcel = async () => {
                if (isExporting.value) return;
                isExporting.value = true;
                try {
                    await ReportService.exportExcel({
                        fromDate: filters.fromDate,
                        toDate: filters.toDate,
                        customerId: filters.customerId ? filters.customerId : undefined,
                        status: filters.status
                    });
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Xuất Báo Cáo Thành Công', 'File Excel 2 Sheet đã được tải về máy của bạn.', 'success');
                    }
                } catch (err) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Lỗi Xuất File', err.message, 'error');
                    } else {
                        alert('Lỗi xuất file: ' + err.message);
                    }
                } finally {
                    isExporting.value = false;
                }
            };

            // 6. Tính toán Dữ Liệu Biểu Đồ (Charts)
            // Biểu đồ Donut Phân Bổ Trạng Thái
            const donutMetrics = computed(() => {
                const total = reportData.totalOrders;
                if (total === 0) {
                    return {
                        deliveredPct: 0,
                        returningPct: 0,
                        transitPct: 0,
                        dashDelivered: '0 251.3',
                        dashTransit: '0 251.3',
                        dashReturning: '0 251.3',
                        offsetTransit: 0,
                        offsetReturning: 0
                    };
                }
                const c = 251.327; // 2 * PI * 40
                const delivPct = (reportData.deliveredCount / total) * 100;
                const retPct = (reportData.returningCount / total) * 100;
                const transPct = Math.max(0, 100 - delivPct - retPct);

                const lenDeliv = (delivPct / 100) * c;
                const lenTrans = (transPct / 100) * c;
                const lenRet = (retPct / 100) * c;

                return {
                    deliveredPct: delivPct.toFixed(1),
                    returningPct: retPct.toFixed(1),
                    transitPct: transPct.toFixed(1),
                    dashDelivered: `${lenDeliv.toFixed(1)} ${c}`,
                    dashTransit: `${lenTrans.toFixed(1)} ${c}`,
                    dashReturning: `${lenRet.toFixed(1)} ${c}`,
                    offsetTransit: -lenDeliv,
                    offsetReturning: -(lenDeliv + lenTrans)
                };
            });

            // Biểu đồ Cột Xu Hướng 7 ngày gần nhất
            const barChartData = computed(() => {
                const daysMap = {};
                // Khởi tạo 7 ngày gần nhất
                const now = new Date();
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(now.getDate() - i);
                    const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    daysMap[key] = { label: key, fee: 0, cod: 0, count: 0, isToday: i === 0 };
                }

                // Nhóm các đơn từ reportData.shipments theo ngày
                if (Array.isArray(reportData.shipments)) {
                    reportData.shipments.forEach(s => {
                        if (!s.createdAt) return;
                        const d = new Date(s.createdAt);
                        const key = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                        if (daysMap[key]) {
                            daysMap[key].fee += Number(s.shippingFee) || 0;
                            daysMap[key].cod += Number(s.codAmount) || 0;
                            daysMap[key].count++;
                        }
                    });
                }

                const list = Object.values(daysMap);
                const maxFee = Math.max(...list.map(x => x.fee), 100000);
                const maxCod = Math.max(...list.map(x => x.cod), 500000);

                return list.map(item => ({
                    ...item,
                    feeHeight: Math.max(10, Math.min(100, Math.round((item.fee / maxFee) * 85))) + '%',
                    codHeight: Math.max(12, Math.min(100, Math.round((item.cod / maxCod) * 90))) + '%',
                    feeText: (item.fee / 1000000).toFixed(1) + 'M',
                    codText: (item.cod / 1000000).toFixed(1) + 'M'
                }));
            });

            // Lọc danh sách vận đơn hiển thị trên bảng
            const filteredShipments = computed(() => {
                if (!tableSearchQuery.value.trim()) {
                    return reportData.shipments;
                }
                const q = tableSearchQuery.value.toLowerCase().trim();
                return reportData.shipments.filter(s => {
                    const code = (s.trackingCode || '').toLowerCase();
                    const sender = (s.senderName || '').toLowerCase();
                    const receiver = (s.receiverName || '').toLowerCase();
                    const phone = (s.receiverPhone || '').toLowerCase();
                    return code.includes(q) || sender.includes(q) || receiver.includes(q) || phone.includes(q);
                });
            });

            // Helper chuyển màu sắc Badge trạng thái
            const getStatusBadge = (status) => {
                switch (status) {
                    case 'DELIVERED':
                        return { label: 'Đã Giao Hàng', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
                    case 'IN_TRANSIT':
                        return { label: 'Đang Luân Chuyển', class: 'bg-blue-50 text-blue-700 border border-blue-200' };
                    case 'OUT_FOR_DELIVERY':
                        return { label: 'Đang Phát Hàng', class: 'bg-amber-50 text-amber-700 border border-amber-200' };
                    case 'RETURNING':
                        return { label: 'Đang Chuyển Hoàn', class: 'bg-rose-50 text-rose-700 border border-rose-200' };
                    case 'RETURNED':
                        return { label: 'Đã Hoàn Về Shop', class: 'bg-purple-50 text-purple-700 border border-purple-200' };
                    case 'CANCELLED':
                        return { label: 'Đã Hủy Đơn', class: 'bg-slate-100 text-slate-600 border border-slate-300' };
                    default:
                        return { label: status || 'Chờ Xử Lý', class: 'bg-slate-50 text-slate-700 border border-slate-200' };
                }
            };

            // Helper chuyển màu sắc Badge tình trạng nộp quỹ COD
            const getCodSettlementBadge = (status) => {
                const s = String(status || 'UNSETTLED').toUpperCase();
                if (s === 'SETTLED') {
                    return { label: 'Đã Thu Quỹ', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200', isPulse: false };
                }
                if (s === 'PENDING_SETTLEMENT') {
                    return { label: 'Chờ Duyệt Quỹ', class: 'bg-blue-50 text-blue-700 border border-blue-200', isPulse: true };
                }
                return { label: 'Chưa Nộp Quỹ', class: 'bg-amber-50 text-amber-700 border border-amber-200', isPulse: false };
            };

            // Điều hướng sang tra cứu vận đơn
            const goToTracking = (trackingCode) => {
                if (trackingCode) {
                    emit('view-tracking', trackingCode);
                }
            };

            // Chuyển trang
            const changePage = (newPage) => {
                if (newPage >= 0 && newPage < pagination.totalPages) {
                    pagination.page = newPage;
                    loadReport();
                }
            };

            // Đồng hồ thời gian thực
            const updateClock = () => {
                const now = new Date();
                liveClock.value = now.toLocaleTimeString('vi-VN', { hour12: false });
            };

            onMounted(() => {
                updateClock();
                setInterval(updateClock, 1000);
                applyQuickRange('7days');
            });

            return {
                isLoading,
                isExporting,
                activeSubtab,
                liveClock,
                isAdminOrCs,
                activeQuickRange,
                filters,
                pagination,
                tableSearchQuery,
                reportData,
                donutMetrics,
                barChartData,
                filteredShipments,
                formatVnd,
                formatNumber,
                applyQuickRange,
                loadReport,
                handleExportExcel,
                getStatusBadge,
                getCodSettlementBadge,
                goToTracking,
                changePage
            };
        },
        template: `
            <div class="space-y-4 pb-12 animate-entrance">
                
                <!-- ========================================================================= -->
                <!-- 1. HERO BANNER: CHUẨN VNPT GRADIENT ĐỒNG BỘ CÁC MÀN HỆ THỐNG             -->
                <!-- ========================================================================= -->
                <div class="rounded-2xl vnpt-gradient text-white p-4 sm:p-5 shadow-lg shadow-blue-900/15 relative overflow-hidden transition-all duration-300">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div class="space-y-1">
                            <div class="flex items-center space-x-2">
                                <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10.5px] uppercase font-bold tracking-wider border border-white/20 shadow-sm">
                                    Financial &amp; Volume Reporting
                                </span>
                              
                            </div>
                            <h2 class="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                                Báo Cáo Sản Lượng &amp; Đối Soát Dòng Tiền COD
                            </h2>
                            <p class="text-xs text-blue-100 font-medium">
                                Nền tảng điều phối bưu chính VNPT Cloud · Tổng hợp dữ liệu theo thời gian thực · Xuất Excel 2 Sheet
                            </p>
                        </div>

                        <!-- Cụm nút tác vụ trên Banner -->
                        <div class="flex items-center space-x-2.5 flex-shrink-0">
                            <button 
                                type="button" 
                                @click="loadReport" 
                                :disabled="isLoading"
                                class="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold transition flex items-center space-x-1.5 backdrop-blur-sm"
                                title="Đồng bộ lại dữ liệu"
                            >
                                <svg class="w-4 h-4" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{{ isLoading ? 'Đang Tải...' : 'Làm Mới' }}</span>
                            </button>

                            <button 
                                type="button" 
                                @click="handleExportExcel" 
                                :disabled="isExporting"
                                class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition flex items-center space-x-2 disabled:opacity-50"
                            >
                                <svg v-if="!isExporting" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span v-else class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isExporting ? 'Đang Xuất Excel...' : 'Xuất Báo Cáo Excel' }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ========================================================================= -->
                <!-- 2. BỘ LỌC KỲ BÁO CÁO & ĐIỀU KIỆN TRA CỨU                                 -->
                <!-- ========================================================================= -->
                <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <!-- Nút Lọc Nhanh -->
                        <div class="flex items-center space-x-1.5">
                            <span class="text-xs font-bold text-slate-500 mr-1">Khoảng ngày:</span>
                            <button 
                                type="button"
                                @click="applyQuickRange('today')"
                                :class="activeQuickRange === 'today' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                                class="px-2.5 py-1 rounded-lg text-xs transition"
                            >
                                Hôm Nay
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('7days')"
                                :class="activeQuickRange === '7days' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                                class="px-2.5 py-1 rounded-lg text-xs transition"
                            >
                                7 Ngày Qua
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('30days')"
                                :class="activeQuickRange === '30days' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                                class="px-2.5 py-1 rounded-lg text-xs transition"
                            >
                                30 Ngày Qua
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('month')"
                                :class="activeQuickRange === 'month' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'"
                                class="px-2.5 py-1 rounded-lg text-xs transition"
                            >
                                Tháng Này
                            </button>
                        </div>

                        <!-- Subtab Toggle -->
                        <div class="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
                            <button 
                                type="button"
                                @click="activeSubtab = 'summary'"
                                :class="activeSubtab === 'summary' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 font-medium hover:text-slate-900'"
                                class="px-3 py-1 rounded-lg transition"
                            >
                                1. Tổng Hợp &amp; KPI
                            </button>
                            <button 
                                type="button"
                                @click="activeSubtab = 'details'"
                                :class="activeSubtab === 'details' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-600 font-medium hover:text-slate-900'"
                                class="px-3 py-1 rounded-lg transition"
                            >
                                2. Chi Tiết Vận Đơn ({{ formatNumber(reportData.totalOrders) }})
                            </button>
                        </div>
                    </div>

                    <!-- Input Lọc Chi Tiết -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Từ Ngày</label>
                            <input 
                                type="date" 
                                v-model="filters.fromDate"
                                @change="activeQuickRange = 'custom'; loadReport();"
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Đến Ngày</label>
                            <input 
                                type="date" 
                                v-model="filters.toDate"
                                @change="activeQuickRange = 'custom'; loadReport();"
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Mã Khách Hàng (Shop ID)</label>
                            <input 
                                type="text" 
                                v-model="filters.customerId"
                                :disabled="!isAdminOrCs"
                                :placeholder="isAdminOrCs ? 'Nhập ID khách hàng hoặc để trống...' : 'Tài khoản cá nhân / Shop'"
                                @keyup.enter="loadReport"
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Trạng Thái Bưu Gửi</label>
                            <select 
                                v-model="filters.status"
                                @change="loadReport"
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="DELIVERED">Giao thành công (DELIVERED)</option>
                                <option value="IN_TRANSIT">Đang luân chuyển (IN_TRANSIT)</option>
                                <option value="OUT_FOR_DELIVERY">Đang phát hàng (OUT_FOR_DELIVERY)</option>
                                <option value="RETURNING">Đang chuyển hoàn (RETURNING)</option>
                                <option value="RETURNED">Đã hoàn về shop (RETURNED)</option>
                                <option value="CANCELLED">Đã hủy đơn (CANCELLED)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- ========================================================================= -->
                <!-- 3. NỘI DUNG SUBTAB 1: TỔNG HỢP & ĐỐI SOÁT COD (MẶC ĐỊNH)                  -->
                <!-- ========================================================================= -->
                <div v-show="activeSubtab === 'summary'" class="space-y-4">
                    
                    <!-- 4 Thẻ Thống Kê KPI Chuẩn B2B (Hover Animation & JetBrains Mono) -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                        <!-- Card 1: Tổng Vận Đơn -->
                        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200">
                            <div class="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Tổng Sản Lượng Đơn</div>
                            <div class="mt-2 flex items-baseline justify-between">
                                <div class="text-2xl font-extrabold font-mono text-slate-900">
                                    {{ formatNumber(reportData.totalOrders) }}
                                </div>
                                <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Kiện</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Bao gồm toàn bộ đơn phát sinh</div>
                        </div>

                        <!-- Card 2: Doanh Thu Cước Phí -->
                        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200">
                            <div class="text-[11px] font-bold uppercase text-slate-500 tracking-wide">Doanh Thu Cước Phí</div>
                            <div class="mt-2 flex items-baseline justify-between">
                                <div class="text-2xl font-extrabold font-mono text-slate-900">
                                    {{ formatVnd(reportData.totalShippingFee) }}
                                </div>
                                <span class="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">Doanh Thu</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Cước dịch vụ chuyển phát</div>
                        </div>

                        <!-- Card 3: Tiền COD Cần Đối Soát -->
                        <div class="bg-white p-4 rounded-2xl border border-purple-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200 bg-purple-50/20">
                            <div class="text-[11px] font-bold uppercase text-purple-700 tracking-wide">Tổng Tiền Thu Hộ COD</div>
                            <div class="mt-2 flex items-baseline justify-between">
                                <div class="text-2xl font-extrabold font-mono text-purple-700">
                                    {{ formatVnd(reportData.totalCodAmount) }}
                                </div>
                                <span class="text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">Quỹ Trạm</span>
                            </div>
                            <div class="mt-2 pt-2 border-t border-purple-200/60 space-y-1 text-[11px]">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500">Đã thu quỹ:</span>
                                    <span class="font-mono font-bold text-emerald-700">{{ formatVnd(reportData.settledCodAmount) }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500">Bưu tá giữ / Chờ duyệt:</span>
                                    <span class="font-mono font-bold text-blue-700 inline-flex items-center">
                                        <span class="live-pulse-dot mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        {{ formatVnd(reportData.pendingCodAmount) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Card 4: Tỷ Lệ Giao Thành Công -->
                        <div class="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition duration-200 bg-emerald-50/20">
                            <div class="text-[11px] font-bold uppercase text-emerald-700 tracking-wide">Tỷ Lệ Giao Thành Công</div>
                            <div class="mt-2 flex items-baseline justify-between">
                                <div class="text-2xl font-extrabold font-mono text-emerald-600">
                                    {{ reportData.successRate ? reportData.successRate.toFixed(1) : '0.0' }}%
                                </div>
                                <span class="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                    {{ formatNumber(reportData.deliveredCount) }} đơn
                                </span>
                            </div>
                            <div class="text-[11px] text-emerald-600 mt-1">
                                Hoàn: {{ formatNumber(reportData.returningCount) }} đơn
                            </div>
                        </div>
                    </div>

                    <!-- 2 BIỂU ĐỒ TRỰC QUAN (SVG CỘT & DONUT CO GIÃN ĐÀN HỒI) -->
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        
                        <!-- Biểu đồ 1: Cột Xu Hướng Doanh Thu & COD 7 Ngày (2/3 chiều ngang) -->
                        <div class="lg:col-span-2 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div>
                                    <h4 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                        Xu Hướng Doanh Thu Cước &amp; Tiền Thu Hộ COD Theo Ngày
                                    </h4>
                                    <p class="text-[11px] text-slate-400 mt-0.5">
                                        Biến động sản lượng &amp; dòng tiền qua các ngày trong kỳ (Hover vào cột để xem chi tiết)
                                    </p>
                                </div>
                                <div class="flex items-center space-x-3 text-xs">
                                    <span class="flex items-center text-slate-600 font-semibold">
                                        <span class="w-2.5 h-2.5 rounded-sm bg-blue-600 mr-1.5"></span>
                                        Cước Phí
                                    </span>
                                    <span class="flex items-center text-slate-600 font-semibold">
                                        <span class="w-2.5 h-2.5 rounded-sm bg-purple-600 mr-1.5"></span>
                                        Tiền COD
                                    </span>
                                </div>
                            </div>

                            <!-- Cột biểu đồ -->
                            <div class="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200">
                                <div 
                                    v-for="(day, idx) in barChartData" 
                                    :key="idx" 
                                    class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative"
                                    :class="{ 'bg-blue-50/50 rounded-xl pb-1': day.isToday }"
                                >
                                    <!-- Tooltip hover -->
                                    <div class="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[10.5px] py-1 px-2.5 rounded-lg font-mono pointer-events-none z-20 whitespace-nowrap shadow-xl">
                                        {{ day.label }}: Cước {{ day.feeText }} | COD {{ day.codText }} ({{ day.count }} đơn)
                                    </div>

                                    <!-- Thanh cột đôi -->
                                    <div class="w-full flex items-end justify-center gap-1.5 h-full">
                                        <div 
                                            class="w-3.5 sm:w-5 bg-blue-500 rounded-t-md group-hover:bg-blue-600 transition-all duration-500 ease-out" 
                                            :style="{ height: day.feeHeight }"
                                        ></div>
                                        <div 
                                            class="w-3.5 sm:w-5 bg-purple-500 rounded-t-md group-hover:bg-purple-600 transition-all duration-500 ease-out" 
                                            :style="{ height: day.codHeight }"
                                        ></div>
                                    </div>
                                    <span class="text-[10.5px] font-semibold" :class="day.isToday ? 'text-blue-700 font-bold' : 'text-slate-500'">
                                        {{ day.isToday ? 'Hôm Nay' : day.label }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Biểu đồ 2: SVG Donut Phân Bổ Trạng Thái (1/3 chiều ngang) -->
                        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                                <h4 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                    Cơ Cấu Trạng Thái Bưu Gửi
                                </h4>
                                <p class="text-[11px] text-slate-400 mt-0.5">
                                    Tỷ lệ thành công, luân chuyển và chuyển hoàn
                                </p>
                            </div>

                            <!-- SVG Donut Chart -->
                            <div class="flex items-center justify-center relative py-2">
                                <svg class="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" stroke-width="12" fill="transparent"/>
                                    
                                    <!-- Đã Giao Thành Công -->
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#10b981" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashDelivered" 
                                        stroke-dashoffset="0"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                    
                                    <!-- Đang Luân Chuyển / Đang Phát -->
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#0284c7" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashTransit" 
                                        :stroke-dashoffset="donutMetrics.offsetTransit"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />

                                    <!-- Chuyển Hoàn -->
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#f43f5e" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashReturning" 
                                        :stroke-dashoffset="donutMetrics.offsetReturning"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                </svg>

                                <!-- Tâm Donut -->
                                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span class="text-lg font-black font-mono text-slate-800">
                                        {{ donutMetrics.deliveredPct }}%
                                    </span>
                                    <span class="text-[9.5px] uppercase font-bold text-emerald-600">Thành Công</span>
                                </div>
                            </div>

                            <!-- Chú thích Donut -->
                            <div class="space-y-1.5 pt-1 text-xs border-t border-slate-100">
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center text-slate-600 font-medium">
                                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
                                        Đã Giao Thành Công
                                    </span>
                                    <span class="font-bold font-mono text-slate-800">{{ donutMetrics.deliveredPct }}%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center text-slate-600 font-medium">
                                        <span class="w-2.5 h-2.5 rounded-full bg-sky-500 mr-2"></span>
                                        Đang Luân Chuyển / Phát
                                    </span>
                                    <span class="font-bold font-mono text-slate-800">{{ donutMetrics.transitPct }}%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center text-slate-600 font-medium">
                                        <span class="w-2.5 h-2.5 rounded-full bg-rose-500 mr-2"></span>
                                        Chuyển Hoàn / Thất Bại
                                    </span>
                                    <span class="font-bold font-mono text-slate-800">{{ donutMetrics.returningPct }}%</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>

                <!-- ========================================================================= -->
                <!-- 4. NỘI DUNG SUBTAB 2: BẢNG CHI TIẾT VẬN ĐƠN & PHÂN TRANG                   -->
                <!-- ========================================================================= -->
                <div v-show="activeSubtab === 'details'" class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3">
                    
                    <!-- Toolbar Bảng Chi Tiết -->
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <h3 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                Danh Sách Vận Đơn Đối Soát
                            </h3>
                            <span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold">
                                {{ formatNumber(reportData.totalOrders) }} đơn
                            </span>
                        </div>

                        <div class="flex items-center space-x-2">
                            <!-- Ô tìm kiếm nhanh -->
                            <div class="relative">
                                <input 
                                    type="text" 
                                    v-model="tableSearchQuery" 
                                    placeholder="Tìm mã đơn, người gửi/nhận..."
                                    class="w-56 sm:w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <!-- Nút Xuất Excel trong Toolbar -->
                            <button 
                                type="button" 
                                @click="handleExportExcel" 
                                :disabled="isExporting"
                                class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
                            >
                                <svg v-if="!isExporting" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isExporting ? 'Xuất...' : 'Xuất Excel' }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Bảng Vận Đơn Chuẩn Enterprise -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                    <th class="py-3 px-3 w-12 text-center">STT</th>
                                    <th class="py-3 px-3">Mã Vận Đơn</th>
                                    <th class="py-3 px-3">Ngày Tạo</th>
                                    <th class="py-3 px-3">Người Gửi</th>
                                    <th class="py-3 px-3">Người Nhận</th>
                                    <th class="py-3 px-3 text-center">Dịch Vụ</th>
                                    <th class="py-3 px-3 text-right">Cước Phí</th>
                                    <th class="py-3 px-3 text-right">Tiền COD</th>
                                    <th class="py-3 px-3 text-center">Nộp Quỹ COD</th>
                                    <th class="py-3 px-3 text-center">Trạng Thái</th>
                                    <th class="py-3 px-3 text-center">Tác Vụ</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs text-slate-800">
                                <!-- Loading skeleton -->
                                <tr v-if="isLoading">
                                    <td colspan="11" class="py-10 text-center text-slate-400">
                                        <div class="flex flex-col items-center space-y-2">
                                            <span class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                            <span class="text-xs font-semibold text-slate-500">Đang tải danh sách vận đơn...</span>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Empty state -->
                                <tr v-else-if="filteredShipments.length === 0">
                                    <td colspan="11" class="py-12 text-center text-slate-400">
                                        <div class="flex flex-col items-center space-y-2">
                                            <div class="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <span class="text-xs font-bold text-slate-600">Không có dữ liệu vận đơn nào trong kỳ đã chọn</span>
                                            <span class="text-[11px] text-slate-400">Vui lòng thử mở rộng khoảng thời gian hoặc thay đổi bộ lọc trạng thái.</span>
                                        </div>
                                    </td>
                                </tr>

                                <!-- Dòng dữ liệu -->
                                <tr 
                                    v-else 
                                    v-for="(s, idx) in filteredShipments" 
                                    :key="s.trackingCode || idx"
                                    class="hover:bg-slate-50 transition"
                                >
                                    <td class="py-2.5 px-3 text-center font-mono text-slate-400">
                                        {{ pagination.page * pagination.size + idx + 1 }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <button 
                                            type="button" 
                                            @click="goToTracking(s.trackingCode)"
                                            class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline transition"
                                        >
                                            {{ s.trackingCode }}
                                        </button>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                                        {{ s.createdAt ? s.createdAt.substring(0, 16).replace('T', ' ') : '-' }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <div class="font-bold text-slate-900">{{ s.senderName || 'Người Gửi' }}</div>
                                        <div class="text-[10.5px] text-slate-400 truncate max-w-[180px]">{{ s.senderAddress || '-' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <div class="font-bold text-slate-900">{{ s.receiverName || 'Người Nhận' }}</div>
                                        <div class="text-[10.5px] text-slate-400 truncate max-w-[180px]">{{ s.receiverAddress || '-' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 text-center">
                                        <span class="px-2 py-0.5 rounded text-[10.5px] font-bold uppercase bg-slate-100 text-slate-700">
                                            {{ s.serviceType || 'EXPRESS' }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                        {{ formatVnd(s.shippingFee) }}
                                    </td>
                                    <td class="py-2.5 px-3 text-right font-mono font-bold text-purple-700">
                                        {{ formatVnd(s.codAmount) }}
                                    </td>
                                    <td class="py-2.5 px-3 text-center whitespace-nowrap">
                                        <span 
                                            v-if="s.codAmount && Number(s.codAmount) > 0"
                                            :class="['px-2 py-0.5 rounded-md text-[10.5px] font-bold inline-flex items-center', getCodSettlementBadge(s.codSettlementStatus).class]"
                                        >
                                            <span v-if="getCodSettlementBadge(s.codSettlementStatus).isPulse" class="live-pulse-dot mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                            {{ getCodSettlementBadge(s.codSettlementStatus).label }}
                                        </span>
                                        <span v-else class="text-slate-300 font-mono text-[11px]">—</span>
                                    </td>
                                    <td class="py-2.5 px-3 text-center">
                                        <span 
                                            class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-sm inline-block"
                                            :class="getStatusBadge(s.currentStatus).class"
                                        >
                                            {{ getStatusBadge(s.currentStatus).label }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-center">
                                        <button 
                                            type="button" 
                                            @click="goToTracking(s.trackingCode)"
                                            class="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                            title="Tra cứu hành trình đơn này"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Phân Trang (Pagination Footer) -->
                    <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang <span class="font-bold text-slate-800">{{ pagination.page + 1 }}</span> / <span class="font-bold text-slate-800">{{ pagination.totalPages }}</span> 
                            (Tổng <span class="font-bold text-slate-800">{{ formatNumber(pagination.totalElements) }}</span> bản ghi)
                        </div>

                        <div class="flex items-center space-x-1.5">
                            <button 
                                type="button" 
                                @click="changePage(pagination.page - 1)" 
                                :disabled="pagination.page === 0"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                            >
                                Trang Trước
                            </button>
                            <span class="px-2 font-mono font-bold text-blue-600">{{ pagination.page + 1 }}</span>
                            <button 
                                type="button" 
                                @click="changePage(pagination.page + 1)" 
                                :disabled="pagination.page >= pagination.totalPages - 1"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                            >
                                Trang Sau
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        `
    };

    window.ReportView = ReportView;
})();
