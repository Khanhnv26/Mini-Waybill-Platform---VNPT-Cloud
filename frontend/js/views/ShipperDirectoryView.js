
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
        status: 'ACTIVE'
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
            const currentPage = ref(1);
            const pageSize = ref(5);

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
                    const data = await ShipperDirectoryService.list();
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

            const telegramLinkedCount = computed(() => {
                return shippers.value.filter(item => item.hasLinkedTelegram).length;
            });

            const stationCoverageCount = computed(() => {
                const set = new Set(shippers.value.map(item => item.stationCode).filter(Boolean));
                return set.size;
            });

            const filteredShippers = computed(() => {
                let list = shippers.value;

                if (statusFilter.value !== 'ALL') {
                    list = list.filter(item => item.status === statusFilter.value);
                }

                if (stationFilter.value !== 'ALL') {
                    list = list.filter(item => item.stationCode === stationFilter.value);
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

            watch([searchQuery, statusFilter, stationFilter, pageSize], () => {
                currentPage.value = 1;
            });

            const goToPage = (page) => {
                if (page >= 1 && page <= totalPages.value) {
                    currentPage.value = page;
                }
            };

            const hasActiveFilter = computed(() => {
                return searchQuery.value.trim() !== '' || statusFilter.value !== 'ALL' || stationFilter.value !== 'ALL';
            });

            const resetFilters = () => {
                searchQuery.value = '';
                statusFilter.value = 'ALL';
                stationFilter.value = 'ALL';
                currentPage.value = 1;
            };

            const openCreate = () => {
                Object.assign(form, emptyForm());
                showModal.value = true;
            };

            const openEdit = (item) => {
                Object.assign(form, {
                    id: item.id,
                    courierCode: item.courierCode || '',
                    fullName: item.fullName || '',
                    phone: item.phone || '',
                    telegramChatId: '',
                    stationCode: item.stationCode || 'POST-HN-CG',
                    status: item.status || 'ACTIVE'
                });
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
                    telegramChatId: form.telegramChatId.trim() || null
                };
                isSaving.value = true;
                try {
                    if (form.id) {
                        payload.status = form.status;
                        if (!payload.telegramChatId) delete payload.telegramChatId;
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
                currentPage,
                pageSize,
                showModal,
                form,
                confirmDialog,
                stations: STATIONS,
                stationLabel,
                activeShippersCount,
                telegramLinkedCount,
                stationCoverageCount,
                hasActiveFilter,
                resetFilters,
                filteredShippers,
                totalPages,
                startIndex,
                endIndex,
                paginatedShippers,
                goToPage,
                openCreate,
                openEdit,
                save,
                confirmToggleStatus,
                executeToggleStatus,
                loadShippers
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Shipper Directory
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Lý Danh Bạ &amp; Đội Ngũ Bưu Tá Phát Hàng
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Quản lý tập trung hồ sơ nhân sự bưu tá tuyến phát, phân bổ địa bàn trạm bưu cục và kiểm soát trạng thái kết nối Telegram Bot nhận lệnh giao toàn trình.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto flex-wrap sm:flex-nowrap gap-y-2">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ shippers.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tổng Bưu Tá</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ activeShippersCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Hoạt Động</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-sky-200">{{ telegramLinkedCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đã Nối Bot</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ stationCoverageCount }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Trạm Phủ</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-full sm:w-72">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                placeholder="Tìm theo mã, họ tên, SĐT, trạm..." 
                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                            />
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
                            v-model="statusFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ACTIVE">Đang hoạt động</option>
                            <option value="INACTIVE">Tạm dừng hoạt động</option>
                        </select>

                        <select 
                            v-model="stationFilter" 
                            class="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition max-w-[200px]"
                        >
                            <option value="ALL">Tất cả bưu cục / trạm</option>
                            <option v-for="s in stations" :key="s.code" :value="s.code">{{ s.label }}</option>
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

                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse table-b2b">
                            <thead>
                                <tr>
                                    <th class="w-14 text-center">ID</th>
                                    <th class="w-32">MÃ BƯU TÁ</th>
                                    <th>HỌ TÊN BƯU TÁ</th>
                                    <th class="w-36">SỐ ĐIỆN THOẠI</th>
                                    <th>BƯU CỤC CÔNG TÁC</th>
                                    <th class="w-36 text-center">KẾT NỐI TELEGRAM</th>
                                    <th class="w-32 text-center">TRẠNG THÁI</th>
                                    <th class="w-44 text-right">THAO TÁC</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                <tr v-for="item in paginatedShippers" :key="item.id" class="hover:bg-slate-50/80 transition">
                                    <td class="font-mono text-xs font-bold text-slate-400 text-center">#{{ item.id }}</td>
                                    
                                    <td>
                                        <span class="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs inline-block">
                                            {{ item.courierCode }}
                                        </span>
                                    </td>

                                    <td>
                                        <div class="flex items-center space-x-2.5">
                                            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shadow-xs flex-shrink-0">
                                                {{ (item.fullName || 'B').charAt(0).toUpperCase() }}
                                            </div>
                                            <div>
                                                <div class="font-bold text-slate-800 text-xs leading-tight">
                                                    {{ item.fullName }}
                                                </div>
                                                <div class="text-[10px] text-slate-400 font-medium mt-0.5">
                                                    Bưu tá phát tuyến địa bàn
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td>
                                        <span class="font-mono font-bold text-slate-700 text-xs">{{ item.phone || '—' }}</span>
                                    </td>

                                    <td>
                                        <div class="space-y-0.5">
                                            <div class="font-semibold text-xs text-slate-800">{{ stationLabel(item.stationCode) }}</div>
                                            <div class="font-mono text-[10px] text-slate-400">{{ item.stationCode }}</div>
                                        </div>
                                    </td>

                                    <td class="text-center">
                                        <span 
                                            v-if="item.hasLinkedTelegram" 
                                            class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-sky-50 text-sky-700 border border-sky-200"
                                            title="Đã liên kết Telegram Bot nhận đơn hàng"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                                            <span>Đã Kết Nối</span>
                                        </span>
                                        <span 
                                            v-else 
                                            class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500 border border-slate-200"
                                            title="Chưa kết nối Telegram Bot"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                            <span>Chưa Kết Nối</span>
                                        </span>
                                    </td>

                                    <td class="text-center">
                                        <span 
                                            :class="[
                                                'px-2.5 py-0.5 rounded-full text-[10.5px] font-bold inline-flex items-center space-x-1 border',
                                                item.status === 'ACTIVE' 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                            ]"
                                        >
                                            <span class="w-1.5 h-1.5 rounded-full" :class="item.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                                            <span>{{ item.status === 'ACTIVE' ? 'Hoạt Động' : 'Tạm Dừng' }}</span>
                                        </span>
                                    </td>

                                    <td class="text-right py-2.5 px-3 whitespace-nowrap">
                                        <div class="flex items-center justify-end space-x-1.5">
                                            <button 
                                                type="button" 
                                                @click="openEdit(item)" 
                                                class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 shadow-xs"
                                                title="Sửa thông tin bưu tá"
                                            >
                                                <span>Sửa</span>
                                            </button>

                                            <button 
                                                type="button" 
                                                @click="confirmToggleStatus(item)" 
                                                :class="[
                                                    'px-2 py-1 rounded-lg text-xs font-bold transition border shadow-xs',
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
                                    <td colspan="8" class="text-center py-10 text-slate-400 text-xs">
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
                                            1. Thông Tin Nhận Diện &amp; Địa Bàn
                                        </div>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Mã Bưu Tá <span class="text-rose-500">*</span></label>
                                                <input 
                                                    v-model="form.courierCode" 
                                                    required 
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
                                                placeholder="VD: Nguyễn Văn An"
                                                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div class="grid grid-cols-2 gap-3">
                                            <div>
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                                                <input 
                                                    v-model="form.phone" 
                                                    placeholder="0912345678"
                                                    class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                                />
                                            </div>
                                            <div v-if="form.id">
                                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Trạng Thái Hoạt Động</label>
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

                                    <div class="space-y-2 pt-2">
                                        <div class="text-[11px] font-black uppercase tracking-wider text-sky-700 border-b border-sky-100 pb-1 flex items-center justify-between">
                                            <span>2. Kênh Thông Báo Telegram Bot</span>
                                            <span class="text-[10px] text-sky-600 lowercase font-normal">Tự động nhận đơn</span>
                                        </div>

                                        <div class="p-2.5 rounded-xl bg-sky-50 border border-sky-200/80 text-xs text-sky-900 space-y-1">
                                            <div class="font-bold flex items-center space-x-1.5 text-sky-800">
                                                <span class="w-1.5 h-1.5 rounded-full bg-sky-600"></span>
                                                <span>Cách bưu tá tự kết nối Telegram Bot:</span>
                                            </div>
                                            <p class="text-[11px] text-sky-700">
                                                Bưu tá mở bot Telegram hệ thống và gửi lệnh: 
                                                <code class="px-1.5 py-0.5 rounded bg-white font-mono font-bold text-sky-800 border border-sky-300">/link {{ form.courierCode || '&lt;MÃ_BƯU_TÁ&gt;' }}</code>
                                            </p>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-bold text-slate-700 mb-1">
                                                Gán Thủ Công Telegram Chat ID (Tùy chọn)
                                            </label>
                                            <input 
                                                v-model="form.telegramChatId" 
                                                placeholder="Chỉ nhập khi cần gắn mới hoặc can thiệp trực tiếp"
                                                class="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                            <span class="text-[10px] text-slate-400 mt-1 block">Để trống nếu để bưu tá tự gửi cú pháp liên kết qua Telegram.</span>
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

                <teleport to="body">
                    <Transition name="modal">
                        <div v-if="confirmDialog.show" class="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                            <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 animate-fade-in">
                                <div class="flex items-center space-x-3">
                                    <div 
                                        class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
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
