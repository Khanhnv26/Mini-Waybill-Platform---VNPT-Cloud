/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: QUẢN LÝ & KHỞI TẠO BƯU GỬI (SHIPMENT MANAGEMENT & DISPATCH)
 * Tích Hợp 2 Subtabs: [Khởi Tạo Bưu Gửi] & [Danh Sách Vận Đơn] Chuẩn RBAC B2B
 * Thiết Kế Tối Giản (Minimal Icon), Tập Trung Dữ Liệu & Trải Nghiệm Doanh Nghiệp
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const ShipmentView = {
        name: 'ShipmentView',
        props: ['customerPrefill'],
        emits: ['created-shipment'],
        setup(props, { emit }) {
            // Trạng thái Subtab hiện thời: 'create' | 'list'
            const currentSubtab = ref('create');

            const isSubmitting = ref(false);
            const hubsList = ref([]);

            // Danh sách vận đơn & phân trang
            const shipmentsList = ref([]);
            const isLoadingShipments = ref(false);
            const shipmentSearchQuery = ref('');
            const selectedStatusFilter = ref('ALL');
            const currentPage = ref(1);
            const itemsPerPage = ref(10);

            const currentUser = typeof Auth !== 'undefined' ? Auth.getUser() : null;

            // Kiểm tra quyền xem toàn bộ đơn hàng của hệ thống
            const hasReadAllPermission = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ROLE_CS') || Auth.hasPermission('shipment:read_all');
            });

            // Kiểm tra quyền tạo đơn hộ cho khách hàng khác (RBAC module SHIPMENT)
            const canCreateForOthers = computed(() => {
                if (typeof Auth === 'undefined') return false;
                return Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ROLE_CS') || Auth.hasPermission('shipment:create_for_others');
            });

            // Form khởi tạo vận đơn
            const form = reactive({
                customerId: null,
                serviceType: 'EXPRESS',
                weight: 1.0,
                codAmount: 0,
                
                // Người gửi (Điểm tiếp nhận)
                senderName: currentUser?.fullName || 'Bưu chính Viễn thông VNPT',
                senderPhone: '',
                senderProvince: 'Hà Nội',
                senderDetail: '',

                // Người nhận (Điểm phát trả)
                receiverName: '',
                receiverPhone: '',
                receiverProvince: 'Hồ Chí Minh',
                receiverDetail: ''
            });

            // Hồ sơ khách hàng của tài khoản đang đăng nhập
            const myProfile = ref(null);
            const isLoadingProfile = ref(false);
            const showProfileModal = ref(false);
            const isSavingProfile = ref(false);
            const profileForm = reactive({
                fullName: '',
                phoneNumber: '',
                address: ''
            });

            // Danh sách khách hàng (cho Admin/CSKH tạo hộ hoặc lọc danh sách)
            const customersList = ref([]);
            const selectedCustomerFilter = ref('');

            const loadCustomersList = async () => {
                if (canCreateForOthers.value || hasReadAllPermission.value) {
                    try {
                        const data = await CustomerService.getAllCustomers();
                        customersList.value = Array.isArray(data) ? data : [];
                    } catch (e) {
                        console.error('[ShipmentView] Không thể tải danh bạ khách hàng:', e);
                    }
                }
            };

            const loadMyProfile = async () => {
                if (typeof Auth === 'undefined' || !Auth.isAuthenticated()) return;
                isLoadingProfile.value = true;
                try {
                    const prof = await CustomerService.getMyProfile();
                    if (prof) {
                        myProfile.value = prof;
                        profileForm.fullName = prof.fullName || '';
                        profileForm.phoneNumber = prof.phoneNumber || '';
                        profileForm.address = prof.address || '';

                        // Tự động điền thông tin người gửi nếu là khách gửi thông thường
                        if (!canCreateForOthers.value) {
                            if (prof.fullName) form.senderName = prof.fullName;
                            if (prof.phoneNumber) form.senderPhone = prof.phoneNumber;
                            if (prof.address) form.senderDetail = prof.address;
                        }
                    }
                } catch (err) {
                    console.warn('[ShipmentView] Chưa thể lấy hồ sơ khách hàng:', err.message);
                } finally {
                    isLoadingProfile.value = false;
                }
            };

            const handleUpdateProfile = async () => {
                if (!profileForm.fullName || !profileForm.phoneNumber || !profileForm.address) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng điền đủ họ tên, SĐT và địa chỉ', 'warning');
                    return;
                }
                isSavingProfile.value = true;
                try {
                    const updated = await CustomerService.updateMyProfile({
                        fullName: profileForm.fullName,
                        phoneNumber: profileForm.phoneNumber,
                        address: profileForm.address
                    });
                    myProfile.value = updated;
                    form.senderName = updated.fullName;
                    form.senderPhone = updated.phoneNumber;
                    form.senderDetail = updated.address;
                    showProfileModal.value = false;
                    Utils.showToast('Thành Công', 'Đã cập nhật hồ sơ khách hàng');
                } catch (err) {
                    Utils.showToast('Lỗi', err.message || 'Không thể cập nhật hồ sơ', 'error');
                } finally {
                    isSavingProfile.value = false;
                }
            };

            const onCustomerSelectChange = (event) => {
                const custVal = event?.target?.value;
                if (!custVal) return;
                const cust = customersList.value.find(c => c.id === Number(custVal));
                if (cust) {
                    form.customerId = cust.id;
                    if (cust.fullName) form.senderName = cust.fullName;
                    if (cust.phoneNumber) form.senderPhone = cust.phoneNumber;
                    if (cust.address) form.senderDetail = cust.address;
                }
            };

            // Tự động điền dữ liệu nếu nhận từ Danh Bạ Khách Hàng (Tác nghiệp Tạo Đơn Nhanh)
            watch(() => props.customerPrefill, (cust) => {
                if (cust) {
                    currentSubtab.value = 'create';
                    if (canCreateForOthers.value) {
                        form.customerId = cust.id;
                    }
                    form.senderName = cust.fullName || form.senderName;
                    form.senderPhone = cust.phoneNumber || form.senderPhone;
                    form.senderDetail = cust.address || form.senderDetail;
                    Utils.showToast('Đã Điền Dữ Liệu', `Đã gắn thông tin đối tác ${cust.fullName} vào đơn gửi`);
                }
            }, { immediate: true });

            // Danh mục chuẩn hóa tiếng Việt cho Hubs phòng ngừa lỗi font/encoding
            const standardHubInfo = {
                'HUB-HN-01': { hubName: 'Kho Tổng Hà Nội', province: 'Hà Nội' },
                'HUB-HP-01': { hubName: 'Kho Tổng Hải Phòng', province: 'Hải Phòng' },
                'HUB-DN-01': { hubName: 'Kho Tổng Đà Nẵng', province: 'Đà Nẵng' },
                'HUB-HCM-01': { hubName: 'Kho Tổng TP. Hồ Chí Minh', province: 'Hồ Chí Minh' },
                'HUB-CT-01': { hubName: 'Kho Tổng Cần Thơ', province: 'Cần Thơ' }
            };

            // Tải danh bạ bưu cục / Hubs từ database
            const loadHubs = async () => {
                try {
                    const hubs = await RoutingService.getAllHubs();
                    let list = [];
                    if (Array.isArray(hubs) && hubs.length > 0) {
                        list = hubs.map(h => {
                            const std = standardHubInfo[h.hubCode];
                            const safeHubName = (h.hubName && !h.hubName.includes('?')) ? h.hubName : (std?.hubName || h.hubName || 'Kho Tổng');
                            const safeProvince = (h.province && !h.province.includes('?')) ? h.province : (std?.province || h.province || 'Hà Nội');
                            return {
                                ...h,
                                hubName: safeHubName,
                                province: safeProvince
                            };
                        });
                    } else {
                        // Fallback danh mục bưu cục chuẩn
                        list = [
                            { id: 1, hubCode: 'HUB-HN-01', hubName: 'Kho Tổng Hà Nội', province: 'Hà Nội', latitude: 21.028511, longitude: 105.782000 },
                            { id: 2, hubCode: 'HUB-HP-01', hubName: 'Kho Tổng Hải Phòng', province: 'Hải Phòng', latitude: 20.844912, longitude: 106.688084 },
                            { id: 3, hubCode: 'HUB-DN-01', hubName: 'Kho Tổng Đà Nẵng', province: 'Đà Nẵng', latitude: 16.054407, longitude: 108.202167 },
                            { id: 4, hubCode: 'HUB-HCM-01', hubName: 'Kho Tổng TP. Hồ Chí Minh', province: 'Hồ Chí Minh', latitude: 10.823099, longitude: 106.629664 },
                            { id: 5, hubCode: 'HUB-CT-01', hubName: 'Kho Tổng Cần Thơ', province: 'Cần Thơ', latitude: 10.045162, longitude: 105.746857 }
                        ];
                    }

                    hubsList.value = list;
                    if (list.length >= 2) {
                        if (!form.senderProvince) form.senderProvince = list[0].province;
                        if (!form.receiverProvince) form.receiverProvince = list[1].province;
                    }
                    if (window.MapManager) {
                        window.MapManager.updateHubs(list);
                    }
                } catch (err) {
                    console.error('[ShipmentView] Lỗi tải Hubs:', err);
                    Utils.showToast('Cảnh Báo', 'Không tải được danh bạ bưu cục từ máy chủ', 'warning');
                }
            };

            // Tải danh sách vận đơn theo phân quyền người dùng
            const loadShipments = async () => {
                isLoadingShipments.value = true;
                try {
                    let customerIdParam = null;
                    if (hasReadAllPermission.value) {
                        if (selectedCustomerFilter.value) {
                            customerIdParam = Number(selectedCustomerFilter.value);
                        }
                    }
                    // Nếu là khách thông thường, customerIdParam = null. Backend sẽ dùng JWT để lấy đơn của khách
                    const data = await ShipmentService.getShipments(customerIdParam);
                    shipmentsList.value = Array.isArray(data) ? data : [];
                } catch (err) {
                    console.error('[ShipmentView] Lỗi tải danh sách vận đơn:', err);
                    Utils.showToast('Thông Báo', err.message || 'Không thể tải danh sách vận đơn', 'warning');
                } finally {
                    isLoadingShipments.value = false;
                }
            };

            // Chuyển đổi Subtab linh hoạt
            const switchSubtab = (tab) => {
                currentSubtab.value = tab;
                if (tab === 'list') {
                    loadShipments();
                }
            };

            // Lọc danh sách vận đơn theo Tìm kiếm & Trạng thái
            const filteredShipments = computed(() => {
                let list = shipmentsList.value || [];
                if (selectedStatusFilter.value && selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(s => s.currentStatus === selectedStatusFilter.value);
                }
                if (shipmentSearchQuery.value && shipmentSearchQuery.value.trim()) {
                    const q = shipmentSearchQuery.value.trim().toLowerCase();
                    list = list.filter(s => 
                        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                        (s.senderName && s.senderName.toLowerCase().includes(q)) ||
                        (s.senderPhone && s.senderPhone.includes(q)) ||
                        (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                        (s.receiverPhone && s.receiverPhone.includes(q)) ||
                        (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                    );
                }
                return list;
            });

            // Phân trang
            const totalPages = computed(() => Math.max(1, Math.ceil(filteredShipments.value.length / itemsPerPage.value)));

            const paginatedShipments = computed(() => {
                const start = (currentPage.value - 1) * itemsPerPage.value;
                return filteredShipments.value.slice(start, start + itemsPerPage.value);
            });

            watch([selectedStatusFilter, shipmentSearchQuery], () => {
                currentPage.value = 1;
            });

            // Chỉ số thống kê nhanh (KPI Metrics)
            const stats = computed(() => {
                const list = shipmentsList.value || [];
                const total = list.length;
                const inTransit = list.filter(s => 
                    ['ROUTE_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'ARRIVED_DEST_HUB'].includes(s.currentStatus)
                ).length;
                const delivered = list.filter(s => s.currentStatus === 'DELIVERED').length;
                const pending = list.filter(s => ['CREATED', 'PENDING_ROUTING'].includes(s.currentStatus)).length;
                const totalCod = list.reduce((acc, s) => acc + (Number(s.codAmount) || 0), 0);
                return { total, inTransit, delivered, pending, totalCod };
            });

            // Tính toán tạm tính cước phí thời gian thực (Live Fee Calculation)
            const baseFee = computed(() => {
                const w = Math.max(0.1, Number(form.weight) || 1);
                if (form.serviceType === 'EXPRESS') {
                    return Math.max(35000, Math.round(w * 22000));
                }
                return Math.max(20000, Math.round(w * 13000));
            });

            const codFee = computed(() => {
                const cod = Number(form.codAmount) || 0;
                if (cod <= 0) return 0;
                return Math.max(10000, Math.round(cod * 0.01));
            });

            const fuelSurcharge = computed(() => {
                return Math.round(baseFee.value * 0.06);
            });

            const totalEstimatedFee = computed(() => {
                return baseFee.value + codFee.value + fuelSurcharge.value;
            });

            // Tìm Hub tương ứng theo tỉnh thành
            const senderHubName = computed(() => {
                const h = hubsList.value.find(x => x.province === form.senderProvince);
                if (h) {
                    const cleanName = (h.hubName && !h.hubName.includes('?')) ? h.hubName : (standardHubInfo[h.hubCode]?.hubName || `Kho Tổng ${h.province}`);
                    return `${cleanName} (${h.hubCode})`;
                }
                return `Bưu cục ${form.senderProvince || 'Hà Nội'}`;
            });

            const receiverHubName = computed(() => {
                const h = hubsList.value.find(x => x.province === form.receiverProvince);
                if (h) {
                    const cleanName = (h.hubName && !h.hubName.includes('?')) ? h.hubName : (standardHubInfo[h.hubCode]?.hubName || `Kho Tổng ${h.province}`);
                    return `${cleanName} (${h.hubCode})`;
                }
                return `Bưu cục ${form.receiverProvince || 'Hải Phòng'}`;
            });

            const resetForm = () => {
                form.serviceType = 'EXPRESS';
                form.weight = 1.0;
                form.codAmount = 0;
                form.receiverName = '';
                form.receiverPhone = '';
                form.receiverDetail = '';
                Utils.showToast('Làm Mới', 'Đã đặt lại biểu mẫu tạo vận đơn');
            };

            // Khởi tạo đơn và tự động điều hướng sang Danh Sách Vận Đơn
            const handleSubmit = async () => {
                if (canCreateForOthers.value && !form.customerId) {
                    Utils.showToast('Chưa Chọn Khách Hàng', 'Vui lòng chọn hoặc nhập mã khách hàng gửi', 'warning');
                    return;
                }
                if (!form.senderName || !form.senderPhone || !form.senderProvince || !form.senderDetail) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ Họ tên, SĐT, Tỉnh/Thành và Địa chỉ người gửi', 'warning');
                    return;
                }
                if (!form.receiverName || !form.receiverPhone || !form.receiverProvince || !form.receiverDetail) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng điền đầy đủ Họ tên, SĐT, Tỉnh/Thành và Địa chỉ người nhận', 'warning');
                    return;
                }

                isSubmitting.value = true;
                try {
                    const payload = {
                        requestId: 'REQ-' + Date.now(),
                        senderName: form.senderName,
                        senderPhone: form.senderPhone,
                        senderAddress: `${form.senderDetail}, ${form.senderProvince}`,
                        receiverName: form.receiverName,
                        receiverPhone: form.receiverPhone,
                        receiverAddress: `${form.receiverDetail}, ${form.receiverProvince}`,
                        serviceType: form.serviceType,
                        weight: Number(form.weight),
                        codAmount: Number(form.codAmount)
                    };

                    if (canCreateForOthers.value && form.customerId) {
                        payload.customerId = Number(form.customerId);
                    }

                    const res = await ShipmentService.createShipment(payload);
                    Utils.showToast('Thành Công', `Đã khởi tạo vận đơn: ${res.trackingCode}`);

                    // Reset thông tin người nhận
                    form.receiverName = '';
                    form.receiverPhone = '';
                    form.receiverDetail = '';

                    // Tự động chuyển sang Subtab Danh Sách Vận Đơn và nạp dữ liệu mới nhất
                    currentSubtab.value = 'list';
                    await loadShipments();
                } catch (err) {
                    Utils.showToast('Thất Bại', err.message, 'error');
                } finally {
                    isSubmitting.value = false;
                }
            };

            // Chuyển sang Tra Cứu Lộ Trình & Bản Đồ Leaflet
            const viewTracking = (trackingCode) => {
                emit('created-shipment', trackingCode);
            };

            onMounted(() => {
                loadHubs();
                loadShipments();
                loadMyProfile();
                loadCustomersList();
            });

            return {
                currentSubtab,
                switchSubtab,
                form,
                hubsList,
                isSubmitting,
                handleSubmit,
                resetForm,
                baseFee,
                codFee,
                fuelSurcharge,
                totalEstimatedFee,
                senderHubName,
                receiverHubName,
                currentUser,
                hasReadAllPermission,
                canCreateForOthers,
                myProfile,
                isLoadingProfile,
                showProfileModal,
                isSavingProfile,
                profileForm,
                handleUpdateProfile,
                customersList,
                selectedCustomerFilter,
                onCustomerSelectChange,
                shipmentsList,
                isLoadingShipments,
                shipmentSearchQuery,
                selectedStatusFilter,
                loadShipments,
                filteredShipments,
                paginatedShipments,
                currentPage,
                totalPages,
                itemsPerPage,
                stats,
                viewTracking,
                Utils
            };
        },
        template: `
            <div class="space-y-4 pb-8 text-slate-800">
                <!-- 1. HERO BANNER: CHUẨN VNPT GRADIENT ĐỒNG BỘ RBAC -->
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Logistics Dispatch &amp; Management
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Quản Trị Vận Đơn &amp; Khởi Tạo Bưu Gửi Ký Gửi
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Tiếp nhận yêu cầu gửi hàng, điều phối luồng luân chuyển bưu cục và kiểm soát trạng thái giao nhận toàn trình.
                            </p>
                        </div>

                        <!-- Thống kê nhanh KPI -->
                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ hubsList.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kho Tổng Hub</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                                <div class="text-sm sm:text-base font-bold leading-tight font-mono text-amber-300">{{ shipmentsList.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Bưu Gửi</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[80px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ Utils.formatCurrency(stats.totalCod) }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">COD Ký Gửi</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 2. THANH ĐIỀU HƯỚNG SUBTABS (TỐI GIẢN ICON) -->
                <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div class="flex items-center space-x-2">
                        <button 
                            type="button" 
                            @click="switchSubtab('create')"
                            :class="[
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all',
                                currentSubtab === 'create'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            ]"
                        >
                            Khởi Tạo Bưu Gửi Mới
                        </button>

                        <button 
                            type="button" 
                            @click="switchSubtab('list')"
                            :class="[
                                'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5',
                                currentSubtab === 'list'
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                            ]"
                        >
                            <span>Quản Lý Danh Sách Vận Đơn</span>
                            <span :class="currentSubtab === 'list' ? 'bg-white/25 text-white' : 'bg-blue-100 text-blue-700'" class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
                                {{ shipmentsList.length }}
                            </span>
                        </button>
                    </div>

                    <!-- Nút Tải Lại Nhanh Dữ Liệu -->
                    <div v-if="currentSubtab === 'list'" class="flex items-center space-x-2">
                        <button 
                            type="button"
                            @click="loadShipments"
                            :disabled="isLoadingShipments"
                            class="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition disabled:opacity-50 shadow-sm"
                        >
                            {{ isLoadingShipments ? 'Đang Tải...' : 'Làm Mới' }}
                        </button>
                    </div>
                </div>

                <!-- ============================================================ -->
                <!-- SUBTAB 1: KHỞI TẠO BƯU GỬI (DISPATCH FORM)                   -->
                <!-- ============================================================ -->
                <div v-show="currentSubtab === 'create'" class="space-y-3">
                    <!-- Cảnh Báo Hồ Sơ Người Gửi Thiếu Thông Tin (Dành cho tài khoản khách hàng thông thường) -->
                    <div v-if="!canCreateForOthers && myProfile && (!myProfile.phoneNumber || !myProfile.address)" class="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 shadow-sm">
                        <div class="flex items-center space-x-2">
                            <span class="font-bold">Lưu ý:</span>
                            <span>Hồ sơ người gửi của bạn chưa đầy đủ Số điện thoại hoặc Địa chỉ tiếp nhận. Vui lòng cập nhật để tạo đơn thuận tiện hơn.</span>
                        </div>
                        <button type="button" @click="showProfileModal = true" class="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition shadow-sm whitespace-nowrap self-start sm:self-auto">
                            Cập Nhật Hồ Sơ
                        </button>
                    </div>

                    <form @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <!-- CỘT TRÁI (2/3): FORM TIẾP NHẬN 2 KHỐI -->
                        <div class="lg:col-span-2 space-y-4">
                            <!-- KHỐI 1: THÔNG SỐ DỊCH VỤ & HÀNG HÓA -->
                            <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3.5">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div class="flex items-center space-x-2">
                                        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                        <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                            1. Thông Số Dịch Vụ &amp; Bưu Phẩm Ký Gửi
                                        </span>
                                    </div>
                                    <span class="text-[11px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                        Bước 1/2
                                    </span>
                                </div>

                                <div class="grid grid-cols-1 sm:grid-cols-4 gap-3.5 pt-1">
                                    <!-- Mã Khách Hàng / Hồ Sơ Gửi Hàng -->
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                                            <span v-if="canCreateForOthers">Khách Hàng Ký Gửi (Tạo Hộ) <span class="text-rose-500">*</span></span>
                                            <span v-else>Tài Khoản Ký Gửi</span>
                                        </label>
                                        <div v-if="canCreateForOthers">
                                            <select 
                                                v-if="customersList.length > 0"
                                                v-model.number="form.customerId" 
                                                @change="onCustomerSelectChange($event)"
                                                required 
                                                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                            >
                                                <option :value="null" disabled>-- Chọn khách hàng --</option>
                                                <option v-for="c in customersList" :key="c.id" :value="c.id">
                                                    #{{ c.id }} - {{ c.fullName }} ({{ c.phoneNumber || c.customerCode || 'Chưa có SĐT' }})
                                                </option>
                                            </select>
                                            <input 
                                                v-else
                                                v-model.number="form.customerId" 
                                                type="number" 
                                                required 
                                                placeholder="Mã KH: 1, 2..."
                                                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>
                                        <div v-else class="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                                            <div class="truncate">
                                                <span class="font-bold text-blue-700">{{ myProfile?.fullName || currentUser?.fullName || 'Khách Hàng' }}</span>
                                                <span v-if="myProfile?.customerCode" class="ml-1 text-[10px] font-mono text-slate-500">({{ myProfile.customerCode }})</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                @click="showProfileModal = true" 
                                                class="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline ml-2 whitespace-nowrap"
                                            >
                                                Sửa hồ sơ
                                            </button>
                                        </div>
                                    </div>

                                    <!-- Loại Dịch Vụ -->
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Dịch Vụ Vận Chuyển</label>
                                        <select 
                                            v-model="form.serviceType" 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                        >
                                            <option value="EXPRESS">Chuyển phát hỏa tốc (Express 24h)</option>
                                            <option value="STANDARD">Chuyển phát tiêu chuẩn (Standard)</option>
                                        </select>
                                    </div>

                                    <!-- Khối Lượng -->
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">
                                            Khối Lượng (kg) <span class="text-rose-500">*</span>
                                        </label>
                                        <input 
                                            v-model.number="form.weight" 
                                            type="number" 
                                            step="0.1" 
                                            min="0.1" 
                                            required 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                        />
                                    </div>

                                    <!-- Thu Hộ COD -->
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-700 mb-1">Tiền Thu Hộ COD (VNĐ)</label>
                                        <input 
                                            v-model.number="form.codAmount" 
                                            type="number" 
                                            step="1000" 
                                            min="0" 
                                            required 
                                            class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <!-- KHỐI 2: TUYẾN GỬI & NHẬN (2 CỘT TIẾP NHẬN - PHÁT TRẢ) -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- Bên Gửi (Tiếp Nhận) -->
                                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div class="flex items-center space-x-2">
                                            <span class="w-2 h-2 rounded-full bg-slate-800"></span>
                                            <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                                2. Thông Tin Người Gửi
                                            </span>
                                        </div>
                                        <span class="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                                            Điểm Xuất Phát
                                        </span>
                                    </div>

                                    <div class="space-y-2.5 pt-0.5">
                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Họ Tên Cá Nhân / Doanh Nghiệp Gửi</label>
                                            <input 
                                                v-model="form.senderName" 
                                                type="text" 
                                                required 
                                                placeholder="Tên người gửi..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Số Điện Thoại Liên Hệ</label>
                                            <input 
                                                v-model="form.senderPhone" 
                                                type="text" 
                                                required 
                                                placeholder="024... hoặc 09..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tỉnh / Thành Phố Tiếp Nhận (Hub)</label>
                                            <select 
                                                v-model="form.senderProvince" 
                                                required 
                                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                            >
                                                <option v-for="h in hubsList" :key="h.id" :value="h.province">
                                                    {{ h.province }} - {{ h.hubName }} ({{ h.hubCode }})
                                                </option>
                                                <option v-if="hubsList.length === 0" value="Hà Nội">Hà Nội (Mặc định)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Địa Chỉ Chi Tiết (Số nhà, phố, phường)</label>
                                            <textarea 
                                                v-model="form.senderDetail" 
                                                rows="2" 
                                                required 
                                                placeholder="VD: Số 57 Huỳnh Thúc Kháng, Đống Đa..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                <!-- Bên Nhận (Phát Trả) -->
                                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <div class="flex items-center space-x-2">
                                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                            <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                                3. Thông Tin Người Nhận
                                            </span>
                                        </div>
                                        <span class="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                            Điểm Phát Trả
                                        </span>
                                    </div>

                                    <div class="space-y-2.5 pt-0.5">
                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Họ Tên Người Nhận Hàng</label>
                                            <input 
                                                v-model="form.receiverName" 
                                                type="text" 
                                                required 
                                                placeholder="Tên cá nhân / Đơn vị nhận..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Số Điện Thoại Liên Hệ</label>
                                            <input 
                                                v-model="form.receiverPhone" 
                                                type="text" 
                                                required 
                                                placeholder="028... hoặc 09..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition" 
                                            />
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Tỉnh / Thành Phố Phát Trả (Hub)</label>
                                            <select 
                                                v-model="form.receiverProvince" 
                                                required 
                                                class="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                            >
                                                <option v-for="h in hubsList" :key="h.id" :value="h.province">
                                                    {{ h.province }} - {{ h.hubName }} ({{ h.hubCode }})
                                                </option>
                                                <option v-if="hubsList.length === 0" value="Hồ Chí Minh">TP. Hồ Chí Minh (Mặc định)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label class="block text-[11px] font-semibold text-slate-600 mb-1">Địa Chỉ Chi Tiết (Số nhà, phố, phường)</label>
                                            <textarea 
                                                v-model="form.receiverDetail" 
                                                rows="2" 
                                                required 
                                                placeholder="VD: Số 121 Pasteur, Phường 6, Quận 3..." 
                                                class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- CỘT PHẢI (1/3): THẺ TỔNG KẾT BIÊN NHẬN TẠM TÍNH & ĐỊNH TUYẾN -->
                        <div class="space-y-4">
                            <!-- Card Tóm Tắt Cước Phí -->
                            <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                    <div class="flex items-center space-x-2">
                                        <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                                            Biên Nhận Tạm Tính
                                        </span>
                                    </div>
                                    <span class="text-[10px] font-mono text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        LIVE RATE
                                    </span>
                                </div>

                                <!-- Chi tiết từng khoản phí -->
                                <div class="space-y-2 text-xs">
                                    <div class="flex justify-between py-1 border-b border-slate-50">
                                        <span class="text-slate-500">Cước chính ({{ form.weight }} kg):</span>
                                        <span class="font-mono font-bold text-slate-800">{{ Utils.formatCurrency(baseFee) }}</span>
                                    </div>
                                    <div class="flex justify-between py-1 border-b border-slate-50">
                                        <span class="text-slate-500">Phí thu hộ COD (1%):</span>
                                        <span class="font-mono font-bold" :class="codFee > 0 ? 'text-emerald-700' : 'text-slate-400'">
                                            {{ codFee > 0 ? Utils.formatCurrency(codFee) : '0 VNĐ (Miễn phí)' }}
                                        </span>
                                    </div>
                                    <div class="flex justify-between py-1 border-b border-slate-50">
                                        <span class="text-slate-500">Phụ phí xăng dầu &amp; an ninh:</span>
                                        <span class="font-mono font-bold text-slate-800">{{ Utils.formatCurrency(fuelSurcharge) }}</span>
                                    </div>

                                    <!-- Tổng tiền thanh toán -->
                                    <div class="pt-2 flex items-baseline justify-between">
                                        <div>
                                            <div class="text-[11px] font-bold text-slate-600 uppercase">Tổng Cước Ước Tính:</div>
                                            <div class="text-[10px] text-slate-400">Đã bao gồm thuế GTGT</div>
                                        </div>
                                        <div class="text-lg font-black font-mono text-blue-700">
                                            {{ Utils.formatCurrency(totalEstimatedFee) }}
                                        </div>
                                    </div>
                                </div>

                                <!-- Định tuyến bưu cục dự kiến -->
                                <div class="pt-2 border-t border-slate-100 space-y-2">
                                    <div class="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                        Tuyến Luân Chuyển Dự Kiến
                                    </div>

                                    <div class="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2 font-medium">
                                        <div class="flex items-center space-x-2 text-slate-700">
                                            <span class="w-2 h-2 rounded-full bg-slate-800"></span>
                                            <span class="truncate font-semibold">{{ senderHubName }}</span>
                                        </div>
                                        <div class="border-l-2 border-dashed border-blue-400 ml-1 pl-3 text-[10px] font-mono text-blue-600 py-0.5">
                                            {{ form.serviceType === 'EXPRESS' ? 'Chuyển phát Hỏa Tốc (~24h)' : 'Chuyển phát Đường Bộ (~48-72h)' }}
                                        </div>
                                        <div class="flex items-center space-x-2 text-blue-700">
                                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                            <span class="truncate font-semibold">{{ receiverHubName }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Cụm nút hành động -->
                                <div class="pt-2 space-y-2">
                                    <button 
                                        type="submit" 
                                        :disabled="isSubmitting"
                                        class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
                                    >
                                        <span v-if="isSubmitting" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                        <span>{{ isSubmitting ? 'Đang Định Tuyến Bưu Cục...' : 'Xác Nhận & Xuất Vận Đơn' }}</span>
                                    </button>

                                    <button 
                                        type="button" 
                                        @click="resetForm" 
                                        class="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition text-center"
                                    >
                                        Đặt Lại Biểu Mẫu
                                    </button>
                                </div>
                            </div>

                            <!-- Thẻ Ghi Chú Quy Chuẩn Bưu Chính -->
                            <div class="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-[11px] text-blue-900 leading-relaxed space-y-1">
                                <div class="font-bold">
                                    Chính Sách Bưu Gửi VNPT
                                </div>
                                <p class="text-slate-600 text-[10.5px]">
                                    Vận đơn sau khi khởi tạo sẽ tự động sinh mã vạch Code128, kích hoạt điều phối OSRM trên toàn quốc và thông báo tin nhắn xác nhận cho khách hàng.
                                </p>
                            </div>
                        </div>
                    </form>
                </div>

                <!-- ============================================================ -->
                <!-- SUBTAB 2: QUẢN LÝ DANH SÁCH VẬN ĐƠN (WAYBILL MANAGEMENT)     -->
                <!-- ============================================================ -->
                <div v-show="currentSubtab === 'list'" class="space-y-4">
                    <!-- 1. CÁC THẺ KPI METRICS TỔNG QUAN (TỐI GIẢN ICON) -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <!-- Thẻ 1: Tổng đơn -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                            <div class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Tổng Bưu Gửi</div>
                            <div class="mt-1.5 text-2xl font-black font-mono text-slate-800">{{ stats.total }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Tổng số đơn ký gửi</div>
                        </div>

                        <!-- Thẻ 2: Chờ lấy / Tiếp nhận -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                            <div class="text-[11px] font-bold text-amber-600 uppercase tracking-wide">Chờ Xử Lý</div>
                            <div class="mt-1.5 text-2xl font-black font-mono text-amber-600">{{ stats.pending }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Chờ tiếp nhận &amp; định tuyến</div>
                        </div>

                        <!-- Thẻ 3: Đang luân chuyển -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                            <div class="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">Đang Luân Chuyển</div>
                            <div class="mt-1.5 text-2xl font-black font-mono text-indigo-600">{{ stats.inTransit }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Trung chuyển qua các Hub</div>
                        </div>

                        <!-- Thẻ 4: Phát thành công -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                            <div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">Phát Thành Công</div>
                            <div class="mt-1.5 text-2xl font-black font-mono text-emerald-600">{{ stats.delivered }}</div>
                            <div class="text-[10px] text-slate-400 mt-0.5">Giao thành công người nhận</div>
                        </div>
                    </div>

                    <!-- 2. TOOLBAR: TÌM KIẾM & BỘ LỌC TRẠNG THÁI (TỐI GIẢN ICON) -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm">
                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <!-- Ô tìm kiếm đơn giản -->
                            <div class="relative flex-1">
                                <input 
                                    v-model="shipmentSearchQuery"
                                    type="text"
                                    placeholder="Tìm kiếm theo mã vận đơn, người gửi, người nhận, SĐT..."
                                    class="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                />
                                <button 
                                    v-if="shipmentSearchQuery" 
                                    @click="shipmentSearchQuery = ''"
                                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 font-medium"
                                >
                                    Xóa
                                </button>
                            </div>

                            <!-- Dropdown Lọc Trạng Thái, Khách Hàng & Nút Thao Tác -->
                            <div class="flex flex-wrap items-center gap-2">
                                <!-- Lọc theo Khách hàng (Dành cho Admin/CSKH có quyền xem tất cả) -->
                                <select 
                                    v-if="hasReadAllPermission && customersList.length > 0"
                                    v-model="selectedCustomerFilter"
                                    @change="loadShipments"
                                    class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                >
                                    <option value="">Tất cả khách hàng</option>
                                    <option v-for="c in customersList" :key="c.id" :value="c.id">
                                        #{{ c.id }} - {{ c.fullName }}
                                    </option>
                                </select>

                                <select 
                                    v-model="selectedStatusFilter"
                                    class="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                                >
                                    <option value="ALL">Tất cả trạng thái ({{ shipmentsList.length }})</option>
                                    <option value="PENDING_ROUTING">Chờ định tuyến bưu cục</option>
                                    <option value="ROUTE_ASSIGNED">Đã định tuyến luân chuyển</option>
                                    <option value="PICKED_UP">Đã lấy hàng từ người gửi</option>
                                    <option value="IN_TRANSIT">Đang vận chuyển liên tỉnh</option>
                                    <option value="OUT_FOR_DELIVERY">Đang chuyển phát</option>
                                    <option value="DELIVERED">Phát thành công</option>
                                    <option value="DELIVERY_FAILED">Giao không thành công</option>
                                </select>

                                <button 
                                    type="button"
                                    @click="switchSubtab('create')"
                                    class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm shadow-blue-500/20 whitespace-nowrap"
                                >
                                    + Tạo Đơn Mới
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 3. BẢNG DỮ LIỆU DANH SÁCH VẬN ĐƠN CHUẨN ENTERPRISE B2B -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <!-- Loading Bar -->
                        <div v-if="isLoadingShipments" class="p-8 text-center space-y-2">
                            <div class="inline-block animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                            <div class="text-xs font-medium text-slate-500">Đang đồng bộ danh sách vận đơn từ máy chủ...</div>
                        </div>

                        <!-- Empty State (Không dùng icon cồng kềnh) -->
                        <div v-else-if="filteredShipments.length === 0" class="p-10 text-center space-y-2">
                            <div class="text-xs font-bold text-slate-700">Không tìm thấy vận đơn nào phù hợp</div>
                            <p class="text-[11px] text-slate-400 max-w-sm mx-auto">
                                Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc bộ lọc trạng thái đơn hàng.
                            </p>
                            <div class="pt-2">
                                <button 
                                    type="button" 
                                    @click="switchSubtab('create')" 
                                    class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                                >
                                    Khởi Tạo Bưu Gửi Ngay
                                </button>
                            </div>
                        </div>

                        <!-- Data Table -->
                        <div v-else class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                                        <th class="py-3 px-3.5">Mã Bưu Gửi / Loại</th>
                                        <th class="py-3 px-3.5">Người Gửi (Tiếp Nhận)</th>
                                        <th class="py-3 px-3.5">Người Nhận (Phát Trả)</th>
                                        <th class="py-3 px-3.5">Khối Lượng &amp; COD</th>
                                        <th class="py-3 px-3.5">Trạng Thái Toàn Trình</th>
                                        <th class="py-3 px-3.5">Thời Gian Tạo</th>
                                        <th class="py-3 px-3.5 text-right">Thao Tác</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-xs">
                                    <tr 
                                        v-for="s in paginatedShipments" 
                                        :key="s.id"
                                        class="hover:bg-blue-50/40 transition-colors"
                                    >
                                        <!-- Mã Bưu Gửi -->
                                        <td class="py-3 px-3.5">
                                            <div class="flex items-center space-x-1.5">
                                                <span 
                                                    @click="viewTracking(s.trackingCode)"
                                                    class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer tracking-tight"
                                                    title="Bấm để xem chi tiết lộ trình"
                                                >
                                                    {{ s.trackingCode }}
                                                </span>
                                            </div>
                                            <div class="flex items-center space-x-1.5 mt-0.5">
                                                <span 
                                                    :class="s.serviceType === 'EXPRESS' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'"
                                                    class="px-1.5 py-0.5 rounded text-[10px] font-bold border"
                                                >
                                                    {{ s.serviceType === 'EXPRESS' ? 'HỎA TỐC' : 'TIÊU CHUẨN' }}
                                                </span>
                                                <span class="text-[10px] font-mono text-slate-400">#KH:{{ s.customerId }}</span>
                                            </div>
                                        </td>

                                        <!-- Người Gửi -->
                                        <td class="py-3 px-3.5 max-w-[200px]">
                                            <div class="font-bold text-slate-800 truncate">{{ s.senderName }}</div>
                                            <div class="text-[11px] font-mono text-slate-500">{{ s.senderPhone }}</div>
                                            <div class="text-[10px] text-slate-400 truncate" :title="s.senderAddress">
                                                {{ s.senderAddress }}
                                            </div>
                                        </td>

                                        <!-- Người Nhận -->
                                        <td class="py-3 px-3.5 max-w-[220px]">
                                            <div class="font-bold text-slate-800 truncate">{{ s.receiverName }}</div>
                                            <div class="text-[11px] font-mono text-slate-500">{{ s.receiverPhone }}</div>
                                            <div class="text-[10px] text-slate-400 truncate" :title="s.receiverAddress">
                                                {{ s.receiverAddress }}
                                            </div>
                                        </td>

                                        <!-- Khối Lượng & COD -->
                                        <td class="py-3 px-3.5 whitespace-nowrap">
                                            <div class="font-mono font-bold text-xs" :class="s.codAmount > 0 ? 'text-emerald-600' : 'text-slate-500'">
                                                {{ Utils.formatCurrency(s.codAmount) }}
                                            </div>
                                            <div class="text-[11px] font-mono text-slate-500">
                                                KL: <span class="font-semibold text-slate-700">{{ s.weight }} kg</span>
                                            </div>
                                        </td>

                                        <!-- Trạng Thái -->
                                        <td class="py-3 px-3.5 whitespace-nowrap">
                                            <span 
                                                :class="['inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border', Utils.getStatusBadgeClass(s.currentStatus)]"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80"></span>
                                                {{ Utils.formatStatusText(s.currentStatus) }}
                                            </span>
                                        </td>

                                        <!-- Thời Gian Tạo -->
                                        <td class="py-3 px-3.5 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                            {{ Utils.formatTime(s.createdAt) }}
                                        </td>

                                        <!-- Thao Tác (Nút text tối giản, không icon) -->
                                        <td class="py-3 px-3.5 text-right whitespace-nowrap">
                                            <button 
                                                type="button"
                                                @click="viewTracking(s.trackingCode)"
                                                class="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-xs font-bold transition-all border border-blue-200 hover:border-blue-600 shadow-sm"
                                                title="Mở bản đồ định tuyến và giám sát vận trình"
                                            >
                                                Xem Lộ Trình
                                            </button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- 4. PHÂN TRANG (PAGINATION) -->
                        <div v-if="filteredShipments.length > 0" class="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                            <div>
                                Hiển thị <span class="font-bold text-slate-700">{{ paginatedShipments.length }}</span> / <span class="font-bold text-slate-700">{{ filteredShipments.length }}</span> vận đơn (Trang {{ currentPage }} / {{ totalPages }})
                            </div>
                            <div class="flex items-center space-x-1.5">
                                <button 
                                    type="button"
                                    @click="currentPage = Math.max(1, currentPage - 1)"
                                    :disabled="currentPage === 1"
                                    class="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-semibold transition disabled:opacity-40 disabled:hover:bg-white"
                                >
                                    Trước
                                </button>
                                <span class="px-2 py-1 font-mono font-bold text-slate-700">
                                    {{ currentPage }}
                                </span>
                                <button 
                                    type="button"
                                    @click="currentPage = Math.min(totalPages, currentPage + 1)"
                                    :disabled="currentPage === totalPages"
                                    class="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md font-semibold transition disabled:opacity-40 disabled:hover:bg-white"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- MODAL CẬP NHẬT HỒ SƠ KHÁCH HÀNG (GET/PUT /api/customers/me) -->
                <div v-if="showProfileModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div class="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 class="text-sm font-bold text-slate-800">Cập Nhật Hồ Sơ Gửi Hàng</h3>
                                <p class="text-[11px] text-slate-500 mt-0.5">Thông tin này được dùng làm địa chỉ người gửi mặc định</p>
                            </div>
                            <button type="button" @click="showProfileModal = false" class="text-slate-400 hover:text-slate-600 text-lg font-bold p-1">&times;</button>
                        </div>

                        <form @submit.prevent="handleUpdateProfile" class="space-y-3">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Họ Và Tên / Tên Doanh Nghiệp <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="profileForm.fullName" 
                                    type="text" 
                                    required 
                                    placeholder="VD: Nguyễn Văn A"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                                />
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Số Điện Thoại Liên Hệ <span class="text-rose-500">*</span></label>
                                <input 
                                    v-model="profileForm.phoneNumber" 
                                    type="text" 
                                    required 
                                    placeholder="VD: 0912345678"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                                />
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Địa Chỉ Chi Tiết (Số nhà, đường, phường/xã) <span class="text-rose-500">*</span></label>
                                <textarea 
                                    v-model="profileForm.address" 
                                    rows="2" 
                                    required 
                                    placeholder="VD: 57 Huỳnh Thúc Kháng, Láng Hạ, Đống Đa, Hà Nội"
                                    class="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none" 
                                ></textarea>
                            </div>

                            <div class="pt-2 flex items-center justify-end space-x-2">
                                <button 
                                    type="button" 
                                    @click="showProfileModal = false" 
                                    class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                                >
                                    Hủy Bỏ
                                </button>
                                <button 
                                    type="submit" 
                                    :disabled="isSavingProfile" 
                                    class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                                >
                                    {{ isSavingProfile ? 'Đang Lưu...' : 'Lưu Hồ Sơ' }}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `
    };

    window.ShipmentView = ShipmentView;
})();
