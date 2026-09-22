(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const ReportView = {
        name: 'ReportView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const isLoading = ref(false);
            const isExporting = ref(false);
            const activeSubtab = ref('summary');
            const liveClock = ref('');

            const isAdminOrCs = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ADMIN') || Auth.hasRole('CS') || 
                       Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ROLE_CS');
            });

            const activeQuickRange = ref('7days');
            const filters = reactive({
                fromDate: '',
                toDate: '',
                customerId: '',
                status: 'ALL'
            });

            const pagination = reactive({
                page: 0,
                size: 10,
                totalPages: 1,
                totalElements: 0
            });

            const tableSearchQuery = ref('');

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

                    reportData.inTransitCount = res.inTransitCount || 0;
                    reportData.failedCount = res.failedCount || 0;
                    reportData.cancelledCount = res.cancelledCount || 0;
                    reportData.daily = Array.isArray(res.daily) ? res.daily : [];

                    pagination.totalPages = res.totalPages || 1;
                    pagination.totalElements = res.tableTotalElements !== undefined ? res.tableTotalElements : (res.totalOrders || 0);
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

            const donutMetrics = computed(() => {
                const total = Number(reportData.totalOrders) || 0;
                if (total <= 0) {
                    return {
                        deliveredPct: '0.0',
                        returningPct: '0.0',
                        transitPct: '0.0',
                        cancelledPct: '0.0',
                        dashDelivered: '0 251.3',
                        dashTransit: '0 251.3',
                        dashReturning: '0 251.3',
                        dashCancelled: '0 251.3',
                        offsetTransit: 0,
                        offsetReturning: 0,
                        offsetCancelled: 0
                    };
                }
                const c = 251.327;
                const delivered = Number(reportData.deliveredCount) || 0;
                const returning = Number(reportData.returningCount) || 0;
                const failed = Number(reportData.failedCount) || 0;
                const transit = Number(reportData.inTransitCount) || 0;
                const cancelled = Number(reportData.cancelledCount) || 0;

                const delivPct = Math.min(100, Math.max(0, (delivered / total) * 100));
                const transPct = Math.min(100, Math.max(0, (transit / total) * 100));
                const retPct = Math.min(100, Math.max(0, ((returning + failed) / total) * 100));
                const cancelPct = Math.min(100, Math.max(0, (cancelled / total) * 100));

                const lenDeliv = (delivPct / 100) * c;
                const lenTrans = (transPct / 100) * c;
                const lenRet = (retPct / 100) * c;
                const lenCancel = (cancelPct / 100) * c;

                return {
                    deliveredPct: delivPct.toFixed(1),
                    returningPct: retPct.toFixed(1),
                    transitPct: transPct.toFixed(1),
                    cancelledPct: cancelPct.toFixed(1),
                    dashDelivered: `${lenDeliv.toFixed(1)} ${c}`,
                    dashTransit: `${lenTrans.toFixed(1)} ${c}`,
                    dashReturning: `${lenRet.toFixed(1)} ${c}`,
                    dashCancelled: `${lenCancel.toFixed(1)} ${c}`,
                    offsetTransit: -lenDeliv,
                    offsetReturning: -(lenDeliv + lenTrans),
                    offsetCancelled: -(lenDeliv + lenTrans + lenRet)
                };
            });

            const barChartData = computed(() => {
                const todayKey = formatDateStr(new Date());
                const list = (Array.isArray(reportData.daily) ? reportData.daily : []).map(day => {
                    const raw = String(day.date || '');
                    const parts = raw.split('-');
                    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : raw;
                    return {
                        label,
                        fee: Number(day.shippingFee) || 0,
                        cod: Number(day.codAmount) || 0,
                        count: Number(day.count) || 0,
                        isToday: raw === todayKey
                    };
                });
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

            const goToTracking = (trackingCode) => {
                if (trackingCode) {
                    emit('view-tracking', trackingCode);
                }
            };

            const changePage = (newPage) => {
                if (newPage >= 0 && newPage < pagination.totalPages) {
                    pagination.page = newPage;
                    loadReport();
                }
            };

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
            <div class="space-y-4 pb-12 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Financial &amp; Volume Reporting
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Báo Cáo Sản Lượng &amp; Đối Soát Dòng Tiền COD
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Nền tảng điều phối bưu chính VNPT Cloud • Tổng hợp dữ liệu theo thời gian thực • Xuất Excel 2 Sheet.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto flex-shrink-0">
                            <button 
                                type="button" 
                                @click="loadReport" 
                                :disabled="isLoading"
                                class="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/25 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                                title="Đồng bộ lại dữ liệu"
                            >
                                <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{{ isLoading ? 'Đang Tải...' : 'Làm Mới' }}</span>
                            </button>

                            <button 
                                type="button" 
                                @click="handleExportExcel" 
                                :disabled="isExporting"
                                class="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                <svg v-if="!isExporting" class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isExporting ? 'Đang Xuất...' : 'Xuất Báo Cáo Excel' }}</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                    <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <div class="flex items-center space-x-1.5">
                            <span class="text-xs font-bold text-slate-500 mr-1">Khoảng ngày:</span>
                            <button 
                                type="button"
                                @click="applyQuickRange('today')"
                                :class="activeQuickRange === 'today' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                            >
                                Hôm Nay
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('7days')"
                                :class="activeQuickRange === '7days' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                            >
                                7 Ngày Qua
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('30days')"
                                :class="activeQuickRange === '30days' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                            >
                                30 Ngày Qua
                            </button>
                            <button 
                                type="button"
                                @click="applyQuickRange('month')"
                                :class="activeQuickRange === 'month' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                            >
                                Tháng Này
                            </button>
                        </div>

                        <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                            <button 
                                type="button"
                                @click="activeSubtab = 'summary'"
                                :class="activeSubtab === 'summary' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 font-semibold hover:text-slate-900'"
                                class="px-3 py-1 rounded-md transition cursor-pointer"
                            >
                                1. Tổng Hợp &amp; KPI
                            </button>
                            <button 
                                type="button"
                                @click="activeSubtab = 'details'"
                                :class="activeSubtab === 'details' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-600 font-semibold hover:text-slate-900'"
                                class="px-3 py-1 rounded-md transition cursor-pointer"
                            >
                                2. Chi Tiết Vận Đơn ({{ formatNumber(reportData.totalOrders) }})
                            </button>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Từ Ngày</label>
                            <input 
                                type="date" 
                                v-model="filters.fromDate"
                                @change="activeQuickRange = 'custom'; loadReport();"
                                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Đến Ngày</label>
                            <input 
                                type="date" 
                                v-model="filters.toDate"
                                @change="activeQuickRange = 'custom'; loadReport();"
                                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
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
                                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label class="block text-[11px] font-bold text-slate-600 mb-1">Trạng Thái Bưu Gửi</label>
                            <select 
                                v-model="filters.status"
                                @change="loadReport"
                                class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition cursor-pointer"
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

                <div v-show="activeSubtab === 'summary'" class="space-y-4">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Tổng Sản Lượng Đơn</div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <div class="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                                    {{ formatNumber(reportData.totalOrders) }}
                                </div>
                                <span class="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">Kiện</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Bao gồm toàn bộ đơn phát sinh</div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Doanh Thu Cước Phí</div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <div class="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                                    {{ formatVnd(reportData.totalShippingFee) }}
                                </div>
                                <span class="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60">Doanh Thu</span>
                            </div>
                            <div class="text-[11px] text-slate-400 mt-1">Cước dịch vụ chuyển phát</div>
                        </div>

                        <div class="bg-white border border-purple-200 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition bg-purple-50/20 space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-purple-700">Tổng Tiền Thu Hộ COD</div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <div class="text-xl sm:text-2xl font-bold font-mono text-purple-700">
                                    {{ formatVnd(reportData.totalCodAmount) }}
                                </div>
                                <span class="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded border border-purple-200/60">Quỹ Trạm</span>
                            </div>
                            <div class="mt-2 pt-2 border-t border-purple-200/60 space-y-1 text-[11px]">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500">Đã thu quỹ:</span>
                                    <span class="font-mono font-bold text-emerald-700">{{ formatVnd(reportData.settledCodAmount) }}</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500">Chờ duyệt quỹ:</span>
                                    <span class="font-mono font-bold text-blue-700 inline-flex items-center">
                                        <span class="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                        {{ formatVnd(reportData.pendingCodAmount) }}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white border border-emerald-200 rounded-xl p-3.5 sm:p-4 shadow-sm hover:shadow-md transition bg-emerald-50/20 space-y-1">
                            <div class="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">Tỷ Lệ Giao Thành Công</div>
                            <div class="mt-1 flex items-baseline justify-between">
                                <div class="text-xl sm:text-2xl font-bold font-mono text-emerald-600">
                                    {{ reportData.successRate ? reportData.successRate.toFixed(1) : '0.0' }}%
                                </div>
                                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200/60">
                                    {{ formatNumber(reportData.deliveredCount) }} đơn
                                </span>
                            </div>
                            <div class="text-[11px] text-emerald-700 mt-1">
                                Chuyển hoàn: {{ formatNumber(reportData.returningCount) }} đơn
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
                        <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                                <div>
                                    <h4 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                        Xu Hướng Doanh Thu Cước &amp; Tiền Thu Hộ COD Theo Ngày
                                    </h4>
                                    <p class="text-[11px] text-slate-400 mt-0.5">
                                        Biến động sản lượng &amp; dòng tiền qua các ngày trong kỳ
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

                            <div class="h-48 w-full flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-200">
                                <div 
                                    v-for="(day, idx) in barChartData" 
                                    :key="idx" 
                                    class="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer relative"
                                    :class="{ 'bg-blue-50/50 rounded-lg pb-1': day.isToday }"
                                >
                                    <div class="absolute -top-9 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-slate-900 text-white text-[10.5px] py-1 px-2.5 rounded-lg font-mono pointer-events-none z-20 whitespace-nowrap shadow-xl">
                                        {{ day.label }}: Cước {{ day.feeText }} | COD {{ day.codText }} ({{ day.count }} đơn)
                                    </div>

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

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                                <h4 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                    Cơ Cấu Trạng Thái Bưu Gửi
                                </h4>
                                <p class="text-[11px] text-slate-400 mt-0.5">
                                    Tỷ lệ thành công, luân chuyển và chuyển hoàn
                                </p>
                            </div>

                            <div class="flex items-center justify-center relative py-2">
                                <svg class="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" stroke-width="12" fill="transparent"/>
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#10b981" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashDelivered" 
                                        stroke-dashoffset="0"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#0284c7" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashTransit" 
                                        :stroke-dashoffset="donutMetrics.offsetTransit"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#f43f5e" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashReturning" 
                                        :stroke-dashoffset="donutMetrics.offsetReturning"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                    <circle 
                                        cx="50" cy="50" r="40" 
                                        stroke="#94a3b8" 
                                        stroke-width="12" 
                                        :stroke-dasharray="donutMetrics.dashCancelled" 
                                        :stroke-dashoffset="donutMetrics.offsetCancelled"
                                        fill="transparent"
                                        class="transition-all duration-700 ease-out"
                                    />
                                </svg>

                                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span class="text-lg font-black font-mono text-slate-800">
                                        {{ donutMetrics.deliveredPct }}%
                                    </span>
                                    <span class="text-[9.5px] uppercase font-bold text-emerald-600">Thành Công</span>
                                </div>
                            </div>

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
                                <div class="flex items-center justify-between">
                                    <span class="flex items-center text-slate-600 font-medium">
                                        <span class="w-2.5 h-2.5 rounded-full bg-slate-400 mr-2"></span>
                                        Đã Hủy
                                    </span>
                                    <span class="font-bold font-mono text-slate-800">{{ donutMetrics.cancelledPct }}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-show="activeSubtab === 'details'" class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-3">
                    <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <h3 class="text-xs font-bold uppercase text-slate-800 tracking-wide">
                                Danh Sách Vận Đơn Đối Soát
                            </h3>
                            <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[11px] font-bold border border-slate-200/60">
                                {{ formatNumber(reportData.totalOrders) }} đơn
                            </span>
                        </div>

                        <div class="flex items-center space-x-2">
                            <div class="relative">
                                <input 
                                    type="text" 
                                    v-model="tableSearchQuery" 
                                    placeholder="Tìm mã đơn, người gửi/nhận..." 
                                    class="w-56 sm:w-64 pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            <button 
                                type="button" 
                                @click="handleExportExcel" 
                                :disabled="isExporting"
                                class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                            >
                                <svg v-if="!isExporting" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                <span>{{ isExporting ? 'Xuất...' : 'Xuất Excel' }}</span>
                            </button>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                                    <th class="py-2.5 px-3.5 w-12 text-center">STT</th>
                                    <th class="py-2.5 px-3.5">Mã Vận Đơn &amp; Dịch Vụ</th>
                                    <th class="py-2.5 px-3.5">Người Gửi (Tiếp Nhận)</th>
                                    <th class="py-2.5 px-3.5">Người Nhận (Phát Trả)</th>
                                    <th class="py-2.5 px-3.5">Tài Chính &amp; COD</th>
                                    <th class="py-2.5 px-3.5 text-center">Trạng Thái</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs text-slate-800">
                                <tr v-if="isLoading">
                                    <td colspan="6" class="py-10 text-center text-slate-400">
                                        <div class="flex flex-col items-center space-y-2">
                                            <span class="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                                            <span class="text-xs font-semibold text-slate-500">Đang tải danh sách vận đơn...</span>
                                        </div>
                                    </td>
                                </tr>

                                <tr v-else-if="filteredShipments.length === 0">
                                    <td colspan="6" class="py-12 text-center text-slate-400">
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

                                <tr 
                                    v-else 
                                    v-for="(s, idx) in filteredShipments" 
                                    :key="s.trackingCode || idx"
                                    class="hover:bg-slate-50/80 transition"
                                >
                                    <td class="py-2.5 px-3.5 text-center font-mono text-slate-400">
                                        {{ pagination.page * pagination.size + idx + 1 }}
                                    </td>

                                    <td class="py-2.5 px-3.5">
                                        <div class="flex items-center space-x-1.5">
                                            <button 
                                                type="button" 
                                                @click="goToTracking(s.trackingCode)"
                                                class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer"
                                                title="Click để tra cứu hành trình"
                                            >
                                                {{ s.trackingCode }}
                                            </button>
                                            <span 
                                                :class="s.serviceType === 'EXPRESS' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'"
                                                class="px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase"
                                            >
                                                {{ s.serviceType === 'EXPRESS' ? 'HỎA TỐC' : (s.serviceType || 'TIÊU CHUẨN') }}
                                            </span>
                                        </div>
                                        <div class="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                                            {{ s.createdAt ? s.createdAt.substring(0, 16).replace('T', ' ') : '-' }}
                                        </div>
                                    </td>

                                    <td class="py-2.5 px-3.5 max-w-[200px]">
                                        <div class="font-bold text-slate-900 truncate">{{ s.senderName || 'Người Gửi' }}</div>
                                        <div class="text-[11px] text-slate-400 truncate" :title="s.senderAddress">
                                            {{ s.senderAddress || '-' }}
                                        </div>
                                    </td>

                                    <td class="py-2.5 px-3.5 max-w-[220px]">
                                        <div class="font-bold text-slate-900 truncate">{{ s.receiverName || 'Người Nhận' }}</div>
                                        <div class="text-[11px] text-slate-400 truncate" :title="s.receiverAddress">
                                            {{ s.receiverAddress || '-' }}
                                        </div>
                                    </td>

                                    <td class="py-2.5 px-3.5 whitespace-nowrap">
                                        <div class="flex items-center space-x-2">
                                            <span class="font-mono font-bold text-xs" :class="Number(s.codAmount) > 0 ? 'text-purple-700' : 'text-slate-400'">
                                                {{ Number(s.codAmount) > 0 ? 'COD: ' + formatVnd(s.codAmount) : 'Không COD' }}
                                            </span>
                                            <span 
                                                v-if="s.codAmount && Number(s.codAmount) > 0"
                                                :class="['px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center', getCodSettlementBadge(s.codSettlementStatus).class]"
                                            >
                                                <span v-if="getCodSettlementBadge(s.codSettlementStatus).isPulse" class="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                                {{ getCodSettlementBadge(s.codSettlementStatus).label }}
                                            </span>
                                        </div>
                                        <div class="text-[11px] font-mono text-slate-500 mt-0.5">
                                            <span class="text-slate-400">Cước:</span>
                                            <span class="font-semibold text-slate-700 ml-1">{{ formatVnd(s.shippingFee) }}</span>
                                        </div>
                                    </td>

                                    <td class="py-2.5 px-3.5 text-center whitespace-nowrap">
                                        <span 
                                            class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold shadow-2xs inline-block"
                                            :class="getStatusBadge(s.currentStatus).class"
                                        >
                                            {{ getStatusBadge(s.currentStatus).label }}
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang <span class="font-bold text-slate-800">{{ pagination.page + 1 }}</span> / <span class="font-bold text-slate-800">{{ pagination.totalPages }}</span> 
                            (Tổng <span class="font-bold text-slate-800">{{ formatNumber(pagination.totalElements) }}</span> bản ghi)
                        </div>

                        <div class="flex items-center space-x-1.5">
                            <button 
                                type="button" 
                                @click="changePage(pagination.page - 1)" 
                                :disabled="pagination.page === 0"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
                            >
                                Trang Trước
                            </button>
                            <span class="px-2 font-mono font-bold text-blue-600">{{ pagination.page + 1 }}</span>
                            <button 
                                type="button" 
                                @click="changePage(pagination.page + 1)" 
                                :disabled="pagination.page >= pagination.totalPages - 1"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
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
