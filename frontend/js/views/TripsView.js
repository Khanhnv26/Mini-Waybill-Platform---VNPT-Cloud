/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: ĐIỀU PHỐI CHUYẾN XE TRỤC (LINEHAUL TRIPS VIEW)
 * Không icon, tối giản chuẩn Enterprise B2B
 * Bản đồ đồng bộ chuẩn xác với bản đồ đơn hàng (Google Maps hl=vi, Leaflet, OSRM)
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, onMounted, nextTick, watch } = Vue;

    const PRESET_ROUTES = [
        {
            name: 'Trục Bắc Nam (Hà Nội - Đà Nẵng - TP.HCM)',
            originHub: 'HUB-HN-01',
            stops: ['HUB-HN-01', 'HUB-DN-01', 'HUB-HCM-01']
        },
        {
            name: 'Trục Miền Bắc (Hà Nội - Hải Phòng)',
            originHub: 'HUB-HN-01',
            stops: ['HUB-HN-01', 'HUB-HP-01']
        },
        {
            name: 'Trục Miền Nam (TP.HCM - Cần Thơ)',
            originHub: 'HUB-HCM-01',
            stops: ['HUB-HCM-01', 'HUB-CT-01']
        }
    ];

    const PRESET_FEEDER_ROUTES = [
        {
            name: 'Gom Hàng Hà Nội (Cầu Giấy - Đống Đa ➔ Kho Tổng)',
            originHub: 'POST-HN-CG',
            stops: ['POST-HN-CG', 'POST-HN-DDA', 'HUB-HN-01']
        },
        {
            name: 'Phát Trả Hà Nội (Kho Tổng ➔ Cầu Giấy - Đống Đa)',
            originHub: 'HUB-HN-01',
            stops: ['HUB-HN-01', 'POST-HN-CG', 'POST-HN-DDA']
        },
        {
            name: 'Gom Hàng TP.HCM (Quận 1 - Bình Thạnh ➔ Kho Tổng)',
            originHub: 'POST-HCM-Q1',
            stops: ['POST-HCM-Q1', 'POST-HCM-BT', 'HUB-HCM-01']
        },
        {
            name: 'Phát Trả TP.HCM (Kho Tổng ➔ Q.1 - Bình Thạnh)',
            originHub: 'HUB-HCM-01',
            stops: ['HUB-HCM-01', 'POST-HCM-Q1', 'POST-HCM-BT']
        },
        {
            name: 'Gom Hàng Đà Nẵng (Hải Châu - Sơn Trà ➔ Kho Tổng)',
            originHub: 'POST-DN-HC',
            stops: ['POST-DN-HC', 'POST-DN-ST', 'HUB-DN-01']
        },
        {
            name: 'Phát Trả Đà Nẵng (Kho Tổng ➔ Hải Châu - Sơn Trà)',
            originHub: 'HUB-DN-01',
            stops: ['HUB-DN-01', 'POST-DN-HC', 'POST-DN-ST']
        }
    ];

    const HUB_COORDINATES = {
        // 5 KHO TỔNG CẤP 1 (SUPER HUBS / CENTRAL HUBS)
        'HUB-HN-01': { 
            name: 'Kho Tổng Hà Nội', 
            address: 'Lô 12-A, KCN Minh Khai, Phường Minh Khai, Quận Bắc Từ Liêm, Hà Nội',
            province: 'Hà Nội',
            district: 'Bắc Từ Liêm',
            lat: 21.028511, 
            lng: 105.782000, 
            level: 1 
        },
        'HUB-HP-01': { 
            name: 'Kho Tổng Hải Phòng', 
            address: 'Số 5 Đường Lê Hồng Phong, Phường Đằng Lâm, Quận Hải An, Hải Phòng',
            province: 'Hải Phòng',
            district: 'Hải An',
            lat: 20.844912, 
            lng: 106.688084, 
            level: 1 
        },
        'HUB-DN-01': { 
            name: 'Kho Tổng Đà Nẵng', 
            address: 'Đường số 3, KCN Hòa Khánh, Phường Hòa Khánh Bắc, Quận Liên Chiểu, Đà Nẵng',
            province: 'Đà Nẵng',
            district: 'Liên Chiểu',
            lat: 16.054407, 
            lng: 108.202167, 
            level: 1 
        },
        'HUB-HCM-01': { 
            name: 'Kho Tổng TP. Hồ Chí Minh', 
            address: 'Số 270 Lý Thường Kiệt, Phường 6, Quận Tân Bình, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Tân Bình',
            lat: 10.823099, 
            lng: 106.629664, 
            level: 1 
        },
        'HUB-CT-01': { 
            name: 'Kho Tổng Cần Thơ', 
            address: 'KCN Hưng Phú 1, Phường Hưng Phú, Quận Cái Răng, Cần Thơ',
            province: 'Cần Thơ',
            district: 'Cái Răng',
            lat: 10.045162, 
            lng: 105.746857, 
            level: 1 
        },

        // 17 BƯU CỤC PHÁT CẤP 2/3 (SUB-HUBS / LOCAL POST OFFICES)
        // [Hà Nội]
        'POST-HN-CG': { 
            name: 'Bưu Cục Cầu Giấy', 
            address: 'Số 165 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
            province: 'Hà Nội',
            district: 'Cầu Giấy',
            lat: 21.036200, 
            lng: 105.790600, 
            level: 2, 
            parent: 'HUB-HN-01' 
        },
        'POST-HN-DDA': { 
            name: 'Bưu Cục Đống Đa', 
            address: 'Số 36 Tây Sơn, Phường Quang Trung, Quận Đống Đa, Hà Nội',
            province: 'Hà Nội',
            district: 'Đống Đa',
            lat: 21.018100, 
            lng: 105.829900, 
            level: 2, 
            parent: 'HUB-HN-01' 
        },
        'POST-HN-HBT': { 
            name: 'Bưu Cục Hai Bà Trưng', 
            address: 'Số 236 Lạc Trung, Phường Vĩnh Tuy, Quận Hai Bà Trưng, Hà Nội',
            province: 'Hà Nội',
            district: 'Hai Bà Trưng',
            lat: 21.006900, 
            lng: 105.852400, 
            level: 2, 
            parent: 'HUB-HN-01' 
        },
        'POST-HN-TX': { 
            name: 'Bưu Cục Thanh Xuân', 
            address: 'Số 18 Nguyễn Trãi, Phường Thượng Đình, Quận Thanh Xuân, Hà Nội',
            province: 'Hà Nội',
            district: 'Thanh Xuân',
            lat: 20.993700, 
            lng: 105.807800, 
            level: 2, 
            parent: 'HUB-HN-01' 
        },
        'POST-HN-HD': { 
            name: 'Bưu Cục Hà Đông', 
            address: 'Số 4 Quang Trung, Phường Yết Kiêu, Quận Hà Đông, Hà Nội',
            province: 'Hà Nội',
            district: 'Hà Đông',
            lat: 20.971200, 
            lng: 105.776600, 
            level: 2, 
            parent: 'HUB-HN-01' 
        },

        // [TP. Hồ Chí Minh]
        'POST-HCM-Q1': { 
            name: 'Bưu Cục Bến Nghé (Quận 1)', 
            address: 'Số 2 Công Xã Paris, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Quận 1',
            lat: 10.776900, 
            lng: 106.700900, 
            level: 2, 
            parent: 'HUB-HCM-01' 
        },
        'POST-HCM-TB': { 
            name: 'Bưu Cục Tân Bình', 
            address: 'Số 288 Hoàng Văn Thụ, Phường 4, Quận Tân Bình, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Tân Bình',
            lat: 10.799200, 
            lng: 106.653400, 
            level: 2, 
            parent: 'HUB-HCM-01' 
        },
        'POST-HCM-BT': { 
            name: 'Bưu Cục Bình Thạnh', 
            address: 'Số 364 Bạch Đằng, Phường 14, Quận Bình Thạnh, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Bình Thạnh',
            lat: 10.810600, 
            lng: 106.696100, 
            level: 2, 
            parent: 'HUB-HCM-01' 
        },
        'POST-HCM-TD': { 
            name: 'Bưu Cục TP. Thủ Đức', 
            address: 'Số 128 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Thủ Đức',
            lat: 10.849400, 
            lng: 106.771700, 
            level: 2, 
            parent: 'HUB-HCM-01' 
        },
        'POST-HCM-Q7': { 
            name: 'Bưu Cục Tân Phong (Quận 7)', 
            address: 'Số 1441 Huỳnh Tấn Phát, Phường Phú Mỹ, Quận 7, TP. Hồ Chí Minh',
            province: 'Hồ Chí Minh',
            district: 'Quận 7',
            lat: 10.732400, 
            lng: 106.708200, 
            level: 2, 
            parent: 'HUB-HCM-01' 
        },

        // [Đà Nẵng]
        'POST-DN-HC': { 
            name: 'Bưu Cục Hải Châu', 
            address: 'Số 4 Lê Duẩn, Phường Hải Châu 1, Quận Hải Châu, Đà Nẵng',
            province: 'Đà Nẵng',
            district: 'Hải Châu',
            lat: 16.067800, 
            lng: 108.220800, 
            level: 2, 
            parent: 'HUB-DN-01' 
        },
        'POST-DN-TK': { 
            name: 'Bưu Cục Thanh Khê', 
            address: 'Số 251 Điện Biên Phủ, Phường Chính Gián, Quận Thanh Khê, Đà Nẵng',
            province: 'Đà Nẵng',
            district: 'Thanh Khê',
            lat: 16.061300, 
            lng: 108.181200, 
            level: 2, 
            parent: 'HUB-DN-01' 
        },
        'POST-DN-ST': { 
            name: 'Bưu Cục Sơn Trà', 
            address: 'Số 1 Ngô Quyền, Phường Thọ Quang, Quận Sơn Trà, Đà Nẵng',
            province: 'Đà Nẵng',
            district: 'Sơn Trà',
            lat: 16.082500, 
            lng: 108.243100, 
            level: 2, 
            parent: 'HUB-DN-01' 
        },

        // [Hải Phòng]
        'POST-HP-NQ': { 
            name: 'Bưu Cục Ngô Quyền', 
            address: 'Số 147 Lương Khánh Thiện, Phường Cầu Đất, Quận Ngô Quyền, Hải Phòng',
            province: 'Hải Phòng',
            district: 'Ngô Quyền',
            lat: 20.856100, 
            lng: 106.699700, 
            level: 2, 
            parent: 'HUB-HP-01' 
        },
        'POST-HP-HB': { 
            name: 'Bưu Cục Hồng Bàng', 
            address: 'Số 5 Nguyễn Tri Phương, Phường Minh Khai, Quận Hồng Bàng, Hải Phòng',
            province: 'Hải Phòng',
            district: 'Hồng Bàng',
            lat: 20.865300, 
            lng: 106.671200, 
            level: 2, 
            parent: 'HUB-HP-01' 
        },

        // [Cần Thơ]
        'POST-CT-NK': { 
            name: 'Bưu Cục Ninh Kiều', 
            address: 'Số 2 Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ',
            province: 'Cần Thơ',
            district: 'Ninh Kiều',
            lat: 10.034200, 
            lng: 105.779700, 
            level: 2, 
            parent: 'HUB-CT-01' 
        },
        'POST-CT-CR': { 
            name: 'Bưu Cục Cái Răng', 
            address: 'Số 321 Quốc Lộ 1A, Phường Lê Bình, Quận Cái Răng, Cần Thơ',
            province: 'Cần Thơ',
            district: 'Cái Răng',
            lat: 10.003900, 
            lng: 105.753300, 
            level: 2, 
            parent: 'HUB-CT-01' 
        }
    };

    // Mạng lưới trạm chốt hành lang giao thông đường bộ nội địa Việt Nam (QL1A & Cao tốc Bắc - Nam CT01)
    // Ngăn chặn triệt để hiện tượng thuật toán OSRM bẻ lái cắt qua biên giới Lào hoặc Campuchia
    const VIETNAM_CORRIDOR_WAYPOINTS = [
        { name: 'Ninh Bình (CT01)', lat: 20.2506, lng: 105.9745 },
        { name: 'Thanh Hóa (QL1A)', lat: 19.8067, lng: 105.7852 },
        { name: 'Vinh (Nghệ An)', lat: 18.6796, lng: 105.6813 },
        { name: 'Hà Tĩnh (QL1A)', lat: 18.3560, lng: 105.9059 },
        { name: 'Đồng Hới (Quảng Bình)', lat: 17.4740, lng: 106.6225 },
        { name: 'Đông Hà (Quảng Trị)', lat: 16.8164, lng: 107.1005 },
        { name: 'Huế (QL1A)', lat: 16.4637, lng: 107.5905 },
        { name: 'Đà Nẵng (Hải Vân)', lat: 16.0544, lng: 108.2022 },
        { name: 'Quảng Ngãi (CT01)', lat: 15.1205, lng: 108.7923 },
        { name: 'Quy Nhơn (Bình Định)', lat: 13.7830, lng: 109.2197 },
        { name: 'Tuy Hòa (Phú Yên)', lat: 13.0882, lng: 109.3075 },
        { name: 'Nha Trang (Khánh Hòa)', lat: 12.2388, lng: 109.1967 },
        { name: 'Phan Rang (Ninh Thuận)', lat: 11.5658, lng: 108.9882 },
        { name: 'Phan Thiết (Bình Thuận)', lat: 10.9274, lng: 108.1021 },
        { name: 'Long Khánh (Đồng Nai)', lat: 10.9431, lng: 107.2410 }
    ];

    const buildVietnamRouteWaypoints = (stopCoords) => {
        if (!Array.isArray(stopCoords) || stopCoords.length <= 1) return stopCoords || [];
        const result = [];
        for (let i = 0; i < stopCoords.length - 1; i++) {
            const current = stopCoords[i];
            const next = stopCoords[i + 1];
            result.push(current);

            const isNorthToSouth = current.lat > next.lat;
            const minLat = Math.min(current.lat, next.lat);
            const maxLat = Math.max(current.lat, next.lat);

            // Tìm các điểm chốt hành lang nội địa nằm giữa 2 trạm dừng liên tiếp
            const intermediates = VIETNAM_CORRIDOR_WAYPOINTS.filter(wp => {
                return wp.lat > minLat + 0.35 && wp.lat < maxLat - 0.35;
            });

            if (isNorthToSouth) {
                intermediates.sort((a, b) => b.lat - a.lat);
            } else {
                intermediates.sort((a, b) => a.lat - b.lat);
            }

            intermediates.forEach(wp => result.push(wp));
        }
        result.push(stopCoords[stopCoords.length - 1]);
        return result;
    };

    const TripsView = {
        name: 'TripsView',
        props: {
            embedded: {
                type: Boolean,
                default: false
            },
            currentStation: {
                type: String,
                default: 'ALL'
            }
        },
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const tripsList = ref([]);
            const hubsList = ref([]);
            const isLoading = ref(false);
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');
            const tripDirectionTab = ref('OUTBOUND'); // 'OUTBOUND' | 'INBOUND'
            const selectedStationHub = ref(props.currentStation || 'ALL');
            // Quy trình 3 bước trực quan: 1. Gom hàng bưu cục, 2. Xe trục liên tỉnh, 3. Phát hàng bưu cục
            const currentStep = ref(1);

            // Chế độ vận tải: XE TRỤC (LINEHAUL) vs XE TRUNG CHUYỂN (FEEDER)
            const transportMode = ref('LINEHAUL'); // 'LINEHAUL' | 'FEEDER'
            const feederDirectionTab = ref('OUTBOUND'); // 'OUTBOUND' | 'INBOUND' | 'TRIPS'
            const feederVehiclePlate = ref('29C-556.12 (Tải 1.5T)');
            const feederDriverName = ref('Vũ Văn Gom');
            const selectedFeederStation = ref('ALL');
            const shipmentsList = ref([]);
            const isLoadingShipments = ref(false);
            const isFeederActionRunning = ref(false);

            const getOriginPostOfficeInfo = (item) => {
                if (!item) return { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy' };
                if (item.originPostOffice) {
                    const name = HUB_COORDINATES[item.originPostOffice]?.name || item.originPostOffice;
                    return { code: item.originPostOffice, name };
                }
                if (item.senderAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.senderAddress);
                    if (found) return { code: found.code, name: found.name };
                }
                return { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy' };
            };

            const getDestPostOfficeInfo = (item) => {
                if (!item) return { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu' };
                if (item.destPostOffice) {
                    const name = HUB_COORDINATES[item.destPostOffice]?.name || item.destPostOffice;
                    return { code: item.destPostOffice, name };
                }
                if (item.receiverAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.receiverAddress);
                    if (found) return { code: found.code, name: found.name };
                }
                return { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu' };
            };

            const loadShipmentsData = async () => {
                try {
                    isLoadingShipments.value = true;
                    const data = await ShipmentService.getAll();
                    shipmentsList.value = Array.isArray(data) ? data : [];
                } catch (err) {
                    console.error('[TripsView] Lỗi nạp bưu gửi:', err);
                } finally {
                    isLoadingShipments.value = false;
                }
            };

            // Danh sách các đơn chờ gom xe trung chuyển lên Hub (Xe Đi)
            const pendingFeederItems = computed(() => {
                return shipmentsList.value.filter(s => {
                    if (s.currentStatus !== 'PICKED_UP') return false;
                    if (selectedFeederStation.value === 'ALL') return true;
                    return (s.locationCode === selectedFeederStation.value) || (getOriginPostOfficeInfo(s).code === selectedFeederStation.value);
                });
            });

            const totalFeederWeight = computed(() => {
                return pendingFeederItems.value.reduce((acc, cur) => acc + (cur.weight || 0), 0);
            });

            // Danh sách các đơn xe trung chuyển từ Kho Tổng đang về Bưu cục (Xe Đến)
            // ĐỒNG BỘ CHẶT CHẼ VỚI XE TRỤC CONTAINER LIÊN TỈNH:
            // Chỉ hiển thị các đơn mà xe trục đã cập bến và dỡ hàng tại Kho Tổng Đích (ARRIVED_DEST_HUB tại Kho Tổng)
            // Tuyệt đối không cho phép nhập kho bưu cục khi xe trục container vẫn đang chạy trên đường (IN_TRANSIT)
            const incomingFeederItems = computed(() => {
                return shipmentsList.value.filter(s => {
                    const destPO = getDestPostOfficeInfo(s).code;
                    const isForThisPO = (selectedFeederStation.value === 'ALL') || (destPO === selectedFeederStation.value);
                    if (!isForThisPO) return false;
                    const loc = (s.locationCode || '').toUpperCase();
                    const alreadyAtPO = loc.startsWith('POST-') && s.currentStatus === 'ARRIVED_DEST_HUB';
                    if (alreadyAtPO || s.currentStatus === 'OUT_FOR_DELIVERY' || s.currentStatus === 'DELIVERED') return false;

                    // Bưu phẩm phải thực tế đã dỡ tại Kho Tổng Đích (xe trục đã cập bến Kho Tổng)
                    const targetDestHub = (s.destinationHub || '').toUpperCase();
                    const isUnloadedAtDestHub = s.currentStatus === 'ARRIVED_DEST_HUB' && (loc === targetDestHub || loc.startsWith('HUB-'));
                    return isUnloadedAtDestHub;
                });
            });

            const totalIncomingFeederWeight = computed(() => {
                return incomingFeederItems.value.reduce((acc, cur) => acc + (cur.weight || 0), 0);
            });

            // Xuất xe gom trung chuyển cho 1 đơn cụ thể
            const handleDispatchFeederItem = async (item) => {
                const poInfo = getOriginPostOfficeInfo(item);
                const targetHub = item.sourceHub || 'HUB-HN-01';
                const plate = feederVehiclePlate.value.trim() || '29C-556.12';
                const driver = feederDriverName.value.trim() || 'Vũ Văn Gom';
                const note = `Xe trung chuyển nội đô (BKS: ${plate}, Lái xe: ${driver}) gom hàng rời bưu cục ${poInfo.name} (${poInfo.code}) chuyển tiếp lên Kho Tổng ${targetHub}`;
                isFeederActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(item.trackingCode, 'IN_TRANSIT', targetHub, note);
                    item.currentStatus = 'IN_TRANSIT';
                    item.locationCode = targetHub;
                    Utils.showToast('Xuất Bến Thành Công', `Bưu gửi ${item.trackingCode} đã lên xe ${plate} về Kho Tổng`);
                    setTimeout(() => loadShipmentsData(), 600);
                } catch (err) {
                    Utils.showToast('Lỗi Gom Xe', err.message, 'error');
                } finally {
                    isFeederActionRunning.value = false;
                }
            };

            // Xuất chuyến xe gom trung chuyển hàng loạt (Xe Đi)
            const handleDispatchAllFeeder = async () => {
                if (pendingFeederItems.value.length === 0) {
                    Utils.showToast('Thông Báo', 'Không có bưu phẩm nào đang chờ xuất xe trung chuyển', 'warning');
                    return;
                }
                const poText = selectedFeederStation.value !== 'ALL' ? selectedFeederStation.value : 'toàn bộ bưu cục';
                const plate = feederVehiclePlate.value.trim() || '29C-556.12 (Tải 1.5T)';
                const driver = feederDriverName.value.trim() || 'Vũ Văn Gom';

                if (!confirm(`Xác nhận điều phối xe trung chuyển (BKS: ${plate}, Lái xe: ${driver}) gom ${pendingFeederItems.value.length} bưu gửi (${totalFeederWeight.value.toFixed(1)} kg) từ ${poText} về Kho Tổng?`)) {
                    return;
                }

                isFeederActionRunning.value = true;
                let count = 0;
                try {
                    for (const item of pendingFeederItems.value) {
                        const targetHub = item.sourceHub || 'HUB-HN-01';
                        const note = `Xe trung chuyển nội đô (BKS: ${plate}, Lái xe: ${driver}) xuất bến từ bưu cục về Kho Tổng ${targetHub}. Bưu phẩm đang trên đường trung chuyển.`;
                        await TrackingService.updateStatus(item.trackingCode, 'IN_TRANSIT', targetHub, note);
                        item.currentStatus = 'IN_TRANSIT';
                        item.locationCode = targetHub;
                        count++;
                    }
                    Utils.showToast('Xuất Bến Thành Công', `Đã xuất xe gom trung chuyển thành công cho ${count} bưu gửi!`);
                    setTimeout(() => loadShipmentsData(), 600);
                } catch (err) {
                    Utils.showToast('Lỗi', `Đã gom ${count} bưu gửi trước khi lỗi: ${err.message}`, 'warning');
                } finally {
                    isFeederActionRunning.value = false;
                }
            };

            // Tiếp nhận 1 kiện từ xe Feeder đến bưu cục phát
            const handleReceiveIncomingFeeder = async (item) => {
                const targetPO = selectedFeederStation.value !== 'ALL' ? selectedFeederStation.value : getDestPostOfficeInfo(item).code;
                const poInfo = HUB_COORDINATES[targetPO] || { name: 'Bưu Cục Phát' };
                const note = `Xe trung chuyển nội đô đã cập bến ${poInfo.name} (${targetPO}). Bưu phẩm đã dỡ vào kho bưu cục, sẵn sàng bàn giao bưu tá phát.`;
                isFeederActionRunning.value = true;
                try {
                    await TrackingService.updateStatus(item.trackingCode, 'ARRIVED_DEST_HUB', targetPO, note);
                    item.currentStatus = 'ARRIVED_DEST_HUB';
                    item.locationCode = targetPO;
                    Utils.showToast('Cập Bến Thành Công', `Bưu gửi ${item.trackingCode} đã cập bến ${poInfo.name}`);
                    setTimeout(() => loadShipmentsData(), 600);
                } catch (err) {
                    Utils.showToast('Lỗi Tiếp Nhận', err.message, 'error');
                } finally {
                    isFeederActionRunning.value = false;
                }
            };

            // Tiếp nhận toàn bộ xe Feeder cập bến bưu cục phát (Xe Đến)
            const handleReceiveAllIncomingFeeder = async () => {
                if (incomingFeederItems.value.length === 0) {
                    Utils.showToast('Thông Báo', 'Không có bưu phẩm nào đang trên xe trung chuyển về bưu cục', 'warning');
                    return;
                }
                const poCode = selectedFeederStation.value !== 'ALL' ? selectedFeederStation.value : 'bưu cục phát';
                if (!confirm(`Xác nhận xe trung chuyển nội đô từ Kho Tổng đã cập bến ${poCode}?\nHệ thống sẽ dỡ ${incomingFeederItems.value.length} bưu gửi vào bưu cục để sẵn sàng giao bưu tá.`)) {
                    return;
                }
                isFeederActionRunning.value = true;
                let count = 0;
                try {
                    for (const item of incomingFeederItems.value) {
                        const targetPO = selectedFeederStation.value !== 'ALL' ? selectedFeederStation.value : getDestPostOfficeInfo(item).code;
                        const poInfo = HUB_COORDINATES[targetPO] || { name: 'Bưu Cục Phát' };
                        const note = `Xe trung chuyển nội đô đã cập bến ${poInfo.name} (${targetPO}). Bưu phẩm đã dỡ an toàn vào kho bưu cục, sẵn sàng bàn giao bưu tá phát.`;
                        await TrackingService.updateStatus(item.trackingCode, 'ARRIVED_DEST_HUB', targetPO, note);
                        item.currentStatus = 'ARRIVED_DEST_HUB';
                        item.locationCode = targetPO;
                        count++;
                    }
                    Utils.showToast('Cập Bến Thành Công', `Đã tiếp nhận ${count} bưu gửi từ xe trung chuyển vào bưu cục!`);
                    setTimeout(() => loadShipmentsData(), 600);
                } catch (err) {
                    Utils.showToast('Lỗi', `Đã dỡ ${count} bưu gửi trước khi lỗi: ${err.message}`, 'warning');
                } finally {
                    isFeederActionRunning.value = false;
                }
            };

            const openCreateTripModal = (type = null) => {
                if (type) {
                    setTripType(type);
                } else {
                    setTripType(transportMode.value);
                }
                showCreateModal.value = true;
            };

            watch(() => props.currentStation, (newVal) => {
                if (newVal) selectedStationHub.value = newVal;
            });

            const getDefaultDepartureTime = () => {
                const d = new Date();
                d.setHours(d.getHours() + 4);
                d.setMinutes(0, 0, 0);
                const pad = (n) => String(n).padStart(2, '0');
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
            };

            // Cấu hình Bộ Lập Lịch Gom Đơn (Tự Động vs Thủ Công)
            const schedulerConfig = reactive({
                enabled: true,
                intervalSeconds: 300,
                fixedCronTimes: '08:00, 12:00, 18:00, 22:00',
                readyThresholdPercent: 80.0,
                cutoffBufferMinutes: 30,
                lastRunTime: null,
                lastConsolidatedCount: 0
            });
            const isUpdatingScheduler = ref(false);
            const isConsolidatingAll = ref(false);

            // Modal Lập Chuyến Xe Mới
            const showCreateModal = ref(false);
            const isSubmittingTrip = ref(false);
            const selectedPresetIndex = ref(0);
            const selectedStopToAdd = ref('');
            const tripForm = reactive({
                tripType: 'LINEHAUL',
                tripCode: '',
                routeName: PRESET_ROUTES[0].name,
                originHub: PRESET_ROUTES[0].originHub,
                vehiclePlate: '29C-888.99',
                driverName: 'Nguyễn Văn A',
                maxWeight: 8000,
                scheduledDepartureTime: getDefaultDepartureTime(),
                cutoffBufferMinutes: 30,
                stopHubCodes: [...PRESET_ROUTES[0].stops]
            });

            // Modal Chi Tiết & Bản Đồ
            const showDetailModal = ref(false);
            const activeTripDetail = ref(null);
            const isLoadingDetail = ref(false);
            const isConsolidating = ref(false);
            const isExecutingAction = ref(false);
            const detailActiveTab = ref('manifests');
            const activeManifests = computed(() => {
                return (activeTripDetail.value?.manifests || []).filter(m => m.status !== 'REMOVED');
            });

            // Quản lý Đơn hàng Chờ Khả Dụng
            const eligibleAssignments = ref([]);
            const isLoadingEligible = ref(false);
            const eligibleSearchQuery = ref('');
            const selectedEligibleCodes = ref([]);
            const isConsolidatingSelected = ref(false);

            let leafletMap = null;
            let routeLayers = [];
            let stopMarkers = [];
            let tripRoutePoints = [];
            let radarMarker = null;

            const loadTrips = async () => {
                isLoading.value = true;
                try {
                    const data = await RoutingService.getAllTrips();
                    tripsList.value = Array.isArray(data) ? data : [];
                } catch (e) {
                    Utils.showToast('Lỗi Tải Dữ Liệu', e.message, 'error');
                } finally {
                    isLoading.value = false;
                }
            };

            const loadHubs = async () => {
                try {
                    const data = await RoutingService.getAllHubs();
                    hubsList.value = Array.isArray(data) ? data : [];
                    if (window.MapManager && Array.isArray(data)) {
                        window.MapManager.updateHubs(data);
                    }
                } catch (e) {
                    console.error('[TripsView] Không thể tải danh bạ Hubs:', e);
                }
            };

            const loadSchedulerConfig = async () => {
                try {
                    const data = await RoutingService.getSchedulerConfig();
                    if (data) {
                        schedulerConfig.enabled = data.enabled !== false;
                        schedulerConfig.intervalSeconds = data.intervalSeconds || 300;
                        schedulerConfig.fixedCronTimes = data.fixedCronTimes || '08:00, 12:00, 18:00, 22:00';
                        schedulerConfig.readyThresholdPercent = data.readyThresholdPercent || 80.0;
                        schedulerConfig.cutoffBufferMinutes = data.cutoffBufferMinutes || 30;
                        schedulerConfig.lastRunTime = data.lastRunTime;
                        schedulerConfig.lastConsolidatedCount = data.lastConsolidatedCount || 0;
                    }
                } catch (e) {
                    console.error('[TripsView] Không thể tải cấu hình scheduler:', e);
                }
            };

            const toggleSchedulerMode = async () => {
                isUpdatingScheduler.value = true;
                try {
                    const newEnabled = !schedulerConfig.enabled;
                    const res = await RoutingService.updateSchedulerConfig({
                        enabled: newEnabled,
                        intervalSeconds: schedulerConfig.intervalSeconds
                    });
                    schedulerConfig.enabled = res.enabled;
                    Utils.showToast('Cập Nhật Bộ Lập Lịch', newEnabled ? 'Đã kích hoạt chế độ Tự Động quét ngầm.' : 'Đã chuyển sang chế độ Thủ Công.', 'success');
                } catch (e) {
                    Utils.showToast('Lỗi Cập Nhật', e.message, 'error');
                } finally {
                    isUpdatingScheduler.value = false;
                }
            };

            const changeSchedulerInterval = async (intervalSec) => {
                isUpdatingScheduler.value = true;
                try {
                    const res = await RoutingService.updateSchedulerConfig({
                        enabled: schedulerConfig.enabled,
                        intervalSeconds: parseInt(intervalSec)
                    });
                    schedulerConfig.intervalSeconds = res.intervalSeconds;
                    Utils.showToast('Đổi Chu Kỳ Quét', `Đã đổi chu kỳ quét ngầm thành ${Math.round(res.intervalSeconds / 60)} phút.`, 'success');
                } catch (e) {
                    Utils.showToast('Lỗi Cập Nhật', e.message, 'error');
                } finally {
                    isUpdatingScheduler.value = false;
                }
            };

            const isTripOutbound = (t, station) => {
                if (!station || station === 'ALL') return true;
                const origin = (t.stops && t.stops.length > 0) ? t.stops[0].hubCode : (t.originHub || t.currentHub);
                return origin === station;
            };

            const isTripInbound = (t, station) => {
                if (t.status !== 'IN_TRANSIT') return false;
                if (!station || station === 'ALL') return true;
                const stops = t.stops || [];
                const firstStop = stops[0]?.hubCode;
                if (firstStop === station) return false;
                return stops.some(s => s.hubCode === station);
            };

            const isFeederTrip = (trip) => {
                if (!trip) return false;
                if (trip.tripType === 'FEEDER') return true;
                if (trip.stops && Array.isArray(trip.stops)) {
                    return trip.stops.some(s => {
                        const code = s.hubCode || s;
                        return code && code.startsWith('POST-');
                    });
                }
                return false;
            };

            const linehaulTrips = computed(() => {
                return tripsList.value.filter(t => !isFeederTrip(t));
            });

            const feederTrips = computed(() => {
                return tripsList.value.filter(t => isFeederTrip(t));
            });

            const linehaulTripsCount = computed(() => linehaulTrips.value.length);
            const feederTripsCount = computed(() => feederTrips.value.length);

            const kpiStats = computed(() => {
                const currentPool = transportMode.value === 'LINEHAUL' ? linehaulTrips.value : feederTrips.value;
                const total = currentPool.length;
                const inTransit = currentPool.filter(t => t.status === 'IN_TRANSIT').length;
                const scheduled = currentPool.filter(t => t.status === 'SCHEDULED').length;
                const completed = currentPool.filter(t => t.status === 'COMPLETED').length;
                const totalWeightKg = currentPool.reduce((sum, t) => sum + (t.currentWeight || 0), 0);
                const outboundCount = currentPool.filter(t => isTripOutbound(t, selectedStationHub.value)).length;
                const inboundCount = currentPool.filter(t => isTripInbound(t, selectedStationHub.value)).length;
                return { total, inTransit, scheduled, completed, totalWeightKg, outboundCount, inboundCount };
            });

            const filteredTrips = computed(() => {
                let list = transportMode.value === 'LINEHAUL' ? linehaulTrips.value : feederTrips.value;
                if (tripDirectionTab.value === 'OUTBOUND') {
                    list = list.filter(t => isTripOutbound(t, selectedStationHub.value));
                } else if (tripDirectionTab.value === 'INBOUND') {
                    list = list.filter(t => isTripInbound(t, selectedStationHub.value));
                }
                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(t => t.status === selectedStatusFilter.value);
                }
                const q = searchQuery.value.trim().toLowerCase();
                if (q) {
                    list = list.filter(t =>
                        (t.tripCode && t.tripCode.toLowerCase().includes(q)) ||
                        (t.vehiclePlate && t.vehiclePlate.toLowerCase().includes(q)) ||
                        (t.driverName && t.driverName.toLowerCase().includes(q)) ||
                        (t.routeName && t.routeName.toLowerCase().includes(q))
                    );
                }
                return list;
            });

            const currentPage = ref(1);
            const pageSize = ref(10);

            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredTrips.value.length / pageSize.value) || 1;
            });

            const paginatedTrips = computed(() => {
                if (pageSize.value === -1) return filteredTrips.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredTrips.value.slice(start, start + pageSize.value);
            });

            const startIndex = computed(() => {
                if (filteredTrips.value.length === 0) return 0;
                return (currentPage.value - 1) * pageSize.value + 1;
            });

            const endIndex = computed(() => {
                return Math.min(currentPage.value * pageSize.value, filteredTrips.value.length);
            });

            watch([searchQuery, selectedStatusFilter, pageSize, tripDirectionTab, selectedStationHub], () => {
                currentPage.value = 1;
            });

            const goToPage = (p) => {
                if (p >= 1 && p <= totalPages.value) {
                    currentPage.value = p;
                }
            };

            const currentPresets = computed(() => {
                return tripForm.tripType === 'FEEDER' ? PRESET_FEEDER_ROUTES : PRESET_ROUTES;
            });

            const applyPresetRoute = (index) => {
                selectedPresetIndex.value = index;
                const routes = currentPresets.value;
                const preset = routes[index];
                if (preset) {
                    tripForm.routeName = preset.name;
                    tripForm.originHub = preset.originHub;
                    tripForm.stopHubCodes = [...preset.stops];
                }
            };

            const setTripType = (type) => {
                tripForm.tripType = type;
                selectedPresetIndex.value = 0;
                applyPresetRoute(0);
            };


            const availableHubsToAdd = computed(() => {
                if (tripForm.tripType === 'LINEHAUL') {
                    // Xe Trục Liên Tỉnh: CHỈ CHO PHÉP CHỌN 5 KHO TỔNG CẤP 1
                    return hubsList.value.filter(h => {
                        const isCentral = (h.hubLevel === 1) || (h.hubCode && h.hubCode.startsWith('HUB-'));
                        return isCentral && !tripForm.stopHubCodes.includes(h.hubCode);
                    });
                } else {
                    // Xe Trung Chuyển Nội Đô: Cho phép chọn Bưu Cục con và Kho Tổng
                    return hubsList.value.filter(h => !tripForm.stopHubCodes.includes(h.hubCode));
                }
            });

            const addNewStop = () => {
                if (selectedStopToAdd.value) {
                    addStopCode(selectedStopToAdd.value);
                    selectedStopToAdd.value = '';
                }
            };

            const getHubDisplayName = (code) => {
                if (!code) return '';
                const trimmed = String(code).trim();
                const hub = hubsList.value.find(h => h.hubCode === trimmed);
                if (hub && hub.hubName) return hub.hubName;
                const fallback = HUB_COORDINATES[trimmed] || HUB_COORDINATES[trimmed.toUpperCase()];
                if (fallback && fallback.name) return fallback.name;
                return trimmed;
            };

            const getHubAddress = (code) => {
                if (!code) return 'Chưa có địa chỉ vận hành';
                const trimmed = String(code).trim();
                const hub = hubsList.value.find(h => h.hubCode === trimmed);
                if (hub && hub.address) return hub.address;
                const fallback = HUB_COORDINATES[trimmed] || HUB_COORDINATES[trimmed.toUpperCase()];
                if (fallback && fallback.address) return fallback.address;
                return 'Đang cập nhật địa chỉ';
            };

            const getHubLocation = (stop) => {
                const hubCode = stop.hubCode || stop;
                const trimmed = String(hubCode).trim();
                const hub = hubsList.value.find(item => item.hubCode === trimmed);
                const fallbackCoord = HUB_COORDINATES[trimmed] || HUB_COORDINATES[trimmed.toUpperCase()];
                const latitude = Number(stop.latitude ?? hub?.latitude ?? fallbackCoord?.lat);
                const longitude = Number(stop.longitude ?? hub?.longitude ?? fallbackCoord?.lng);
                if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
                    return null;
                }
                return {
                    name: stop.hubName || hub?.hubName || fallbackCoord?.name || trimmed,
                    address: stop.hubAddress || hub?.address || fallbackCoord?.address || getHubAddress(trimmed),
                    lat: latitude,
                    lng: longitude
                };
            };

            const addStopCode = (code) => {
                if (code && !tripForm.stopHubCodes.includes(code)) {
                    tripForm.stopHubCodes.push(code);
                }
            };

            const removeStopCode = (index) => {
                if (tripForm.stopHubCodes.length > 2) {
                    tripForm.stopHubCodes.splice(index, 1);
                } else {
                    Utils.showToast('Thông Báo', 'Lộ trình phải có tối thiểu 2 trạm dừng!', 'warning');
                }
            };

            const submitCreateTrip = async () => {
                if (!tripForm.routeName || !tripForm.vehiclePlate || !tripForm.driverName) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng điền đủ tên tuyến, biển số xe và tài xế!', 'warning');
                    return;
                }
                if (tripForm.stopHubCodes.length < 2) {
                    Utils.showToast('Lộ Trình Không Hợp Lệ', 'Chuyến xe phải có ít nhất 2 trạm dừng!', 'warning');
                    return;
                }

                isSubmittingTrip.value = true;
                try {
                    await RoutingService.createTrip({
                        tripCode: tripForm.tripCode.trim() || undefined,
                        routeName: tripForm.routeName.trim(),
                        originHub: tripForm.stopHubCodes[0],
                        vehiclePlate: tripForm.vehiclePlate.trim(),
                        driverName: tripForm.driverName.trim(),
                        maxWeight: parseFloat(tripForm.maxWeight) || 5000,
                        scheduledDepartureTime: tripForm.scheduledDepartureTime ? new Date(tripForm.scheduledDepartureTime).toISOString() : undefined,
                        cutoffBufferMinutes: parseInt(tripForm.cutoffBufferMinutes) || 30,
                        stopHubCodes: tripForm.stopHubCodes
                    });
                    Utils.showToast('Thành Công', 'Đã khởi tạo chuyến xe trục thành công!', 'success');
                    showCreateModal.value = false;
                    await loadTrips();
                } catch (err) {
                    Utils.showToast('Tạo Chuyến Thất Bại', err.message, 'error');
                } finally {
                    isSubmittingTrip.value = false;
                }
            };

            const loadEligibleAssignments = async (tripId) => {
                isLoadingEligible.value = true;
                try {
                    const data = await RoutingService.getEligibleAssignments(tripId);
                    eligibleAssignments.value = Array.isArray(data) ? data : [];
                    selectedEligibleCodes.value = [];
                } catch (e) {
                    console.error('[TripsView] Lỗi tải đơn chờ khả dụng:', e);
                } finally {
                    isLoadingEligible.value = false;
                }
            };

            const filteredEligibleAssignments = computed(() => {
                const q = eligibleSearchQuery.value.trim().toLowerCase();
                if (!q) return eligibleAssignments.value;
                return eligibleAssignments.value.filter(item =>
                    (item.trackingCode && item.trackingCode.toLowerCase().includes(q)) ||
                    (item.sourceHub && item.sourceHub.toLowerCase().includes(q)) ||
                    (item.destinationHub && item.destinationHub.toLowerCase().includes(q))
                );
            });

            const selectedEligibleWeight = computed(() => {
                return eligibleAssignments.value
                    .filter(item => selectedEligibleCodes.value.includes(item.trackingCode))
                    .reduce((sum, item) => sum + (item.weight || 0), 0)
                    .toFixed(1);
            });

            const toggleSelectAllEligible = () => {
                if (selectedEligibleCodes.value.length === filteredEligibleAssignments.value.length && filteredEligibleAssignments.value.length > 0) {
                    selectedEligibleCodes.value = [];
                } else {
                    selectedEligibleCodes.value = filteredEligibleAssignments.value.map(i => i.trackingCode);
                }
            };

            const switchDetailTab = (tab) => {
                detailActiveTab.value = tab;
                if (tab === 'route') {
                    nextTick(() => {
                        if (leafletMap) {
                            leafletMap.invalidateSize();
                        }
                    });
                }
            };

            const openTripDetail = async (tripId) => {
                isLoadingDetail.value = true;
                showDetailModal.value = true;
                detailActiveTab.value = 'route';
                try {
                    const data = await RoutingService.getTripDetail(tripId);
                    activeTripDetail.value = data;
                    await nextTick();
                    renderLeafletMap(data);
                    if (data.status === 'SCHEDULED') {
                        loadEligibleAssignments(tripId);
                    }
                } catch (err) {
                    Utils.showToast('Lỗi Tải Chi Tiết', err.message, 'error');
                    showDetailModal.value = false;
                } finally {
                    isLoadingDetail.value = false;
                }
            };

            const fitTripVietnamView = () => {
                if (!leafletMap) return;
                const vnBounds = [
                    [7.2, 102.0],
                    [23.6, 117.2]
                ];
                leafletMap.fitBounds(vnBounds, { padding: [15, 15], maxZoom: 7 });
            };

            const fitTripRouteView = () => {
                if (!leafletMap) return;
                if (tripRoutePoints && tripRoutePoints.length > 0) {
                    leafletMap.fitBounds(L.latLngBounds(tripRoutePoints), { padding: [40, 40] });
                } else if (stopMarkers && stopMarkers.length > 0) {
                    const group = new L.featureGroup(stopMarkers);
                    leafletMap.fitBounds(group.getBounds(), { padding: [50, 50] });
                } else {
                    fitTripVietnamView();
                }
            };

            const initTripMap = () => {
                const mapEl = document.getElementById('trip-leaflet-map');
                if (!mapEl) return;

                if (leafletMap) {
                    try {
                        leafletMap.remove();
                    } catch (e) {}
                    leafletMap = null;
                }

                leafletMap = L.map(mapEl, {
                    zoomControl: true,
                    minZoom: 4,
                    maxZoom: 20
                });

                const roadLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
                    attribution: '&copy; Google Bản đồ Việt Nam | Bưu chính VNPT',
                    subdomains: ['0', '1', '2', '3'],
                    maxZoom: 20,
                    keepBuffer: 4,
                    updateWhenIdle: false
                });

                const hybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=vi', {
                    attribution: '&copy; Google Vệ tinh | Bưu chính VNPT',
                    subdomains: ['0', '1', '2', '3'],
                    maxZoom: 20,
                    keepBuffer: 4,
                    updateWhenIdle: false
                });

                roadLayer.addTo(leafletMap);

                L.control.layers({
                    'Google Maps': roadLayer,
                    'Google Vệ tinh': hybridLayer
                }, null, { position: 'topright', collapsed: false }).addTo(leafletMap);

                const QuickNav = L.Control.extend({
                    options: { position: 'topleft' },
                    onAdd: function () {
                        const container = L.DomUtil.create('div', 'leaflet-bar map-quick-nav');
                        container.innerHTML = `
                            <button type="button" id="btn-trip-fit-vn" class="quick-nav-btn" title="Toàn cảnh lãnh thổ Việt Nam">
                                <span class="btn-text">Toàn Cảnh VN</span>
                            </button>
                            <button type="button" id="btn-trip-fit-route" class="quick-nav-btn" title="Phóng to lộ trình chuyến xe">
                                <span class="btn-text">Tuyến Xe Chạy</span>
                            </button>
                        `;
                        L.DomEvent.disableClickPropagation(container);
                        setTimeout(() => {
                            const btnVn = container.querySelector('#btn-trip-fit-vn');
                            if (btnVn) {
                                btnVn.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    fitTripVietnamView();
                                });
                            }
                            const btnRoute = container.querySelector('#btn-trip-fit-route');
                            if (btnRoute) {
                                btnRoute.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    fitTripRouteView();
                                });
                            }
                        }, 50);
                        return container;
                    }
                });
                new QuickNav().addTo(leafletMap);
            };

            const renderLeafletMap = async (tripData) => {
                initTripMap();
                if (!leafletMap) return;

                // Dọn dẹp layer cũ
                routeLayers.forEach(l => {
                    try { leafletMap.removeLayer(l); } catch (e) {}
                });
                routeLayers = [];
                stopMarkers.forEach(m => {
                    try { leafletMap.removeLayer(m); } catch (e) {}
                });
                stopMarkers = [];
                if (radarMarker) {
                    try { leafletMap.removeLayer(radarMarker); } catch (e) {}
                    radarMarker = null;
                }
                tripRoutePoints = [];

                const stops = tripData.stops || [];
                if (stops.length === 0) return;

                const locatedStops = stops.map(stop => ({ stop, coord: getHubLocation(stop) }));
                const missingLocations = locatedStops.filter(item => !item.coord);
                if (missingLocations.length > 0) {
                    console.warn('[TripsView] Missing hub coordinates:', missingLocations.map(item => item.stop.hubCode));
                }

                const validStops = locatedStops.filter(item => item.coord);
                if (validStops.length < 2) {
                    Utils.showToast('Thiếu Tọa Độ Hub', 'Không đủ Hub có tọa độ xác thực để vẽ tuyến xe.', 'warning');
                    return;
                }

                // 1. Đặt các mốc điểm trạm dừng (Pins) chuẩn tối giản
                validStops.forEach(({ stop, coord }, index) => {
                    const point = [coord.lat, coord.lng];

                    let pinClass = 'hub-pin-transit';
                    let iconSize = [12, 12];
                    let iconAnchor = [6, 6];

                    if (index === 0) {
                        pinClass = 'hub-pin-source';
                        iconSize = [16, 16];
                        iconAnchor = [8, 8];
                    } else if (index === validStops.length - 1) {
                        pinClass = 'hub-pin-dest';
                        iconSize = [16, 16];
                        iconAnchor = [8, 8];
                    }

                    const markerIcon = L.divIcon({
                        className: pinClass,
                        iconSize: iconSize,
                        iconAnchor: iconAnchor
                    });

                    const marker = L.marker(point, { icon: markerIcon }).addTo(leafletMap);
                    marker.bindPopup(`
                        <div class="text-xs p-1 min-w-[210px]">
                            <p class="font-bold text-slate-800 text-[12px]">Trạm ${stop.stopOrder}: ${coord.name}</p>
                            <p class="text-blue-600 font-mono text-[11px] font-bold">Mã Trạm: ${stop.hubCode}</p>
                            <p class="mt-1 text-slate-700 text-[11px] leading-relaxed"><b>Địa chỉ:</b> ${coord.address || getHubAddress(stop.hubCode)}</p>
                            <p class="mt-1 font-semibold ${stop.status === 'ARRIVED' ? 'text-emerald-600' : (stop.status === 'DEPARTED' ? 'text-blue-600' : 'text-slate-600')}">Trạng thái: ${stop.status}</p>
                            ${stop.arrivedAt ? `<p class="text-slate-400 text-[10.5px]">Đến: ${new Date(stop.arrivedAt).toLocaleTimeString('vi-VN')}</p>` : ''}
                            ${stop.departedAt ? `<p class="text-slate-400 text-[10.5px]">Đi: ${new Date(stop.departedAt).toLocaleTimeString('vi-VN')}</p>` : ''}
                        </div>
                    `);
                    stopMarkers.push(marker);
                });

                // 2. Tính toán lộ trình đường bộ dọc QL1A/CT01 qua OSRM hoặc corridor fallback
                const stopCoords = validStops.map(item => item.coord);
                let routePoints = [];

                try {
                    const routingWaypoints = buildVietnamRouteWaypoints(stopCoords);
                    const coordsQuery = routingWaypoints.map(c => `${c.lng},${c.lat}`).join(';');
                    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);
                    const res = await fetch(osrmUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);
                    if (res.ok) {
                        const json = await res.json();
                        if (json.routes && json.routes.length > 0) {
                            routePoints = json.routes[0].geometry.coordinates.map(pt => [pt[1], pt[0]]);
                        }
                    }
                } catch (e) {
                    console.warn('[TripsView] OSRM route fallback:', e);
                }

                if (!routePoints || routePoints.length === 0) {
                    const routingWaypoints = buildVietnamRouteWaypoints(stopCoords);
                    routePoints = routingWaypoints.map(c => [c.lat, c.lng]);
                }

                tripRoutePoints = routePoints;

                // 3. Phân đoạn tuyến chuẩn Map Tracking:
                // - completedPolyline: Màu xanh dương đậm #0066cc
                // - remainingPolyline: Nét đứt Tím Indigo #6366f1
                const findClosestPointIndex = (targetCoord, points) => {
                    let bestIdx = 0;
                    let minDist = Infinity;
                    for (let i = 0; i < points.length; i++) {
                        const pt = points[i];
                        const dist = Math.hypot(pt[0] - targetCoord.lat, pt[1] - targetCoord.lng);
                        if (dist < minDist) {
                            minDist = dist;
                            bestIdx = i;
                        }
                    }
                    return bestIdx;
                };

                const stopRouteIndices = validStops.map(s => findClosestPointIndex(s.coord, routePoints));

                let currentPoint = null;
                let targetIdx = 0;
                let statusText = 'Chờ Khởi Hành';
                let subText = `Tuyến: ${validStops[0].stop.hubCode} ➔ ${validStops[validStops.length - 1].stop.hubCode}`;

                if (tripData.status === 'COMPLETED') {
                    currentPoint = [validStops[validStops.length - 1].coord.lat, validStops[validStops.length - 1].coord.lng];
                    targetIdx = routePoints.length - 1;
                    statusText = 'Chuyến Xe Đã Hoàn Thành';
                    subText = `TIẾN ĐỘ: 100% | Cập bến ${validStops[validStops.length - 1].coord.name}`;
                } else if (tripData.status === 'SCHEDULED' || tripData.status === 'LOADING') {
                    currentPoint = [validStops[0].coord.lat, validStops[0].coord.lng];
                    targetIdx = 0;
                    statusText = tripData.status === 'LOADING' ? 'Đang Xếp Hàng Lên Xe' : 'Chờ Khởi Hành';
                    subText = `Đậu tại ${validStops[0].coord.name}`;
                } else {
                    // IN_TRANSIT hoặc DEPARTED
                    let arrivedStopIdx = -1;
                    validStops.forEach((s, idx) => {
                        if (s.stop.status === 'ARRIVED' || (tripData.currentHub && tripData.currentHub === s.stop.hubCode)) {
                            arrivedStopIdx = idx;
                        }
                    });

                    if (arrivedStopIdx >= 0) {
                        currentPoint = [validStops[arrivedStopIdx].coord.lat, validStops[arrivedStopIdx].coord.lng];
                        targetIdx = stopRouteIndices[arrivedStopIdx];
                        statusText = `Đã Cập Bến: ${validStops[arrivedStopIdx].coord.name}`;
                        subText = `Trạm ${validStops[arrivedStopIdx].stop.stopOrder}/${validStops.length}`;
                    } else {
                        let lastDepartedIdx = 0;
                        validStops.forEach((s, idx) => {
                            if (s.stop.status === 'DEPARTED' || s.stop.departedAt) {
                                lastDepartedIdx = idx;
                            }
                        });
                        const nextStopIdx = Math.min(validStops.length - 1, lastDepartedIdx + 1);
                        const startRouteIdx = stopRouteIndices[lastDepartedIdx];
                        const endRouteIdx = stopRouteIndices[nextStopIdx];
                        const midIdx = Math.min(routePoints.length - 1, Math.max(0, Math.round((startRouteIdx + endRouteIdx) / 2)));
                        currentPoint = routePoints[midIdx];
                        targetIdx = midIdx;
                        const pct = Math.round((midIdx / (routePoints.length - 1)) * 100);
                        statusText = `Đang Di Chuyển Trên Tuyến`;
                        subText = `${validStops[lastDepartedIdx].stop.hubCode} ➔ ${validStops[nextStopIdx].stop.hubCode} (${pct}%)`;
                    }
                }

                // 4. Vẽ phân đoạn đã hoàn thành (Xanh dương đậm #0066cc)
                if (targetIdx > 0) {
                    const completedCoords = routePoints.slice(0, targetIdx + 1);
                    if (completedCoords.length >= 2) {
                        const completedPolyline = L.polyline(completedCoords, {
                            color: '#0066cc',
                            weight: 4.5,
                            opacity: 0.95,
                            lineJoin: 'round',
                            lineCap: 'round'
                        }).addTo(leafletMap);
                        routeLayers.push(completedPolyline);
                    }
                }

                // 5. Vẽ phân đoạn còn lại (Nét đứt Tím Indigo #6366f1)
                const remainingCoords = targetIdx === 0 ? routePoints : routePoints.slice(targetIdx);
                if (remainingCoords.length >= 2) {
                    const remainingPolyline = L.polyline(remainingCoords, {
                        color: '#6366f1',
                        weight: 4,
                        opacity: 0.85,
                        dashArray: '4, 6',
                        lineJoin: 'round',
                        lineCap: 'round'
                    }).addTo(leafletMap);
                    routeLayers.push(remainingPolyline);
                }

                // 6. Cập nhật Pin Radar phát sóng di động (.hub-pin-current)
                if (currentPoint) {
                    const radarIcon = L.divIcon({
                        className: 'hub-pin-current',
                        iconSize: [18, 18],
                        iconAnchor: [9, 9]
                    });
                    const tooltipHtml = `
                        <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${statusText}</div>
                        <div style="font-size: 10px; color: #0066cc; font-family: monospace; font-weight: 600;">${subText}</div>
                    `;
                    radarMarker = L.marker(currentPoint, { icon: radarIcon, zIndexOffset: 1000 })
                        .bindTooltip(tooltipHtml, { permanent: true, direction: 'top', offset: [0, -10], className: 'radar-tooltip' })
                        .addTo(leafletMap);
                }

                fitTripRouteView();
                setTimeout(() => {
                    if (leafletMap) {
                        leafletMap.invalidateSize();
                    }
                }, 250);
            };

            const handleConsolidateAll = async () => {
                isConsolidatingAll.value = true;
                try {
                    const res = await RoutingService.consolidateAllTrips();
                    const total = res?.totalItems || res?.totalConsolidated || 0;
                    Utils.showToast('Gom Đơn Thành Công', `Đã quét và nạp ${total} kiện hàng vào các chuyến xe chờ.`, 'success');
                    await loadTrips();
                    if (activeTripDetail.value) {
                        const updated = await RoutingService.getTripDetail(activeTripDetail.value.id);
                        activeTripDetail.value = updated;
                        await loadEligibleAssignments(activeTripDetail.value.id);
                    }
                } catch (err) {
                    Utils.showToast('Gom Đơn Thất Bại', err.message, 'error');
                } finally {
                    isConsolidatingAll.value = false;
                }
            };

            const handleAutoConsolidate = async () => {
                if (!activeTripDetail.value) return;
                isConsolidating.value = true;
                try {
                    const res = await RoutingService.autoConsolidate(activeTripDetail.value.id);
                    activeTripDetail.value = res;
                    Utils.showToast('Gom Đơn Thành Công', 'Đã quét và nạp các kiện hàng hợp lệ lên xe.', 'success');
                    await loadTrips();
                    await loadEligibleAssignments(activeTripDetail.value.id);
                } catch (err) {
                    Utils.showToast('Gom Đơn Thất Bại', err.message, 'error');
                } finally {
                    isConsolidating.value = false;
                }
            };

            const handleConsolidateSelected = async () => {
                if (!activeTripDetail.value || selectedEligibleCodes.value.length === 0) return;
                const itemsToLoad = eligibleAssignments.value
                    .filter(i => selectedEligibleCodes.value.includes(i.trackingCode))
                    .map(i => ({
                        trackingCode: i.trackingCode,
                        originHub: i.sourceHub,
                        destinationHub: i.destinationHub,
                        weight: i.weight,
                        serviceType: i.serviceType
                    }));

                isConsolidatingSelected.value = true;
                try {
                    const res = await RoutingService.autoConsolidate(activeTripDetail.value.id, { items: itemsToLoad });
                    activeTripDetail.value = res;
                    Utils.showToast('Nạp Kiện Thành Công', `Đã nạp ${itemsToLoad.length} kiện hàng lên chuyến xe.`, 'success');
                    await loadTrips();
                    await loadEligibleAssignments(activeTripDetail.value.id);
                    detailActiveTab.value = 'manifests';
                } catch (err) {
                    Utils.showToast('Nạp Kiện Thất Bại', err.message, 'error');
                } finally {
                    isConsolidatingSelected.value = false;
                }
            };

            const handleRemoveItem = async (trackingCode) => {
                if (!activeTripDetail.value) return;
                if (!confirm(`Bạn có chắc chắn muốn gỡ kiện hàng ${trackingCode} khỏi chuyến xe?`)) return;

                try {
                    const res = await RoutingService.removeManifestItem(activeTripDetail.value.id, trackingCode);
                    activeTripDetail.value = res;
                    Utils.showToast('Đã Gỡ Kiện Hàng', `Kiện hàng ${trackingCode} đã được gỡ và hoàn lại tải trọng xe.`, 'success');
                    await loadTrips();
                    await loadEligibleAssignments(activeTripDetail.value.id);
                } catch (err) {
                    Utils.showToast('Gỡ Kiện Thất Bại', err.message, 'error');
                }
            };

            const handleDepartTrip = async (tripId) => {
                if (!confirm('Xác nhận xuất bến cho chuyến xe này? Xe sẽ chuyển sang trạng thái IN_TRANSIT.')) return;
                isExecutingAction.value = true;
                try {
                    const res = await RoutingService.departTrip(tripId);
                    if (activeTripDetail.value && activeTripDetail.value.id === tripId) {
                        activeTripDetail.value = res;
                        await nextTick();
                        renderLeafletMap(res);
                    }
                    Utils.showToast('Xuất Bến Thành Công', 'Chuyến xe đã chính thức lăn bánh trên đường trục.', 'success');
                    await loadTrips();
                } catch (err) {
                    Utils.showToast('Xuất Bến Thất Bại', err.message, 'error');
                } finally {
                    isExecutingAction.value = false;
                }
            };

            const handleArriveAtStation = async (trip, targetHub) => {
                if (!trip) return;
                let stopCode = targetHub;
                if (!stopCode || stopCode === 'ALL') {
                    const nextStop = (trip.stops || []).find(s => s.status === 'PENDING');
                    stopCode = nextStop ? nextStop.hubCode : trip.currentHub;
                }
                if (!stopCode) {
                    Utils.showToast('Thông Báo', 'Không xác định được trạm dừng tiếp theo của xe', 'warning');
                    return;
                }
                const stopName = getHubDisplayName(stopCode);
                if (!confirm(`Xác nhận chuyến xe ${trip.tripCode} (BKS: ${trip.vehiclePlate}) đã cập bến trạm ${stopCode} (${stopName})?\n\nCác kiện hàng có đích đến tại trạm này sẽ tự động được dỡ vào kho bãi.`)) {
                    return;
                }

                isExecutingAction.value = true;
                try {
                    const res = await RoutingService.arriveAtStop(trip.id, stopCode);
                    Utils.showToast('Cập Bến & Dỡ Hàng Thành Công', `Chuyến xe ${trip.tripCode} đã đến ${stopCode}. Kiện hàng đã dỡ vào kho an toàn!`, 'success');
                    await loadTrips();
                    if (activeTripDetail.value && activeTripDetail.value.id === trip.id) {
                        activeTripDetail.value = res;
                        await nextTick();
                        renderLeafletMap(res);
                    }
                } catch (err) {
                    Utils.showToast('Cập Bến Thất Bại', err.message, 'error');
                } finally {
                    isExecutingAction.value = false;
                }
            };

            const handleArriveNextStop = async () => {
                if (!activeTripDetail.value) return;
                const trip = activeTripDetail.value;
                const nextStop = (trip.stops || []).find(s => s.status === 'PENDING');
                if (!nextStop) {
                    Utils.showToast('Thông Báo', 'Chuyến xe đã đi qua tất cả các trạm dừng!', 'info');
                    return;
                }
                await handleArriveAtStation(trip, nextStop.hubCode);
            };

            const formatDateTime = (dt) => {
                if (!dt) return 'Chưa thiết lập';
                try {
                    const d = new Date(dt);
                    if (isNaN(d.getTime())) return dt;
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
                } catch (e) {
                    return dt;
                }
            };

            const isTripOverdue = (trip) => {
                if (!trip || trip.status !== 'SCHEDULED' || !trip.scheduledDepartureTime) return false;
                if (typeof trip.isOverdue === 'boolean') return trip.isOverdue;
                return new Date(trip.scheduledDepartureTime).getTime() < Date.now();
            };

            const getCountdownInfo = (trip) => {
                if (!trip || !trip.scheduledDepartureTime) return { text: '--', isOverdue: false, badgeClass: 'bg-slate-100 text-slate-600' };
                if (trip.status === 'IN_TRANSIT') return { text: 'Đang hành trình', isOverdue: false, badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold' };
                if (trip.status === 'COMPLETED') return { text: 'Đã hoàn thành', isOverdue: false, badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold' };
                const diffMs = new Date(trip.scheduledDepartureTime).getTime() - Date.now();
                if (diffMs < 0) {
                    const pastMins = Math.abs(Math.round(diffMs / 60000));
                    const hours = Math.floor(pastMins / 60);
                    const mins = pastMins % 60;
                    return { text: `Trễ ${hours > 0 ? hours + 'h ' : ''}${mins}m`, isOverdue: true, badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold' };
                } else {
                    const remainingMins = Math.round(diffMs / 60000);
                    const hours = Math.floor(remainingMins / 60);
                    const mins = remainingMins % 60;
                    return { text: `Còn ${hours > 0 ? hours + 'h ' : ''}${mins}m`, isOverdue: false, badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200 font-bold' };
                }
            };

            const getCountdownText = (trip) => getCountdownInfo(trip).text;
            const getCountdownBadgeClass = (trip) => getCountdownInfo(trip).badgeClass;

            const getCalculatedCutoffText = (depTime, bufferMin = 30) => {
                if (!depTime) return 'Trước giờ chạy 30p';
                try {
                    const d = new Date(depTime);
                    d.setMinutes(d.getMinutes() - bufferMin);
                    const pad = (n) => String(n).padStart(2, '0');
                    return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
                } catch (e) {
                    return 'Trước giờ chạy 30p';
                }
            };

            const getTripStatusLabel = (tripOrStatus) => {
                if (!tripOrStatus) return 'Không xác định';
                const status = typeof tripOrStatus === 'string' ? tripOrStatus : tripOrStatus.status;
                const tripObj = typeof tripOrStatus === 'object' ? tripOrStatus : null;
                if (status === 'IN_TRANSIT') return 'Đang Chạy Tuyến';
                if (status === 'COMPLETED') return 'Đã Hoàn Thành';
                if (status === 'CANCELLED') return 'Đã Hủy';
                if (status === 'SCHEDULED') {
                    if (tripObj && isTripOverdue(tripObj)) return 'Trễ Giờ Xuất Bến';
                    if (tripObj && (tripObj.readyToDepart || (tripObj.weightPercentage || 0) >= 80)) return 'Sẵn Sàng Xuất Bến';
                    return 'Đang Gom Hàng';
                }
                return status || 'Không xác định';
            };

            const getTripStatusBadgeClass = (trip) => {
                if (!trip) return 'bg-slate-100 text-slate-600';
                if (trip.status === 'IN_TRANSIT') return 'bg-blue-50 text-blue-700 border border-blue-200 font-bold';
                if (trip.status === 'COMPLETED') return 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold';
                if (trip.status === 'CANCELLED') return 'bg-slate-100 text-slate-600 border border-slate-200';
                if (trip.status === 'SCHEDULED') {
                    if (isTripOverdue(trip)) return 'bg-rose-50 text-rose-700 border border-rose-300 font-black';
                    if (trip.readyToDepart || (trip.weightPercentage || 0) >= 80) return 'bg-amber-100 text-amber-900 border border-amber-300 font-black shadow-2xs';
                    return 'bg-blue-50 text-blue-700 border border-blue-200';
                }
                return 'bg-slate-50 text-slate-700 border border-slate-200';
            };

            const getExpressCount = (manifests) => {
                if (!Array.isArray(manifests)) return 0;
                return manifests.filter(m => m.serviceType === 'EXPRESS').length;
            };

            const getStandardCount = (manifests) => {
                if (!Array.isArray(manifests)) return 0;
                return manifests.filter(m => m.serviceType !== 'EXPRESS').length;
            };

            const printTripManifest = (trip) => {
                if (!trip) return;
                const printWindow = window.open('', '_blank', 'width=900,height=700');
                if (!printWindow) {
                    Utils.showToast('Lỗi Trình Duyệt', 'Vui lòng cho phép mở popup để in bảng kê', 'warning');
                    return;
                }
                const manifestsHtml = (trip.manifests || []).map((m, idx) => `
                    <tr>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 11px;">${idx + 1}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; font-weight: bold; font-size: 11px;">${m.trackingCode}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">
                            <strong>${m.originHub}</strong> <span style="color: #64748b;">(${getHubDisplayName(m.originHub)})</span><br/>
                            <span style="color: #475569; font-size: 10px;">${m.originHubAddress || getHubAddress(m.originHub)}</span>
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px;">
                            <strong>${m.destinationHub}</strong> <span style="color: #64748b;">(${getHubDisplayName(m.destinationHub)})</span><br/>
                            <span style="color: #475569; font-size: 10px;">${m.destinationHubAddress || getHubAddress(m.destinationHub)}</span>
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-size: 11px; font-weight: bold;">${m.weightKg || 1} kg</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 11px;">
                            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${m.serviceType === 'EXPRESS' ? '#eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;' : '#f8fafc; color: #475569; border: 1px solid #e2e8f0;'}">
                                ${m.serviceType || 'STANDARD'}
                            </span>
                        </td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 11px;">[  ]</td>
                    </tr>
                `).join('');

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8" />
                        <title>Bảng Kê Chuyến Xe - ${trip.tripCode}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 20px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                            @media print {
                                button { display: none !important; }
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <div style="border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="font-size: 11px; font-weight: bold; color: #0066cc; text-transform: uppercase; letter-spacing: 0.5px;">BƯU CHÍNH VIỄN THÔNG VNPT - HỆ THỐNG ĐIỀU PHỐI VẬN TẢI</div>
                                <div style="font-size: 18px; font-weight: 800; margin-top: 4px;">BẢNG KÊ VẬN CHUYỂN BƯU PHẨM (TRIP MANIFEST)</div>
                                <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Mã Chuyến: <strong>${trip.tripCode}</strong> • Tuyến: <strong>${trip.routeName}</strong></div>
                            </div>
                            <div style="text-align: right;">
                                <button onclick="window.print()" style="padding: 6px 14px; background: #0066cc; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; margin-bottom: 6px;">In Phiếu (Print)</button>
                                <div style="font-size: 11px; color: #64748b;">Thời điểm in: ${new Date().toLocaleString('vi-VN')}</div>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12px; margin-bottom: 15px;">
                            <div><strong>Biển số xe:</strong> ${trip.vehiclePlate}</div>
                            <div><strong>Tài xế lái xe:</strong> ${trip.driverName}</div>
                            <div><strong>Hub xuất phát:</strong> ${trip.currentHub || 'N/A'}</div>
                            <div><strong>Giờ xuất bến dự kiến:</strong> ${formatDateTime(trip.scheduledDepartureTime)}</div>
                            <div><strong>Tổng số kiện nạp:</strong> ${trip.manifests?.length || 0} kiện</div>
                            <div><strong>Tổng tải trọng bàn giao:</strong> ${trip.currentWeight || 0} / ${trip.maxWeight || 5000} kg (${trip.weightPercentage || 0}%)</div>
                        </div>

                        <div style="font-size: 12px; font-weight: bold; text-transform: uppercase; color: #334155; margin-bottom: 6px;">
                            Danh Sách Chi Tiết Bưu Kiện Bàn Giao Lên Xe (${trip.manifests?.length || 0} kiện)
                        </div>

                        <table>
                            <thead>
                                <tr style="background: #f1f5f9;">
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: center; width: 40px;">STT</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left;">Mã Vận Đơn</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left;">Hub Tiếp Nhận</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: left;">Hub Phát Trả (Đích)</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: right;">Khối Lượng</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: center;">Dịch Vụ</th>
                                    <th style="border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 11px; text-align: center; width: 80px;">Kiểm Đếm</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${manifestsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px; color: #94a3b8;">Không có bưu kiện nào trên chuyến xe</td></tr>'}
                            </tbody>
                        </table>

                        <div style="margin-top: 35px; display: flex; justify-content: space-between; font-size: 12px; page-break-inside: avoid;">
                            <div style="text-align: center; width: 220px;">
                                <div style="font-weight: bold;">ĐẠI DIỆN HUB GIAO HÀNG</div>
                                <div style="font-size: 10px; color: #64748b;">(Ký, ghi rõ họ tên và đóng dấu)</div>
                                <div style="height: 60px;"></div>
                            </div>
                            <div style="text-align: center; width: 220px;">
                                <div style="font-weight: bold;">TÀI XẾ NHẬN HÀNG</div>
                                <div style="font-size: 10px; color: #64748b;">(Ký, ghi rõ họ tên và mã số lái xe)</div>
                                <div style="height: 60px;"></div>
                            </div>
                            <div style="text-align: center; width: 220px;">
                                <div style="font-weight: bold;">ĐIỀU PHỐI VIÊN DUYỆT</div>
                                <div style="font-size: 10px; color: #64748b;">(Xác nhận niêm phong kẹp chì)</div>
                                <div style="height: 60px;"></div>
                            </div>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            };

            const getStatusBadge = (status) => {
                switch (status) {
                    case 'SCHEDULED':
                        return 'bg-blue-50 text-blue-700 border border-blue-200';
                    case 'IN_TRANSIT':
                        return 'bg-amber-50 text-amber-700 border border-amber-200';
                    case 'COMPLETED':
                        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                    case 'CANCELLED':
                        return 'bg-slate-100 text-slate-600 border border-slate-200';
                    default:
                        return 'bg-slate-50 text-slate-700 border border-slate-200';
                }
            };

            const getWeightColor = (pct) => {
                if (pct >= 95) return 'bg-rose-600';
                if (pct >= 80) return 'bg-amber-500';
                return 'bg-blue-600';
            };

            const viewTracking = (code) => {
                if (code) {
                    emit('view-tracking', code);
                }
            };

            const isReadyForDeparture = (trip) => {
                if (!trip) return false;
                return !!(trip.readyToDepart && trip.status === 'SCHEDULED');
            };

            onMounted(() => {
                loadTrips();
                loadHubs();
                loadSchedulerConfig();
                loadShipmentsData();
            });

            return {
                tripsList, hubsList, isLoading, loadTrips, searchQuery, selectedStatusFilter,
                tripDirectionTab, selectedStationHub, handleArriveAtStation, isTripOutbound, isTripInbound,
                kpiStats, filteredTrips,
                embedded: computed(() => !!props.embedded),
                viewTracking,
                schedulerConfig, isUpdatingScheduler, isConsolidatingAll, toggleSchedulerMode, changeSchedulerInterval, handleConsolidateAll,
                showCreateModal, isSubmittingTrip, tripForm, PRESET_ROUTES, selectedPresetIndex,
                showDetailModal, activeTripDetail, isLoadingDetail, isConsolidating, isExecutingAction,
                detailActiveTab, eligibleAssignments, isLoadingEligible, eligibleSearchQuery, selectedEligibleCodes,
                filteredEligibleAssignments, selectedEligibleWeight, isConsolidatingSelected,
                selectedStopToAdd, availableHubsToAdd, addNewStop, getHubDisplayName, getHubAddress,
                applyPresetRoute, addStopCode, removeStopCode, submitCreateTrip,
                openTripDetail, handleAutoConsolidate, handleConsolidateSelected, toggleSelectAllEligible,
                handleRemoveItem, handleDepartTrip, handleArriveNextStop,
                getStatusBadge, getWeightColor,
                formatDateTime, getCountdownText, getCountdownBadgeClass, getCalculatedCutoffText,
                getTripStatusLabel, getTripStatusBadgeClass,
                getExpressCount, getStandardCount, printTripManifest,
                isReadyForDeparture,
                currentPage, pageSize, totalPages, paginatedTrips, startIndex, endIndex, goToPage,
                switchDetailTab, activeManifests,
                currentPresets, setTripType, isFeederTrip,
                transportMode, linehaulTrips, feederTrips, linehaulTripsCount, feederTripsCount,
                feederDirectionTab, feederVehiclePlate, feederDriverName, selectedFeederStation,
                shipmentsList, isLoadingShipments, isFeederActionRunning, loadShipmentsData,
                pendingFeederItems, totalFeederWeight, incomingFeederItems, totalIncomingFeederWeight,
                handleDispatchFeederItem, handleDispatchAllFeeder,
                handleReceiveIncomingFeeder, handleReceiveAllIncomingFeeder,
                getOriginPostOfficeInfo, getDestPostOfficeInfo,
                openCreateTripModal, HUB_COORDINATES, currentStep
            };
        },
        template: `
        <div :class="embedded ? 'space-y-3.5 text-slate-800' : 'p-5 max-w-7xl mx-auto space-y-4 text-slate-800'">
            <!-- 1. HERO BANNER VNPT GRADIENT -->
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider border border-white/20">
                                TRUNG TÂM ĐIỀU VẬN VNPT
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông Việt Nam</span>
                        </div>
                        <h1 class="text-base sm:text-xl font-extrabold tracking-tight mt-1 text-white">
                            Quản Lý &amp; Điều Phối Chuyến Xe Vận Tải
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal max-w-2xl">
                            Mô hình quy trình 3 chặng khép kín: Gom hàng từ bưu cục ➔ Xe container trục liên tỉnh ➔ Phát hàng về bưu cục đích.
                        </p>
                    </div>

                    <!-- Thống kê nhanh KPI 3 Chặng -->
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <div class="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[80px]">
                            <div class="text-base font-black leading-tight">{{ pendingFeederItems.length }}</div>
                            <div class="text-[10px] text-blue-100 uppercase font-semibold">Chờ Gom Đi</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[80px]">
                            <div class="text-base font-black leading-tight text-amber-300">{{ linehaulTrips.filter(t => t.status === 'IN_TRANSIT').length }}</div>
                            <div class="text-[10px] text-blue-100 uppercase font-semibold">Xe Trục Chạy</div>
                        </div>
                        <div class="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-center min-w-[80px]">
                            <div class="text-base font-black leading-tight text-emerald-300">{{ incomingFeederItems.length }}</div>
                            <div class="text-[10px] text-blue-100 uppercase font-semibold">Chờ Phát Về</div>
                        </div>
                        <button 
                            @click="loadTrips(); loadShipmentsData()" 
                            :disabled="isLoading || isLoadingShipments"
                            class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20 cursor-pointer flex items-center space-x-1.5"
                            title="Làm mới dữ liệu"
                        >
                            <span v-if="isLoading || isLoadingShipments" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin block"></span>
                            <span>Làm Mới</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 2. THANH TIẾN TRÌNH 3 BƯỚC TRỰC QUAN (3-STEP PIPELINE) -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <!-- BƯỚC 1 -->
                <button 
                    type="button"
                    @click="currentStep = 1; transportMode = 'FEEDER'"
                    :class="currentStep === 1 ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                    class="p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start space-x-3 group cursor-pointer"
                >
                    <div 
                        :class="currentStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'"
                        class="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition"
                    >
                        01
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <div class="font-bold text-[11px] uppercase tracking-wider text-slate-500">Chặng Gom Hàng</div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                {{ pendingFeederItems.length }} kiện
                            </span>
                        </div>
                        <div class="font-extrabold text-xs sm:text-sm mt-0.5 truncate" :class="currentStep === 1 ? 'text-blue-900' : 'text-slate-800'">
                            Bưu Cục ➔ Kho Tổng
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Xe tải 1.5T gom hàng quầy</div>
                    </div>
                </button>

                <!-- BƯỚC 2 -->
                <button 
                    type="button"
                    @click="currentStep = 2; transportMode = 'LINEHAUL'"
                    :class="currentStep === 2 ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                    class="p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start space-x-3 group cursor-pointer"
                >
                    <div 
                        :class="currentStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'"
                        class="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition"
                    >
                        02
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <div class="font-bold text-[11px] uppercase tracking-wider text-slate-500">Trục Quốc Lộ 1A</div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                {{ linehaulTrips.length }} xe
                            </span>
                        </div>
                        <div class="font-extrabold text-xs sm:text-sm mt-0.5 truncate" :class="currentStep === 2 ? 'text-blue-900' : 'text-slate-800'">
                            Xe Container Liên Tỉnh
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Đầu kéo 30T kết nối 5 Kho Tổng</div>
                    </div>
                </button>

                <!-- BƯỚC 3 -->
                <button 
                    type="button"
                    @click="currentStep = 3; transportMode = 'FEEDER'"
                    :class="currentStep === 3 ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm ring-2 ring-blue-500/20' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
                    class="p-3.5 rounded-xl border-2 text-left transition-all duration-200 flex items-start space-x-3 group cursor-pointer"
                >
                    <div 
                        :class="currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'"
                        class="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs shrink-0 transition"
                    >
                        03
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <div class="font-bold text-[11px] uppercase tracking-wider text-slate-500">Chặng Phát Hàng</div>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {{ incomingFeederItems.length }} kiện
                            </span>
                        </div>
                        <div class="font-extrabold text-xs sm:text-sm mt-0.5 truncate" :class="currentStep === 3 ? 'text-blue-900' : 'text-slate-800'">
                            Kho Tổng ➔ Bưu Cục Phát
                        </div>
                        <div class="text-[11px] text-slate-500 mt-0.5">Xe tải 1.5T dỡ hàng cho shipper</div>
                    </div>
                </button>
            </div>

            <!-- ========================================================================= -->
            <!-- NỘI DUNG: BƯỚC 1 - GOM HÀNG VỀ KHO TỔNG                                   -->
            <!-- ========================================================================= -->
            <div v-if="currentStep === 1" class="space-y-3">
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="font-bold text-slate-700">Lọc Bưu Cục Gom:</span>
                        <select v-model="selectedFeederStation" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="ALL">Toàn Bộ Bưu Cục ({{ pendingFeederItems.length }} kiện)</option>
                            <option value="POST-HN-CG">Bưu Cục Cầu Giấy (Hà Nội)</option>
                            <option value="POST-HN-DDA">Bưu Cục Đống Đa (Hà Nội)</option>
                            <option value="POST-HN-HBT">Bưu Cục Hai Bà Trưng (Hà Nội)</option>
                            <option value="POST-HN-TX">Bưu Cục Thanh Xuân (Hà Nội)</option>
                            <option value="POST-HN-HD">Bưu Cục Hà Đông (Hà Nội)</option>
                            <option value="POST-HCM-Q1">Bưu Cục Bến Nghé (Quận 1 - TP.HCM)</option>
                            <option value="POST-HCM-TB">Bưu Cục Tân Bình (TP.HCM)</option>
                            <option value="POST-HCM-BT">Bưu Cục Bình Thạnh (TP.HCM)</option>
                            <option value="POST-HCM-TD">Bưu Cục TP. Thủ Đức</option>
                            <option value="POST-HCM-Q7">Bưu Cục Quận 7 (TP.HCM)</option>
                            <option value="POST-DN-HC">Bưu Cục Hải Châu (Đà Nẵng)</option>
                            <option value="POST-DN-TK">Bưu Cục Thanh Khê (Đà Nẵng)</option>
                            <option value="POST-DN-ST">Bưu Cục Sơn Trà (Đà Nẵng)</option>
                            <option value="POST-HP-NQ">Bưu Cục Ngô Quyền (Hải Phòng)</option>
                            <option value="POST-CT-NK">Bưu Cục Ninh Kiều (Cần Thơ)</option>
                        </select>

                        <div class="h-4 w-px bg-slate-300 mx-1 hidden sm:block"></div>

                        <div class="flex items-center space-x-1.5 text-slate-600">
                            <span class="text-slate-400">Xe gom:</span>
                            <input type="text" v-model="feederVehiclePlate" class="px-2 py-1 rounded border border-slate-200 bg-slate-50 font-mono font-bold text-slate-700 w-36 text-xs" />
                            <span class="text-slate-400">Tài xế:</span>
                            <input type="text" v-model="feederDriverName" class="px-2 py-1 rounded border border-slate-200 bg-slate-50 font-bold text-slate-700 w-28 text-xs" />
                        </div>
                    </div>

                    <button 
                        @click="handleDispatchAllFeeder"
                        :disabled="pendingFeederItems.length === 0 || isFeederActionRunning"
                        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-40 flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                        <span v-if="isFeederActionRunning" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Xuất Xe Gom Hàng Loạt ({{ pendingFeederItems.length }} Kiện - {{ totalFeederWeight.toFixed(1) }} kg)</span>
                    </button>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                    <div class="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                        <span class="font-extrabold uppercase tracking-wider text-slate-700 text-[11px]">
                            Danh Sách Bưu Phẩm Tại Quầy Đang Chờ Xe Gom Về Kho Tổng
                        </span>
                        <span class="text-slate-500 font-medium">Tổng khối lượng: <strong class="text-blue-700">{{ totalFeederWeight.toFixed(1) }} kg</strong></span>
                    </div>

                    <div v-if="pendingFeederItems.length === 0" class="p-12 text-center text-slate-400">
                        Không có bưu phẩm nào đang chờ gom tại bưu cục đã chọn.
                    </div>

                    <table v-else class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Bưu Cục Nhận (Nguồn)</th>
                                <th class="py-2.5 px-3">Kho Tổng Tiếp Nhận</th>
                                <th class="py-2.5 px-3">Thời Gian Tiếp Nhận</th>
                                <th class="py-2.5 px-3">Người Nhận &amp; Địa Chỉ</th>
                                <th class="py-2.5 px-3">Khối Lượng</th>
                                <th class="py-2.5 px-3 text-right">Tác Nghiệp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in pendingFeederItems" :key="item.id || item.trackingCode" class="hover:bg-blue-50/40 transition">
                                <td class="py-2.5 px-3 font-mono font-bold text-blue-700">
                                    <button type="button" @click="viewTracking(item.trackingCode)" class="hover:underline cursor-pointer">
                                        {{ item.trackingCode }}
                                    </button>
                                </td>
                                <td class="py-2.5 px-3 text-slate-800 font-semibold">{{ getOriginPostOfficeInfo(item).name }} ({{ getOriginPostOfficeInfo(item).code }})</td>
                                <td class="py-2.5 px-3 text-indigo-700 font-bold">{{ item.sourceHub || 'HUB-HN-01' }}</td>
                                <td class="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{{ formatDateTime(item.createdAt || item.updatedAt) }}</td>
                                <td class="py-2.5 px-3 max-w-xs truncate text-slate-700"><span class="font-bold">{{ item.receiverName }}</span> - {{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono">{{ item.weight || 0 }} kg</td>
                                <td class="py-2.5 px-3 text-right">
                                    <button 
                                        @click="handleDispatchFeederItem(item)"
                                        :disabled="isFeederActionRunning"
                                        class="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 rounded-md font-bold text-[11px] transition shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                        Lên Xe Gom
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ========================================================================= -->
            <!-- NỘI DUNG: BƯỚC 2 - XE CONTAINER TRỤC LIÊN TỈNH                           -->
            <!-- ========================================================================= -->
            <div v-else-if="currentStep === 2" class="space-y-3">
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <!-- HƯỚNG XE: XUẤT BẾN vs CẬP BẾN -->
                    <div class="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
                        <button 
                            type="button"
                            @click="tripDirectionTab = 'OUTBOUND'"
                            :class="tripDirectionTab === 'OUTBOUND' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                            class="px-3 py-1.5 rounded-md transition text-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                            <span>Xe Xuất Bến (Đi)</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold font-mono">{{ kpiStats.outboundCount }}</span>
                        </button>
                        <button 
                            type="button"
                            @click="tripDirectionTab = 'INBOUND'"
                            :class="tripDirectionTab === 'INBOUND' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-500 hover:text-slate-800'"
                            class="px-3 py-1.5 rounded-md transition text-xs flex items-center space-x-1.5 cursor-pointer"
                        >
                            <span>Xe Cập Bến &amp; Dỡ Hàng (Đến)</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold font-mono">{{ kpiStats.inboundCount }}</span>
                        </button>
                    </div>

                    <div class="flex items-center space-x-2">
                        <select v-model="selectedStationHub" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500/20">
                            <option value="ALL">Toàn Bộ 5 Kho Tổng</option>
                            <option value="HUB-HN-01">Kho Tổng Hà Nội (HUB-HN-01)</option>
                            <option value="HUB-DN-01">Kho Tổng Đà Nẵng (HUB-DN-01)</option>
                            <option value="HUB-HCM-01">Kho Tổng TP.HCM (HUB-HCM-01)</option>
                            <option value="HUB-HP-01">Kho Tổng Hải Phòng (HUB-HP-01)</option>
                            <option value="HUB-CT-01">Kho Tổng Cần Thơ (HUB-CT-01)</option>
                        </select>
                        <button 
                            @click="toggleSchedulerMode()"
                            :disabled="isUpdatingScheduler"
                            class="px-3 py-1.5 rounded-lg font-bold transition flex items-center space-x-1.5 border text-xs cursor-pointer"
                            :class="schedulerConfig.mode === 'AUTO' ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'"
                            title="Nhấn để chuyển đổi chế độ lập lịch gom hàng tự động hoặc thủ công"
                        >
                            <span>Lịch Chạy:</span>
                            <span class="font-extrabold">{{ schedulerConfig.mode === 'AUTO' ? 'Tự Động (' + schedulerConfig.intervalMinutes + ' phút/chuyến)' : 'Thủ Công' }}</span>
                        </button>
                        <button 
                            @click="openCreateTripModal('LINEHAUL')"
                            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm transition cursor-pointer"
                        >
                            + Lập Chuyến Container Mới
                        </button>
                    </div>
                </div>

                <!-- DANH SÁCH CHUYẾN XE CONTAINER -->
                <div v-if="filteredTrips.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
                    Không có chuyến xe container nào phù hợp với bộ lọc hiện tại.
                </div>

                <div v-else class="grid grid-cols-1 gap-3 text-xs">
                    <div 
                        v-for="trip in filteredTrips" 
                        :key="trip.id"
                        class="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 shadow-sm transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                        <!-- THÔNG TIN CHUYẾN -->
                        <div class="space-y-1.5 flex-1">
                            <div class="flex items-center space-x-2">
                                <span class="font-mono font-black text-sm text-blue-800">{{ trip.tripCode }}</span>
                                <span 
                                    :class="['px-2 py-0.5 rounded text-[10px] font-bold border uppercase', getStatusBadge(trip.status)]"
                                >
                                    {{ getTripStatusLabel(trip) }}
                                </span>
                                <span class="text-xs text-slate-400">|</span>
                                <span class="font-bold text-xs text-slate-700">{{ trip.routeName || 'Trục Bắc Nam QL1A' }}</span>
                            </div>

                            <div class="text-xs text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <div><span class="text-slate-400">Đầu kéo:</span> <strong class="font-mono text-slate-800">{{ trip.vehiclePlate || '29H-999.88' }}</strong></div>
                                <div><span class="text-slate-400">Tài xế:</span> <strong class="text-slate-800">{{ trip.driverName || 'Nguyễn Văn Thắng' }}</strong></div>
                                <div><span class="text-slate-400">Tải trọng:</span> <strong class="text-blue-700">{{ (trip.currentWeight || 0).toFixed(1) }} / {{ trip.capacity || 30 }} Tấn</strong></div>
                            </div>

                            <!-- LỘ TRÌNH RÚT GỌN -->
                            <div class="flex items-center space-x-2 text-[11px] text-slate-500 pt-0.5">
                                <span class="font-bold text-slate-700">{{ trip.originHub }}</span>
                                <span>➔</span>
                                <span v-if="trip.stops && trip.stops.length > 2" class="text-slate-400">
                                    {{ trip.stops.slice(1, -1).map(s => s.hubCode).join(' ➔ ') }} ➔
                                </span>
                                <span class="font-bold text-slate-700">{{ trip.destinationHub }}</span>
                            </div>

                            <!-- THỜI GIAN LẬP LỊCH & ĐIỀU ĐỘ -->
                            <div class="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 mt-1.5">
                                <div class="flex items-center space-x-1">
                                    <span class="text-slate-400 font-medium">Lịch chạy:</span>
                                    <span class="font-mono font-bold text-slate-800">{{ formatDateTime(trip.scheduledDepartureTime) }}</span>
                                </div>
                                <div class="flex items-center space-x-1" v-if="trip.cutoffTime || trip.scheduledDepartureTime">
                                    <span class="text-slate-400 font-medium">Đóng sổ (Cut-off):</span>
                                    <span class="font-mono font-medium text-slate-700">{{ formatDateTime(trip.cutoffTime || trip.scheduledDepartureTime) }}</span>
                                </div>
                                <span 
                                    v-if="trip.scheduledDepartureTime"
                                    :class="['px-2 py-0.5 rounded text-[10.5px]', getCountdownBadgeClass(trip)]"
                                >
                                    {{ getCountdownText(trip) }}
                                </span>
                                <div v-if="trip.departureTime" class="flex items-center space-x-1 text-blue-700">
                                    <span class="text-slate-400 font-medium">Xuất bến lúc:</span>
                                    <span class="font-mono font-bold">{{ formatDateTime(trip.departureTime) }}</span>
                                </div>
                                <div v-if="trip.arrivalTime" class="flex items-center space-x-1 text-emerald-700">
                                    <span class="text-slate-400 font-medium">Cập bến lúc:</span>
                                    <span class="font-mono font-bold">{{ formatDateTime(trip.arrivalTime) }}</span>
                                </div>
                            </div>
                        </div>

                        <!-- NÚT TÁC NGHIỆP 1 CHẠM -->
                        <div class="flex items-center space-x-2 self-end md:self-center shrink-0">
                            <button 
                                @click="openTripDetail(trip.id)"
                                class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition border border-slate-200 cursor-pointer"
                            >
                                Chi Tiết &amp; Bản Đồ
                            </button>

                            <!-- NÚT XUẤT BẾN (OUTBOUND) -->
                            <button 
                                v-if="tripDirectionTab === 'OUTBOUND' && trip.status === 'SCHEDULED'"
                                @click="handleDepartTrip(trip.id)"
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
                            >
                                Xuất Bến Ngay
                            </button>

                            <span 
                                v-else-if="tripDirectionTab === 'OUTBOUND' && trip.status === 'IN_TRANSIT'"
                                class="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs rounded-lg inline-flex items-center space-x-1.5"
                            >
                                <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                <span>Đang Lưu Thông QL1A</span>
                            </span>

                            <!-- NÚT CẬP BẾN & DỠ HÀNG (INBOUND) -->
                            <button 
                                v-if="tripDirectionTab === 'INBOUND' && trip.status === 'IN_TRANSIT'"
                                @click="handleArriveAtStation(trip, selectedStationHub)"
                                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
                            >
                                Xác Nhận Cập Bến &amp; Dỡ Hàng
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ========================================================================= -->
            <!-- NỘI DUNG: BƯỚC 3 - PHÁT HÀNG VỀ BƯU CỤC                                   -->
            <!-- ========================================================================= -->
            <div v-else-if="currentStep === 3" class="space-y-3">
                <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div class="flex items-center space-x-2">
                        <span class="font-bold text-slate-700">Bưu Cục Phát Đích:</span>
                        <select v-model="selectedFeederStation" class="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-emerald-500/20">
                            <option value="ALL">Toàn Bộ Bưu Cục Phát ({{ incomingFeederItems.length }} kiện)</option>
                            <option value="POST-HN-CG">Bưu Cục Cầu Giấy (Hà Nội)</option>
                            <option value="POST-HN-DDA">Bưu Cục Đống Đa (Hà Nội)</option>
                            <option value="POST-HN-HBT">Bưu Cục Hai Bà Trưng (Hà Nội)</option>
                            <option value="POST-HN-TX">Bưu Cục Thanh Xuân (Hà Nội)</option>
                            <option value="POST-HN-HD">Bưu Cục Hà Đông (Hà Nội)</option>
                            <option value="POST-HCM-Q1">Bưu Cục Bến Nghé (Quận 1 - TP.HCM)</option>
                            <option value="POST-HCM-TB">Bưu Cục Tân Bình (TP.HCM)</option>
                            <option value="POST-HCM-BT">Bưu Cục Bình Thạnh (TP.HCM)</option>
                            <option value="POST-HCM-TD">Bưu Cục TP. Thủ Đức</option>
                            <option value="POST-HCM-Q7">Bưu Cục Quận 7 (TP.HCM)</option>
                            <option value="POST-DN-HC">Bưu Cục Hải Châu (Đà Nẵng)</option>
                            <option value="POST-DN-TK">Bưu Cục Thanh Khê (Đà Nẵng)</option>
                            <option value="POST-DN-ST">Bưu Cục Sơn Trà (Đà Nẵng)</option>
                            <option value="POST-HP-NQ">Bưu Cục Ngô Quyền (Hải Phòng)</option>
                            <option value="POST-CT-NK">Bưu Cục Ninh Kiều (Cần Thơ)</option>
                        </select>
                    </div>

                    <button 
                        @click="handleReceiveAllIncomingFeeder"
                        :disabled="incomingFeederItems.length === 0 || isFeederActionRunning"
                        class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-40 flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
                    >
                        <span v-if="isFeederActionRunning" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Dỡ Hàng Toàn Bộ Vào Bưu Cục Phát ({{ incomingFeederItems.length }} Kiện)</span>
                    </button>
                </div>

                <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-xs">
                    <div class="p-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                        <div class="space-y-0.5">
                            <span class="font-extrabold uppercase tracking-wider text-slate-700 text-[11px] block">
                                Bưu Phẩm Đã Dỡ Xe Trục Tại Kho Tổng Đích ➔ Chờ Xe Chuyển Về Bưu Cục Phát
                            </span>
                            <span class="text-[11px] text-emerald-700 font-semibold">
                                ✓ Đã đồng bộ: Chỉ hiển thị các đơn mà xe container liên tỉnh đã cập bến Kho Tổng đích thành công
                            </span>
                        </div>
                    </div>

                    <div v-if="incomingFeederItems.length === 0" class="p-12 text-center text-slate-400">
                        Hiện không có kiện hàng nào chờ phát về bưu cục đã chọn.
                    </div>

                    <table v-else class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Kho Tổng Đích Đã Cập Bến</th>
                                <th class="py-2.5 px-3">Bưu Cục Phát Cuối</th>
                                <th class="py-2.5 px-3">Thời Gian Tiếp Nhận</th>
                                <th class="py-2.5 px-3">Người Nhận &amp; Địa Chỉ</th>
                                <th class="py-2.5 px-3">Khối Lượng</th>
                                <th class="py-2.5 px-3 text-right">Tác Nghiệp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in incomingFeederItems" :key="item.id || item.trackingCode" class="hover:bg-emerald-50/40 transition">
                                <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                    <button type="button" @click="viewTracking(item.trackingCode)" class="hover:underline cursor-pointer">
                                        {{ item.trackingCode }}
                                    </button>
                                </td>
                                <td class="py-2.5 px-3 text-indigo-700 font-bold">{{ item.destinationHub || item.sourceHub || 'HUB' }}</td>
                                <td class="py-2.5 px-3 text-slate-800 font-semibold">{{ getDestPostOfficeInfo(item).name }} ({{ getDestPostOfficeInfo(item).code }})</td>
                                <td class="py-2.5 px-3 font-mono text-slate-600 text-[11px]">{{ formatDateTime(item.updatedAt || item.createdAt) }}</td>
                                <td class="py-2.5 px-3 max-w-xs truncate text-slate-700"><span class="font-bold">{{ item.receiverName }}</span> - {{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono">{{ item.weight || 0 }} kg</td>
                                <td class="py-2.5 px-3 text-right">
                                    <button 
                                        @click="handleReceiveIncomingFeeder(item)"
                                        :disabled="isFeederActionRunning"
                                        class="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold text-[11px] transition shadow-xs disabled:opacity-50 cursor-pointer"
                                    >
                                        Dỡ Vào Bưu Cục
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- ================================================================= -->
            <!-- MODAL 1: LẬP CHUYẾN XE MỚI (BỐ CỤC 2 CỘT GỌN GÀNG KHÔNG TRÀN)     -->
            <!-- ================================================================= -->
            <teleport to="body">
            <Transition name="modal">
            <div v-if="showCreateModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden">
                    <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider">Khởi Tạo Chuyến Xe Trục Tuyến Đa Điểm</h3>
                            <p class="text-xs text-slate-500 mt-0.5">Lập kế hoạch xe container luân chuyển liên tỉnh</p>
                        </div>
                        <button @click="showCreateModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-md">✕</button>
                    </div>

                    <form @submit.prevent="submitCreateTrip" class="p-5 space-y-4 text-xs">
                        <!-- 1. Bộ Chọn Phân Loại Chuyến Xe (Xe Trục Tuyến Chính vs Xe Trung Chuyển Nội Đô) -->
                        <div>
                            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1.5">
                                Phân Loại Nghiệp Vụ Chuyến Xe
                            </label>
                            <div class="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                                <button 
                                    type="button"
                                    @click="setTripType('LINEHAUL')"
                                    :class="[
                                        'py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5',
                                        tripForm.tripType === 'LINEHAUL' ? 'bg-white text-blue-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                                    ]"
                                >
                                    <span>Xe Trục Liên Tỉnh (Linehaul)</span>
                                </button>
                                <button 
                                    type="button"
                                    @click="setTripType('FEEDER')"
                                    :class="[
                                        'py-1.5 px-3 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5',
                                        tripForm.tripType === 'FEEDER' ? 'bg-white text-purple-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                                    ]"
                                >
                                    <span>Xe Trung Chuyển Nội Đô (Feeder)</span>
                                </button>
                            </div>
                            <p v-if="tripForm.tripType === 'LINEHAUL'" class="text-[10px] text-blue-600 mt-1">
                                • <b>Xe Trục Liên Tỉnh</b>: Xe tải lớn chỉ dừng và gom đơn giữa <b>5 Kho Tổng Cấp 1</b> (Hà Nội, Hải Phòng, Đà Nẵng, TP.HCM, Cần Thơ).
                            </p>
                            <p v-else class="text-[10px] text-purple-600 mt-1">
                                • <b>Xe Trung Chuyển Nội Đô</b>: Thu gom / phát trả hàng hóa giữa Kho Tổng mẹ và các <b>Bưu Cục con trực thuộc</b>.
                            </p>
                        </div>

                        <!-- 2. Tuyến mẫu nhanh dạng Grid Buttons -->
                        <div>
                            <label class="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1.5">
                                Chọn Tuyến Mẫu Nhanh
                            </label>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button 
                                    type="button"
                                    v-for="(p, idx) in currentPresets" 
                                    :key="p.name"
                                    @click="applyPresetRoute(idx)"
                                    :class="[
                                        'p-2 rounded-lg border text-left transition text-xs',
                                        selectedPresetIndex === idx ? 'border-2 border-blue-600 bg-blue-50/70 text-blue-800 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                                    ]"
                                >
                                    <div class="truncate">{{ p.name }}</div>
                                    <div class="text-[10px] text-slate-400 font-normal mt-0.5">{{ p.stops.length }} trạm dừng</div>
                                </button>
                            </div>
                        </div>

                        <!-- Bố Cục 2 Cột Cân Đối -->
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <!-- Cột Trái: Thông Tin Tuyến & Xe -->
                            <div class="space-y-3">
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Tên Tuyến Xe *</label>
                                    <input v-model="tripForm.routeName" type="text" required class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-medium" />
                                </div>
                                <div>
                                    <label class="block font-semibold text-slate-700 mb-1">Mã Chuyến (Tự sinh nếu trống)</label>
                                    <input v-model="tripForm.tripCode" type="text" placeholder="TRIP-..." class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-mono" />
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1">Biển Số Xe *</label>
                                        <input v-model="tripForm.vehiclePlate" type="text" required class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-mono font-bold" />
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1">Tài Xế *</label>
                                        <input v-model="tripForm.driverName" type="text" required class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-medium" />
                                    </div>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1">Tải Trọng Tối Đa (kg) *</label>
                                        <input v-model="tripForm.maxWeight" type="number" step="100" min="100" max="30000" required class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-medium" />
                                    </div>
                                    <div>
                                        <label class="block font-semibold text-slate-700 mb-1">Chặn Gom (Cut-off)</label>
                                        <select v-model="tripForm.cutoffBufferMinutes" class="w-full rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none font-medium">
                                            <option :value="15">Trước 15 phút</option>
                                            <option :value="30">Trước 30 phút (Chuẩn)</option>
                                            <option :value="45">Trước 45 phút</option>
                                            <option :value="60">Trước 60 phút</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Cột Phải: Lịch Trình & Các Trạm Dừng -->
                            <div class="space-y-3">
                                <div class="p-3 bg-blue-50/50 rounded-lg border border-blue-200 space-y-1.5">
                                    <div class="flex items-center justify-between">
                                        <label class="font-bold text-blue-900 text-xs">Lịch Xuất Bến Kế Hoạch *</label>
                                        <span class="text-[11px] text-blue-700 font-mono">Cut-off: <b>{{ getCalculatedCutoffText(tripForm.scheduledDepartureTime, tripForm.cutoffBufferMinutes) }}</b></span>
                                    </div>
                                    <input v-model="tripForm.scheduledDepartureTime" type="datetime-local" required class="w-full rounded-lg border border-blue-300 px-3 py-1.5 bg-white outline-none font-medium text-xs" />
                                    <p class="text-[10px] text-blue-600/80">
                                        Sau mốc Cut-off, xe sẽ đóng sổ không nhận thêm đơn mới để kho bãi in bảng kê và xếp hàng.
                                    </p>
                                </div>

                                <div>
                                    <label class="block font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-1.5">
                                        Thứ Tự Lộ Trình Các Trạm Dừng ({{ tripForm.stopHubCodes.length }} Trạm)
                                    </label>
                                    <div class="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                                        <div v-for="(code, sIdx) in tripForm.stopHubCodes" :key="sIdx" class="flex items-center justify-between p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                                            <span class="font-medium text-slate-700">
                                                <b>{{ sIdx + 1 }}.</b> {{ getHubDisplayName(code) }}
                                                <span class="font-mono text-blue-600 ml-1 text-[11px]">({{ code }})</span>
                                            </span>
                                            <button 
                                                type="button"
                                                @click="removeStopCode(sIdx)"
                                                class="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded text-xs"
                                            >
                                                Xóa
                                            </button>
                                        </div>
                                    </div>
                                    <div v-if="availableHubsToAdd.length > 0" class="flex items-center space-x-1.5 pt-2">
                                        <select v-model="selectedStopToAdd" class="flex-1 rounded-lg border border-slate-200 px-2.5 py-1 bg-white text-xs outline-none">
                                            <option value="">-- {{ tripForm.tripType === 'LINEHAUL' ? 'Chọn Kho Tổng Cấp 1 thêm vào tuyến' : 'Chọn Bưu Cục / Hub thêm vào tuyến' }} --</option>
                                            <option v-for="h in availableHubsToAdd" :key="h.hubCode" :value="h.hubCode">
                                                {{ (h.hubLevel === 1 || (h.hubCode && h.hubCode.startsWith('HUB-'))) ? '[Kho Tổng] ' : '[Bưu Cục] ' }}{{ h.hubName || h.hubCode }} ({{ h.hubCode }})
                                            </option>
                                        </select>
                                        <button 
                                            type="button"
                                            @click="addNewStop"
                                            :disabled="!selectedStopToAdd"
                                            class="px-3 py-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white font-bold rounded-lg text-xs transition"
                                        >
                                            Thêm Trạm
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Footer Modal -->
                        <div class="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                            <button type="button" @click="showCreateModal = false" class="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition">
                                Hủy Bỏ
                            </button>
                            <button type="submit" :disabled="isSubmittingTrip" class="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm shadow-blue-500/20 transition">
                                {{ isSubmittingTrip ? 'Đang Khởi Tạo...' : 'Xác Nhận Lập Chuyến' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
            </Transition>
            </teleport>

            <!-- ================================================================= -->
            <!-- MODAL 2: CHI TIẾT CHUYẾN XE (3 SUBTABS CHUYÊN BIỆT CHUẨN B2B)    -->
            <!-- ================================================================= -->
            <teleport to="body">
            <Transition name="modal">
            <div v-if="showDetailModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
                    
                    <!-- Header Modal -->
                    <div class="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                        <div>
                            <div class="flex items-center space-x-2">
                                <h3 class="font-extrabold text-sm text-slate-900">Chuyến Xe {{ activeTripDetail?.tripCode }}</h3>
                                <span :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', getStatusBadge(activeTripDetail?.status)]">
                                    {{ activeTripDetail?.status }}
                                </span>
                                <span v-if="isReadyForDeparture(activeTripDetail)" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Sẵn Sàng Xuất Bến
                                </span>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 mt-1">
                                <span>{{ activeTripDetail?.routeName }} | Xe: <b>{{ activeTripDetail?.vehiclePlate }}</b> ({{ activeTripDetail?.driverName }})</span>
                                <span class="text-slate-300">|</span>
                                <span>Lịch đi: <b class="text-slate-700">{{ formatDateTime(activeTripDetail?.scheduledDepartureTime) }}</b></span>
                                <span class="text-slate-300">|</span>
                                <span>Cut-off: <b class="text-slate-700">{{ formatDateTime(activeTripDetail?.cutoffTime) }}</b></span>
                                <span 
                                    v-if="activeTripDetail?.status === 'SCHEDULED'"
                                    :class="[
                                        'px-1.5 py-0.5 rounded text-[10px] tracking-tight',
                                        getCountdownBadgeClass(activeTripDetail)
                                    ]"
                                >
                                    {{ getCountdownText(activeTripDetail) }}
                                </span>
                            </div>
                        </div>

                        <div class="flex items-center space-x-2">
                            <button 
                                type="button"
                                @click="printTripManifest(activeTripDetail)"
                                class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-xs transition shadow-sm"
                                title="In Bảng Kê Vận Đơn Khổ A4 bàn giao tài xế và kho bãi"
                            >
                                In Bảng Kê (A4)
                            </button>
                            <button @click="showDetailModal = false" class="text-slate-400 hover:text-slate-600 font-bold text-sm p-1 rounded-md">✕</button>
                        </div>
                    </div>

                    <!-- Subtabs Điều Hướng Modal (Chuẩn Gạch Chân B2B) -->
                    <div class="px-5 bg-white border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                        <div class="flex space-x-5">
                            <button 
                                type="button" 
                                @click="switchDetailTab('route')" 
                                :class="[
                                    'pb-2.5 pt-2.5 text-xs font-bold transition border-b-2',
                                    detailActiveTab === 'route' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                                ]"
                            >
                                Lộ Trình &amp; Bản Đồ
                            </button>
                            <button 
                                type="button" 
                                @click="switchDetailTab('manifests')" 
                                :class="[
                                    'pb-2.5 pt-2.5 text-xs font-bold transition border-b-2',
                                    detailActiveTab === 'manifests' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                                ]"
                            >
                                Kiện Hàng Trên Xe ({{ activeManifests?.length || 0 }})
                            </button>
                            <button 
                                v-if="activeTripDetail?.status === 'SCHEDULED'"
                                type="button" 
                                @click="switchDetailTab('eligible')" 
                                :class="[
                                    'pb-2.5 pt-2.5 text-xs font-bold transition border-b-2',
                                    detailActiveTab === 'eligible' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                                ]"
                            >
                                Đơn Hàng Chờ Xếp Xe ({{ eligibleAssignments.length }})
                            </button>
                        </div>
                        <div class="text-xs text-slate-500">
                            Tải trọng: <b class="text-slate-800">{{ activeTripDetail?.currentWeight || 0 }}</b> / {{ activeTripDetail?.maxWeight || 5000 }} kg 
                            ({{ activeTripDetail?.weightPercentage || 0 }}%)
                        </div>
                    </div>

                    <!-- Body Modal (Chuyển Tab Chuyên Biệt Không Bị Chồng Chéo) -->
                    <div class="p-5 overflow-y-auto space-y-4 text-xs flex-1">
                        
                        <!-- TAB 1: LỘ TRÌNH & BẢN ĐỒ -->
                        <div v-show="detailActiveTab === 'route'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <div class="font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-2 flex justify-between">
                                    <span>Bản Đồ Định Vị Tuyến Đường Trục</span>
                                    <span class="text-slate-400 font-normal">Google Maps hl=vi</span>
                                </div>
                                <div id="trip-leaflet-map" style="height: 380px;" class="rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 relative"></div>
                            </div>

                            <div>
                                <div class="font-bold text-slate-700 uppercase tracking-wider text-[10.5px] mb-2 flex justify-between">
                                    <span>Tiến Độ Các Chặng Dừng Dọc Tuyến</span>
                                    <button 
                                        v-if="activeTripDetail?.status === 'IN_TRANSIT'"
                                        @click="handleArriveNextStop"
                                        :disabled="isExecutingAction"
                                        class="text-blue-600 hover:underline font-bold text-[11px]"
                                    >
                                        Cập Bến Trạm Kế Tiếp
                                    </button>
                                </div>
                                <div class="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                                    <div 
                                        v-for="s in activeTripDetail?.stops" 
                                        :key="s.stopOrder"
                                        class="p-3 rounded-lg border border-slate-200/80 bg-slate-50 flex items-center justify-between"
                                    >
                                        <div>
                                            <div class="font-bold text-slate-800">
                                                Trạm {{ s.stopOrder }}: {{ getHubDisplayName(s.hubCode) }}
                                                <span class="text-blue-600 font-mono text-[11px]">({{ s.hubCode }})</span>
                                            </div>
                                            <div class="text-[11px] text-slate-500 mt-0.5">{{ s.hubAddress || getHubAddress(s.hubCode) }}</div>
                                            <div class="text-[11px] text-slate-400 mt-0.5">
                                                Đến: {{ s.arrivedAt ? new Date(s.arrivedAt).toLocaleTimeString('vi-VN') : '--:--' }} | 
                                                Đi: {{ s.departedAt ? new Date(s.departedAt).toLocaleTimeString('vi-VN') : '--:--' }}
                                            </div>
                                        </div>
                                        <span :class="['px-2 py-0.5 rounded-md font-bold text-[10px]', s.status === 'ARRIVED' ? 'bg-emerald-100 text-emerald-800' : (s.status === 'DEPARTED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600')]">
                                            {{ s.status }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- TAB 2: KIỆN HÀNG TRÊN XE (MANIFESTS) -->
                        <div v-if="detailActiveTab === 'manifests'" class="space-y-3">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div class="flex items-center space-x-2">
                                    <span class="text-slate-500 text-xs">
                                        Tổng: <b class="text-slate-800">{{ activeManifests?.length || 0 }}</b> kiện
                                    </span>
                                    <span class="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10.5px] font-bold">
                                        Hỏa tốc: {{ getExpressCount(activeManifests) }}
                                    </span>
                                    <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] font-medium">
                                        Tiêu chuẩn: {{ getStandardCount(activeManifests) }}
                                    </span>
                                </div>
                                <div class="flex items-center space-x-2" v-if="activeTripDetail?.status === 'SCHEDULED'">
                                    <button 
                                        @click="handleAutoConsolidate" 
                                        :disabled="isConsolidating"
                                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-sm text-xs"
                                    >
                                        {{ isConsolidating ? 'Đang Gom...' : 'Gom Nhanh Tất Cả' }}
                                    </button>
                                </div>
                            </div>

                            <div class="rounded-xl border border-slate-200/80 overflow-hidden">
                                <div v-if="!activeManifests || activeManifests.length === 0" class="p-8 text-center text-slate-400">
                                    Chưa có kiện hàng nào trên xe. Bạn có thể sang tab 'Đơn Hàng Chờ Xếp Xe' để tích chọn nạp đơn.
                                </div>
                                <table v-else class="min-w-full divide-y divide-slate-100">
                                    <thead class="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-600">
                                        <tr>
                                            <th class="px-4 py-2.5 text-left">Mã Vận Đơn</th>
                                            <th class="px-4 py-2.5 text-left">Chặng Vận Chuyển</th>
                                            <th class="px-4 py-2.5 text-left">Khối Lượng</th>
                                            <th class="px-4 py-2.5 text-left">Dịch Vụ</th>
                                            <th class="px-4 py-2.5 text-left">Trạng Thái Kiện</th>
                                            <th class="px-4 py-2.5 text-right" v-if="activeTripDetail?.status === 'SCHEDULED'">Thao Tác</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="m in activeManifests" :key="m.trackingCode" class="hover:bg-slate-50/50">
                                            <td class="px-4 py-2 font-mono font-bold text-blue-600 cursor-pointer hover:underline" @click="viewTracking(m.trackingCode)">
                                                {{ m.trackingCode }}
                                            </td>
                                            <td class="px-4 py-2 text-slate-700">
                                                <div><span class="font-mono text-slate-800 font-bold">{{ m.originHub }}</span> <span class="text-slate-500 font-medium">({{ getHubDisplayName(m.originHub) }})</span> đến <span class="font-mono text-slate-800 font-bold">{{ m.destinationHub }}</span> <span class="text-slate-500 font-medium">({{ getHubDisplayName(m.destinationHub) }})</span></div>
                                                <div class="text-[10.5px] text-slate-500 mt-0.5">{{ m.originHubAddress || getHubAddress(m.originHub) }} → {{ m.destinationHubAddress || getHubAddress(m.destinationHub) }}</div>
                                            </td>
                                            <td class="px-4 py-2 font-semibold text-slate-700">{{ m.weightKg }} kg</td>
                                            <td class="px-4 py-2 text-slate-500">{{ m.serviceType || 'EXPRESS' }}</td>
                                            <td class="px-4 py-2">
                                                <span :class="[
                                                    'px-2 py-0.5 rounded text-[10px] font-bold',
                                                    m.status === 'LOADED' ? 'bg-blue-50 text-blue-700' : 
                                                    (m.status === 'UNLOADED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 line-through')
                                                ]">
                                                    {{ m.status }}
                                                </span>
                                            </td>
                                            <td class="px-4 py-2 text-right" v-if="activeTripDetail?.status === 'SCHEDULED'">
                                                <button 
                                                    v-if="m.status === 'LOADED'"
                                                    @click="handleRemoveItem(m.trackingCode)"
                                                    class="text-rose-600 hover:text-rose-800 font-bold text-xs"
                                                >
                                                    Gỡ Kiện
                                                </button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- TAB 3: ĐƠN HÀNG CHỜ XẾP XE (ELIGIBLE ASSIGNMENTS) -->
                        <div v-if="detailActiveTab === 'eligible'" class="space-y-3">
                            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div class="flex-1 max-w-xs">
                                    <input 
                                        v-model="eligibleSearchQuery"
                                        type="text" 
                                        placeholder="Lọc mã đơn chờ..." 
                                        class="w-full text-xs rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50 focus:bg-white outline-none"
                                    />
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button 
                                        @click="handleConsolidateSelected"
                                        :disabled="selectedEligibleCodes.length === 0 || isConsolidatingSelected"
                                        class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-lg transition shadow-sm text-xs"
                                    >
                                        {{ isConsolidatingSelected ? 'Đang Nạp...' : 'Nạp Đơn Đã Chọn (' + selectedEligibleCodes.length + ' đơn - ' + selectedEligibleWeight + ' kg)' }}
                                    </button>
                                    <button 
                                        @click="handleAutoConsolidate"
                                        :disabled="isConsolidating"
                                        class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition shadow-sm text-xs"
                                    >
                                        {{ isConsolidating ? 'Đang Gom...' : 'Gom Nhanh Tất Cả' }}
                                    </button>
                                </div>
                            </div>

                            <div class="rounded-xl border border-slate-200/80 overflow-hidden">
                                <div v-if="isLoadingEligible" class="p-8 text-center text-slate-400">
                                    Đang quét danh sách đơn chờ hợp lệ...
                                </div>
                                <div v-else-if="filteredEligibleAssignments.length === 0" class="p-8 text-center text-slate-400">
                                    Không có đơn hàng nào khớp với lộ trình của chuyến xe này.
                                </div>
                                <table v-else class="min-w-full divide-y divide-slate-100">
                                    <thead class="bg-slate-50 text-[10.5px] uppercase font-bold text-slate-600">
                                        <tr>
                                            <th class="px-4 py-2.5 text-left w-10">
                                                <input 
                                                    type="checkbox" 
                                                    @change="toggleSelectAllEligible"
                                                    :checked="selectedEligibleCodes.length === filteredEligibleAssignments.length && filteredEligibleAssignments.length > 0"
                                                    class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </th>
                                            <th class="px-4 py-2.5 text-left">Mã Vận Đơn</th>
                                            <th class="px-4 py-2.5 text-left">Chặng Gửi</th>
                                            <th class="px-4 py-2.5 text-left">Khối Lượng</th>
                                            <th class="px-4 py-2.5 text-left">Dịch Vụ</th>
                                            <th class="px-4 py-2.5 text-left">Thời Gian Phân Tuyến</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-slate-100">
                                        <tr v-for="a in filteredEligibleAssignments" :key="a.trackingCode" class="hover:bg-slate-50/50">
                                            <td class="px-4 py-2">
                                                <input 
                                                    type="checkbox" 
                                                    :value="a.trackingCode"
                                                    v-model="selectedEligibleCodes"
                                                    class="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td class="px-4 py-2 font-mono font-bold text-blue-600 cursor-pointer hover:underline" @click="viewTracking(a.trackingCode)">
                                                {{ a.trackingCode }}
                                            </td>
                                            <td class="px-4 py-2 text-slate-700">
                                                <span class="font-mono text-slate-800">{{ a.sourceHub }}</span> đến <span class="font-mono text-slate-800">{{ a.destinationHub }}</span>
                                            </td>
                                            <td class="px-4 py-2 font-semibold text-slate-700">{{ a.weight }} kg</td>
                                            <td class="px-4 py-2 text-slate-500">{{ a.serviceType || 'EXPRESS' }}</td>
                                            <td class="px-4 py-2 text-slate-400 text-[11px]">
                                                {{ a.assignedAt ? new Date(a.assignedAt).toLocaleString('vi-VN') : '--' }}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>

                    <!-- Footer Modal -->
                    <div class="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2 flex-shrink-0">
                        <button 
                            type="button" 
                            @click="showDetailModal = false" 
                            class="px-4 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                        >
                            Đóng Cửa Sổ
                        </button>
                        <button 
                            v-if="activeTripDetail?.status === 'SCHEDULED'"
                            type="button" 
                            @click="handleDepartTrip(activeTripDetail.id)"
                            :class="[
                                'px-4 py-1.5 rounded-lg text-xs font-bold transition shadow-sm',
                                isReadyForDeparture(activeTripDetail)
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            ]"
                        >
                            Xuất Bến Chuyến Xe Này
                        </button>
                    </div>
                </div>
            </div>
            </Transition>
            </teleport>
        </div>
        `
    };

    window.TripsView = TripsView;
})();
