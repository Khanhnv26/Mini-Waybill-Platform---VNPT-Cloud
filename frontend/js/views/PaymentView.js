(function () {
    const { ref, reactive, computed, watch, onMounted, onUnmounted } = Vue;
    const PaymentView = {
        name: 'PaymentView',
        emits: ['view-tracking', 'switch-tab'],
        setup(props, { emit }) {
            const isLoading = ref(false);
            const isSubmitting = ref(false);
            const currentUser = computed(() => {
                return (typeof Auth !== 'undefined') ? Auth.getUser() : null;
            });
            const isStaff = computed(() => {
                if (typeof Auth === 'undefined') return true;
                return Auth.isInternalStaff ? Auth.isInternalStaff() : (
                    Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ADMIN') ||
                    Auth.hasRole('ROLE_POST_OFFICE_OPERATOR') || Auth.hasRole('ROLE_DISPATCHER') ||
                    Auth.hasRole('ROLE_CS') || Auth.hasRole('ROLE_HUB_OPERATOR')
                );
            });
            const isCustomerOnly = computed(() => {
                return !isStaff.value;
            });
            
            const searchKeyword = ref('');
            const filterStatus = ref('');
            const filterType = ref('');
            const filterMethod = ref('');
            const filterDate = ref('all');
            const pagination = reactive({
                page: 0,
                size: 15,
                totalPages: 1,
                totalElements: 0
            });
            const transactions = ref([]);
            const stats = reactive({
                totalCodSuccess: 0,
                totalShippingFeeSuccess: 0,
                totalCodPending: 0,
                pendingCount: 0,
                successCount: 0,
                totalCount: 0
            });
            
            const showQrModal = ref(false);
            const activeQrTx = ref(null);
            let qrPollingTimer = null;
            const showCashModal = ref(false);
            const activeCashTx = ref(null);
            const cashNote = ref('');
            const showReceiptModal = ref(false);
            const activeReceiptTx = ref(null);
            
            const formatVnd = (val) => {
                const num = Number(val) || 0;
                return new Intl.NumberFormat('vi-VN').format(num) + ' đ';
            };
            const formatDateTime = (dtStr) => {
                if (!dtStr) return '—';
                try {
                    const d = new Date(dtStr);
                    if (isNaN(d.getTime())) return dtStr;
                    return d.toLocaleString('vi-VN', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                    });
                } catch (e) {
                    return dtStr;
                }
            };
            const pad = (n) => String(n).padStart(2, '0');
            const formatLocalDateTime = (d) => {
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            };
            
            const getDateRange = (rangeType) => {
                if (rangeType === 'all') return { from: null, to: null };
                const now = new Date();
                const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                const to = formatLocalDateTime(endOfDay);
                if (rangeType === 'today') {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                    return { from: formatLocalDateTime(start), to };
                }
                if (rangeType === '7days') {
                    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0);
                    return { from: formatLocalDateTime(start), to };
                }
                if (rangeType === 'thisMonth') {
                    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                    return { from: formatLocalDateTime(start), to };
                }
                return { from: null, to: null };
            };
            
            const fetchTransactions = async () => {
                if (typeof PaymentService === 'undefined') return;
                isLoading.value = true;
                try {
                    const dateFilter = getDateRange(filterDate.value);
                    const params = {
                        page: pagination.page,
                        size: pagination.size,
                        keyword: searchKeyword.value.trim(),
                        status: filterStatus.value || null,
                        paymentType: filterType.value || null,
                        paymentMethod: filterMethod.value || null,
                        fromDate: dateFilter.from,
                        toDate: dateFilter.to
                    };
                    const res = await PaymentService.getTransactions(params);
                    if (res && res.content) {
                        transactions.value = res.content;
                        pagination.totalPages = res.totalPages || 1;
                        pagination.totalElements = res.totalElements || 0;
                    } else if (Array.isArray(res)) {
                        transactions.value = res;
                        pagination.totalPages = 1;
                        pagination.totalElements = res.length;
                    }
                } catch (e) {
                    console.error('[PaymentView] Lỗi tải giao dịch:', e);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Lỗi Tải Giao Dịch', e.message || 'Không thể kết nối đến payment-service', 'error');
                    }
                } finally {
                    isLoading.value = false;
                }
            };
            const fetchStats = async () => {
                if (typeof PaymentService === 'undefined') return;
                try {
                    const res = await PaymentService.getStats();
                    if (res) {
                        stats.totalCodSuccess = res.totalCodSuccess || 0;
                        stats.totalShippingFeeSuccess = res.totalShippingFeeSuccess || 0;
                        stats.totalCodPending = res.totalCodPending || 0;
                        stats.pendingCount = res.pendingCount || 0;
                        stats.successCount = res.successCount || 0;
                        stats.totalCount = res.totalCount || 0;
                    }
                } catch (e) {
                    console.error('[PaymentView] Lỗi tải thống kê:', e);
                }
            };
            const reloadAll = () => {
                pagination.page = 0;
                fetchTransactions();
                fetchStats();
            };
            const changePage = (newPage) => {
                if (newPage < 0 || newPage >= pagination.totalPages) return;
                pagination.page = newPage;
                fetchTransactions();
            };
            
            const openQrModal = (tx) => {
                activeQrTx.value = tx;
                showQrModal.value = true;
                
                if (qrPollingTimer) clearInterval(qrPollingTimer);
                qrPollingTimer = setInterval(async () => {
                    if (!activeQrTx.value || !activeQrTx.value.trackingCode) return;
                    try {
                        const check = await PaymentService.getPaymentByTracking(activeQrTx.value.trackingCode);
                        if (check && check.status === 'SUCCESS') {
                            activeQrTx.value.status = 'SUCCESS';
                            activeQrTx.value.paidAt = check.paidAt || new Date().toISOString();
                            closeQrModal();
                            if (window.Utils && window.Utils.showToast) {
                                window.Utils.showToast('Thanh Toán Thành Công', `Đơn hàng ${check.trackingCode} đã hoàn tất thanh toán VietQR!`, 'success');
                            }
                            reloadAll();
                        }
                    } catch (err) {
                    }
                }, 3500);
            };
            const closeQrModal = () => {
                showQrModal.value = false;
                activeQrTx.value = null;
                if (qrPollingTimer) {
                    clearInterval(qrPollingTimer);
                    qrPollingTimer = null;
                }
            };
            
            const handleMockPay = async () => {
                if (!activeQrTx.value || !activeQrTx.value.trackingCode) return;
                isSubmitting.value = true;
                try {
                    await PaymentService.mockPay(activeQrTx.value.trackingCode);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thanh Toán Giả Lập', `Đã giả lập nộp tiền thành công cho đơn ${activeQrTx.value.trackingCode}`, 'success');
                    }
                    closeQrModal();
                    reloadAll();
                } catch (e) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thất Bại', e.message || 'Không thể giả lập thanh toán', 'error');
                    }
                } finally {
                    isSubmitting.value = false;
                }
            };
            
            const openCashModal = (tx) => {
                activeCashTx.value = tx;
                cashNote.value = 'Thu tiền mặt tại quầy bưu cục';
                showCashModal.value = true;
            };
            const closeCashModal = () => {
                showCashModal.value = false;
                activeCashTx.value = null;
                cashNote.value = '';
            };
            const handleConfirmCash = async () => {
                if (!activeCashTx.value || !activeCashTx.value.trackingCode) return;
                isSubmitting.value = true;
                try {
                    await PaymentService.confirmCashPayment({
                        trackingCode: activeCashTx.value.trackingCode,
                        amount: activeCashTx.value.amount,
                        paymentType: activeCashTx.value.paymentType,
                        note: cashNote.value.trim() || 'Thu tiền mặt'
                    });
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Xác Nhận Tiền Mặt', `Đã ghi nhận thu tiền mặt thành công cho đơn ${activeCashTx.value.trackingCode}!`, 'success');
                    }
                    closeCashModal();
                    reloadAll();
                } catch (e) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Lỗi Xác Nhận', e.message || 'Không thể xác nhận thu tiền mặt', 'error');
                    }
                } finally {
                    isSubmitting.value = false;
                }
            };
            
            const openReceiptModal = (tx) => {
                activeReceiptTx.value = tx;
                showReceiptModal.value = true;
            };
            const closeReceiptModal = () => {
                showReceiptModal.value = false;
                activeReceiptTx.value = null;
            };
            
            const navigateToTracking = (trackingCode) => {
                if (!trackingCode) return;
                const cleanCode = String(trackingCode).trim();
                emit('view-tracking', cleanCode, 'payments');
            };
            const resetFilters = () => {
                searchKeyword.value = '';
                filterStatus.value = '';
                filterType.value = '';
                filterMethod.value = '';
                filterDate.value = 'all';
            };
            const applyQuickRange = (range) => {
                filterDate.value = range;
            };
            
            const exportExcel = () => {
                if (!transactions.value || transactions.value.length === 0) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thông Báo', 'Không có dữ liệu giao dịch để kết xuất!', 'warning');
                    }
                    return;
                }
                try {
                    const headers = ['Mã Giao Dịch', 'Mã Vận Đơn', 'Loại Cước', 'Số Tiền (VND)', 'Kênh Thu', 'Trạng Thái', 'Ngày Tạo', 'Ngày Thu', 'Ghi Chú'];
                    const rows = transactions.value.map(t => [
                        t.paymentCode || '',
                        t.trackingCode || '',
                        t.paymentType === 'COD' ? 'Thu hộ COD' : (t.paymentType === 'SHIPPING_FEE' ? 'Cước gửi' : 'Phí hoàn'),
                        t.amount || 0,
                        t.paymentMethod === 'VIETQR' ? 'VietQR' : 'Tiền mặt',
                        t.status === 'SUCCESS' ? 'Đã thu' : (t.status === 'PENDING' ? 'Chờ thu' : 'Thất bại'),
                        t.createdAt || '',
                        t.paidAt || '',
                        (t.payerNote || '').replace(/[\r\n,]/g, ' ')
                    ]);
                    let csvContent = '\uFEFF' + headers.join(',') + '\n';
                    rows.forEach(r => {
                        csvContent += r.map(c => `"${c}"`).join(',') + '\n';
                    });
                    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.setAttribute('href', url);
                    link.setAttribute('download', `bao_cao_doi_soat_thanh_toan_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Xuất Tệp Thành Công', 'Đã tải xuống file đối soát thanh toán định dạng CSV/Excel', 'success');
                    }
                } catch (e) {
                    console.error('[PaymentView] Lỗi xuất file:', e);
                }
            };
            
            watch([searchKeyword, filterStatus, filterType, filterMethod, filterDate], () => {
                pagination.page = 0;
                fetchTransactions();
            });
            onMounted(() => {
                if (!window.Auth || !window.Auth.isAuthenticated()) {
                    try {
                        sessionStorage.setItem('redirectAfterLogin', '/payments');
                    } catch (e) {}
                    if (typeof window.navigateTo === 'function') {
                        window.navigateTo('/login');
                    } else if (typeof window !== 'undefined' && window.location) {
                        window.location.href = '/login';
                    }
                    return;
                }
                
                const urlParams = new URLSearchParams(window.location.search);
                const trackingQuery = urlParams.get('tracking') || urlParams.get('code');
                if (trackingQuery) {
                    searchKeyword.value = trackingQuery.trim();
                }
                fetchTransactions();
                fetchStats();
            });
            onUnmounted(() => {
                if (qrPollingTimer) {
                    clearInterval(qrPollingTimer);
                    qrPollingTimer = null;
                }
            });
            const copyCode = (code, label = 'mã') => {
                if (!code) return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        if (window.Utils && window.Utils.showToast) {
                            window.Utils.showToast('Đã Sao Chép', `Đã sao chép ${label} ${code} vào bộ nhớ tạm!`, 'success');
                        }
                    }).catch(() => {});
                }
            };
            return {
                currentUser,
                isStaff,
                isCustomerOnly,
                isLoading,
                isSubmitting,
                searchKeyword,
                filterStatus,
                filterType,
                filterMethod,
                filterDate,
                pagination,
                transactions,
                stats,
                showQrModal,
                activeQrTx,
                showCashModal,
                activeCashTx,
                cashNote,
                showReceiptModal,
                activeReceiptTx,
                formatVnd,
                formatDateTime,
                copyCode,
                reloadAll,
                changePage,
                openQrModal,
                closeQrModal,
                handleMockPay,
                openCashModal,
                closeCashModal,
                handleConfirmCash,
                openReceiptModal,
                closeReceiptModal,
                navigateToTracking,
                resetFilters,
                applyQuickRange,
                exportExcel
            };
        },
        template: `
        <div class="space-y-4 pb-12 text-slate-800 dark:text-slate-100">
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-sm relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>
                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs font-semibold text-blue-100 uppercase tracking-wide">
                                Kế Toán &amp; Đối Soát Dòng Tiền
                            </span>
                            <span class="text-blue-100/60 text-xs">•</span>
                            <span class="text-blue-100 text-xs font-medium">Waybill Platform</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white flex items-center space-x-2">
                            <span>Quản Lý Giao Dịch &amp; Đối Soát Thanh Toán</span>
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal max-w-2xl">
                            <span v-if="isStaff">Giám sát toàn trình dòng tiền cước bưu chính, thu hộ COD VietQR Napas 24/7, xác nhận thu tiền mặt và đối soát doanh thu bưu cục.</span>
                            <span v-else>Theo dõi dòng tiền thu hộ COD đơn gửi của bạn, tra cứu lịch sử và thanh toán cước trực tuyến qua cổng VietQR Napas.</span>
                        </p>
                        <p class="text-[11px] text-blue-100 mt-1.5 font-medium flex items-center space-x-2">
                            <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                            <span v-if="isStaff">Phạm vi: Toàn hệ thống (Quản trị viên / Điều hành bưu cục)</span>
                            <span v-else>Khách hàng: <strong>{{ currentUser?.fullName || 'Khách Hàng Waybill' }}</strong></span>
                        </p>
                    </div>
                    <div class="flex items-center space-x-2 self-start sm:self-auto flex-shrink-0">
                        <button 
                            type="button" 
                            @click="exportExcel"
                            class="px-3.5 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/25 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer"
                        >
                            <svg class="w-3.5 h-3.5 text-emerald-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <span>Xuất Báo Cáo</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl p-3.5 shadow-sm">
                    <div class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                        {{ isStaff ? 'COD Đã Thu' : 'COD Đã Nhận' }}
                    </div>
                    <div class="mt-1.5 text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">{{ formatVnd(stats.totalCodSuccess) }}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Tiền thu hộ giao thành công</div>
                </div>
                <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl p-3.5 shadow-sm">
                    <div class="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                        {{ isStaff ? 'Cước Đã Thu' : 'Cước Đã Trả' }}
                    </div>
                    <div class="mt-1.5 text-xl sm:text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{{ formatVnd(stats.totalShippingFeeSuccess) }}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Cước vận chuyển phát sinh</div>
                </div>
                <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl p-3.5 shadow-sm">
                    <div class="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                        {{ isStaff ? 'COD Chờ Trả' : 'COD Chờ Thu' }}
                    </div>
                    <div class="mt-1.5 text-xl sm:text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{{ formatVnd(stats.totalCodPending) }}</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Tiền chờ kết toán chu kỳ</div>
                </div>
                <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl p-3.5 shadow-sm">
                    <div class="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wide">Chờ Thu Tiền</div>
                    <div class="mt-1.5 text-xl sm:text-2xl font-black font-mono text-purple-600 dark:text-purple-400">{{ stats.pendingCount }} Đơn</div>
                    <div class="text-[10px] text-slate-400 mt-0.5">Giao dịch đang chờ thanh toán</div>
                </div>
            </div>
            <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl p-3 sm:p-3.5 shadow-sm space-y-3">
                <div class="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100 dark:border-[#1e2e56]">
                    <div class="flex items-center space-x-1.5">
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">Khoảng ngày:</span>
                        <button 
                            type="button"
                            @click="applyQuickRange('all')"
                            :class="filterDate === 'all' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#19264c] dark:hover:bg-[#23345e] text-slate-700 dark:text-slate-300 font-semibold'"
                            class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                        >
                            Toàn Bộ
                        </button>
                        <button 
                            type="button"
                            @click="applyQuickRange('today')"
                            :class="filterDate === 'today' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#19264c] dark:hover:bg-[#23345e] text-slate-700 dark:text-slate-300 font-semibold'"
                            class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                        >
                            Hôm Nay
                        </button>
                        <button 
                            type="button"
                            @click="applyQuickRange('7days')"
                            :class="filterDate === '7days' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#19264c] dark:hover:bg-[#23345e] text-slate-700 dark:text-slate-300 font-semibold'"
                            class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                        >
                            7 Ngày Qua
                        </button>
                        <button 
                            type="button"
                            @click="applyQuickRange('thisMonth')"
                            :class="filterDate === 'thisMonth' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#19264c] dark:hover:bg-[#23345e] text-slate-700 dark:text-slate-300 font-semibold'"
                            class="px-2.5 py-1 rounded-md text-xs transition cursor-pointer"
                        >
                            Tháng Này
                        </button>
                    </div>
                    <div class="flex items-center space-x-2">
                        <span class="hidden sm:inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#0b1329] px-2.5 py-1 rounded-lg border border-slate-200/70 dark:border-[#23345e]">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Thời gian thực</span>
                        </span>
                        <button 
                            type="button"
                            @click="reloadAll"
                            :disabled="isLoading"
                            class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 dark:bg-[#0b1329] dark:hover:bg-[#19264c] border border-slate-200/80 dark:border-[#23345e] text-slate-600 dark:text-slate-300 transition-all duration-200 active:scale-90 disabled:opacity-50 cursor-pointer shadow-2xs"
                            title="Làm mới dữ liệu thời gian thực"
                        >
                            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin text-blue-600': isLoading }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div class="relative flex-1 min-w-0">
                        <input 
                            v-model="searchKeyword"
                            type="text"
                            maxlength="50"
                            placeholder="Tìm kiếm theo mã vận đơn, mã giao dịch, mã khách hàng..."
                            class="w-full pl-3.5 pr-12 py-2 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-lg text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#0b1329] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        />
                        <button 
                            v-if="searchKeyword" 
                            @click="searchKeyword = ''"
                            class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                        >
                            Xóa
                        </button>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <select 
                            v-model="filterStatus"
                            class="px-3 py-2 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-[#0b1329] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition cursor-pointer"
                        >
                            <option value="">Tất cả trạng thái ({{ pagination.totalElements }})</option>
                            <option value="SUCCESS">Đã thu thành công</option>
                            <option value="PENDING">Chờ thu tiền</option>
                            <option value="FAILED">Thanh toán thất bại</option>
                            <option value="CANCELLED">Giao dịch đã hủy</option>
                        </select>
                        <select 
                            v-model="filterType"
                            class="px-3 py-2 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-[#0b1329] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition cursor-pointer"
                        >
                            <option value="">Tất cả loại cước</option>
                            <option value="COD">Thu hộ COD</option>
                            <option value="SHIPPING_FEE">Cước vận chuyển</option>
                            <option value="RETURN_FEE">Phí chuyển hoàn</option>
                        </select>
                        <select 
                            v-model="filterMethod"
                            class="px-3 py-2 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-[#0b1329] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition cursor-pointer"
                        >
                            <option value="">Tất cả kênh thu</option>
                            <option value="VIETQR">Chuyển khoản VietQR</option>
                            <option value="CASH">Tiền mặt tại quầy</option>
                        </select>
                        <button 
                            type="button"
                            @click="exportExcel"
                            class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-emerald-500/20 flex items-center space-x-1.5 whitespace-nowrap cursor-pointer"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            <span>Xuất Excel</span>
                        </button>
                    </div>
                </div>
            </div>
            <div class="b2b-card bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-xl shadow-sm overflow-hidden">
                <div class="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1e2e56]">
                    <div class="flex items-center space-x-2">
                        <h3 class="text-xs font-bold uppercase text-slate-800 dark:text-slate-100 tracking-wide">
                            Nhật Ký Giao Dịch &amp; Đối Soát
                        </h3>
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#19264c] text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200/60 dark:border-[#23345e]">
                            {{ pagination.totalElements }} giao dịch
                        </span>
                    </div>
                    <div class="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>Đơn vị tính: <strong>VNĐ</strong></span>
                    </div>
                </div>
                <div v-if="isLoading" class="p-8 text-center space-y-2">
                    <div class="inline-block animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Đang đồng bộ danh sách giao dịch từ payment-service...</div>
                </div>
                <div v-else-if="transactions.length === 0" class="p-10 text-center space-y-2">
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-200">Không tìm thấy giao dịch nào phù hợp</div>
                    <p class="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                        Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái và khoảng thời gian.
                    </p>
                    <div class="pt-2">
                        <button 
                            type="button" 
                            @click="resetFilters" 
                            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            Đặt Lại Bộ Lọc
                        </button>
                    </div>
                </div>
                <div v-else class="overflow-x-auto w-full">
                    <table class="w-full text-left border-collapse table-auto">
                        <thead>
                            <tr class="bg-slate-50/90 dark:bg-[#19264c] border-b border-slate-200 dark:border-[#23345e] text-[11px] font-extrabold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                                <th class="py-2.5 px-3 whitespace-nowrap" style="min-width: 145px; max-width: 170px;">Mã Giao Dịch &amp; Ngày Tạo</th>
                                <th class="py-2.5 px-3 whitespace-nowrap" style="min-width: 120px; max-width: 140px;">Mã Bưu Gửi</th>
                                <th class="py-2.5 px-2.5 whitespace-nowrap" style="min-width: 85px;">Phân Loại Cước</th>
                                <th class="py-2.5 px-2.5 whitespace-nowrap" style="min-width: 90px;">Số Tiền (VND)</th>
                                <th class="py-2.5 px-2.5 whitespace-nowrap" style="min-width: 85px;">Kênh Thu Tiền</th>
                                <th class="py-2.5 px-2.5 whitespace-nowrap" style="min-width: 105px;">Trạng Thái Thu</th>
                                <th class="py-2.5 px-3 whitespace-nowrap" style="min-width: 110px; max-width: 140px;">{{ isStaff ? 'Mã KH / Ghi Chú' : 'Ghi Chú Đơn' }}</th>
                                <th class="py-2.5 px-3 text-right whitespace-nowrap" style="min-width: 135px;">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-[#1e2e56] text-xs">
                            <tr 
                                v-for="tx in transactions" 
                                :key="tx.paymentCode"
                                class="group hover:bg-blue-50/40 dark:hover:bg-[#19264c]/60 transition-colors"
                            >
                                <td class="py-2.5 px-3">
                                    <div class="flex items-center space-x-1 group/code">
                                        <span 
                                            class="font-mono font-bold text-slate-800 dark:text-slate-100 text-xs truncate inline-block align-middle cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors" 
                                            style="max-width: 135px;"
                                            :title="'Click để sao chép mã GD: ' + tx.paymentCode"
                                            @click="copyCode(tx.paymentCode, 'mã giao dịch')"
                                        >
                                            {{ tx.paymentCode }}
                                        </span>
                                        <button 
                                            type="button" 
                                            @click="copyCode(tx.paymentCode, 'mã giao dịch')"
                                            class="opacity-0 group-hover/code:opacity-100 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 cursor-pointer transition-opacity"
                                            title="Sao chép mã giao dịch"
                                        >
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                        </button>
                                    </div>
                                    <div class="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1 whitespace-nowrap">
                                        <svg class="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                        <span>{{ formatDateTime(tx.createdAt) }}</span>
                                    </div>
                                </td>
                                <td class="py-2.5 px-3">
                                    <button 
                                        type="button"
                                        @click="navigateToTracking(tx.trackingCode)"
                                        class="font-mono font-bold text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:underline inline-flex items-center space-x-1 cursor-pointer group/tracking text-left transition-colors tracking-tight whitespace-nowrap"
                                        :title="'Click để tra cứu hành trình: ' + tx.trackingCode"
                                    >
                                        <span class="truncate inline-block align-bottom" style="max-width: 110px;">{{ tx.trackingCode }}</span>
                                        <svg class="w-3 h-3 text-blue-500 opacity-60 group-hover/tracking:opacity-100 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                    </button>
                                </td>
                                <td class="py-2.5 px-2.5 whitespace-nowrap text-xs font-medium">
                                    <span v-if="tx.paymentType === 'COD'" class="text-amber-700 dark:text-amber-400">
                                        Thu hộ COD
                                    </span>
                                    <span v-else-if="tx.paymentType === 'SHIPPING_FEE'" class="text-blue-700 dark:text-blue-400">
                                        Cước gửi
                                    </span>
                                    <span v-else class="text-purple-700 dark:text-purple-400">
                                        Phí hoàn
                                    </span>
                                </td>
                                <td class="py-2.5 px-2.5 whitespace-nowrap">
                                    <div class="font-mono font-bold text-xs" :class="tx.paymentType === 'COD' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'">
                                        {{ formatVnd(tx.amount) }}
                                    </div>
                                </td>
                                <td class="py-2.5 px-2.5 whitespace-nowrap">
                                    <div v-if="tx.paymentMethod === 'VIETQR'" class="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                        <svg class="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                                        <span>VietQR</span>
                                    </div>
                                    <div v-else class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                        <svg class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                        <span>Tiền mặt</span>
                                    </div>
                                </td>
                                <td class="py-2.5 px-2.5 whitespace-nowrap">
                                    <span 
                                        v-if="tx.status === 'SUCCESS'"
                                        class="status-indicator text-emerald-700 dark:text-emerald-400 status-indicator-emerald"
                                    >
                                        <span class="status-dot bg-emerald-500"></span>
                                        <span>Đã Thu Tiền</span>
                                    </span>
                                    <span 
                                        v-else-if="tx.status === 'PENDING'"
                                        class="status-indicator text-amber-700 dark:text-amber-400 status-indicator-amber"
                                    >
                                        <span class="status-dot bg-amber-500"></span>
                                        <span>Chờ Thu Tiền</span>
                                    </span>
                                    <span 
                                        v-else-if="tx.status === 'CANCELLED'"
                                        class="status-indicator text-slate-500 dark:text-slate-400 status-indicator-slate"
                                    >
                                        <span class="status-dot bg-slate-400"></span>
                                        <span>Đã Hủy</span>
                                    </span>
                                    <span 
                                        v-else
                                        class="status-indicator text-rose-600 dark:text-rose-400 status-indicator-rose"
                                    >
                                        <span class="status-dot bg-rose-500"></span>
                                        <span>Thất Bại</span>
                                    </span>
                                </td>
                                <td class="py-2.5 px-3">
                                    <div v-if="tx.customerCode" class="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate" style="max-width: 110px;" :title="'Mã KH: ' + tx.customerCode">
                                        <span class="text-slate-400 font-normal">#KH:</span> {{ tx.customerCode }}
                                    </div>
                                    <div class="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5" style="max-width: 110px;" :title="tx.payerNote || 'Không có ghi chú'">
                                        {{ tx.payerNote || '—' }}
                                    </div>
                                </td>
                                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                                    <div class="inline-flex items-center justify-end gap-1.5">
                                        <template v-if="tx.status === 'PENDING'">
                                            <button 
                                                type="button"
                                                @click="openQrModal(tx)"
                                                class="px-2 py-1 rounded-md bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[10.5px] font-bold transition inline-flex items-center gap-1 shadow-sm shadow-blue-500/20 cursor-pointer whitespace-nowrap"
                                                title="Quét mã VietQR thanh toán 24/7"
                                            >
                                                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                                                <span>Quét QR</span>
                                            </button>
                                            <button 
                                                v-if="isStaff"
                                                type="button"
                                                @click="openCashModal(tx)"
                                                class="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[10.5px] font-bold transition inline-flex items-center gap-1 shadow-sm shadow-emerald-500/20 cursor-pointer whitespace-nowrap"
                                                title="Xác nhận đã thu tiền mặt tại quầy"
                                            >
                                                <svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                                                <span>Thu Tiền</span>
                                            </button>
                                        </template>
                                        <template v-else>
                                            <button 
                                                type="button"
                                                @click="openReceiptModal(tx)"
                                                class="px-2.5 py-1 rounded-md border border-slate-200 dark:border-[#23345e] bg-slate-50 hover:bg-slate-100 dark:bg-[#19264c] dark:hover:bg-[#23345e] text-slate-700 dark:text-slate-200 text-[10.5px] font-bold transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                                title="Xem chi tiết biên lai đối soát"
                                            >
                                                <svg class="w-3 h-3 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                <span>Biên Lai</span>
                                            </button>
                                        </template>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div v-if="pagination.totalElements > 0" class="p-3 bg-slate-50 dark:bg-[#19264c] border-t border-slate-200 dark:border-[#23345e] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <div>
                        Hiển thị <span class="font-bold text-slate-700 dark:text-slate-200">{{ transactions.length > 0 ? (pagination.page * pagination.size + 1) : 0 }} - {{ Math.min((pagination.page + 1) * pagination.size, pagination.totalElements) }}</span> / <span class="font-bold text-slate-700 dark:text-slate-200">{{ pagination.totalElements }}</span> giao dịch (Trang {{ pagination.page + 1 }} / {{ Math.max(1, pagination.totalPages) }})
                    </div>
                    <div class="flex items-center space-x-1.5">
                        <button 
                            type="button"
                            @click="changePage(pagination.page - 1)"
                            :disabled="pagination.page <= 0"
                            class="px-2.5 py-1 bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] hover:bg-slate-50 dark:hover:bg-[#1e2e56] text-slate-700 dark:text-slate-200 rounded-md font-semibold transition disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#131e3a] cursor-pointer"
                        >
                            Trước
                        </button>
                        <span class="px-2 py-1 font-mono font-bold text-slate-700 dark:text-slate-200">
                            {{ pagination.page + 1 }}
                        </span>
                        <button 
                            type="button"
                            @click="changePage(pagination.page + 1)"
                            :disabled="pagination.page >= pagination.totalPages - 1"
                            class="px-2.5 py-1 bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] hover:bg-slate-50 dark:hover:bg-[#1e2e56] text-slate-700 dark:text-slate-200 rounded-md font-semibold transition disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-[#131e3a] cursor-pointer"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
            <teleport to="body">
                <div v-if="showQrModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div class="bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl max-w-sm w-full shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
                        <div class="vnpt-gradient p-3.5 text-white flex items-center justify-between">
                            <div class="flex items-center space-x-2">
                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg>
                                <span class="font-bold text-xs uppercase tracking-wide">Thanh Toán VietQR Napas 24/7</span>
                            </div>
                            <button type="button" @click="closeQrModal" class="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center text-xs cursor-pointer">✕</button>
                        </div>
                        <div class="p-4 text-center space-y-3">
                            <div class="mx-auto w-52 h-52 p-2 bg-white border border-slate-200 rounded-xl shadow-inner flex flex-col items-center justify-center overflow-hidden">
                                <img 
                                    v-if="activeQrTx?.qrUrl" 
                                    :src="activeQrTx.qrUrl" 
                                    alt="Mã VietQR" 
                                    class="w-full h-full object-contain"
                                />
                                <svg v-else class="w-40 h-40" viewBox="0 0 100 100" fill="#0f172a">
                                    <rect x="5" y="5" width="28" height="28" rx="3" fill="#00376d"/>
                                    <rect x="9" y="9" width="20" height="20" rx="1.5" fill="#ffffff"/>
                                    <rect x="13" y="13" width="12" height="12" rx="1" fill="#0077dd"/>
                                    <rect x="67" y="5" width="28" height="28" rx="3" fill="#00376d"/>
                                    <rect x="71" y="9" width="20" height="20" rx="1.5" fill="#ffffff"/>
                                    <rect x="75" y="13" width="12" height="12" rx="1" fill="#0077dd"/>
                                    <rect x="5" y="67" width="28" height="28" rx="3" fill="#00376d"/>
                                    <rect x="9" y="71" width="20" height="20" rx="1.5" fill="#ffffff"/>
                                    <rect x="13" y="75" width="12" height="12" rx="1" fill="#0077dd"/>
                                    <rect x="38" y="10" width="8" height="8" fill="#00376d"/>
                                    <rect x="48" y="22" width="10" height="8" fill="#0077dd"/>
                                    <rect x="38" y="38" width="24" height="24" rx="3" fill="#00376d"/>
                                    <rect x="42" y="42" width="16" height="16" rx="1.5" fill="#ffffff"/>
                                    <text x="50" y="53" font-size="7" font-weight="bold" text-anchor="middle" fill="#0055bb">WB</text>
                                    <rect x="68" y="38" width="10" height="6" fill="#00376d"/>
                                    <rect x="80" y="72" width="10" height="18" fill="#00376d"/>
                                </svg>
                            </div>
                            <div class="bg-slate-50 dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#23345e] rounded-lg p-2.5 text-left text-xs space-y-1.5">
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Mã vận đơn:</span>
                                    <span class="font-mono font-bold text-blue-600 dark:text-blue-400">{{ activeQrTx?.trackingCode }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Số tiền:</span>
                                    <span class="font-bold text-rose-600 text-sm">{{ formatVnd(activeQrTx?.amount) }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Ngân hàng:</span>
                                    <span class="font-semibold text-slate-800 dark:text-slate-200">{{ activeQrTx?.bankCode || 'MB Bank' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Số tài khoản:</span>
                                    <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ activeQrTx?.accountNo || '0987654321' }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Cú pháp CK:</span>
                                    <span class="font-mono font-bold text-slate-700 dark:text-slate-300">
                                        {{ (activeQrTx?.paymentType === 'SHIPPING_FEE' ? 'CUOC ' : (activeQrTx?.paymentType === 'RETURN_FEE' ? 'HOAN ' : 'COD ')) + activeQrTx?.trackingCode }}
                                    </span>
                                </div>
                            </div>
                            <div class="pt-1 space-y-1.5">
                                <button 
                                    type="button"
                                    @click="handleMockPay"
                                    :disabled="isSubmitting"
                                    class="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-2xs flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                                    <span>{{ isSubmitting ? 'Đang xử lý...' : 'Giả lập khách quét trả thành công' }}</span>
                                </button>
                                <button 
                                    type="button"
                                    @click="closeQrModal"
                                    class="w-full py-1.5 rounded-lg border border-slate-200 dark:border-[#23345e] text-slate-600 dark:text-slate-400 text-xs font-medium cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </teleport>
            <teleport to="body">
                <div v-if="showCashModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div class="bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl max-w-sm w-full shadow-xl overflow-hidden p-4 space-y-3 animate-in fade-in zoom-in duration-150">
                        <div class="flex items-center space-x-2 text-slate-800 dark:text-slate-100">
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                            </div>
                            <div>
                                <h3 class="font-bold text-xs uppercase tracking-wide">Xác Nhận Thu Tiền Mặt</h3>
                                <p class="text-[11px] text-slate-400">Giao dịch viên quầy / Bưu tá thu tiền trực tiếp</p>
                            </div>
                        </div>
                        <div class="bg-slate-50 dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#23345e] rounded-lg p-2.5 text-xs space-y-1.5">
                            <div class="flex justify-between">
                                <span class="text-slate-500">Mã vận đơn:</span>
                                <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ activeCashTx?.trackingCode }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Số tiền thu:</span>
                                <span class="font-bold text-rose-600 text-sm">{{ formatVnd(activeCashTx?.amount) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Khoản thu:</span>
                                <span class="font-medium text-slate-700 dark:text-slate-300">
                                    {{ activeCashTx?.paymentType === 'COD' ? 'Thu hộ COD' : (activeCashTx?.paymentType === 'SHIPPING_FEE' ? 'Cước gửi' : 'Phí hoàn') }}
                                </span>
                            </div>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-slate-500 mb-1">Ghi chú xác nhận thu tiền:</label>
                            <input 
                                type="text" 
                                v-model="cashNote" 
                                class="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-[#23345e] bg-white dark:bg-[#0b1329] text-xs focus:ring-1 focus:ring-blue-500" 
                                placeholder="Thu tiền mặt tại quầy..."
                            />
                        </div>
                        <div class="flex items-center space-x-2 pt-1">
                            <button 
                                type="button" 
                                @click="closeCashModal" 
                                class="flex-1 py-1.5 rounded-lg border border-slate-300 dark:border-[#23345e] text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer"
                            >
                                Hủy
                            </button>
                            <button 
                                type="button" 
                                @click="handleConfirmCash" 
                                :disabled="isSubmitting"
                                class="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                                {{ isSubmitting ? 'Đang lưu...' : 'Xác nhận đã thu' }}
                            </button>
                        </div>
                    </div>
                </div>
            </teleport>
            <teleport to="body">
                <div v-if="showReceiptModal" class="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
                    <div class="bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl max-w-md w-full shadow-xl overflow-hidden p-5 space-y-4 animate-in fade-in zoom-in duration-150">
                        <div class="flex items-center justify-between border-b border-slate-100 dark:border-[#1e2e56] pb-3">
                            <div class="flex items-center space-x-2">
                                <div class="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-xs">
                                    WB
                                </div>
                                <div>
                                    <h3 class="font-bold text-xs uppercase tracking-wide">Biên Lai Thu Tiền Điện Tử</h3>
                                    <p class="text-[11px] text-slate-400">Hệ thống bưu chính Waybill Logistics</p>
                                </div>
                            </div>
                            <button type="button" @click="closeReceiptModal" class="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">✕</button>
                        </div>
                        <div class="bg-slate-50 dark:bg-[#0b1329] border border-slate-200/80 dark:border-[#23345e] rounded-xl p-3.5 space-y-2 text-xs">
                            <div class="flex justify-between">
                                <span class="text-slate-500">Mã giao dịch:</span>
                                <span class="font-mono font-bold text-blue-600">{{ activeReceiptTx?.paymentCode }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Mã vận đơn:</span>
                                <span class="font-mono font-bold">{{ activeReceiptTx?.trackingCode }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Loại khoản thu:</span>
                                <span class="font-semibold">{{ activeReceiptTx?.paymentType === 'COD' ? 'Thu hộ COD' : (activeReceiptTx?.paymentType === 'SHIPPING_FEE' ? 'Cước gửi hàng' : 'Phí hoàn') }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Số tiền:</span>
                                <span class="font-bold text-rose-600 text-base">{{ formatVnd(activeReceiptTx?.amount) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Hình thức thanh toán:</span>
                                <span class="font-semibold">{{ activeReceiptTx?.paymentMethod === 'VIETQR' ? 'Chuyển khoản VietQR' : 'Tiền mặt tại quầy/bưu tá' }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Thời gian tạo:</span>
                                <span>{{ formatDateTime(activeReceiptTx?.createdAt) }}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-500">Thời gian hoàn tất:</span>
                                <span class="text-emerald-600 font-semibold">{{ formatDateTime(activeReceiptTx?.paidAt) }}</span>
                            </div>
                            <div v-if="activeReceiptTx?.referenceCode" class="flex justify-between">
                                <span class="text-slate-500">Mã tham chiếu:</span>
                                <span class="font-mono text-slate-600">{{ activeReceiptTx?.referenceCode }}</span>
                            </div>
                        </div>
                        <div class="flex justify-end space-x-2 pt-1">
                            <button 
                                type="button" 
                                @click="closeReceiptModal" 
                                class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs cursor-pointer"
                            >
                                Đóng biên lai
                            </button>
                        </div>
                    </div>
                </div>
            </teleport>
        </div>
        `
    };
    window.PaymentView = PaymentView;
})();
