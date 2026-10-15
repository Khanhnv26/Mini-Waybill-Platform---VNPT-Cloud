(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const AdminRatingView = {
        name: 'AdminRatingView',
        setup() {
            const ratings = ref([]);
            const isLoading = ref(false);
            const isSaving = ref(false);

            const stats = reactive({
                averageServiceRating: 0.0,
                averageShipperRating: 0.0,
                totalRatings: 0,
                visibleRatingsCount: 0,
                hiddenRatingsCount: 0,
                negativeRatingsCount: 0,
                starDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
            });

            const filters = reactive({
                keyword: '',
                star: 'ALL',
                courierCode: '',
                status: 'ALL'
            });

            const pagination = reactive({
                page: 0,
                size: 20,
                totalPages: 1,
                totalElements: 0
            });

            const selectedRating = ref(null);
            const showDetailModal = ref(false);
            const showHideModal = ref(false);

            const hideForm = reactive({
                ratingId: null,
                trackingCode: '',
                presetReason: 'Ngôn từ xúc phạm, thiếu văn hóa, đả kích cá nhân',
                customReason: ''
            });

            const zoomImageUrl = ref(null);

            const isAdmin = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ADMIN');
            });

            const isDispatcher = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ROLE_DISPATCHER') || Auth.hasRole('DISPATCHER');
            });

            const starPercentages = computed(() => {
                const total = stats.totalRatings || 0;
                const dist = stats.starDistribution || {};
                const res = {};
                for (let i = 1; i <= 5; i++) {
                    const count = dist[i] || 0;
                    res[i] = total > 0 ? Math.round((count / total) * 100) : 0;
                }
                return res;
            });

            const loadStats = async () => {
                try {
                    const res = await RatingService.getRatingStats();
                    if (res) {
                        stats.averageServiceRating = res.averageServiceRating ?? 0.0;
                        stats.averageShipperRating = res.averageShipperRating ?? 0.0;
                        stats.totalRatings = res.totalRatings ?? 0;
                        stats.visibleRatingsCount = res.visibleRatingsCount ?? 0;
                        stats.hiddenRatingsCount = res.hiddenRatingsCount ?? 0;
                        stats.negativeRatingsCount = res.negativeRatingsCount ?? 0;
                        if (res.starDistribution) {
                            stats.starDistribution = res.starDistribution;
                        }
                    }
                } catch (err) {
                    console.error(err);
                }
            };

            const loadRatings = async () => {
                isLoading.value = true;
                try {
                    const res = await RatingService.getAdminRatings({
                        keyword: filters.keyword,
                        star: filters.star,
                        courierCode: filters.courierCode,
                        status: filters.status,
                        page: pagination.page,
                        size: pagination.size,
                        sort: 'createdAt,desc'
                    });

                    if (res) {
                        ratings.value = res.content || [];
                        pagination.page = res.page || 0;
                        pagination.size = res.size || 20;
                        pagination.totalPages = res.totalPages || 1;
                        pagination.totalElements = res.totalElements || 0;
                    }
                } catch (err) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Lỗi Tải Dữ Liệu', err.message, 'error');
                    }
                } finally {
                    isLoading.value = false;
                }
            };

            const applyFilters = () => {
                pagination.page = 0;
                loadRatings();
            };

            const resetFilters = () => {
                filters.keyword = '';
                filters.star = 'ALL';
                filters.courierCode = '';
                filters.status = 'ALL';
                pagination.page = 0;
                loadRatings();
            };

            const filterByStar = (star) => {
                if (filters.star === String(star)) {
                    filters.star = 'ALL';
                } else {
                    filters.star = String(star);
                }
                applyFilters();
            };

            const filterNegative = () => {
                if (filters.star === 'NEGATIVE') {
                    filters.star = 'ALL';
                } else {
                    filters.star = 'NEGATIVE';
                }
                applyFilters();
            };

            const filterStatus = (status) => {
                if (filters.status === status) {
                    filters.status = 'ALL';
                } else {
                    filters.status = status;
                }
                applyFilters();
            };

            const changePage = (newPage) => {
                if (newPage >= 0 && newPage < pagination.totalPages) {
                    pagination.page = newPage;
                    loadRatings();
                }
            };

            const openDetail = (item) => {
                selectedRating.value = item;
                showDetailModal.value = true;
            };

            const closeDetail = () => {
                showDetailModal.value = false;
                selectedRating.value = null;
            };

            const openHideDialog = (item) => {
                if (!isAdmin.value) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Từ Chối Thao Tác', 'Chỉ Quản trị viên (ADMIN) mới có quyền ẩn đánh giá', 'error');
                    }
                    return;
                }
                hideForm.ratingId = item.id;
                hideForm.trackingCode = item.trackingCode;
                hideForm.presetReason = 'Ngôn từ xúc phạm, thiếu văn hóa, đả kích cá nhân';
                hideForm.customReason = '';
                showHideModal.value = true;
            };

            const closeHideDialog = () => {
                showHideModal.value = false;
                hideForm.ratingId = null;
                hideForm.trackingCode = '';
                hideForm.customReason = '';
            };

            const confirmHideRating = async () => {
                if (!hideForm.ratingId) return;
                let reason = hideForm.presetReason === 'OTHER' ? hideForm.customReason.trim() : hideForm.presetReason;
                if (!reason) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thiếu Thông Tin', 'Vui lòng cung cấp lý do kiểm duyệt', 'error');
                    }
                    return;
                }

                isSaving.value = true;
                try {
                    const updated = await RatingService.updateRatingVisibility(hideForm.ratingId, true, reason);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thành Công', `Đã ẩn đánh giá đơn ${hideForm.trackingCode}`);
                    }
                    closeHideDialog();
                    if (selectedRating.value && selectedRating.value.id === updated.id) {
                        selectedRating.value = updated;
                    }
                    await Promise.all([loadRatings(), loadStats()]);
                } catch (err) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thất Bại', err.message, 'error');
                    }
                } finally {
                    isSaving.value = false;
                }
            };

            const unhideRating = async (item) => {
                if (!isAdmin.value) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Từ Chối Thao Tác', 'Chỉ Quản trị viên (ADMIN) mới có quyền bỏ ẩn đánh giá', 'error');
                    }
                    return;
                }

                isSaving.value = true;
                try {
                    const updated = await RatingService.updateRatingVisibility(item.id, false, null);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thành Công', `Đã công khai lại đánh giá đơn ${item.trackingCode}`);
                    }
                    if (selectedRating.value && selectedRating.value.id === updated.id) {
                        selectedRating.value = updated;
                    }
                    await Promise.all([loadRatings(), loadStats()]);
                } catch (err) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thất Bại', err.message, 'error');
                    }
                } finally {
                    isSaving.value = false;
                }
            };

            const exportCsv = () => {
                if (!ratings.value.length) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thông Báo', 'Không có dữ liệu để xuất', 'info');
                    }
                    return;
                }

                const headers = ['Mã vận đơn', 'Thời gian', 'Mã bưu tá', 'Đ.Giá Dịch Vụ', 'Đ.Giá Shipper', 'SĐT xác thực', 'Tiêu chí', 'Bình luận', 'Trạng thái'];
                const rows = ratings.value.map(r => [
                    r.trackingCode,
                    r.createdAt || '',
                    r.courierCode || '',
                    r.serviceRating,
                    r.shipperRating,
                    r.verifiedPhone || '',
                    (r.tags || []).join('; '),
                    `"${(r.comment || '').replace(/"/g, '""')}"`,
                    r.isHidden ? 'Đã ẩn' : 'Hiển thị'
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `Danh_Sach_Danh_Gia_${new Date().toISOString().slice(0, 10)}.csv`;
                link.click();
            };

            const renderStars = (score) => {
                let s = '';
                for (let i = 1; i <= 5; i++) {
                    s += i <= score ? '★' : '☆';
                }
                return s;
            };

            onMounted(() => {
                loadStats();
                loadRatings();
            });

            return {
                ratings,
                isLoading,
                isSaving,
                stats,
                filters,
                pagination,
                selectedRating,
                showDetailModal,
                showHideModal,
                hideForm,
                zoomImageUrl,
                isAdmin,
                isDispatcher,
                starPercentages,
                applyFilters,
                resetFilters,
                filterByStar,
                filterNegative,
                filterStatus,
                changePage,
                openDetail,
                closeDetail,
                openHideDialog,
                closeHideDialog,
                confirmHideRating,
                unhideRating,
                exportCsv,
                renderStars
            };
        },
        template: `
        <div class="space-y-4 animate-fade-in pb-12">
            
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                ĐÁNH GIÁ CSAT
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Waybill Platform</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Quản Lý Đánh Giá Dịch Vụ &amp; Bưu Tá
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Giám sát điểm CSAT khách hàng dành cho dịch vụ bưu chính và tác phong giao hàng của bưu tá; kiểm duyệt các phản ánh vi phạm quy chuẩn.
                        </p>
                    </div>

                    <div class="flex items-center space-x-2 self-start sm:self-auto flex-wrap sm:flex-nowrap gap-2">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-amber-300 flex items-center justify-center gap-1">
                                <span>{{ stats.averageServiceRating }}</span>
                                <span class="text-xs text-amber-200">★</span>
                            </div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Điểm Dịch Vụ</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300 flex items-center justify-center gap-1">
                                <span>{{ stats.averageShipperRating }}</span>
                                <span class="text-xs text-emerald-200">★</span>
                            </div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Điểm Shipper</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-white">
                                {{ stats.totalRatings }}
                            </div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tổng Đánh Giá</div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="isAdmin" class="bg-blue-50 dark:bg-[#131e3a] border border-blue-200 dark:border-blue-900/60 rounded-xl px-4 py-3 text-xs flex items-center justify-between text-blue-700 dark:text-blue-300 smooth-transition">
                <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    </div>
                    <span>
                        Vai trò <strong>Quản Trị Viên (ADMIN)</strong>: Bạn có quyền tra cứu, lọc số liệu và thực hiện <strong>Ẩn / Bỏ ẩn</strong> đánh giá vi phạm quy chuẩn.
                    </span>
                </div>
                <span class="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-blue-200/60 dark:bg-blue-900/70 text-blue-800 dark:text-blue-200">
                    TOÀN QUYỀN KIỂM DUYỆT
                </span>
            </div>

            <div v-else class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl px-4 py-3 text-xs flex items-center justify-between text-amber-700 dark:text-amber-300 smooth-transition">
                <div class="flex items-center gap-2.5">
                    <div class="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                    <span>
                        Vai trò <strong>Điều Phối Viên (STAFF)</strong>: Bạn được tra cứu, lọc danh sách và xem chi tiết phản hồi. Thao tác <strong>Ẩn/Hiện đánh giá bị khóa</strong> (chỉ ADMIN).
                    </span>
                </div>
                <span class="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-200/60 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200">
                    CHỈ ĐỌC
                </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                <div class="lg:col-span-2 bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl p-4 sm:p-5 shadow-xs smooth-transition">
                    <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-[#23345e]">
                        <div>
                            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Phân Bố Mức Độ Hài Lòng (Số Sao)
                            </h2>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Nhấp trực tiếp vào từng mức sao để lọc nhanh danh sách đơn hàng
                            </p>
                        </div>
                        <button @click="resetFilters" class="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            Xóa lọc sao
                        </button>
                    </div>

                    <div class="space-y-2.5">
                        <div v-for="s in [5, 4, 3, 2, 1]" :key="s" @click="filterByStar(s)" 
                            :title="filters.star === String(s) ? 'Bấm để hủy lọc mức ' + s + ' sao' : 'Bấm để lọc các đơn ' + s + ' sao'"
                            class="group cursor-pointer select-none flex items-center gap-3 p-1.5 rounded-xl transition-all" 
                            :class="filters.star === String(s) 
                                ? 'bg-blue-50/90 dark:bg-blue-950/50 border border-blue-400 dark:border-blue-600 shadow-xs ring-1 ring-blue-400/30' 
                                : 'border border-transparent hover:bg-slate-50 dark:hover:bg-[#19264c] hover:border-slate-200 dark:hover:border-[#23345e]'">
                            
                            <div class="w-24 sm:w-28 flex items-center gap-1.5 flex-shrink-0">
                                <span class="text-xs font-bold flex items-center gap-0.5" :class="s <= 2 ? 'text-rose-500' : 'text-amber-500'">
                                    {{ s }} ★
                                </span>
                                <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                    {{ s === 5 ? 'Tuyệt vời' : s === 4 ? 'Hài lòng' : s === 3 ? 'Tạm ổn' : s === 2 ? 'Kém' : 'Rất tệ' }}
                                </span>
                            </div>

                            <div class="flex-1 bg-slate-100 dark:bg-[#0b1329] h-2.5 rounded-full overflow-hidden">
                                <div class="h-full rounded-full group-hover:brightness-105 transition-all duration-500" 
                                    :style="{ 
                                        width: starPercentages[s] + '%',
                                        background: s <= 2 ? '#f43f5e' : (s >= 4 ? 'linear-gradient(90deg, #f59e0b, #eab308)' : '#fbbf24')
                                    }">
                                </div>
                            </div>

                            <span class="text-xs font-bold w-12 text-right flex-shrink-0 font-mono" :class="s <= 2 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'">{{ starPercentages[s] }}%</span>
                            <span class="text-[11px] text-slate-400 w-16 text-right flex-shrink-0 font-medium">{{ stats.starDistribution[s] || 0 }} đơn</span>
                        </div>
                    </div>
                </div>

                <div class="space-y-3 flex flex-col justify-between">
                    <div @click="filterNegative" class="group cursor-pointer bg-white dark:bg-[#131e3a] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md smooth-transition flex-1 flex flex-col justify-between" :class="filters.star === 'NEGATIVE' ? 'ring-2 ring-rose-500 bg-rose-50/30' : ''">
                        <div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                                    <span class="w-2.5 h-2.5 rounded-full bg-rose-500 pulse-active-rose"></span>
                                    Cần Xử Lý Khiếu Nại (&le;2★)
                                </span>
                                <span class="text-xs text-rose-500 font-semibold group-hover:translate-x-1 smooth-transition">&rarr;</span>
                            </div>
                            <div class="mt-2.5 flex items-baseline gap-2">
                                <span class="text-2xl font-black text-rose-600 dark:text-rose-400">{{ stats.negativeRatingsCount }}</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400">vận đơn có phản hồi xấu</span>
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Đơn bưu tá giao trễ, hàng hóa bị móp méo hoặc phản ánh thái độ phục vụ chưa đạt chuẩn.
                            </p>
                        </div>
                        <div class="mt-3 pt-2.5 border-t border-rose-100 dark:border-rose-900/30 flex items-center justify-between text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                            <span>Bấm để lọc các đơn này</span>
                            <span class="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">Ưu tiên cao</span>
                        </div>
                    </div>

                    <div @click="filterStatus('HIDDEN')" class="group cursor-pointer bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 hover:shadow-md smooth-transition flex-1 flex flex-col justify-between" :class="filters.status === 'HIDDEN' ? 'ring-2 ring-slate-500 bg-slate-50/50' : ''">
                        <div>
                            <div class="flex items-center justify-between">
                                <span class="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                                    <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                                    Đánh Giá Đã Ẩn Mềm
                                </span>
                                <span class="text-xs text-slate-400 group-hover:translate-x-1 smooth-transition">&rarr;</span>
                            </div>
                            <div class="mt-2.5 flex items-baseline gap-2">
                                <span class="text-2xl font-black text-slate-700 dark:text-slate-300">{{ stats.hiddenRatingsCount }}</span>
                                <span class="text-xs text-slate-500 dark:text-slate-400">bản ghi đã kiểm duyệt</span>
                            </div>
                            <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                Đánh giá chứa từ ngữ xúc phạm hoặc thông tin sai lệch đã bị gỡ khỏi cổng tra cứu công khai.
                            </p>
                        </div>
                        <div class="mt-3 pt-2.5 border-t border-slate-100 dark:border-[#23345e] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            <span>Đã loại khỏi điểm TB</span>
                            <span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-[#19264c] text-slate-600 dark:text-slate-300">Nhật ký Audit</span>
                        </div>
                    </div>
                </div>

            </div>

            <div class="bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl p-4 shadow-xs space-y-3 smooth-transition">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                    
                    <div class="lg:col-span-4 relative">
                        <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        </span>
                        <input 
                            v-model="filters.keyword" 
                            @keydown.enter="applyFilters"
                            type="text" 
                            placeholder="Tìm theo mã vận đơn (WB-...), SĐT, bưu tá, nội dung..."
                            class="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#131e3a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 smooth-transition"
                        />
                    </div>

                    <div class="lg:col-span-2">
                        <select 
                            v-model="filters.star" 
                            @change="applyFilters"
                            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 smooth-transition"
                        >
                            <option value="ALL">Tất cả mức sao</option>
                            <option value="5">5 Sao (Tuyệt vời)</option>
                            <option value="4">4 Sao (Hài lòng)</option>
                            <option value="3">3 Sao (Tạm ổn)</option>
                            <option value="2">2 Sao (Kém)</option>
                            <option value="1">1 Sao (Rất tệ)</option>
                            <option value="NEGATIVE">&le; 2 Sao (Tiêu cực)</option>
                        </select>
                    </div>

                    <div class="lg:col-span-3">
                        <input 
                            v-model="filters.courierCode" 
                            @keydown.enter="applyFilters"
                            type="text" 
                            placeholder="Mã bưu tá (VD: SHIP-HN01)..."
                            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-[#131e3a] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 smooth-transition"
                        />
                    </div>

                    <div class="lg:col-span-2">
                        <select 
                            v-model="filters.status" 
                            @change="applyFilters"
                            class="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl text-slate-700 dark:text-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 smooth-transition"
                        >
                            <option value="ALL">Trạng thái: Tất cả</option>
                            <option value="VISIBLE">Đang hiển thị</option>
                            <option value="HIDDEN">Đã ẩn (Ẩn mềm)</option>
                        </select>
                    </div>

                    <div class="lg:col-span-1 flex items-center space-x-1">
                        <button 
                            @click="applyFilters"
                            class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold smooth-transition text-center"
                            title="Tìm kiếm"
                        >
                            Tìm
                        </button>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#23345e] text-xs text-slate-500 dark:text-slate-400">
                    <div class="flex items-center gap-2">
                        <span>Kết quả tìm kiếm:</span>
                        <span class="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold border border-blue-200 dark:border-blue-900/50">
                            {{ pagination.totalElements }} bản ghi
                        </span>
                        <button v-if="filters.keyword || filters.star !== 'ALL' || filters.courierCode || filters.status !== 'ALL'" @click="resetFilters" class="text-xs text-rose-500 hover:underline ml-2">
                            Xóa lọc
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        <button @click="loadRatings" class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#23345e] hover:bg-slate-50 dark:hover:bg-[#19264c] text-slate-700 dark:text-slate-300 font-medium smooth-transition">
                            Làm mới
                        </button>
                        <button @click="exportCsv" class="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#23345e] hover:bg-slate-50 dark:hover:bg-[#19264c] text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 smooth-transition">
                            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                            Xuất CSV
                        </button>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-2xl shadow-xs overflow-hidden smooth-transition">
                <div class="overflow-x-auto">
                    <table class="w-full min-w-[1100px] text-left border-collapse text-xs">
                        <thead>
                            <tr class="bg-slate-50/90 dark:bg-[#0b1329]/90 border-b border-slate-200 dark:border-[#23345e] text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                <th class="py-3 px-4 min-w-[180px] whitespace-nowrap">MÃ VẬN ĐƠN &amp; THỜI GIAN</th>
                                <th class="py-3 px-4 min-w-[150px] whitespace-nowrap">BƯU TÁ PHỤ TRÁCH</th>
                                <th class="py-3 px-4 min-w-[130px] whitespace-nowrap">Đ.GIÁ DỊCH VỤ</th>
                                <th class="py-3 px-4 min-w-[130px] whitespace-nowrap">Đ.GIÁ BƯU TÁ</th>
                                <th class="py-3 px-4 min-w-[260px]">PHẢN HỒI KHÁCH HÀNG</th>
                                <th class="py-3 px-4 min-w-[120px] text-center whitespace-nowrap">TRẠNG THÁI</th>
                                <th class="py-3 px-4 min-w-[180px] text-center whitespace-nowrap">THAO TÁC</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-[#23345e]">
                            <tr v-if="isLoading">
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <div class="inline-flex items-center gap-2">
                                        <div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span>Đang tải dữ liệu đánh giá...</span>
                                    </div>
                                </td>
                            </tr>
                            <tr v-else-if="!ratings.length">
                                <td colspan="7" class="py-12 text-center text-slate-400">
                                    <p class="font-medium">Không tìm thấy bản ghi đánh giá nào</p>
                                    <button @click="resetFilters" class="mt-2 text-xs text-blue-500 hover:underline">Đặt lại bộ lọc</button>
                                </td>
                            </tr>
                            <tr v-else v-for="item in ratings" :key="item.id" class="hover:bg-slate-50/80 dark:hover:bg-[#19264c]/40 smooth-transition" :class="item.isHidden ? 'bg-rose-500/5 dark:bg-rose-950/10' : ''">
                                <td class="py-3 px-4">
                                    <span class="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer" @click="openDetail(item)">{{ item.trackingCode }}</span>
                                    <span class="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">{{ item.createdAt }}</span>
                                </td>
                                <td class="py-3 px-4">
                                    <span class="font-semibold text-slate-800 dark:text-slate-200 block">{{ item.courierCode || 'Chưa gán bưu tá' }}</span>
                                </td>
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <span :class="item.serviceRating <= 2 ? 'text-rose-500' : 'text-amber-500'" class="text-sm font-bold">{{ renderStars(item.serviceRating) }}</span>
                                    <span class="font-mono font-bold text-slate-800 dark:text-slate-200 ml-1">{{ item.serviceRating }}.0</span>
                                </td>
                                <td class="py-3 px-4 whitespace-nowrap">
                                    <span :class="item.shipperRating <= 2 ? 'text-rose-500' : 'text-amber-500'" class="text-sm font-bold">{{ renderStars(item.shipperRating) }}</span>
                                    <span class="font-mono font-bold text-slate-800 dark:text-slate-200 ml-1">{{ item.shipperRating }}.0</span>
                                </td>
                                <td class="py-3 px-4 max-w-sm">
                                    <p class="truncate text-slate-700 dark:text-slate-300 font-medium" :title="item.comment || ''">
                                        {{ item.comment || 'Không để lại bình luận văn bản' }}
                                    </p>
                                    <div class="mt-1 flex flex-wrap items-center gap-1">
                                        <span v-for="tag in (item.tags || [])" :key="tag" class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#19264c] text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#23345e]">
                                            {{ tag }}
                                        </span>
                                        <span v-if="item.attachmentUrls && item.attachmentUrls.length" class="inline-flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                            📷 {{ item.attachmentUrls.length }} ảnh
                                        </span>
                                    </div>
                                </td>
                                <td class="py-3 px-4 text-center whitespace-nowrap">
                                    <span v-if="item.isHidden" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                        <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Đã Ẩn
                                    </span>
                                    <span v-else class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hiển Thị
                                    </span>
                                </td>
                                <td class="py-3 px-4 text-center whitespace-nowrap">
                                    <div class="inline-flex items-center justify-center gap-2">
                                        <button 
                                            @click="openDetail(item)" 
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#23345e] hover:bg-slate-100 dark:hover:bg-[#19264c] text-slate-700 dark:text-slate-200 text-xs font-semibold smooth-transition shadow-2xs hover:border-slate-300 dark:hover:border-slate-600"
                                            title="Xem chi tiết đánh giá"
                                        >
                                            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                            <span>Chi tiết</span>
                                        </button>

                                        <template v-if="isAdmin">
                                            <button 
                                                v-if="item.isHidden" 
                                                @click="unhideRating(item)" 
                                                :disabled="isSaving" 
                                                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold smooth-transition shadow-2xs disabled:opacity-50"
                                                title="Bỏ ẩn và công khai lại đánh giá"
                                            >
                                                <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                                <span>Bỏ ẩn</span>
                                            </button>
                                            <button 
                                                v-else 
                                                @click="openHideDialog(item)" 
                                                :disabled="isSaving" 
                                                class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-xs font-bold smooth-transition shadow-2xs disabled:opacity-50"
                                                title="Ẩn đánh giá vi phạm"
                                            >
                                                <svg class="w-3.5 h-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                                                <span>Ẩn đơn</span>
                                            </button>
                                        </template>
                                        <template v-else>
                                            <button 
                                                disabled 
                                                title="Chỉ Quản trị viên (ADMIN) mới có quyền ẩn/hiện đánh giá" 
                                                class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#23345e] text-slate-400 opacity-40 cursor-not-allowed text-xs font-medium"
                                            >
                                                <span>Ẩn</span>
                                            </button>
                                        </template>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="p-3.5 sm:p-4 border-t border-slate-100 dark:border-[#23345e] bg-slate-50/50 dark:bg-[#0b1329]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div class="flex items-center gap-2">
                        <span>Số dòng:</span>
                        <select v-model="pagination.size" @change="applyFilters" class="px-2 py-1 bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#23345e] rounded-lg text-xs text-slate-700 dark:text-slate-300 font-semibold focus:outline-none">
                            <option :value="10">10</option>
                            <option :value="20">20</option>
                            <option :value="50">50</option>
                        </select>
                        <span class="text-slate-400">|</span>
                        <span>Trang {{ pagination.page + 1 }} / {{ pagination.totalPages }} (Tổng {{ pagination.totalElements }} bản ghi)</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <button @click="changePage(pagination.page - 1)" :disabled="pagination.page <= 0" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#23345e] bg-white dark:bg-[#131e3a] text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#19264c] disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
                            &larr; Trang trước
                        </button>
                        <button class="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                            {{ pagination.page + 1 }}
                        </button>
                        <button @click="changePage(pagination.page + 1)" :disabled="pagination.page >= pagination.totalPages - 1" class="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#23345e] bg-white dark:bg-[#131e3a] text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-[#19264c] disabled:opacity-40 disabled:cursor-not-allowed smooth-transition">
                            Trang sau &rarr;
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal 1: Chi Tiết Đánh Giá -->
            <teleport to="body">
                <Transition name="modal">
                    <div v-if="showDetailModal && selectedRating" @click.self="closeDetail" class="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                        <div class="bg-white dark:bg-[#131e3a] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#23345e] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
                            
                            <div class="p-5 border-b border-slate-100 dark:border-[#23345e] flex items-center justify-between sticky top-0 bg-white/95 dark:bg-[#131e3a]/95 backdrop-blur-md z-10">
                                <div>
                                    <div class="flex items-center gap-2.5">
                                        <h3 class="text-base font-extrabold tracking-tight font-mono text-blue-600 dark:text-blue-400">{{ selectedRating.trackingCode }}</h3>
                                        <span v-if="selectedRating.isHidden" class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                                            Đã Bị Ẩn
                                        </span>
                                        <span v-else class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                            Hiển Thị Công Khai
                                        </span>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ngày gửi: {{ selectedRating.createdAt }}</p>
                                </div>
                                <button @click="closeDetail" class="w-8 h-8 rounded-xl border border-slate-200 dark:border-[#23345e] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#19264c] smooth-transition" title="Đóng">
                                    &times;
                                </button>
                            </div>

                            <div class="p-5 space-y-4 text-xs">
                                
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl">
                                    <div>
                                        <span class="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider block font-semibold">Khách Hàng Đánh Giá</span>
                                        <div class="flex items-center gap-2 mt-1">
                                            <span class="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">{{ selectedRating.verifiedPhone || 'Khách vãng lai' }}</span>
                                            <span v-if="selectedRating.verifiedPhone" class="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded font-semibold">
                                                Đã Xác Thực
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <span class="text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider block font-semibold">Bưu Tá Phụ Trách</span>
                                        <span class="font-bold text-sm text-slate-900 dark:text-slate-100 block mt-1">{{ selectedRating.courierCode || 'Chưa gán bưu tá' }}</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="p-3 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl">
                                        <span class="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Chất Lượng Vận Chuyển:</span>
                                        <div class="flex items-center gap-2 mt-1.5">
                                            <span class="text-base font-bold text-amber-500">{{ renderStars(selectedRating.serviceRating) }}</span>
                                            <span class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ selectedRating.serviceRating }}/5</span>
                                        </div>
                                    </div>
                                    <div class="p-3 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl">
                                        <span class="text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider block">Thái Độ Bưu Tá:</span>
                                        <div class="flex items-center gap-2 mt-1.5">
                                            <span class="text-base font-bold text-amber-500">{{ renderStars(selectedRating.shipperRating) }}</span>
                                            <span class="font-bold text-sm text-slate-800 dark:text-slate-200">{{ selectedRating.shipperRating }}/5</span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <span class="text-slate-600 dark:text-slate-400 font-bold block mb-1.5 uppercase text-[11px] tracking-wider">Tiêu Chí Khách Chọn:</span>
                                    <div class="flex flex-wrap gap-1.5">
                                        <span v-if="!selectedRating.tags || !selectedRating.tags.length" class="text-slate-400 italic">Không có tiêu chí nào</span>
                                        <span v-for="tag in selectedRating.tags" :key="tag" class="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span class="text-slate-600 dark:text-slate-400 font-bold block mb-1.5 uppercase text-[11px] tracking-wider">Bình Luận Khách Hàng:</span>
                                    <div class="p-3.5 bg-slate-50 dark:bg-[#0b1329] border border-slate-200 dark:border-[#23345e] rounded-xl text-xs leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                                        {{ selectedRating.comment || 'Khách hàng không để lại bình luận văn bản.' }}
                                    </div>
                                </div>

                                <div v-if="selectedRating.attachmentUrls && selectedRating.attachmentUrls.length">
                                    <span class="text-slate-600 dark:text-slate-400 font-bold block mb-1.5 uppercase text-[11px] tracking-wider">Hình Ảnh Đính Kèm:</span>
                                    <div class="flex items-center gap-3">
                                        <div v-for="(url, idx) in selectedRating.attachmentUrls" :key="idx" @click="zoomImageUrl = url" class="relative group cursor-pointer border border-slate-200 dark:border-[#23345e] rounded-xl overflow-hidden w-24 h-24 bg-slate-100 dark:bg-[#0b1329]">
                                            <img :src="url" alt="Ảnh đính kèm" class="w-full h-full object-cover">
                                            <div class="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 smooth-transition flex items-center justify-center text-white text-[11px] font-bold">
                                                Phóng to
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div v-if="selectedRating.isHidden" class="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5 text-rose-700 dark:text-rose-300">
                                    <div class="flex items-center gap-2 font-bold text-xs">
                                        <svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                        <span>ĐÁNH GIÁ NÀY ĐANG BỊ ẨN MỀM (LOẠI KHỎI ĐIỂM TRUNG BÌNH)</span>
                                    </div>
                                    <div class="text-[11px] space-y-1 pl-6">
                                        <p><strong>Người thực hiện ẩn:</strong> <span class="font-mono">{{ selectedRating.hiddenBy || 'admin' }}</span> &bull; <strong>Thời gian:</strong> <span>{{ selectedRating.hiddenAt }}</span></p>
                                        <p><strong>Lý do kiểm duyệt:</strong> <span class="font-semibold">{{ selectedRating.hiddenReason || 'Chưa cung cấp' }}</span></p>
                                    </div>
                                </div>

                            </div>

                            <div class="p-4 border-t border-slate-100 dark:border-[#23345e] bg-slate-50/70 dark:bg-[#0b1329]/70 flex items-center justify-between sticky bottom-0">
                                <button @click="closeDetail" class="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#23345e] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#131e3a] smooth-transition">
                                    Đóng
                                </button>

                                <div v-if="isAdmin">
                                    <button v-if="selectedRating.isHidden" @click="unhideRating(selectedRating)" :disabled="isSaving" class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs smooth-transition shadow-sm">
                                        Bỏ Ẩn Đánh Giá (Công khai lại)
                                    </button>
                                    <button v-else @click="openHideDialog(selectedRating)" :disabled="isSaving" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs smooth-transition shadow-sm">
                                        Ẩn Đánh Giá Này
                                    </button>
                                </div>
                                <div v-else>
                                    <span class="text-xs text-slate-500 italic">Chỉ Quản trị viên mới được thao tác Ẩn/Hiện</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Transition>
            </teleport>

            <!-- Modal 2: Xác Nhận Ẩn Đánh Giá Vi Phạm -->
            <teleport to="body">
                <Transition name="modal">
                    <div v-if="showHideModal" @click.self="closeHideDialog" class="fixed inset-0 z-[100] bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
                        <div class="bg-white dark:bg-[#131e3a] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#23345e] rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
                            
                            <div class="flex items-start justify-between gap-3">
                                <div class="flex items-start gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 flex items-center justify-center flex-shrink-0">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-extrabold text-slate-900 dark:text-slate-100">Xác Nhận Ẩn Đánh Giá Vi Phạm</h3>
                                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Vận đơn: <strong class="font-mono text-rose-600 dark:text-rose-400">{{ hideForm.trackingCode }}</strong></p>
                                    </div>
                                </div>
                                <button @click="closeHideDialog" class="w-7 h-7 rounded-lg border border-slate-200 dark:border-[#23345e] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#19264c] transition" title="Đóng">
                                    &times;
                                </button>
                            </div>

                            <p class="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-[#0b1329] p-3 rounded-xl border border-slate-200 dark:border-[#23345e]">
                                Đánh giá bị ẩn sẽ <strong>không hiển thị</strong> ở cổng tra cứu công khai và <strong>bị loại trừ khỏi điểm trung bình</strong> của bưu tá. Hệ thống ghi nhận lịch sử kiểm duyệt phục vụ đối soát.
                            </p>

                            <div class="space-y-2 text-xs">
                                <label class="block font-bold text-slate-700 dark:text-slate-300">Lý do ẩn (Bắt buộc):</label>
                                <select v-model="hideForm.presetReason" class="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b1329] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#23345e] rounded-xl focus:ring-2 focus:ring-rose-500 text-xs font-medium focus:outline-none">
                                    <option value="Ngôn từ xúc phạm, thiếu văn hóa, đả kích cá nhân">Ngôn từ xúc phạm, thiếu văn hóa, đả kích cá nhân</option>
                                    <option value="Spam, quảng cáo rác, link mã độc">Spam, quảng cáo rác, link mã độc</option>
                                    <option value="Khách nhầm đơn hàng / Thông tin sai lệch thực tế">Khách nhầm đơn hàng / Thông tin sai lệch thực tế</option>
                                    <option value="Khiếu nại bưu cục đã hòa giải thành công với người nhận">Khiếu nại bưu cục đã hòa giải thành công với người nhận</option>
                                    <option value="OTHER">Lý do kiểm duyệt khác (nhập chi tiết)</option>
                                </select>
                                <textarea v-if="hideForm.presetReason === 'OTHER'" v-model="hideForm.customReason" placeholder="Nhập chi tiết ghi chú kiểm duyệt cho ban điều phối..." class="w-full px-3 py-2 bg-slate-50 dark:bg-[#0b1329] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-[#23345e] rounded-xl focus:ring-2 focus:ring-rose-500 text-xs h-16 resize-none focus:outline-none"></textarea>
                            </div>

                            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#23345e]">
                                <button @click="closeHideDialog" class="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#23345e] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#19264c] smooth-transition">
                                    Hủy bỏ
                                </button>
                                <button @click="confirmHideRating" :disabled="isSaving" class="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-sm shadow-rose-500/20 smooth-transition disabled:opacity-50">
                                    {{ isSaving ? 'Đang xử lý...' : 'Xác Nhận Ẩn Đánh Giá' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </Transition>
            </teleport>

            <!-- Modal 3: Phóng To Ảnh Đính Kèm -->
            <teleport to="body">
                <Transition name="modal">
                    <div v-if="zoomImageUrl" @click="zoomImageUrl = null" class="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer">
                        <img :src="zoomImageUrl" alt="Phóng to ảnh" class="max-w-3xl max-h-[90vh] object-contain rounded-2xl shadow-2xl">
                    </div>
                </Transition>
            </teleport>

        </div>
        `
    };

    window.AdminRatingView = AdminRatingView;
})();
