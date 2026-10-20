(function () {
    const { ref, reactive, computed, onMounted, watch } = Vue;
    const HUBS = [
        { code: 'HUB-HN-01', label: 'Siêu HUB Hà Nội (HUB-HN-01)' },
        { code: 'HUB-DN-01', label: 'Siêu HUB Đà Nẵng (HUB-DN-01)' },
        { code: 'HUB-HCM-01', label: 'Siêu HUB TP.HCM (HUB-HCM-01)' },
        { code: 'HUB-HP-01', label: 'HUB Hải Phòng (HUB-HP-01)' },
        { code: 'HUB-CT-01', label: 'HUB Cần Thơ (HUB-CT-01)' },
        { code: 'POST-HN-CG', label: 'Bưu cục Cầu Giấy (POST-HN-CG)' },
        { code: 'POST-HN-DDA', label: 'Bưu cục Đống Đa (POST-HN-DDA)' },
        { code: 'POST-HN-HBT', label: 'Bưu cục Hai Bà Trưng (POST-HN-HBT)' },
        { code: 'POST-HN-TX', label: 'Bưu cục Thanh Xuân (POST-HN-TX)' },
        { code: 'POST-HN-HD', label: 'Bưu cục Hà Đông (POST-HN-HD)' },
        { code: 'POST-DN-HC', label: 'Bưu cục Hải Châu (POST-DN-HC)' },
        { code: 'POST-DN-TK', label: 'Bưu cục Thanh Khê (POST-DN-TK)' },
        { code: 'POST-DN-ST', label: 'Bưu cục Sơn Trà (POST-DN-ST)' },
        { code: 'POST-HCM-Q1', label: 'Bưu cục Quận 1 (POST-HCM-Q1)' },
        { code: 'POST-HCM-TB', label: 'Bưu cục Tân Bình (POST-HCM-TB)' },
        { code: 'POST-HCM-BT', label: 'Bưu cục Bình Thạnh (POST-HCM-BT)' }
    ];
    const VEHICLE_TYPES = [
        { code: 'TRUCK_1_5T', label: 'Tải 1.5T (Gom hàng nội đô)', defaultCapacity: 1500 },
        { code: 'TRUCK_2_5T', label: 'Tải 2.5T (Trung chuyển Feeder)', defaultCapacity: 2500 },
        { code: 'TRUCK_5T', label: 'Tải 5.0T (Liên tỉnh / Linehaul)', defaultCapacity: 5000 },
        { code: 'CONTAINER', label: 'Container 15.0T (Trục Bắc - Nam)', defaultCapacity: 15000 }
    ];
    const emptyAddForm = () => ({
        vehiclePlate: '',
        modelName: '',
        vehicleType: 'TRUCK_2_5T',
        payloadCapacity: 2500,
        currentHub: 'HUB-HN-01',
        assignedDriverName: '',
        driverPhone: ''
    });
    const emptyEditForm = () => ({
        id: null,
        vehiclePlate: '',
        modelName: '',
        vehicleType: '',
        payloadCapacity: 0,
        currentHub: '',
        status: 'AVAILABLE',
        assignedDriverName: '',
        driverPhone: ''
    });
    const FleetView = {
        name: 'FleetView',
        props: {
            currentUser: { type: Object, default: () => null }
        },
        setup() {
            const vehicles = ref([]);
            const isLoading = ref(false);
            const isSaving = ref(false);
            const searchQuery = ref('');
            const hubFilter = ref('ALL');
            const statusFilter = ref('ALL');
            const typeFilter = ref('ALL');
            const showAddModal = ref(false);
            const showEditModal = ref(false);
            const addForm = reactive(emptyAddForm());
            const editForm = reactive(emptyEditForm());
            const minDelay = (p, ms = 250) => Promise.all([p, new Promise(r => setTimeout(r, ms))]).then(([res]) => res);
            const loadVehicles = async () => {
                if (typeof RoutingService === 'undefined') return;
                isLoading.value = true;
                try {
                    const data = await minDelay(RoutingService.getVehicles({
                        hub: hubFilter.value,
                        status: statusFilter.value,
                        vehicleType: typeFilter.value
                    }), 250);
                    vehicles.value = Array.isArray(data) ? data : [];
                } catch (error) {
                    if (window.Utils) {
                        window.Utils.showToast('Không tải được đội xe', error.message, 'error');
                    }
                } finally {
                    isLoading.value = false;
                }
            };
            const kpiStats = computed(() => {
                const total = vehicles.value.length;
                const available = vehicles.value.filter(v => v.status === 'AVAILABLE').length;
                const onTrip = vehicles.value.filter(v => v.status === 'ON_TRIP').length;
                const maintenance = vehicles.value.filter(v => v.status === 'MAINTENANCE').length;
                const disabled = vehicles.value.filter(v => v.status === 'DISABLED').length;
                return { total, available, onTrip, maintenance, disabled };
            });
            const filteredVehicles = computed(() => {
                let list = vehicles.value;
                const q = searchQuery.value.trim().toLowerCase();
                if (q) {
                    list = list.filter(v =>
                        (v.vehiclePlate && v.vehiclePlate.toLowerCase().includes(q)) ||
                        (v.modelName && v.modelName.toLowerCase().includes(q)) ||
                        (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(q)) ||
                        (v.driverPhone && v.driverPhone.includes(q))
                    );
                }
                return list;
            });
            const currentPage = ref(1);
            const pageSize = ref(10);
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredVehicles.value.length / pageSize.value) || 1;
            });
            const startIndex = computed(() => {
                if (filteredVehicles.value.length === 0) return 0;
                return (currentPage.value - 1) * pageSize.value + 1;
            });
            const endIndex = computed(() => {
                if (pageSize.value === -1) return filteredVehicles.value.length;
                return Math.min(currentPage.value * pageSize.value, filteredVehicles.value.length);
            });
            const paginatedVehicles = computed(() => {
                if (pageSize.value === -1) return filteredVehicles.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredVehicles.value.slice(start, start + pageSize.value);
            });
            watch([searchQuery, hubFilter, statusFilter, typeFilter, pageSize], () => {
                currentPage.value = 1;
            });
            const goToPage = (page) => {
                if (page >= 1 && page <= totalPages.value) {
                    currentPage.value = page;
                }
            };
            const handleTypeChangeInAdd = () => {
                const found = VEHICLE_TYPES.find(t => t.code === addForm.vehicleType);
                if (found) {
                    addForm.payloadCapacity = found.defaultCapacity;
                }
            };
            const openAddModal = () => {
                Object.assign(addForm, emptyAddForm());
                showAddModal.value = true;
            };
            const openEditModal = (v) => {
                Object.assign(editForm, {
                    id: v.id,
                    vehiclePlate: v.vehiclePlate,
                    modelName: v.modelName,
                    vehicleType: v.vehicleType,
                    payloadCapacity: v.payloadCapacity,
                    currentHub: v.currentHub,
                    status: v.status,
                    assignedDriverName: v.assignedDriverName || '',
                    driverPhone: v.driverPhone || ''
                });
                showEditModal.value = true;
            };
            const submitAddVehicle = async () => {
                if (!addForm.vehiclePlate.trim() || !addForm.modelName.trim() || !addForm.currentHub) {
                    if (window.Utils) window.Utils.showToast('Thiếu thông tin', 'Vui lòng nhập biển số, dòng xe và Hub quản lý!', 'warning');
                    return;
                }
                isSaving.value = true;
                try {
                    await RoutingService.createVehicle({
                        vehiclePlate: addForm.vehiclePlate.trim().toUpperCase(),
                        modelName: addForm.modelName.trim(),
                        vehicleType: addForm.vehicleType,
                        payloadCapacity: Number(addForm.payloadCapacity) || 2500,
                        currentHub: addForm.currentHub,
                        assignedDriverName: addForm.assignedDriverName.trim() || null,
                        driverPhone: addForm.driverPhone.trim() || null
                    });
                    if (window.Utils) window.Utils.showToast('Thành công', `Đã thêm xe ${addForm.vehiclePlate} vào đội xe!`, 'success');
                    showAddModal.value = false;
                    await loadVehicles();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Lỗi thêm xe', error.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };
            const submitEditVehicle = async () => {
                if (!editForm.id) return;
                isSaving.value = true;
                try {
                    await RoutingService.updateVehicle(editForm.id, {
                        modelName: editForm.modelName.trim(),
                        vehicleType: editForm.vehicleType,
                        payloadCapacity: Number(editForm.payloadCapacity),
                        currentHub: editForm.currentHub,
                        status: editForm.status,
                        assignedDriverName: editForm.assignedDriverName.trim() || null,
                        driverPhone: editForm.driverPhone.trim() || null
                    });
                    if (window.Utils) window.Utils.showToast('Thành công', `Đã cập nhật thông tin xe ${editForm.vehiclePlate}!`, 'success');
                    showEditModal.value = false;
                    await loadVehicles();
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Lỗi cập nhật', error.message, 'error');
                } finally {
                    isSaving.value = false;
                }
            };
            const toggleQuickStatus = async (v, targetStatus) => {
                if (!v || !v.id) return;
                try {
                    await RoutingService.updateVehicleStatus(v.id, targetStatus);
                    v.status = targetStatus;
                    const labels = {
                        AVAILABLE: 'Sẵn sàng điều phối',
                        MAINTENANCE: 'Bảo dưỡng kỹ thuật',
                        DISABLED: 'Vô hiệu hóa'
                    };
                    if (window.Utils) {
                        window.Utils.showToast('Đã đổi trạng thái', `Xe ${v.vehiclePlate} chuyển sang ${labels[targetStatus] || targetStatus}.`, 'success');
                    }
                } catch (error) {
                    if (window.Utils) window.Utils.showToast('Không đổi được trạng thái', error.message, 'error');
                }
            };
            const getStatusBadge = (status) => {
                switch (status) {
                    case 'AVAILABLE':
                        return { text: 'Sẵn sàng', dotClass: 'bg-emerald-500', indicatorClass: 'status-indicator-emerald' };
                    case 'ON_TRIP':
                        return { text: 'Chạy tuyến', dotClass: 'bg-blue-500 status-dot-pulse', indicatorClass: 'status-indicator-blue' };
                    case 'MAINTENANCE':
                        return { text: 'Bảo dưỡng', dotClass: 'bg-amber-500', indicatorClass: 'status-indicator-amber' };
                    case 'DISABLED':
                        return { text: 'Vô hiệu hóa', dotClass: 'bg-slate-400', indicatorClass: 'status-indicator-slate' };
                    default:
                        return { text: status, dotClass: 'bg-slate-400', indicatorClass: 'status-indicator-slate' };
                }
            };
            const getVehicleTypeBadge = (type) => {
                const found = VEHICLE_TYPES.find(t => t.code === type);
                return found ? found.label : type;
            };
            const getHubLabel = (code) => {
                const found = HUBS.find(h => h.code === code);
                return found ? found.label : code;
            };
            onMounted(loadVehicles);
            return {
                vehicles,
                isLoading,
                isSaving,
                searchQuery,
                hubFilter,
                statusFilter,
                typeFilter,
                showAddModal,
                showEditModal,
                addForm,
                editForm,
                kpiStats,
                filteredVehicles,
                currentPage,
                pageSize,
                totalPages,
                startIndex,
                endIndex,
                paginatedVehicles,
                goToPage,
                hubs: HUBS,
                vehicleTypes: VEHICLE_TYPES,
                loadVehicles,
                openAddModal,
                openEditModal,
                handleTypeChangeInAdd,
                submitAddVehicle,
                submitEditVehicle,
                toggleQuickStatus,
                getStatusBadge,
                getVehicleTypeBadge,
                getHubLabel
            };
        },
        template: `
            <div class="space-y-3.5 pb-8 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-sm relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>
                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                            <div class="text-xs font-medium text-blue-100">
                                Trung Tâm Quản Lý Phương Tiện Vận Tải
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Lý Đội Phương Tiện &amp; Điều Phối Đội Xe
                            </h1>
                            <p class="text-[11px] sm:text-xs text-blue-100/90 mt-0.5 leading-normal max-w-2xl">
                                Quản lý tập trung toàn bộ phương tiện vận tải đường trục và xe gom Feeder.
                                <span class="hidden sm:inline"> Tự động liên kết trực tiếp với thuật toán tính thời gian giao hàng (ETA), tự động kích hoạt cảnh báo dời ETA (+12h) khi HUB xuất phát hết xe sẵn sàng.</span>
                            </p>
                        </div>
                        <div class="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2 self-start md:self-auto w-full md:w-auto">
                            <div class="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[64px] sm:min-w-[74px]">
                                <div class="text-sm sm:text-base font-extrabold leading-tight text-white font-mono">{{ kpiStats.total }}</div>
                                <div class="text-[9px] sm:text-[10px] text-blue-100 font-medium uppercase mt-0.5 whitespace-nowrap">Tổng Xe</div>
                            </div>
                            <div class="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[64px] sm:min-w-[74px]">
                                <div class="text-sm sm:text-base font-extrabold leading-tight text-emerald-300 font-mono">{{ kpiStats.available }}</div>
                                <div class="text-[9px] sm:text-[10px] text-blue-100 font-medium uppercase mt-0.5 whitespace-nowrap">Sẵn Sàng</div>
                            </div>
                            <div class="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[64px] sm:min-w-[74px]">
                                <div class="text-sm sm:text-base font-extrabold leading-tight text-sky-200 font-mono">{{ kpiStats.onTrip }}</div>
                                <div class="text-[9px] sm:text-[10px] text-blue-100 font-medium uppercase mt-0.5 whitespace-nowrap">Chạy Tuyến</div>
                            </div>
                            <div class="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[64px] sm:min-w-[74px]">
                                <div class="text-sm sm:text-base font-extrabold leading-tight text-amber-300 font-mono">{{ kpiStats.maintenance }}</div>
                                <div class="text-[9px] sm:text-[10px] text-blue-100 font-medium uppercase mt-0.5 whitespace-nowrap">Bảo Dưỡng</div>
                            </div>
                            <div class="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[64px] sm:min-w-[74px]">
                                <div class="text-sm sm:text-base font-extrabold leading-tight text-slate-300 font-mono">{{ kpiStats.disabled }}</div>
                                <div class="text-[9px] sm:text-[10px] text-blue-100 font-medium uppercase mt-0.5 whitespace-nowrap">Đã Khóa</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div class="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 flex-1">
                        <div class="relative w-full sm:w-64">
                            <input 
                                v-model="searchQuery" 
                                type="text" 
                                placeholder="Tìm biển số, tài xế, dòng xe..." 
                                class="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition" 
                            />
                            <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            <select 
                                v-model="hubFilter" 
                                @change="loadVehicles" 
                                class="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white outline-none cursor-pointer"
                            >
                                <option value="ALL">Tất cả HUB / Bưu cục</option>
                                <option v-for="h in hubs" :key="h.code" :value="h.code">{{ h.label }}</option>
                            </select>
                            <select 
                                v-model="statusFilter" 
                                @change="loadVehicles" 
                                class="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white outline-none cursor-pointer"
                            >
                                <option value="ALL">Tất cả trạng thái</option>
                                <option value="AVAILABLE">AVAILABLE - Sẵn sàng</option>
                                <option value="ON_TRIP">ON_TRIP - Chạy tuyến</option>
                                <option value="MAINTENANCE">MAINTENANCE - Bảo dưỡng</option>
                                <option value="DISABLED">DISABLED - Vô hiệu hóa</option>
                            </select>
                            <select 
                                v-model="typeFilter" 
                                @change="loadVehicles" 
                                class="w-full sm:w-auto px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white outline-none cursor-pointer"
                            >
                                <option value="ALL">Tất cả phân loại xe</option>
                                <option v-for="t in vehicleTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                            type="button"
                            @click="loadVehicles" 
                            :disabled="isLoading"
                            class="flex-1 sm:flex-none justify-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': isLoading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                            </svg>
                            <span>Làm Mới</span>
                        </button>
                        <button 
                            type="button"
                            @click="openAddModal" 
                            class="flex-1 sm:flex-none justify-center px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                            </svg>
                            <span>Thêm Xe Mới</span>
                        </button>
                    </div>
                </div>
                <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    <!-- Mobile Card View (< md) -->
                    <div class="md:hidden divide-y divide-slate-100">
                        <div v-if="isLoading" class="p-3.5 space-y-3">
                            <div v-for="i in 5" :key="'skel-fleet-mob-' + i" class="p-3.5 rounded-xl border border-slate-200 bg-white animate-pulse space-y-2.5">
                                <div class="flex items-start justify-between gap-2">
                                    <div class="flex items-center gap-2.5">
                                        <div class="w-9 h-9 rounded-xl bg-slate-200 shrink-0"></div>
                                        <div class="space-y-1">
                                            <div class="h-3.5 w-28 bg-slate-200 rounded"></div>
                                            <div class="h-2.5 w-20 bg-slate-100 rounded"></div>
                                        </div>
                                    </div>
                                    <div class="h-5 w-20 bg-slate-200 rounded-full"></div>
                                </div>
                                <div class="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                    <div class="h-3 w-20 bg-slate-200 rounded"></div>
                                    <div class="h-3 w-24 bg-slate-200 rounded"></div>
                                </div>
                            </div>
                        </div>
                        <div v-else-if="filteredVehicles.length === 0" class="py-8 text-center text-slate-400 text-xs">
                            Không tìm thấy phương tiện nào phù hợp với bộ lọc.
                        </div>
                        <template v-else>
                            <div v-for="v in paginatedVehicles" :key="v.id" class="p-3.5 space-y-2.5">
                            <div class="flex items-start justify-between gap-2">
                                <div class="flex items-center gap-2.5 min-w-0">
                                    <div class="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                        </svg>
                                    </div>
                                    <div class="min-w-0">
                                        <div class="font-mono font-extrabold text-slate-900 text-sm tracking-tight truncate">{{ v.vehiclePlate }}</div>
                                        <div class="text-[11px] text-slate-500 font-medium truncate">{{ v.modelName }} • {{ getVehicleTypeBadge(v.vehicleType) }}</div>
                                    </div>
                                </div>
                                <span class="status-indicator shrink-0 text-[10.5px]" :class="getStatusBadge(v.status).indicatorClass">
                                    <span :class="['status-dot', getStatusBadge(v.status).dotClass]"></span>
                                    <span>{{ getStatusBadge(v.status).text }}</span>
                                </span>
                            </div>

                            <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div>
                                    <span class="text-slate-400 text-[10px] block">Trạm đỗ hiện tại</span>
                                    <span class="font-semibold text-slate-800 truncate block">{{ v.currentHub }}</span>
                                </div>
                                <div>
                                    <span class="text-slate-400 text-[10px] block">Tải trọng tối đa</span>
                                    <span class="font-mono font-bold text-slate-800">{{ Number(v.payloadCapacity || 0).toLocaleString() }} kg</span>
                                </div>
                                <div class="col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between">
                                    <span class="text-slate-500 text-[10.5px]">Tài xế: <strong class="text-slate-800">{{ v.assignedDriverName || 'Chưa gán tài xế' }}</strong></span>
                                    <a v-if="v.driverPhone" :href="'tel:' + v.driverPhone" class="text-blue-600 font-mono font-bold text-[10.5px] hover:underline flex items-center gap-1">
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                        {{ v.driverPhone }}
                                    </a>
                                </div>
                            </div>

                            <div class="flex items-center justify-end gap-1.5 pt-0.5">
                                <button 
                                    v-if="v.status === 'AVAILABLE'"
                                    type="button"
                                    @click="toggleQuickStatus(v, 'MAINTENANCE')" 
                                    class="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Đưa vào bảo dưỡng"
                                >
                                    Bảo Dưỡng
                                </button>
                                <button 
                                    v-else-if="v.status === 'MAINTENANCE' || v.status === 'DISABLED'"
                                    type="button"
                                    @click="toggleQuickStatus(v, 'AVAILABLE')" 
                                    class="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Sẵn sàng xuất bến"
                                >
                                    Sẵn Sàng
                                </button>
                                <button 
                                    type="button"
                                    @click="openEditModal(v)" 
                                    class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Sửa thông tin / Đổi tài xế"
                                >
                                    Sửa Xe
                                </button>
                                <button 
                                    v-if="v.status !== 'ON_TRIP' && v.status !== 'DISABLED'"
                                    type="button"
                                    @click="toggleQuickStatus(v, 'DISABLED')" 
                                    class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                                    title="Tạm ngưng khai thác xe"
                                >
                                    Khóa
                                </button>
                            </div>
                        </div>
                        </template>
                    </div>

                    <!-- Desktop Table (>= md) -->
                    <div class="hidden md:block overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                    <th class="py-2.5 px-3.5">Biển Kiểm Soát</th>
                                    <th class="py-2.5 px-3.5">Dòng Xe &amp; Phân Loại</th>
                                    <th class="py-2.5 px-3.5">Tải Trọng Tối Đa</th>
                                    <th class="py-2.5 px-3.5">Trạm Đỗ Hiện Tại</th>
                                    <th class="py-2.5 px-3.5">Tài Xế Phụ Trách</th>
                                    <th class="py-2.5 px-3.5 text-center">Tình Trạng Xe</th>
                                    <th class="py-2.5 px-3.5 text-right">Tác Vụ Kỹ Thuật</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-xs">
                                <template v-if="isLoading">
                                    <tr v-for="i in 5" :key="'skel-fleet-' + i" class="animate-pulse">
                                        <td class="py-3 px-3.5">
                                            <div class="flex items-center gap-2">
                                                <div class="w-8 h-8 rounded-lg bg-slate-200 shrink-0"></div>
                                                <div class="space-y-1">
                                                    <div class="h-3.5 w-24 bg-slate-200 rounded"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-3 px-3.5">
                                            <div class="space-y-1">
                                                <div class="h-3.5 w-24 bg-slate-200 rounded"></div>
                                                <div class="h-2.5 w-16 bg-slate-100 rounded"></div>
                                            </div>
                                        </td>
                                        <td class="py-3 px-3.5"><div class="h-3 w-20 bg-slate-200 rounded"></div></td>
                                        <td class="py-3 px-3.5"><div class="h-3 w-28 bg-slate-100 rounded"></div></td>
                                        <td class="py-3 px-3.5">
                                            <div class="space-y-1">
                                                <div class="h-3 w-24 bg-slate-200 rounded"></div>
                                                <div class="h-2.5 w-16 bg-slate-100 rounded"></div>
                                            </div>
                                        </td>
                                        <td class="py-3 px-3.5 text-center"><div class="h-5 w-20 bg-slate-200 rounded-full mx-auto"></div></td>
                                        <td class="py-3 px-3.5 text-right"><div class="h-7 w-20 bg-slate-200 rounded-lg ml-auto"></div></td>
                                    </tr>
                                </template>
                                <template v-else-if="filteredVehicles.length === 0">
                                    <tr>
                                        <td colspan="7" class="py-8 text-center text-slate-400">
                                            Không tìm thấy phương tiện nào phù hợp với bộ lọc.
                                        </td>
                                    </tr>
                                </template>
                                <template v-else>
                                    <tr v-for="v in paginatedVehicles" :key="v.id" class="hover:bg-slate-50/70 transition">
                                    <td class="py-2.5 px-3.5">
                                        <div class="flex items-center gap-2">
                                            <div class="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <div class="font-mono font-bold text-slate-900 text-sm tracking-tight">{{ v.vehiclePlate }}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3.5">
                                        <div class="font-bold text-slate-800">{{ v.modelName }}</div>
                                        <div class="text-[10.5px] text-slate-500 font-medium">{{ getVehicleTypeBadge(v.vehicleType) }}</div>
                                    </td>
                                    <td class="py-2.5 px-3.5 font-mono font-bold text-slate-700">
                                        {{ Number(v.payloadCapacity || 0).toLocaleString() }} kg
                                    </td>
                                    <td class="py-2.5 px-3.5">
                                        <div class="font-semibold text-slate-800 text-xs">
                                            {{ v.currentHub }}
                                        </div>
                                    </td>
                                    <td class="py-2.5 px-3.5">
                                        <div class="font-semibold text-slate-800">{{ v.assignedDriverName || 'Chưa gán tài xế' }}</div>
                                        <div class="text-[10px] text-slate-500 font-mono">{{ v.driverPhone || '—' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3.5 text-center">
                                        <span class="status-indicator" :class="getStatusBadge(v.status).indicatorClass">
                                            <span :class="['status-dot', getStatusBadge(v.status).dotClass]"></span>
                                            <span>{{ getStatusBadge(v.status).text }}</span>
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3.5 text-right whitespace-nowrap">
                                        <div class="inline-flex items-center gap-1.5">
                                            <button 
                                                v-if="v.status === 'AVAILABLE'"
                                                type="button"
                                                @click="toggleQuickStatus(v, 'MAINTENANCE')" 
                                                class="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                                title="Đưa vào bảo dưỡng"
                                            >
                                                Bảo Dưỡng
                                            </button>
                                            <button 
                                                v-else-if="v.status === 'MAINTENANCE' || v.status === 'DISABLED'"
                                                type="button"
                                                @click="toggleQuickStatus(v, 'AVAILABLE')" 
                                                class="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                                title="Sẵn sàng xuất bến"
                                            >
                                                Sẵn Sàng
                                            </button>
                                            <button 
                                                type="button"
                                                @click="openEditModal(v)" 
                                                class="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                                title="Sửa thông tin / Đổi tài xế"
                                            >
                                                Sửa Xe
                                            </button>
                                            <button 
                                                v-if="v.status !== 'ON_TRIP' && v.status !== 'DISABLED'"
                                                type="button"
                                                @click="toggleQuickStatus(v, 'DISABLED')" 
                                                class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                                title="Tạm ngưng khai thác xe"
                                            >
                                                Khóa
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600 gap-2">
                        <div class="flex items-center space-x-2">
                            <span>Hiển thị <b>{{ startIndex }}</b> - <b>{{ endIndex }}</b> trên tổng <b>{{ filteredVehicles.length }}</b> xe</span>
                            <span class="text-slate-300">|</span>
                            <span>Số dòng:</span>
                            <select 
                                v-model.number="pageSize" 
                                class="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-bold text-slate-700 focus:outline-none focus:border-blue-600 cursor-pointer"
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
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                            >
                                ‹
                            </button>
                            <button 
                                v-for="p in totalPages" 
                                :key="p"
                                @click="goToPage(p)"
                                :class="[
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer',
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
                                class="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                            >
                                ›
                            </button>
                        </div>
                    </div>
                </div>
                <teleport to="body">
                    <div v-if="showAddModal" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
                            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-bold text-slate-900 text-sm">Thêm Phương Tiện Vận Tải Mới</h3>
                                </div>
                                <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">&times;</button>
                            </div>
                            <form @submit.prevent="submitAddVehicle" class="space-y-3.5 mt-4 text-xs">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Biển Kiểm Soát *</label>
                                        <input v-model="addForm.vehiclePlate" type="text" placeholder="VD: 29H-999.88" required maxlength="20" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:bg-white outline-none" />
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Dòng Xe (Model) *</label>
                                        <input v-model="addForm.modelName" type="text" placeholder="VD: Isuzu Forward 5T" required maxlength="50" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Phân Loại Xe *</label>
                                        <select v-model="addForm.vehicleType" @change="handleTypeChangeInAdd" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white outline-none">
                                            <option v-for="t in vehicleTypes" :key="t.code" :value="t.code">{{ t.label }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Tải Trọng Tối Đa (kg) *</label>
                                        <input v-model.number="addForm.payloadCapacity" type="number" min="100" max="30000" step="100" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label class="block font-bold text-slate-700 mb-1">HUB Đỗ Ban Đầu *</label>
                                    <select v-model="addForm.currentHub" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-700 focus:bg-white outline-none">
                                        <option v-for="h in hubs" :key="h.code" :value="h.code">{{ h.label }}</option>
                                    </select>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Tài Xế Phụ Trách</label>
                                        <input v-model="addForm.assignedDriverName" type="text" placeholder="VD: Nguyễn Văn Nam" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white outline-none" />
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Số Điện Thoại Tài Xế</label>
                                        <input v-model="addForm.driverPhone" type="text" placeholder="VD: 0912.888.999" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button type="button" @click="showAddModal = false" class="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition cursor-pointer">Hủy</button>
                                    <button type="submit" :disabled="isSaving" class="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold transition shadow-xs cursor-pointer disabled:opacity-50">
                                        {{ isSaving ? 'Đang Lưu...' : 'Xác Nhận Thêm Xe' }}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </teleport>
                <teleport to="body">
                    <div v-if="showEditModal" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in duration-150">
                            <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                                        </svg>
                                    </div>
                                    <h3 class="font-bold text-slate-900 text-sm">Cập Nhật Thông Tin Xe: {{ editForm.vehiclePlate }}</h3>
                                </div>
                                <button @click="showEditModal = false" class="text-slate-400 hover:text-slate-600 text-sm cursor-pointer">&times;</button>
                            </div>
                            <form @submit.prevent="submitEditVehicle" class="space-y-3.5 mt-4 text-xs">
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Dòng Xe (Model)</label>
                                        <input v-model="editForm.modelName" type="text" required maxlength="50" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white outline-none" />
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Tải Trọng (kg)</label>
                                        <input v-model.number="editForm.payloadCapacity" type="number" min="100" max="30000" step="100" required class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">HUB Đỗ Hiện Tại</label>
                                        <select v-model="editForm.currentHub" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-700 focus:bg-white outline-none">
                                            <option v-for="h in hubs" :key="h.code" :value="h.code">{{ h.label }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Trạng Thái Xe</label>
                                        <select v-model="editForm.status" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold focus:bg-white outline-none">
                                            <option value="AVAILABLE">AVAILABLE - Sẵn sàng</option>
                                            <option value="ON_TRIP">ON_TRIP - Chạy tuyến</option>
                                            <option value="MAINTENANCE">MAINTENANCE - Bảo dưỡng</option>
                                            <option value="DISABLED">DISABLED - Vô hiệu hóa</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Tài Xế Phụ Trách</label>
                                        <input v-model="editForm.assignedDriverName" type="text" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:bg-white outline-none" />
                                    </div>
                                    <div>
                                        <label class="block font-bold text-slate-700 mb-1">Số Điện Thoại</label>
                                        <input v-model="editForm.driverPhone" type="text" class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white outline-none" />
                                    </div>
                                </div>
                                <div class="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button type="button" @click="showEditModal = false" class="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition cursor-pointer">Hủy</button>
                                    <button type="submit" :disabled="isSaving" class="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-bold transition shadow-xs cursor-pointer disabled:opacity-50">
                                        {{ isSaving ? 'Đang Lưu...' : 'Lưu Thay Đổi' }}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </teleport>
            </div>
        `
    };
    window.FleetView = FleetView;
})();
