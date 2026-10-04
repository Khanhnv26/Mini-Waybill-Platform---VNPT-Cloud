(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const STATIONS = [
        { code: 'POST-HN-CG', label: 'Bưu cục Cầu Giấy' },
        { code: 'POST-HN-DDA', label: 'Bưu cục Đống Đa' },
        { code: 'POST-HN-HBT', label: 'Bưu cục Hai Bà Trưng' },
        { code: 'POST-HN-TX', label: 'Bưu cục Thanh Xuân' },
        { code: 'POST-HN-HD', label: 'Bưu cục Hà Đông' },
        { code: 'POST-DN-HC', label: 'Bưu cục Hải Châu' },
        { code: 'POST-DN-TK', label: 'Bưu cục Thanh Khê' },
        { code: 'POST-DN-ST', label: 'Bưu cục Sơn Trà' },
        { code: 'POST-HCM-Q1', label: 'Bưu cục Quận 1' },
        { code: 'POST-HCM-TB', label: 'Bưu cục Tân Bình' },
        { code: 'POST-HCM-BT', label: 'Bưu cục Bình Thạnh' },
        { code: 'HUB-HN-01', label: 'Siêu HUB Hà Nội' },
        { code: 'HUB-HP-01', label: 'HUB Hải Phòng' },
        { code: 'HUB-DN-01', label: 'Siêu HUB Đà Nẵng' },
        { code: 'HUB-HCM-01', label: 'Siêu HUB TP.HCM' },
        { code: 'HUB-CT-01', label: 'HUB Cần Thơ' }
    ];

    const emptyForm = () => ({
        id: null,
        courierCode: '',
        fullName: '',
        phone: '',
        telegramChatId: '',
        stationCode: 'POST-HN-CG',
        status: 'ACTIVE',
        shiftStatus: 'ON_DUTY',
        maxOrdersPerShift: 40
    });

    const ShipperDirectoryView = {
        name: 'ShipperDirectoryView',
        setup() {
            const shippers = ref([]);
            const isLoading = ref(false);
            const isSaving = ref(false);
            const showModal = ref(false);

            const searchQuery = ref('');
            const statusFilter = ref('ALL');
            const stationFilter = ref('ALL');
            const shiftFilter = ref('ALL');
            const currentPage = ref(1);
            const pageSize = ref(10);

            const form = reactive(emptyForm());

            const confirmDialog = reactive({
                show: false,
                item: null,
                isProcessing: false
            });

            const stationLabel = (code) => {
                const found = STATIONS.find(item => item.code === code);
                return found ? found.label : (code || 'Chưa gán trạm');
            };

            const loadShippers = async () => {
                if (typeof ShipperDirectoryService === 'undefined') return;
                isLoading.value = true;
                try {
                    const params = {};
                    if (stationFilter.value !== 'ALL') params.stationCode = stationFilter.value;
                    if (shiftFilter.value !== 'ALL') params.shiftStatus = shiftFilter.value;
                    const data = await ShipperDirectoryService.list(params);
                    shippers.value = Array.isArray(data) ? data.slice().sort((a, b) => (b.id || 0) - (a.id || 0)) : [];
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không tải được danh bạ', error.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            const activeShippersCount = computed(() => {
                return shippers.value.filter(item => item.status === 'ACTIVE').length;
            });

            const onDutyCount = computed(() => {
                return shippers.value.filter(item => item.shiftStatus === 'ON_DUTY').length;
            });

            const offDutyCount = computed(() => {
                return shippers.value.filter(item => item.shiftStatus === 'OFF_DUTY').length;
            });

            const telegramLinkedCount = computed(() => {
                return shippers.value.filter(item => item.hasLinkedTelegram).length;
            });

            const stationCoverageCount = computed(() => {
                const set = new Set(shippers.value.map(item => item.stationCode).filter(Boolean));
                return set.size;
            });

            const totalCapacity = computed(() => {
                return shippers.value.reduce((sum, item) => sum + (item.maxOrdersPerShift || 40), 0);
            });

            const totalAssignedOrders = computed(() => {
                return shippers.value.reduce((sum, item) => sum + (item.currentOrdersCount || 0), 0);
            });

            const averageWorkloadPercent = computed(() => {
                if (!totalCapacity.value) return 0;
                return Math.round((totalAssignedOrders.value / totalCapacity.value) * 100);
            });

            const filteredShippers = computed(() => {
                let list = shippers.value;

                if (statusFilter.value !== 'ALL') {
                    list = list.filter(item => item.status === statusFilter.value);
                }

                if (stationFilter.value !== 'ALL') {
                    list = list.filter(item => item.stationCode === stationFilter.value);
                }

                if (shiftFilter.value !== 'ALL') {
                    list = list.filter(item => item.shiftStatus === shiftFilter.value);
                }

                const query = searchQuery.value.trim().toLowerCase();
                if (query) {
                    list = list.filter(item => {
                        const stLabel = stationLabel(item.stationCode).toLowerCase();
                        return [item.courierCode, item.fullName, item.phone, item.stationCode, stLabel]
                            .some(value => String(value || '').toLowerCase().includes(query));
                    });
                }

                return list;
            });

            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredShippers.value.length / pageSize.value) || 1;
            });

            const startIndex = computed(() => {
                if (filteredShippers.value.length === 0) return 0;
                return (currentPage.value - 1) * pageSize.value + 1;
            });

            const endIndex = computed(() => {
                if (pageSize.value === -1) return filteredShippers.value.length;
                return Math.min(currentPage.value * pageSize.value, filteredShippers.value.length);
            });

            const paginatedShippers = computed(() => {
                if (pageSize.value === -1) return filteredShippers.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredShippers.value.slice(start, start + pageSize.value);
            });

            watch([searchQuery, statusFilter, stationFilter, shiftFilter, pageSize], () => {
                currentPage.value = 1;
            });

            const goToPage = (page) => {
                if (page >= 1 && page <= totalPages.value) {
                    currentPage.value = page;
                }
            };

            const hasActiveFilter = computed(() => {
                return searchQuery.value.trim() !== '' || statusFilter.value !== 'ALL' || stationFilter.value !== 'ALL' || shiftFilter.value !== 'ALL';
            });

            const resetFilters = () => {
                searchQuery.value = '';
                statusFilter.value = 'ALL';
                stationFilter.value = 'ALL';
                shiftFilter.value = 'ALL';
                currentPage.value = 1;
            };

            const getWorkloadPercent = (item) => {
                const max = item.maxOrdersPerShift || 40;
                const cur = item.currentOrdersCount || 0;
                return Math.min(100, Math.round((cur / max) * 100));
            };

            const isManualChatIdOpen = ref(false);
            const isSendingTest = ref(false);
            const copiedTelegramCommand = ref(false);

            const maskChatId = (chatId) => {
                if (!chatId) return '';
                const str = String(chatId).trim();
                if (str.length <= 4) return str;
                return `${str.slice(0, 3)}••••${str.slice(-2)}`;
            };

            const copyTelegramCommand = async () => {
                const code = form.courierCode ? form.courierCode.trim().toUpperCase() : '';
                const cmd = `/link ${code || '<MÃ_BƯU_TÁ>'}`;
                try {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(cmd);
                    } else {
                        const tempInput = document.createElement('input');
                        tempInput.value = cmd;
                        document.body.appendChild(tempInput);
                        tempInput.select();
                        document.execCommand('copy');
                        document.body.removeChild(tempInput);
                    }
                    copiedTelegramCommand.value = true;
                    setTimeout(() => {
                        copiedTelegramCommand.value = false;
                    }, 2000);
                    if (window.Utils) window.Utils.showToast('Đã sao chép cú pháp', cmd, 'success');
                } catch {
                    if (window.Utils) window.Utils.showToast('Sao chép thất bại', cmd, 'warning');
                }
            };

            const unlinkTelegram = () => {
                form.telegramChatId = '';
                if (window.Utils) window.Utils.showToast('Đã xóa liên kết', 'Bấm "Lưu Thông Tin" để hoàn tất gỡ bỏ liên kết Telegram.', 'info');
            };

            const sendTelegramTest = async () => {
                const chatId = (form.telegramChatId || '').trim();
                if (!chatId) {
                    if (window.Utils) window.Utils.showToast('Chưa có Chat ID', 'Vui lòng liên kết Telegram trước khi thử nghiệm.', 'warning');
                    return;
                }
                isSendingTest.value = true;
                try {
                    if (typeof NotificationService !== 'undefined' && NotificationService.sendTelegramTest) {
                        await NotificationService.sendTelegramTest(
                            chatId,
                            `🔔 [VNPT POST TEST] Xin chào bưu tá ${form.fullName || form.courierCode}! Kênh thông báo Telegram của bạn đã kết nối thành công với hệ thống Mini Waybill.`
                        );
                        if (window.Utils) window.Utils.showToast('Đã gửi tin nhắn test', 'Tin nhắn thử nghiệm đã được gửi đến Telegram của bưu tá.', 'success');
                    } else {
                        if (window.Utils) window.Utils.showToast('Dịch vụ chưa sẵn sàng', 'NotificationService chưa được nạp.', 'warning');
                    }
                } catch (err) {
                    if (window.Utils) window.Utils.showToast('Lỗi gửi tin nhắn', err.message || 'Không thể gửi tin nhắn thử nghiệm qua Telegram', 'error');
                } finally {
                    isSendingTest.value = false;
                }
            };

            const openCreate = () => {
                Object.assign(form, emptyForm());
                isManualChatIdOpen.value = false;
                showModal.value = true;
            };

            const openEdit = (item) => {
                Object.assign(form, {
                    id: item.id,
                    courierCode: item.courierCode || '',
                    fullName: item.fullName || '',
                    phone: item.phone || '',
                    telegramChatId: item.telegramChatId || '',
                    stationCode: item.stationCode || 'POST-HN-CG',
                    status: item.status || 'ACTIVE',
                    shiftStatus: item.shiftStatus || 'ON_DUTY',
                    maxOrdersPerShift: item.maxOrdersPerShift || 40
                });
                isManualChatIdOpen.value = false;
                showModal.value = true;
            };

            const validate = () => {
                if (!form.courierCode.trim() || !form.fullName.trim()) {
                    return 'Mã bưu tá và họ tên không được để trống';
                }
                const phone = form.phone.trim();
                if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) {
                    return 'Số điện thoại phải từ 7 đến 15 chữ số hợp lệ';
                }
                if (!form.maxOrdersPerShift || form.maxOrdersPerShift < 1) {
                    return 'Hạn mức tiếp nhận đơn phải lớn hơn 0';
                }
                return '';
            };

            const save = async () => {
                const message = validate();
                if (message) {
                    if (window.Utils) window.Utils.showToast('Thiếu thông tin', message, 'warning');
                    return;
                }
                const payload = {
                    courierCode: form.courierCode.trim().toUpperCase(),
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim() || null,
                    stationCode: form.stationCode || null,
                    telegramChatId: form.telegramChatId ? form.telegramChatId.trim() : '',
                    shiftStatus: form.shiftStatus,
                    maxOrdersPerShift: parseInt(form.maxOrdersPerShift, 10) || 40
                };
                isSaving.value = true;
                try {
                    if (form.id) {
                        payload.status = form.status;
                        await ShipperDirectoryService.update(form.id, payload);
                        if (window.Utils) window.Utils.showToast('Đã cập nhật', `Bưu tá ${payload.courierCode} đã được lưu.`, 'success');
                    } else {
                        await ShipperDirectoryService.create(payload);
                        if (window.Utils) window.Utils.showToast('Đã thêm bưu tá', `${payload.fullName} (${payload.courierCode}) đã vào danh bạ.`, 'success');
                    }
                    showModal.value = false;
                    await loadShippers();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không lưu được', error.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };

            const toggleShiftStatus = async (item) => {
                const newStatus = item.shiftStatus === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
                const originalStatus = item.shiftStatus;
                item.shiftStatus = newStatus;
                try {
                    await ShipperDirectoryService.updateShiftStatus(item.id, newStatus);
                    const label = newStatus === 'ON_DUTY' ? 'BẬT CA TRỰC' : 'NGHỈ CA';
                    if (window.Utils) window.Utils.showToast('Cập nhật ca trực', `Bưu tá ${item.courierCode} chuyển sang ${label}.`, 'success');
                } catch (error) {
                    item.shiftStatus = originalStatus;
                    if (window.Utils) window.Utils.showToast('Lỗi đổi ca', error.message, 'error');
                }
            };

            const toggleAllShippersShift = async () => {
                const currentOn = shippers.value.filter(x => x.shiftStatus === 'ON_DUTY').length;
                const target = currentOn > (shippers.value.length / 2) ? 'OFF_DUTY' : 'ON_DUTY';
                const targetLabel = target === 'ON_DUTY' ? 'BẬT CA TOÀN BỘ' : 'NGHỈ CA TOÀN BỘ';
                
                try {
                    isLoading.value = true;
                    const promises = filteredShippers.value.map(s => {
                        if (s.shiftStatus !== target) {
                            s.shiftStatus = target;
                            return ShipperDirectoryService.updateShiftStatus(s.id, target).catch(() => null);
                        }
                        return Promise.resolve();
                    });
                    await Promise.all(promises);
                    if (window.Utils) window.Utils.showToast('Đổi ca hàng loạt', `Đã chuyển bưu tá sang ${targetLabel}.`, 'success');
                    await loadShippers();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Lỗi đổi ca hàng loạt', error.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            const confirmToggleStatus = (item) => {
                confirmDialog.item = item;
                confirmDialog.show = true;
            };

            const executeToggleStatus = async () => {
                const item = confirmDialog.item;
                if (!item || !item.id) {
                    confirmDialog.show = false;
                    return;
                }

                confirmDialog.isProcessing = true;
                try {
                    if (item.status === 'INACTIVE') {
                        await ShipperDirectoryService.update(item.id, { status: 'ACTIVE' });
                        if (window.Utils) window.Utils.showToast('Đã kích hoạt', `Bưu tá ${item.courierCode} hoạt động trở lại.`, 'success');
                    } else {
                        await ShipperDirectoryService.deactivate(item.id);
                        if (window.Utils) window.Utils.showToast('Đã tạm dừng', `Bưu tá ${item.courierCode} chuyển sang ngừng hoạt động.`, 'success');
                    }
                    confirmDialog.show = false;
                    await loadShippers();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Thao tác thất bại', error.message, 'error');
                } finally {
                    confirmDialog.isProcessing = false;
                }
            };

            onMounted(loadShippers);

            return {
                shippers,
                isLoading,
                isSaving,
                searchQuery,
                statusFilter,
                stationFilter,
                shiftFilter,
                currentPage,
                pageSize,
                showModal,
                form,
                confirmDialog,
                stations: STATIONS,
                stationLabel,
                activeShippersCount,
                onDutyCount,
                offDutyCount,
                telegramLinkedCount,
                stationCoverageCount,
                averageWorkloadPercent,
                hasActiveFilter,
                resetFilters,
                getWorkloadPercent,
                filteredShippers,
                totalPages,
                startIndex,
                endIndex,
                paginatedShippers,
                goToPage,
                openCreate,
                openEdit,
                save,
                toggleShiftStatus,
                toggleAllShippersShift,
                isManualChatIdOpen,
                isSendingTest,
                copiedTelegramCommand,
                maskChatId,
                copyTelegramCommand,
                unlinkTelegram,
                sendTelegramTest,
                confirmToggleStatus,
                executeToggleStatus,
                loadShippers
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <!-- TOP BANNER KPI -->
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Shipper Operations
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Trị Ca Trực &amp; Năng Lực Tiếp Nhận Đơn Của Bưu Tá
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal max-w-2xl">
                                Quản lý trực tiếp trạng thái trực tuyến (ON_DUTY / OFF_DUTY), phân bổ địa bàn trạm bưu cục, giám sát giới hạn tải đơn tuyến phát và kết nối Telegram Bot nhận đơn toàn trình.
                            </p>
                        </div>

                        <!-- KPI CARDS ON BANNER -->
                        <div class="flex items-center space-x-2 self-start md:self-auto flex-wrap sm:flex-nowrap gap-y-2">
                            <div class="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[78px]">
                                <div class="text-base font-extrabold leading-tight text-white font-mono">{{ shippers.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tổng Bưu Tá</div>
                            </div>
                            <div class="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[78px]">
                                <div class="text-base font-extrabold leading-tight text-emerald-300 font-mono flex items-center justify-center gap-1">
                                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>{{ onDutyCount }}</span>
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Bật Ca (Trực)</div>
                            </div>
                            <div class="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[78px]">
                                <div class="text-base font-extrabold leading-tight text-slate-300 font-mono">{{ offDutyCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Nghỉ Ca</div>
                            </div>
                            <div class="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[78px]">
                                <div class="text-base font-extrabold leading-tight text-amber-300 font-mono">{{ averageWorkloadPercent }}%</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tải Trung Bình</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- FILTER BAR CARD -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-full sm:w-64">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                maxlength="100"
                                placeholder="Tìm mã, họ tên, SĐT, trạm..." 
                                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            <button 
                                v-if="searchQuery" 
                                @click="searchQuery = ''" 
                                class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                                title="Xóa tìm kiếm"
                            >
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <select 
                            v-model="stationFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition max-w-[200px]"
                        >
                            <option value="ALL">Tất cả bưu cục / trạm</option>
                            <option v-for="s in stations" :key="s.code" :value="s.code">{{ s.label }}</option>
                        </select>

                        <select 
                            v-model="shiftFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                            <option value="ALL">Tất cả ca trực</option>
                            <option value="ON_DUTY">Đang bật ca (ON_DUTY)</option>
                            <option value="OFF_DUTY">Đang nghỉ ca (OFF_DUTY)</option>
                        </select>

                        <select 
                            v-model="statusFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                            <option value="ALL">Tất cả trạng thái hồ sơ</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Tạm dừng hoạt động</option>
                        </select>

                        <button 
                            v-if="hasActiveFilter" 
                            @click="resetFilters" 
                            class="px-2.5 py-1.5 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition flex items-center space-x-1"
                        >
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            <span>Xóa lọc</span>
                        </button>
                    </div>

                    <div class="flex items-center space-x-2">
                        <button 
                            @click="toggleAllShippersShift" 
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                            title="Đổi ca nhanh toàn bộ bưu tá đang lọc"
                        >
                            <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <span>Chuyển Ca Nhanh</span>
                        </button>

                        <button 
                            @click="loadShippers()" 
                            :disabled="isLoading"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50"
                            title="Tải lại dữ liệu danh bạ"
                        >
                            {{ isLoading ? 'Đang Tải...' : 'Làm Mới' }}
                        </button>

                        <button 
                            @click="openCreate()" 
                            class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition flex items-center space-x-1"
                        >
                            <span>+ Thêm Bưu Tá</span>
                        </button>
                    </div>
                </div>

                <!-- SHIPPERS TABLE CARD -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th class="py-2.5 px-3.5 w-60">MÃ &amp; HỌ TÊN BƯU TÁ</th>
                                    <th class="py-2.5 px-3.5">BƯU CỤC TUYẾN PHÁT</th>
                                    <th class="py-2.5 px-3.5 text-center w-40">TRẠNG THÁI CA TRỰC</th>
                                    <th class="py-2.5 px-3.5 w-44">TẢI ĐƠN TRONG CA</th>
                                    <th class="py-2.5 px-3.5 text-center w-28">ĐÁNH GIÁ</th>
                                    <th class="py-2.5 px-3.5 text-center w-32">TELEGRAM BOT</th>
                                    <th class="py-2.5 px-3.5 text-right w-44">ĐIỀU PHỐI CA TRỰC</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs">
                                <tr v-for="item in paginatedShippers" :key="item.id" class="hover:bg-slate-50/80 transition">
                                    <!-- MÃ & HỌ TÊN -->
                                    <td class="py-2.5 px-3.5">
                                        <div class="flex items-center gap-2.5">
                                            <div 
                                                class="w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shadow-xs shrink-0"
                                                :class="item.shiftStatus === 'ON_DUTY' ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white' : 'bg-slate-200 text-slate-600'"
                                            >
                                                {{ (item.fullName || 'B').charAt(0).toUpperCase() }}
                                            </div>
                                            <div class="min-w-0 max-w-[200px]">
                                                <div class="font-bold text-slate-900 leading-tight truncate" :title="item.fullName">
                                                    {{ item.fullName }}
                                                </div>
                                                <div class="text-[10px] text-blue-700 font-mono font-bold mt-0.5 truncate">
                                                    {{ item.courierCode }} • {{ item.phone || 'Chưa SĐT' }}
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <!-- BƯU CỤC TUYẾN PHÁT -->
                                    <td class="py-2.5 px-3.5">
                                        <div class="space-y-0.5">
                                            <span class="inline-flex items-center gap-1 font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                                {{ stationLabel(item.stationCode) }}
                                            </span>
                                            <div class="font-mono text-[10px] text-slate-400">{{ item.stationCode }}</div>
                                        </div>
                                    </td>

                                    <!-- TRẠNG THÁI CA TRỰC (INTERACTIVE BUTTON) -->
                                    <td class="py-2.5 px-3.5 text-center">
                                        <button 
                                            type="button"
                                            @click="toggleShiftStatus(item)"
                                            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold cursor-pointer transition border shadow-xs"
                                            :class="item.shiftStatus === 'ON_DUTY' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'"
                                            :title="item.shiftStatus === 'ON_DUTY' ? 'Bấm để chuyển sang Nghỉ Ca' : 'Bấm để Bật Ca Trực'"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full" :class="item.shiftStatus === 'ON_DUTY' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'"></span>
                                            <span>{{ item.shiftStatus === 'ON_DUTY' ? 'BẬT CA (ON_DUTY)' : 'NGHỈ CA (OFF_DUTY)' }}</span>
                                        </button>
                                    </td>

                                    <!-- TẢI ĐƠN TRONG CA -->
                                    <td class="py-2.5 px-3.5">
                                        <div class="w-36">
                                            <div class="flex justify-between text-[10.5px] mb-1 font-mono">
                                                <span class="font-bold" :class="getWorkloadPercent(item) >= 90 ? 'text-amber-600 font-black' : 'text-slate-700'">
                                                    {{ item.currentOrdersCount || 0 }} / {{ item.maxOrdersPerShift || 40 }} đơn
                                                </span>
                                                <span class="text-slate-500">{{ getWorkloadPercent(item) }}%</span>
                                            </div>
                                            <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    class="h-full rounded-full transition-all" 
                                                    :class="getWorkloadPercent(item) >= 90 ? 'bg-amber-500' : 'bg-emerald-500'" 
                                                    :style="{ width: getWorkloadPercent(item) + '%' }"
                                                ></div>
                                            </div>
                                        </div>
                                    </td>

                                    <!-- ĐÁNH GIÁ (SAO) -->
                                    <td class="py-2.5 px-3.5 text-center">
                                        <span class="inline-flex items-center gap-1 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                            <svg class="w-3 h-3 text-amber-500 fill-current shrink-0" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                            <span>{{ (item.ratingAvg != null ? item.ratingAvg : 5.0).toFixed(1) }}</span>
                                        </span>
                                    </td>

                                    <!-- TELEGRAM BOT -->
                                    <td class="py-2.5 px-3.5 text-center">
                                        <span 
                                            v-if="item.hasLinkedTelegram" 
                                            class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                                            title="Đã liên kết Telegram Bot nhận đơn hàng"
                                        >
                                            <svg class="w-3 h-3 text-sky-500 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z"/></svg>
                                            <span>Đã Nối</span>
                                        </span>
                                        <span 
                                            v-else 
                                            class="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-400 border border-slate-200"
                                            title="Chưa kết nối Telegram Bot"
                                        >
                                            <span>Chưa Nối</span>
                                        </span>
                                    </td>

                                    <!-- THAO TÁC / ĐIỀU PHỐI -->
                                    <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
                                        <div class="inline-flex items-center gap-1.5 justify-end">
                                            <button 
                                                type="button" 
                                                @click="toggleShiftStatus(item)" 
                                                class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition border shadow-xs cursor-pointer"
                                                :class="item.shiftStatus === 'ON_DUTY' 
                                                    ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' 
                                                    : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'"
                                            >
                                                {{ item.shiftStatus === 'ON_DUTY' ? 'Nghỉ Ca' : 'Bật Ca' }}
                                            </button>

                                            <button 
                                                type="button" 
                                                @click="openEdit(item)" 
                                                class="p-1 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                                                title="Sửa thông tin bưu tá"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                            </button>

                                            <button 
                                                type="button" 
                                                @click="confirmToggleStatus(item)" 
                                                :class="[
                                                    'px-2 py-1 rounded-lg text-[11px] font-bold transition border shadow-xs',
                                                    item.status === 'ACTIVE' 
                                                        ? 'bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-200' 
                                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                                ]"
                                                :title="item.status === 'ACTIVE' ? 'Tạm dừng tác nghiệp bưu tá này' : 'Kích hoạt lại bưu tá'"
                                            >
                                                {{ item.status === 'ACTIVE' ? 'Tạm Dừng' : 'Kích Hoạt' }}
                                            </button>
                                        </div>
                                    </td>
                                </tr>

                                <tr v-if="filteredShippers.length === 0">
                                    <td colspan="7" class="text-center py-10 text-slate-400 text-xs">
                                        <div class="flex flex-col items-center justify-center space-y-1.5">
                                            <span class="font-bold text-slate-600">Không tìm thấy bưu tá nào phù hợp với bộ lọc hiện tại.</span>
                                            <button v-if="hasActiveFilter" @click="resetFilters" class="text-blue-600 hover:underline font-bold text-xs">
                                                Xóa tất cả điều kiện lọc
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- PAGINATION -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600 gap-2">
                        <div class="flex items-center space-x-2">
                            <span>Hiển thị <b>{{ startIndex }}</b> - <b>{{ endIndex }}</b> trên tổng <b>{{ filteredShippers.length }}</b> bưu tá</span>
                            <span class="text-slate-300">|</span>
                            <span>Số dòng:</span>
                            <select 
                                v-model.number="pageSize" 
                                class="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                            >
                                <option :value="5">5</option>
                                <option :value="10">10</option>
                                <option :value="20">20</option>
                                <option :value="-1">Tất cả</option>
                            </select>
                        </div>

                        <div v-if="totalPages > 1" class="flex items-center space-x-1 self-end sm:self-auto">
                            <button 
                                @click="goToPage(currentPage - 1)" 
                                :disabled="currentPage === 1"
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                            >
                                ‹
                            </button>
                            <button 
                                v-for="p in totalPages" 
                                :key="p"
                                @click="goToPage(p)"
                                :class="[
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition',
                                    currentPage === p 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                                ]"
                            >
                                {{ p }}
                            </button>
                            <button 
                                @click="goToPage(currentPage + 1)" 
                                :disabled="currentPage === totalPages"
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>

                <!-- MODAL CREATE / EDIT -->
                <teleport to="body">
                    <Transition name="modal">
                        <div v-if="showModal" class="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                            <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-fade-in">
                                <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div class="flex items-center space-x-2">
                                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                        <h3 class="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                                            {{ form.id ? 'Cập Nhật Hồ Sơ Bưu Tá' : 'Thêm Mới Bưu Tá Tuyến Phát' }}
                                        </h3>
                                    </div>
                                    <button @click="showModal = false" class="text-slate-400 hover:text-slate-700 text-lg font-bold">×</button>
                                </div>

                                <form @submit.prevent="save" class="p-5 space-y-4">
                                    <div class="space-y-3">
                                        <div class="text-[11px] font-black uppercase tracking-wider text-blue-700 border-b border-blue-100 pb-1">
                                            1. Thông Tin Nhận Diện &amp; Tuyến Phát
                                        </div>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã Bưu Tá <span class="text-rose-500">*</span></label>
                                                <input 
                                                    v-model="form.courierCode" 
                                                    required 
                                                    maxlength="35"
                                                    placeholder="VD: NV_HN_01"
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                                />
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Bưu Cục Công Tác <span class="text-rose-500">*</span></label>
                                                <select 
                                                    v-model="form.stationCode" 
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                                >
                                                    <option v-for="s in stations" :key="s.code" :value="s.code">{{ s.label }}</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-bold text-slate-700 mb-1">Họ và Tên Bưu Tá <span class="text-rose-500">*</span></label>
                                            <input 
                                                v-model="form.fullName" 
                                                required 
                                                maxlength="100"
                                                placeholder="VD: Nguyễn Văn An"
                                                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                                                <input 
                                                    v-model="form.phone" 
                                                    maxlength="15"
                                                    placeholder="0912345678"
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                                />
                                            </div>
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Hạn Mức Đơn / Ca <span class="text-rose-500">*</span></label>
                                                <input 
                                                    v-model.number="form.maxOrdersPerShift" 
                                                    type="number" 
                                                    min="5" 
                                                    max="200"
                                                    required
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                                />
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Ca Trực Hiện Tại</label>
                                                <select 
                                                    v-model="form.shiftStatus" 
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                                >
                                                    <option value="ON_DUTY">Bật Ca Trực (ON_DUTY)</option>
                                                    <option value="OFF_DUTY">Nghỉ Ca (OFF_DUTY)</option>
                                                </select>
                                            </div>
                                            <div v-if="form.id">
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Trạng Thái Hồ Sơ</label>
                                                <select 
                                                    v-model="form.status" 
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                                >
                                                    <option value="ACTIVE">Hoạt Động</option>
                                                    <option value="INACTIVE">Tạm Dừng</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="space-y-3 pt-2">
                                        <div class="text-[11px] font-black uppercase tracking-wider text-sky-700 border-b border-sky-100 pb-1 flex items-center justify-between">
                                            <span class="flex items-center space-x-1.5">
                                                <svg class="w-3.5 h-3.5 text-sky-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.06-.01.19-.03.3z"/>
                                                </svg>
                                                <span>2. Kênh Thông Báo Telegram Bot</span>
                                            </span>
                                            <span class="text-[10px] text-sky-600 font-semibold">Tự động nhận đơn</span>
                                        </div>

                                        <div v-if="form.telegramChatId" class="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2.5">
                                            <div class="flex items-center justify-between">
                                                <div class="flex items-center space-x-2">
                                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span class="text-xs font-bold text-emerald-900">Đã Kết Nối Telegram Bot Thành Công</span>
                                                </div>
                                                <span class="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 font-mono">
                                                    Chat ID: {{ maskChatId(form.telegramChatId) }}
                                                </span>
                                            </div>

                                            <p class="text-[11px] text-emerald-700 leading-relaxed">
                                                Bưu tá đang nhận thông báo điều phối đơn, dự báo ca trực và kế hoạch giao hàng tự động qua Telegram cá nhân.
                                            </p>

                                            <div class="flex items-center space-x-2 pt-1 border-t border-emerald-100">
                                                <button
                                                    type="button"
                                                    @click="sendTelegramTest()"
                                                    :disabled="isSendingTest"
                                                    class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
                                                >
                                                    <span v-if="isSendingTest" class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                                                    </svg>
                                                    <span>Gửi Tin Nhắn Thử Nghiệm</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    @click="unlinkTelegram()"
                                                    class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 font-semibold text-xs transition cursor-pointer"
                                                    title="Hủy liên kết tài khoản Telegram này"
                                                >
                                                    Hủy Liên Kết
                                                </button>
                                            </div>
                                        </div>

                                        <div v-else class="space-y-2.5">
                                            <div class="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 space-y-2.5">
                                                <div class="flex items-center justify-between">
                                                    <span class="text-xs font-bold text-sky-900 flex items-center space-x-1.5">
                                                        <span class="w-2 h-2 rounded-full bg-sky-500"></span>
                                                        <span>Chưa Kết Nối Telegram Bot</span>
                                                    </span>
                                                    <span class="text-[10.5px] text-slate-500">Liên kết 1 chạm</span>
                                                </div>

                                                <p class="text-[11px] text-slate-600 leading-normal">
                                                    Bưu tá chỉ cần mở Bot Telegram để tự động kích hoạt nhận ca mà không cần nhớ hay nhập ID:
                                                </p>

                                                <div class="flex flex-wrap items-center gap-2 pt-1">
                                                    <a
                                                        :href="'https://t.me/NovaWay_Bill_Bot?start=link_' + (form.courierCode || '')"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        :class="[
                                                            'px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5',
                                                            !form.courierCode ? 'opacity-50 pointer-events-none' : ''
                                                        ]"
                                                    >
                                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.37.74-.56 2.92-1.27 4.86-2.11 5.83-2.52 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.06-.01.19-.03.3z"/>
                                                        </svg>
                                                        <span>Mở Bot Telegram (Tự động liên kết)</span>
                                                    </a>

                                                    <button
                                                        type="button"
                                                        @click="copyTelegramCommand()"
                                                        class="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition flex items-center space-x-1 cursor-pointer"
                                                    >
                                                        <svg class="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                                        </svg>
                                                        <span>{{ copiedTelegramCommand ? 'Đã chép lệnh!' : 'Sao chép cú pháp' }}</span>
                                                    </button>
                                                </div>

                                                <div class="text-[10.5px] text-slate-500 pt-0.5">
                                                    Cú pháp thủ công: <code class="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-sky-800 font-bold">/link {{ form.courierCode || '&lt;MÃ_BƯU_TÁ&gt;' }}</code> gửi tới <strong>@NovaWay_Bill_Bot</strong>
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    type="button"
                                                    @click="isManualChatIdOpen = !isManualChatIdOpen"
                                                    class="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center space-x-1 transition cursor-pointer"
                                                >
                                                    <svg :class="['w-3 h-3 transition-transform', isManualChatIdOpen ? 'rotate-90' : '']" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"></path>
                                                    </svg>
                                                    <span>Nhập Telegram Chat ID thủ công (Dành cho Quản trị viên)</span>
                                                </button>

                                                <div v-show="isManualChatIdOpen" class="mt-2 space-y-1">
                                                    <input
                                                        v-model="form.telegramChatId"
                                                        maxlength="50"
                                                        placeholder="Nhập mã số Telegram Chat ID (VD: 123456789)"
                                                        class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                                    />
                                                    <span class="text-[10px] text-slate-400 block">
                                                        Bưu tá có thể lấy Chat ID bằng cách nhắn <code>/myid</code> cho bot.
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                                        <button 
                                            type="button" 
                                            @click="showModal = false" 
                                            class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                                        >
                                            Hủy Bỏ
                                        </button>
                                        <button 
                                            type="submit" 
                                            :disabled="isSaving" 
                                            class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-sm shadow-blue-500/25 transition disabled:opacity-50 flex items-center space-x-1.5"
                                        >
                                            <span>{{ isSaving ? 'Đang Lưu...' : 'Lưu Thông Tin' }}</span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </Transition>
                </teleport>

                <!-- CONFIRM DIALOG -->
                <teleport to="body">
                    <Transition name="modal">
                        <div v-if="confirmDialog.show" class="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 animate-fade-in">
                                <div class="flex items-center space-x-3">
                                    <div 
                                        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                                        :class="confirmDialog.item?.status === 'ACTIVE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>
                                    <div>
                                        <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                                            {{ confirmDialog.item?.status === 'ACTIVE' ? 'Xác Nhận Tạm Dừng' : 'Xác Nhận Kích Hoạt' }}
                                        </h4>
                                        <p class="text-xs text-slate-500 mt-0.5">
                                            Thay đổi trạng thái tác nghiệp
                                        </p>
                                    </div>
                                </div>

                                <p class="text-xs text-slate-600 leading-relaxed">
                                    Bạn có chắc chắn muốn <b :class="confirmDialog.item?.status === 'ACTIVE' ? 'text-rose-600' : 'text-emerald-600'">{{ confirmDialog.item?.status === 'ACTIVE' ? 'TẠM DỪNG' : 'KÍCH HOẠT' }}</b> bưu tá <b>{{ confirmDialog.item?.fullName }}</b> (<span class="font-mono">{{ confirmDialog.item?.courierCode }}</span>)?
                                </p>

                                <div class="flex items-center justify-end space-x-2 pt-2">
                                    <button 
                                        type="button"
                                        @click="confirmDialog.show = false" 
                                        :disabled="confirmDialog.isProcessing"
                                        class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition disabled:opacity-50"
                                    >
                                        Hủy Bỏ
                                    </button>
                                    <button 
                                        type="button"
                                        @click="executeToggleStatus" 
                                        :disabled="confirmDialog.isProcessing"
                                        :class="[
                                            'px-3.5 py-1.5 rounded-lg text-white text-xs font-bold transition shadow-sm disabled:opacity-50',
                                            confirmDialog.item?.status === 'ACTIVE' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                        ]"
                                    >
                                        {{ confirmDialog.isProcessing ? 'Đang Xử Lý...' : 'Đồng Ý Thực Hiện' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Transition>
                </teleport>
            </div>
        `
    };

    window.ShipperDirectoryView = ShipperDirectoryView;
})();
