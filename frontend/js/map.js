/**
 * VNPT CLOUD - BẢN ĐỒ ĐỊNH VỊ & ĐIỀU PHỐI TUYẾN ĐƯỜNG (LEAFLET)
 * Tích hợp dữ liệu bản đồ tiếng Việt (Google Maps Tiles hl=vi)
 * Khẳng định chủ quyền biển đảo toàn vẹn lãnh thổ Việt Nam (Hoàng Sa & Trường Sa)
 */

(function () {
    /**
     * Bảng trạng thái ĐỒNG BỘ TUYỆT ĐỐI với enum backend
     * org.app.trackingservice.entity.ShipmentStatus.
     * Không được thêm mã ngoài danh sách này, vì backend sẽ ném lỗi ở valueOf().
     */
    const STATUS_RATIOS = {
        'CREATED': 0.0,
        'PENDING_ROUTING': 0.0,
        'ROUTE_ASSIGNED': 0.0,
        'PICKED_UP': 0.0,
        'IN_TRANSIT': 0.50,
        'ARRIVED_DEST_HUB': 1.0,
        'OUT_FOR_DELIVERY': 1.0,
        'DELIVERED': 1.0,
        'DELIVERY_FAILED': 1.0
    };

    const STATUS_NAMES = {
        'CREATED': 'Đã Tiếp Nhận Tại Bưu Cục',
        'PENDING_ROUTING': 'Đang Chờ Phân Tuyến',
        'ROUTE_ASSIGNED': 'Đã Thiết Lập Tuyến',
        'PICKED_UP': 'Đã Gom Về Kho Tổng Gửi',
        'IN_TRANSIT': 'Đang Vận Chuyển Trên Tuyến Trục',
        'ARRIVED_DEST_HUB': 'Đã Đến Kho Tổng Đích',
        'OUT_FOR_DELIVERY': 'Bưu Tá Đang Đi Phát',
        'DELIVERED': 'Giao Hàng Thành Công',
        'DELIVERY_FAILED': 'Phát Không Thành Công'
    };

    const ROUTE_CACHE_PREFIX = 'vnpt.route.v1.';

    const MapManager = {
        map: null,
        polylineLayer: null,
        markersGroup: null,
        baseLayers: {},
        layerControl: null,
        STATUS_RATIOS,
        STATUS_NAMES,
        hubCoordinates: {
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
        },

        // Đồng bộ danh bạ Hubs từ backend vào MapManager
        updateHubs(list) {
            if (!Array.isArray(list)) return;
            list.forEach(h => {
                if (h.hubCode) {
                    const existing = this.hubCoordinates[h.hubCode] || {};
                    this.hubCoordinates[h.hubCode] = {
                        ...existing,
                        name: h.hubName || existing.name || h.hubCode,
                        address: h.address || existing.address || null,
                        lat: Number(h.latitude ?? existing.lat),
                        lng: Number(h.longitude ?? existing.lng),
                        level: h.hubLevel || (h.hubType === 'POST_OFFICE' ? 2 : 1),
                        parent: h.parentHubCode || existing.parent || null,
                        district: h.district || existing.district || null,
                        province: h.province || existing.province || null
                    };
                }
            });
        },

        // Truy xuất tọa độ & thông tin Hub kèm địa chỉ chuẩn
        getHubCoord(code) {
            if (!code) return null;
            const trimmed = String(code).trim();
            const hub = this.hubCoordinates[trimmed] || this.hubCoordinates[trimmed.toUpperCase()];
            if (hub) return { code: trimmed, ...hub };
            return null;
        },

        currentContainerId: null,
        routeCache: {},
        routePoints: [],
        currentRouteKey: null,
        renderToken: 0,
        lastRatio: 0,
        markerAnimFrame: null,
        feederOriginPolyline: null,
        feederDestPolyline: null,
        lastMilePolyline: null,
        shipperMarker: null,

        // State riêng cho bản đồ chuyến xe; không dùng chung với tracking map của bưu gửi.
        tripMap: null,
        tripContainerId: null,
        tripMapOwned: false,
        tripMarkersGroup: null,
        tripStopsGroup: null,
        tripRouteLayer: null,
        tripMarker: null,
        tripMarkerAnimFrame: null,
        tripState: null,

        // Mạng lưới trạm chốt hành lang nội địa dọc QL1A và Cao tốc Bắc - Nam CT01
        vietnamCorridorWaypoints: [
            { name: 'Ninh Bình (CT01)', lat: 20.2506, lng: 105.9745 },
            { name: 'Thanh Hóa (QL1A)', lat: 19.8067, lng: 105.7852 },
            { name: 'Vinh (Nghệ An)', lat: 18.6796, lng: 105.6813 },
            { name: 'Hà Tĩnh (QL1A)', lat: 18.3560, lng: 105.9059 },
            { name: 'Đồng Hới (Quảng Bình)', lat: 17.4740, lng: 106.6225 },
            { name: 'Đông Hà (Quảng Trị)', lat: 16.8164, lng: 107.1005 },
            { name: 'Huế (QL1A)', lat: 16.4637, lng: 107.5905 },
            { name: 'Đà Nẵng (Hải Vân)', lat: 16.054407, lng: 108.202167 },
            { name: 'Quảng Ngãi (CT01)', lat: 15.1205, lng: 108.7923 },
            { name: 'Quy Nhơn (Bình Định)', lat: 13.7830, lng: 109.2197 },
            { name: 'Tuy Hòa (Phú Yên)', lat: 13.0882, lng: 109.3075 },
            { name: 'Nha Trang (Khánh Hòa)', lat: 12.2388, lng: 109.1967 },
            { name: 'Phan Rang (Ninh Thuận)', lat: 11.5658, lng: 108.9882 },
            { name: 'Phan Thiết (Bình Thuận)', lat: 10.9274, lng: 108.1021 },
            { name: 'Long Khánh (Đồng Nai)', lat: 10.9431, lng: 107.2410 }
        ],

        // Tìm Bưu cục Cấp 2/3 phù hợp với địa chỉ và Hub Tổng cha
        getPostOfficeForAddress(address, parentHubCode) {
            if (!address) return null;
            const addrLower = address.toLowerCase();
            for (const [code, h] of Object.entries(this.hubCoordinates)) {
                if (h.level === 2 && (!parentHubCode || h.parent === parentHubCode)) {
                    if (h.district && addrLower.includes(h.district.toLowerCase())) {
                        return { code, ...h };
                    }
                }
            }
            for (const [code, h] of Object.entries(this.hubCoordinates)) {
                if (h.level === 2 && h.parent === parentHubCode) {
                    return { code, ...h };
                }
            }
            return null;
        },

        // Xây dựng danh sách trạm mốc hành lang giao thông đường bộ Việt Nam (QL1A & Cao tốc Bắc - Nam CT01)
        buildVietnamWaypoints(sourceCoord, destCoord) {
            const isNorthToSouth = sourceCoord.lat > destCoord.lat;
            const minLat = Math.min(sourceCoord.lat, destCoord.lat);
            const maxLat = Math.max(sourceCoord.lat, destCoord.lat);

            // Lọc các điểm chốt hành lang nằm giữa điểm đi và điểm đến
            const intermediates = this.vietnamCorridorWaypoints.filter(wp => {
                return wp.lat > minLat + 0.35 && wp.lat < maxLat - 0.35;
            });

            if (isNorthToSouth) {
                intermediates.sort((a, b) => b.lat - a.lat);
            } else {
                intermediates.sort((a, b) => a.lat - b.lat);
            }

            return [sourceCoord, ...intermediates, destCoord];
        },

        // Khởi tạo bản đồ Leaflet với dữ liệu bản đồ tiếng Việt và lớp Chủ Quyền Quốc Gia
        init(containerId = 'tracking-map') {
            const el = document.getElementById(containerId);
            if (!el) return;

            // Nếu map đã tồn tại trên container này và đang hoạt động, chỉ cần điều chỉnh kích thước
            if (this.map && this.currentContainerId === containerId && el._leaflet_id) {
                this.map.invalidateSize();
                return;
            }

            // Nếu trip map đang dùng chung container này, xoá layer riêng trước khi huỷ map.
            if (this.tripMap === this.map) {
                this.clearTripLayers();
                this.tripMap = null;
                this.tripContainerId = null;
                this.tripMapOwned = false;
                this.tripMarkersGroup = null;
                this.tripStopsGroup = null;
            }

            // Nếu đổi sang container khác hoặc map cũ bị mất, dọn dẹp an toàn
            if (this.map) {
                try {
                    this.map.remove();
                } catch (e) {
                    console.warn('[MapManager] Dọn dẹp map cũ:', e);
                }
                this.map = null;
            }

            // Map bị huỷ thì mọi layer tham chiếu tới nó đều không còn hợp lệ.
            // Phải xoá tham chiếu, nếu không lần vẽ sau sẽ thao tác trên layer mồ côi.
            this.completedPolyline = null;
            this.remainingPolyline = null;
            this.radarMarker = null;
            this.markersGroup = null;
            this.currentRouteKey = null;
            this.lastRatio = 0;
            this.cancelPendingRenders();

            this.currentContainerId = containerId;

            // 1. Khởi tạo đối tượng Map Leaflet
            this.map = L.map(containerId, {
                zoomControl: true,
                minZoom: 4,
                maxZoom: 20
            });

            // 2. Cấu hình Tile Layers (Google Maps & Google Vệ tinh)
            const BLANK_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

            const roadLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
                attribution: '&copy; Google Bản đồ Việt Nam | Bưu chính VNPT',
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20,
                keepBuffer: 4,
                updateWhenIdle: false,
                errorTileUrl: BLANK_TILE
            });

            const hybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=vi', {
                attribution: '&copy; Google Vệ tinh | Bưu chính VNPT',
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20,
                keepBuffer: 4,
                updateWhenIdle: false,
                errorTileUrl: BLANK_TILE
            });

            // Mặc định nạp nền Google Maps đường bộ
            roadLayer.addTo(this.map);

            this.baseLayers = {
                'Google Maps': roadLayer,
                'Google Vệ tinh': hybridLayer
            };

            // 3. Nhóm marker dành cho các Bưu cục và tuyến đường vận chuyển (được xóa/vẽ lại theo đơn hàng)
            this.markersGroup = L.layerGroup().addTo(this.map);

            // 4. Thêm Trình chọn Layer (Layer Switcher)
            this.layerControl = L.control.layers(this.baseLayers, null, {
                position: 'topright',
                collapsed: false
            }).addTo(this.map);

            // 5. Thêm Nút Bấm Điều Hướng 1-Click (Toàn cảnh Việt Nam & Tuyến xe chạy)
            this.initQuickNavControl();

            // 6. Thiết lập góc nhìn mặc định bao quát toàn cảnh Việt Nam
            this.fitVietnamView();

            // 7. Cập nhật kích thước Leaflet chuẩn xác khi render xong
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 250);
        },

        // Yêu cầu Leaflet tính lại kích thước khung (sau khi tab hiện lại hoặc layout đổi)
        invalidateSize() {
            if (this.map) {
                try {
                    this.map.invalidateSize();
                } catch (e) {}
            }
        },

        /**
         * Vô hiệu hoá mọi lượt renderRoute đang chạy dở.
         * Bắt buộc gọi trước khi bắt đầu lượt vẽ mới, vì renderRoute có await (OSRM ~4.5s)
         * trong khi polling có thể kích hoạt lượt vẽ khác chỉ sau 3s -> ghi đè layer lẫn nhau.
         */
        cancelPendingRenders() {
            this.renderToken++;
            if (this.markerAnimFrame) {
                cancelAnimationFrame(this.markerAnimFrame);
                this.markerAnimFrame = null;
            }
            return this.renderToken;
        },

        // Lớp phủ trạng thái trên khung bản đồ
        setLoading(message) {
            const el = this.currentContainerId ? document.getElementById(this.currentContainerId) : null;
            if (!el || !el.parentElement) return;

            let overlay = el.parentElement.querySelector('.map-loading-overlay');
            if (!message) {
                if (overlay) overlay.remove();
                return;
            }
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'map-loading-overlay';
                el.parentElement.appendChild(overlay);
            }
            overlay.textContent = message;
        },

        // Đọc tuyến đã tính từ localStorage (tuyến giữa các Hub gần như bất biến)
        readPersistedRoute(cacheKey) {
            try {
                const raw = localStorage.getItem(ROUTE_CACHE_PREFIX + cacheKey);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed || !Array.isArray(parsed.routePoints) || parsed.routePoints.length === 0) return null;
                return parsed;
            } catch (e) {
                return null;
            }
        },

        persistRoute(cacheKey, payload) {
            try {
                localStorage.setItem(ROUTE_CACHE_PREFIX + cacheKey, JSON.stringify(payload));
            } catch (e) {
                // localStorage đầy hoặc bị chặn: bỏ qua, cache trong RAM vẫn hoạt động
            }
        },

        // Nút điều khiển nhanh 1-Click trên bản đồ
        initQuickNavControl() {
            if (!this.map) return;

            const self = this;
            const QuickNav = L.Control.extend({
                options: { position: 'topleft' },
                onAdd: function () {
                    const container = L.DomUtil.create('div', 'leaflet-bar map-quick-nav');
                    container.innerHTML = `
                        <button type="button" id="btn-fit-vietnam" class="quick-nav-btn" title="Bao quát trọn vẹn lãnh thổ Việt Nam (Hoàng Sa & Trường Sa)">
                            <span class="btn-text">Toàn Cảnh VN</span>
                        </button>
                        <button type="button" id="btn-fit-route" class="quick-nav-btn" title="Phóng to theo sát tuyến đường vận chuyển giữa các bưu cục">
                            <span class="btn-text">Tuyến Xe Chạy</span>
                        </button>
                    `;
                    L.DomEvent.disableClickPropagation(container);

                    setTimeout(() => {
                        const btnVn = container.querySelector('#btn-fit-vietnam');
                        if (btnVn) {
                            btnVn.addEventListener('click', (e) => {
                                e.preventDefault();
                                self.fitVietnamView();
                            });
                        }
                        const btnRoute = container.querySelector('#btn-fit-route');
                        if (btnRoute) {
                            btnRoute.addEventListener('click', (e) => {
                                e.preventDefault();
                                self.fitRouteView();
                            });
                        }
                    }, 50);

                    return container;
                }
            });

            new QuickNav().addTo(this.map);
        },

        // 1-Click: Thu phóng bao quát toàn bộ lãnh thổ đất liền và 2 quần đảo Hoàng Sa, Trường Sa
        fitVietnamView() {
            if (!this.map) return;
            // Khung kinh/vĩ độ chuẩn bao gồm Hoàng Sa [16.5, 112.0], Trường Sa [9.5, 114.0], Phú Quốc [10.2, 103.9] và toàn bộ đất liền
            const vnBounds = [
                [7.2, 102.0],  // Cực Nam - Tây Nam (biển phía Nam quần đảo Trường Sa)
                [23.6, 117.2]  // Cực Bắc - Đông Bắc (Hoàng Sa & Trường Sa)
            ];
            this.map.fitBounds(vnBounds, {
                padding: [15, 15],
                maxZoom: 7
            });
        },

        // 1-Click: Thu phóng ôm sát tuyến đường xe chạy hoặc các bưu cục đang xử lý
        fitRouteView() {
            if (!this.map) return;
            if (this.routePoints && this.routePoints.length > 0) {
                const bounds = L.latLngBounds(this.routePoints);
                this.map.fitBounds(bounds, { padding: [40, 40] });
            } else if (this.markersGroup && this.markersGroup.getLayers().length > 0) {
                const group = new L.featureGroup(this.markersGroup.getLayers());
                this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
            } else {
                this.fitVietnamView();
            }
        },

        // Cập nhật tọa độ động từ bảng Hubs trong Database
        updateHubs(hubs) {
            if (!Array.isArray(hubs)) return;

            const movedHubs = [];
            hubs.forEach(h => {
                const latitude = Number(h.latitude);
                const longitude = Number(h.longitude);
                if (h.hubCode && Number.isFinite(latitude) && Number.isFinite(longitude)) {
                    const old = this.hubCoordinates[h.hubCode];
                    if (!old || old.lat !== latitude || old.lng !== longitude) {
                        movedHubs.push(h.hubCode);
                    }
                    this.hubCoordinates[h.hubCode] = {
                        name: h.hubName + ' (' + h.hubCode + ')',
                        address: h.address || old?.address || null,
                        lat: latitude,
                        lng: longitude,
                        province: h.province,
                        district: h.district || old?.district,
                        parent: h.parentHubCode || old?.parent,
                        level: h.hubLevel || old?.level || (h.hubCode.startsWith('POST-') ? 2 : 1)
                    };
                }
            });

            // Toạ độ Hub đổi thì tuyến đã cache không còn đúng nữa, phải xoá để tính lại
            movedHubs.forEach(code => {
                Object.keys(this.routeCache).forEach(key => {
                    if (key.includes(code)) {
                        delete this.routeCache[key];
                        try {
                            localStorage.removeItem(ROUTE_CACHE_PREFIX + key);
                        } catch (e) {}
                    }
                });
            });
        },

        // Lấy thông tin tọa độ bưu cục
        getHubCoord(hubCode) {
            return hubCode ? this.hubCoordinates[hubCode] || null : null;
        },

        /**
         * Các helper dưới đây phục vụ riêng cho bản đồ chuyến xe.
         * Không dùng STATUS_RATIOS, routePoints, radarMarker hoặc marker animation
         * của tracking map để tránh chuyến xe làm thay đổi vị trí bưu gửi.
         */
        hasLeaflet() {
            return typeof L !== 'undefined' && L !== null && typeof L.map === 'function';
        },

        getTripText(value) {
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') {
                return String(value.code || value.hubCode || value.locationCode || value.name || value.label || '').trim();
            }
            return String(value).trim();
        },

        getTripNumber(value) {
            if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
            const number = Number(value);
            return Number.isFinite(number) ? number : null;
        },

        normalizeTripCoordinate(latitude, longitude) {
            const lat = this.getTripNumber(latitude);
            const lng = this.getTripNumber(longitude);
            if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return null;
            }
            return { lat, lng };
        },

        getTripCoordinate(value) {
            if (!value) return null;

            if (Array.isArray(value) && value.length >= 2) {
                return this.normalizeTripCoordinate(value[0], value[1]);
            }

            if (typeof value !== 'object') return null;

            const nested = value.coordinates || value.coordinate || value.location || value.hub;
            if (nested && nested !== value) {
                const nestedCoordinate = this.getTripCoordinate(nested);
                if (nestedCoordinate) return nestedCoordinate;
            }

            return this.normalizeTripCoordinate(
                value.latitude !== undefined
                    ? value.latitude
                    : (value.lat !== undefined
                        ? value.lat
                        : (value.stopLatitude !== undefined ? value.stopLatitude : value.hubLatitude)),
                value.longitude !== undefined
                    ? value.longitude
                    : (value.lng !== undefined
                        ? value.lng
                        : (value.lon !== undefined
                            ? value.lon
                            : (value.stopLongitude !== undefined ? value.stopLongitude : value.hubLongitude)))
            );
        },

        normalizeTripArguments(input, mapId, currentLocationCode, currentLatitude, currentLongitude, progressPercent, vehiclePlate, stops, legacyMapId) {
            if (input && typeof input === 'object' && !Array.isArray(input)) {
                return {
                    payload: input,
                    mapId: typeof mapId === 'string' && mapId.trim() ? mapId.trim() : input.mapId
                };
            }

            // Tương thích với caller cũ truyền positional arguments.
            return {
                payload: {
                    tripCode: input,
                    tripType: mapId,
                    currentLocationCode,
                    currentLatitude,
                    currentLongitude,
                    progressPercent,
                    vehiclePlate,
                    stops
                },
                mapId: legacyMapId
            };
        },

        normalizeTripPayload(payload) {
            const source = payload && typeof payload === 'object' ? payload : {};
            const currentHub = source.currentHub !== undefined ? source.currentHub : source.hub;
            const currentLocation = source.currentLocation && typeof source.currentLocation === 'object'
                ? source.currentLocation
                : {};
            const currentHubCode = this.getTripText(currentHub);
            const currentLocationCode = this.getTripText(
                source.currentLocationCode !== undefined
                    ? source.currentLocationCode
                    : (source.locationCode !== undefined
                        ? source.locationCode
                        : (currentLocation.code || currentLocation.locationCode || currentLocation.hubCode || currentHubCode))
            );

            const currentLatitude = source.currentLatitude !== undefined
                ? source.currentLatitude
                : (source.currentLat !== undefined
                    ? source.currentLat
                    : (source.backendLatitude !== undefined
                        ? source.backendLatitude
                        : (source.latitude !== undefined
                            ? source.latitude
                            : (currentLocation.latitude !== undefined
                                ? currentLocation.latitude
                                : (currentHub && typeof currentHub === 'object' ? currentHub.latitude : undefined)))));
            const currentLongitude = source.currentLongitude !== undefined
                ? source.currentLongitude
                : (source.currentLng !== undefined
                    ? source.currentLng
                    : (source.backendLongitude !== undefined
                        ? source.backendLongitude
                        : (source.longitude !== undefined
                            ? source.longitude
                            : (currentLocation.longitude !== undefined
                                ? currentLocation.longitude
                                : (currentHub && typeof currentHub === 'object' ? currentHub.longitude : undefined)))));

            let progressPercent = source.progressPercent;
            if (progressPercent === undefined) progressPercent = source.progressPercentage;
            if (progressPercent === undefined) progressPercent = source.progress;
            if (progressPercent === undefined) progressPercent = source.percent;
            const numericProgress = this.getTripNumber(progressPercent);

            const stops = Array.isArray(source.stops)
                ? source.stops
                : (Array.isArray(source.stopList)
                    ? source.stopList
                    : (Array.isArray(source.routeStops) ? source.routeStops : []));

            return {
                ...source,
                tripCode: source.tripCode !== undefined ? source.tripCode : (source.tripId !== undefined ? source.tripId : source.code),
                tripType: source.tripType !== undefined ? source.tripType : source.type,
                currentHub,
                currentLocationCode,
                currentLatitude,
                currentLongitude,
                progressPercent: numericProgress === null
                    ? null
                    : Math.max(0, Math.min(100, numericProgress)),
                vehiclePlate: source.vehiclePlate !== undefined
                    ? source.vehiclePlate
                    : (source.plateNumber !== undefined ? source.plateNumber : source.plate),
                stops
            };
        },

        resolveTripState(payload) {
            const normalized = this.normalizeTripPayload(payload);
            const stops = Array.isArray(normalized.stops) ? normalized.stops : [];
            const currentCode = this.getTripText(normalized.currentLocationCode).toUpperCase();
            const currentHubCode = this.getTripText(normalized.currentHub).toUpperCase();
            const codes = [currentCode, currentHubCode].filter(Boolean);

            let currentStop = null;
            if (codes.length > 0) {
                currentStop = stops.find(stop => {
                    if (!stop || typeof stop !== 'object') return false;
                    const stopHub = stop.hub && typeof stop.hub === 'object' ? stop.hub : {};
                    const stopLocation = stop.location && typeof stop.location === 'object' ? stop.location : {};
                    const stopCode = this.getTripText(
                        stop.stopCode !== undefined
                            ? stop.stopCode
                            : (stop.locationCode !== undefined
                                ? stop.locationCode
                                : (stop.hubCode !== undefined
                                    ? stop.hubCode
                                    : (stop.code !== undefined
                                        ? stop.code
                                        : (stopLocation.code || stopLocation.locationCode || stopHub.hubCode || stopHub.code))))
                    ).toUpperCase();
                    return stopCode && codes.includes(stopCode);
                }) || null;
            }

            // Chỉ dùng cờ rõ ràng từ stop; tuyệt đối không suy ra vị trí từ shipment status.
            if (!currentStop) {
                currentStop = stops.find(stop => stop && typeof stop === 'object' && (
                    stop.isCurrent === true || stop.current === true || stop.active === true || stop.isActive === true
                )) || null;
            }
            if (!currentStop && stops.length === 1) currentStop = stops[0];

            const backendCoordinate = this.normalizeTripCoordinate(
                normalized.currentLatitude,
                normalized.currentLongitude
            );
            const stopCoordinate = currentStop ? this.getTripCoordinate(currentStop) : null;
            const coordinate = backendCoordinate || stopCoordinate;

            return {
                ...normalized,
                currentLocationCode: this.getTripText(normalized.currentLocationCode) || null,
                currentPoint: coordinate ? [coordinate.lat, coordinate.lng] : null,
                coordinateSource: backendCoordinate ? 'backend' : (stopCoordinate ? 'stop' : null),
                currentStop
            };
        },

        ensureTripMap(mapId) {
            if (!this.hasLeaflet()) return null;

            const requestedId = typeof mapId === 'string' && mapId.trim()
                ? mapId.trim()
                : (this.tripContainerId || 'trip-map');

            if (this.tripMap && this.tripContainerId === requestedId) {
                try {
                    if (typeof this.tripMap.invalidateSize === 'function') this.tripMap.invalidateSize();
                    return this.tripMap;
                } catch (e) {
                    this.tripMap = null;
                    this.tripContainerId = null;
                    this.tripMapOwned = false;
                    this.tripMarkersGroup = null;
                    this.tripStopsGroup = null;
                    this.tripRouteLayer = null;
                    this.tripMarker = null;
                }
            }

            const oldTripMap = this.tripMap;
            if (oldTripMap && oldTripMap !== this.map && this.tripMapOwned) {
                try {
                    if (typeof oldTripMap.remove === 'function') oldTripMap.remove();
                } catch (e) {}
            }
            this.clearTripLayers();
            this.tripMap = null;
            this.tripContainerId = null;
            this.tripMapOwned = false;

            // Chỉ dùng map tracking khi caller truyền đúng container một cách tường minh.
            if (requestedId === this.currentContainerId && this.map) {
                this.tripMap = this.map;
                this.tripContainerId = requestedId;
                this.tripMapOwned = false;
                this.createTripLayerGroups();
                return this.tripMap;
            }

            if (typeof document === 'undefined' || !document.getElementById) return null;
            const element = document.getElementById(requestedId);
            if (!element) return null;

            // Không đụng vào một Leaflet map khác nếu không phải map đang được quản lý ở đây.
            if (element._leaflet_id) return null;

            try {
                this.tripMap = L.map(requestedId, {
                    zoomControl: true,
                    minZoom: 4,
                    maxZoom: 20
                });
                this.tripContainerId = requestedId;
                this.tripMapOwned = true;

                if (typeof L.tileLayer === 'function') {
                    const baseLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; OpenStreetMap | Bưu chính VNPT',
                        maxZoom: 19,
                        keepBuffer: 4,
                        updateWhenIdle: false
                    });
                    if (baseLayer && typeof baseLayer.addTo === 'function') baseLayer.addTo(this.tripMap);
                }
                this.createTripLayerGroups();
                return this.tripMap;
            } catch (e) {
                this.tripMap = null;
                this.tripContainerId = null;
                this.tripMapOwned = false;
                this.tripMarkersGroup = null;
                this.tripStopsGroup = null;
                this.tripRouteLayer = null;
                this.tripMarker = null;
                return null;
            }
        },

        createTripLayerGroups() {
            if (!this.tripMap || typeof L === 'undefined' || typeof L.layerGroup !== 'function') return;

            if (!this.tripMarkersGroup) {
                this.tripMarkersGroup = L.layerGroup();
                if (this.tripMarkersGroup && typeof this.tripMarkersGroup.addTo === 'function') {
                    this.tripMarkersGroup.addTo(this.tripMap);
                }
            }
            if (!this.tripStopsGroup) {
                this.tripStopsGroup = L.layerGroup();
                if (this.tripStopsGroup && typeof this.tripStopsGroup.addTo === 'function') {
                    this.tripStopsGroup.addTo(this.tripMap);
                }
            }
        },

        clearTripLayers() {
            if (this.tripMarkerAnimFrame && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this.tripMarkerAnimFrame);
            }
            this.tripMarkerAnimFrame = null;

            if (this.tripStopsGroup && typeof this.tripStopsGroup.clearLayers === 'function') {
                this.tripStopsGroup.clearLayers();
            }
            if (this.tripMarkersGroup && typeof this.tripMarkersGroup.clearLayers === 'function') {
                this.tripMarkersGroup.clearLayers();
            }
            if (this.tripRouteLayer && this.tripMap && typeof this.tripMap.removeLayer === 'function') {
                try {
                    this.tripMap.removeLayer(this.tripRouteLayer);
                } catch (e) {}
            }
            this.tripRouteLayer = null;
            this.tripMarker = null;
        },

        escapeTripHtml(value) {
            return String(value === null || value === undefined ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        buildTripTooltip(state) {
            const tripCode = this.escapeTripHtml(state.tripCode || 'Chuyến xe');
            const tripType = this.escapeTripHtml(state.tripType || '');
            const location = this.escapeTripHtml(state.currentLocationCode || this.getTripText(state.currentHub) || 'Chưa xác định');
            const plate = this.escapeTripHtml(state.vehiclePlate || 'Chưa cập nhật');
            const progress = state.progressPercent === null || state.progressPercent === undefined
                ? 'Chưa cập nhật'
                : `${Math.round(state.progressPercent)}%`;

            return `
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${tripCode}</div>
                ${tripType ? `<div style="font-size: 10px; color: #475569;">Loại chuyến: ${tripType}</div>` : ''}
                <div style="font-size: 10px; color: #0066cc; font-family: monospace; font-weight: 600;">TIẾN ĐỘ: ${progress}</div>
                <div style="font-size: 10px; color: #475569;">Vị trí: ${location}</div>
                <div style="font-size: 10px; color: #475569;">Biển số: ${plate}</div>
            `;
        },

        getTripIcon(className, size = 16) {
            if (typeof L === 'undefined' || typeof L.divIcon !== 'function') return null;
            return L.divIcon({
                className,
                iconSize: [size, size],
                iconAnchor: [Math.round(size / 2), Math.round(size / 2)]
            });
        },

        addTripLayer(layer, group) {
            if (!layer || !this.tripMap) return false;
            if (group && typeof group.addLayer === 'function') {
                group.addLayer(layer);
                return true;
            }
            if (typeof layer.addTo === 'function') {
                layer.addTo(this.tripMap);
                return true;
            }
            return false;
        },

        renderTripStops(state) {
            if (this.tripStopsGroup && typeof this.tripStopsGroup.clearLayers === 'function') {
                this.tripStopsGroup.clearLayers();
            }
            if (!this.tripMap || typeof L === 'undefined' || typeof L.marker !== 'function') return [];

            const points = [];
            (Array.isArray(state.stops) ? state.stops : []).forEach((stop, index) => {
                const coordinate = this.getTripCoordinate(stop);
                if (!coordinate) return;
                points.push([coordinate.lat, coordinate.lng]);

                const stopName = this.getTripText(
                    stop && (stop.stopName || stop.hubName || stop.name || stop.locationName || stop.stopCode || stop.hubCode || stop.code)
                ) || `Điểm dừng ${index + 1}`;
                const iconClass = index === 0
                    ? 'trip-stop-start'
                    : (index === state.stops.length - 1 ? 'trip-stop-end' : 'trip-stop');
                const icon = this.getTripIcon(iconClass, 14);
                const options = icon ? { icon } : {};
                let marker;
                try {
                    marker = L.marker([coordinate.lat, coordinate.lng], options);
                    if (marker && typeof marker.bindTooltip === 'function') {
                        marker.bindTooltip(this.escapeTripHtml(stopName), {
                            direction: 'top',
                            offset: [0, -8],
                            className: 'trip-stop-tooltip'
                        });
                    }
                    this.addTripLayer(marker, this.tripStopsGroup);
                } catch (e) {}
            });

            if (points.length > 1 && typeof L.polyline === 'function') {
                try {
                    this.tripRouteLayer = L.polyline(points, {
                        color: '#7c3aed',
                        weight: 3,
                        opacity: 0.75,
                        dashArray: '5, 7',
                        lineJoin: 'round',
                        lineCap: 'round'
                    });
                    this.addTripLayer(this.tripRouteLayer, this.tripMarkersGroup);
                } catch (e) {
                    this.tripRouteLayer = null;
                }
            }

            return points;
        },

        animateTripMarkerTo(targetPoint, duration = 700) {
            if (!this.tripMarker || !targetPoint || typeof this.tripMarker.setLatLng !== 'function') return;

            if (this.tripMarkerAnimFrame && typeof cancelAnimationFrame === 'function') {
                cancelAnimationFrame(this.tripMarkerAnimFrame);
                this.tripMarkerAnimFrame = null;
            }

            if (typeof this.tripMarker.getLatLng !== 'function' || typeof requestAnimationFrame !== 'function') {
                this.tripMarker.setLatLng(targetPoint);
                return;
            }

            const from = this.tripMarker.getLatLng();
            if (!from || !Number.isFinite(Number(from.lat)) || !Number.isFinite(Number(from.lng))) {
                this.tripMarker.setLatLng(targetPoint);
                return;
            }
            const toLat = targetPoint[0];
            const toLng = targetPoint[1];
            const delta = Math.abs(from.lat - toLat) + Math.abs(from.lng - toLng);
            if (delta < 0.0005) {
                this.tripMarker.setLatLng(targetPoint);
                return;
            }

            const startTime = typeof performance !== 'undefined' && typeof performance.now === 'function'
                ? performance.now()
                : Date.now();
            const step = (now) => {
                const t = Math.min(1, (now - startTime) / duration);
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                if (!this.tripMarker || typeof this.tripMarker.setLatLng !== 'function') return;
                this.tripMarker.setLatLng([
                    from.lat + (toLat - from.lat) * eased,
                    from.lng + (toLng - from.lng) * eased
                ]);
                if (t < 1) {
                    this.tripMarkerAnimFrame = requestAnimationFrame(step);
                } else {
                    this.tripMarkerAnimFrame = null;
                }
            };
            this.tripMarkerAnimFrame = requestAnimationFrame(step);
        },

        buildTripResult(state) {
            const currentPoint = state && state.currentPoint ? [state.currentPoint[0], state.currentPoint[1]] : null;
            return {
                tripCode: state ? state.tripCode : null,
                tripType: state ? state.tripType : null,
                currentLocationCode: state ? state.currentLocationCode : null,
                currentHub: state ? state.currentHub : null,
                currentLatitude: currentPoint ? currentPoint[0] : null,
                currentLongitude: currentPoint ? currentPoint[1] : null,
                progressPercent: state ? state.progressPercent : null,
                vehiclePlate: state ? state.vehiclePlate : null,
                stops: state && Array.isArray(state.stops) ? state.stops : [],
                currentStop: state ? state.currentStop : null,
                coordinateSource: state ? state.coordinateSource : null,
                currentPoint,
                marker: this.tripMarker || null
            };
        },

        /**
         * Vẽ các điểm dừng và marker chuyến xe trên trip map riêng.
         * Không suy ra vị trí từ status của bưu gửi; chỉ dùng tọa độ backend hoặc stop hiện tại.
         */
        renderTripProgress(payload, mapId) {
            const args = this.normalizeTripArguments.apply(this, arguments);
            const state = this.resolveTripState(args.payload);
            this.tripState = state;

            const tripMap = this.ensureTripMap(args.mapId);
            if (!tripMap) return null;

            this.clearTripLayers();
            this.createTripLayerGroups();
            const stopPoints = this.renderTripStops(state);
            const result = this.updateTripMarker(state, args.mapId);

            // Chỉ tự căn khung khi đây là bản đồ chuyến xe do MapManager tạo.
            if (this.tripMapOwned && typeof tripMap.fitBounds === 'function') {
                const boundsPoints = state.currentPoint ? [state.currentPoint, ...stopPoints] : stopPoints;
                if (boundsPoints.length > 0 && typeof L !== 'undefined' && typeof L.latLngBounds === 'function') {
                    try {
                        tripMap.fitBounds(L.latLngBounds(boundsPoints), { padding: [35, 35] });
                    } catch (e) {}
                }
            }

            return result || this.buildTripResult(state);
        },

        /**
         * Cập nhật riêng marker chuyến xe, không đụng tới radar marker của shipment tracking.
         */
        updateTripMarker(payload, mapId) {
            const args = this.normalizeTripArguments.apply(this, arguments);
            const previousTripCode = this.tripState && this.tripState.tripCode;
            const incoming = args.payload && typeof args.payload === 'object' && !Array.isArray(args.payload)
                ? args.payload
                : {};
            const mergedPayload = this.tripState ? { ...this.tripState } : {};
            Object.keys(incoming).forEach(key => {
                if (incoming[key] !== undefined) mergedPayload[key] = incoming[key];
            });
            const state = this.resolveTripState(mergedPayload);
            this.tripState = state;

            const tripMap = this.ensureTripMap(args.mapId);
            if (!tripMap) return null;
            if (previousTripCode && state.tripCode && previousTripCode !== state.tripCode) {
                this.clearTripLayers();
            }
            this.createTripLayerGroups();

            const tooltipHtml = this.buildTripTooltip(state);
            if (this.tripMarker && typeof this.tripMarker.setTooltipContent === 'function') {
                this.tripMarker.setTooltipContent(tooltipHtml);
            }

            if (state.currentPoint && typeof L !== 'undefined' && typeof L.marker === 'function') {
                const icon = this.getTripIcon('trip-vehicle-marker', 22);
                const options = icon ? { icon, zIndexOffset: 1200 } : { zIndexOffset: 1200 };

                if (!this.tripMarker) {
                    try {
                        this.tripMarker = L.marker(state.currentPoint, options);
                        if (this.tripMarker && typeof this.tripMarker.bindTooltip === 'function') {
                            this.tripMarker.bindTooltip(tooltipHtml, {
                                permanent: true,
                                direction: 'top',
                                offset: [0, -12],
                                className: 'trip-marker-tooltip'
                            });
                        }
                        this.addTripLayer(this.tripMarker, this.tripMarkersGroup);
                    } catch (e) {
                        this.tripMarker = null;
                    }
                } else {
                    this.animateTripMarkerTo(state.currentPoint);
                }
            }

            return this.buildTripResult(state);
        },

        // Cập nhật tiến độ bưu kiện trên từng chặng OSRM thời gian thực
        updateProgress(status, note = '', currentLocationCode = null) {
            if (!this.map || !this.routePoints || this.routePoints.length === 0) return null;

            // Tìm tọa độ Hub nếu có mã vị trí hiện tại hoặc trong note
            let matchedHubCoord = null;
            if (currentLocationCode && this.hubCoordinates[currentLocationCode]) {
                matchedHubCoord = this.hubCoordinates[currentLocationCode];
            } else if (note && typeof note === 'string') {
                const foundCode = Object.keys(this.hubCoordinates).find(c => note.includes(c));
                if (foundCode) {
                    matchedHubCoord = this.hubCoordinates[foundCode];
                }
            }

            // Trạng thái không nằm trong enum backend: giữ nguyên vị trí hiện tại
            let ratio = STATUS_RATIOS[status] !== undefined ? STATUS_RATIOS[status] : this.lastRatio;
            let targetIdx = Math.min(this.routePoints.length - 1, Math.max(0, Math.round(ratio * (this.routePoints.length - 1))));

            // Nếu đang IN_TRANSIT và có vị trí Hub cụ thể (ví dụ: xe cập bến HUB-DN-01)
            if (status === 'IN_TRANSIT' && matchedHubCoord) {
                let bestIdx = 0;
                let minDistance = Infinity;
                for (let i = 0; i < this.routePoints.length; i++) {
                    const pt = this.routePoints[i];
                    const dist = Math.hypot(pt[0] - matchedHubCoord.lat, pt[1] - matchedHubCoord.lng);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestIdx = i;
                    }
                }
                targetIdx = bestIdx;
                ratio = this.routePoints.length > 1 ? bestIdx / (this.routePoints.length - 1) : 0.5;
            }

            let currentPoint = this.routePoints[targetIdx];
            let percent = Math.round(ratio * 100);

            // Xử lý vị trí ghim và tỷ lệ % chính xác theo chuẩn bưu chính
            if (['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED'].includes(status)) {
                // Đơn mới tạo: Ghim nằm chính xác tại Bưu Cục Tiếp Nhận, 0% hành trình
                if (this.originPostCoord) {
                    currentPoint = [this.originPostCoord.lat, this.originPostCoord.lng];
                } else if (this.sourceCoord) {
                    currentPoint = [this.sourceCoord.lat, this.sourceCoord.lng];
                }
                percent = 0;
            } else if (status === 'PICKED_UP') {
                // Đã gom về Kho Tổng xuất phát: Ghim nằm tại Kho Tổng Gửi (Cấp 1)
                if (this.sourceCoord) {
                    currentPoint = [this.sourceCoord.lat, this.sourceCoord.lng];
                }
                percent = 0;
            } else if (status === 'IN_TRANSIT' && matchedHubCoord) {
                currentPoint = [matchedHubCoord.lat, matchedHubCoord.lng];
            } else if (status === 'ARRIVED_DEST_HUB') {
                // Đã cập bến Kho Tổng đích: Ghim nằm tại Kho Tổng Đích (Cấp 1)
                if (this.destCoord) {
                    currentPoint = [this.destCoord.lat, this.destCoord.lng];
                }
                percent = 100;
            } else if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERY_FAILED') {
                // Bưu tá đang đi phát: Ghim nằm ở Bưu Cục Phát hoặc trên đường giao khách
                if (this.destPostCoord && this.recipientCoord) {
                    currentPoint = [(this.destPostCoord.lat + this.recipientCoord[0]) / 2, (this.destPostCoord.lng + this.recipientCoord[1]) / 2];
                } else if (this.destPostCoord) {
                    currentPoint = [this.destPostCoord.lat, this.destPostCoord.lng];
                }
                percent = 100;
            } else if (status === 'DELIVERED') {
                // Đã giao thành công: Ghim nằm tại Địa chỉ người nhận
                if (this.recipientCoord) {
                    currentPoint = this.recipientCoord;
                } else if (this.destPostCoord) {
                    currentPoint = [this.destPostCoord.lat, this.destPostCoord.lng];
                }
                percent = 100;
            }

            // 1. Cập nhật phân đoạn đã hoàn thành (Xanh dương đậm)
            if (['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP'].includes(status) || ratio === 0) {
                // Đơn mới tạo hoặc vừa gom về kho: Tuyến xe trục chưa chạy, làm rỗng tuyến hoàn thành
                if (this.completedPolyline) {
                    this.completedPolyline.setLatLngs([]);
                }
            } else {
                const completedCoords = this.routePoints.slice(0, targetIdx + 1);
                if (!this.completedPolyline) {
                    this.completedPolyline = L.polyline(completedCoords, {
                        color: '#0066cc',
                        weight: 4.5,
                        opacity: 0.95,
                        lineJoin: 'round',
                        lineCap: 'round'
                    }).addTo(this.map);
                } else {
                    this.completedPolyline.setLatLngs(completedCoords);
                }
            }

            // 2. Cập nhật phân đoạn còn lại / đường định sẵn (Nét đứt Tím Indigo công nghệ thanh lịch)
            const remainingCoords = ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP'].includes(status) || ratio === 0
                ? this.routePoints
                : this.routePoints.slice(targetIdx);

            if (!this.remainingPolyline) {
                this.remainingPolyline = L.polyline(remainingCoords, {
                    color: '#6366f1',
                    weight: 4,
                    opacity: 0.85,
                    dashArray: '4, 6',
                    lineJoin: 'round',
                    lineCap: 'round'
                }).addTo(this.map);
            } else {
                this.remainingPolyline.setLatLngs(remainingCoords);
            }

            // 2b. Cập nhật trạng thái nét liền / nét đứt cho các chặng gom và phát đa tầng
            if (this.feederOriginPolyline) {
                const isOriginCompleted = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
                this.feederOriginPolyline.setStyle({
                    dashArray: isOriginCompleted ? null : '4, 4',
                    weight: isOriginCompleted ? 4.5 : 3.5,
                    opacity: isOriginCompleted ? 0.95 : 0.75
                });
            }

            if (this.feederDestPolyline) {
                const isDestCompleted = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
                this.feederDestPolyline.setStyle({
                    dashArray: isDestCompleted ? null : '4, 4',
                    weight: isDestCompleted ? 4.5 : 3.5,
                    opacity: isDestCompleted ? 0.95 : 0.75
                });
            }

            if (this.lastMilePolyline) {
                const isDelivered = status === 'DELIVERED';
                const isDelivering = status === 'OUT_FOR_DELIVERY';
                this.lastMilePolyline.setStyle({
                    dashArray: isDelivered ? null : (isDelivering ? '4, 4' : '6, 8'),
                    weight: isDelivered ? 4.5 : (isDelivering ? 4 : 2.5),
                    opacity: (isDelivered || isDelivering) ? 0.95 : 0.45
                });
            }

            // Quản lý biểu tượng Shipper xe máy khi chuyển trạng thái
            if (status === 'OUT_FOR_DELIVERY') {
                if (!this.shipperMarker && this.destPostCoord && this.recipientCoord) {
                    const shipperLat = (this.destPostCoord.lat + this.recipientCoord[0]) / 2;
                    const shipperLng = (this.destPostCoord.lng + this.recipientCoord[1]) / 2;
                    const shipperIcon = L.divIcon({
                        className: 'shipper-motorcycle-pin',
                        html: '<svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.18c.41 1.16 1.51 2 2.82 2 1.66 0 3-1.34 3-3s-1.34-3-3-3c-.41 0-.79.09-1.14.24L17.65 9H19V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>',
                        iconSize: [26, 26],
                        iconAnchor: [13, 13]
                    });
                    this.shipperMarker = L.marker([shipperLat, shipperLng], { icon: shipperIcon, zIndexOffset: 1200 })
                        .bindTooltip('<div style="font-size:11px;font-weight:700;color:#059669;">Bưu Tá Đang Đi Phát</div><div style="font-size:10px;color:#64748b;">Chặng cuối tới người nhận</div>', { permanent: true, direction: 'top', className: 'radar-tooltip' })
                        .addTo(this.map);
                }
            } else if (this.shipperMarker && status === 'DELIVERED') {
                this.map.removeLayer(this.shipperMarker);
                this.shipperMarker = null;
            }

            // 3. Cập nhật Pin Radar phát sóng di động
            const statusNames = STATUS_NAMES;
            const labelText = statusNames[status] || status;
            let subText = `TIẾN ĐỘ: ${percent}%`;
            if (status === 'IN_TRANSIT' && matchedHubCoord) {
                subText = `ĐÃ CẬP BẾN: ${matchedHubCoord.name}`;
            }
            const tooltipHtml = `
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${labelText}</div>
                <div style="font-size: 10px; color: #0066cc; font-family: monospace; font-weight: 600;">${subText}</div>
            `;

            if (!this.radarMarker) {
                const radarIcon = L.divIcon({
                    className: 'hub-pin-current',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                this.radarMarker = L.marker(currentPoint, { icon: radarIcon, zIndexOffset: 1000 })
                    .bindTooltip(tooltipHtml, { permanent: true, direction: 'top', offset: [0, -10], className: 'radar-tooltip' })
                    .addTo(this.map);
            } else {
                this.radarMarker.setTooltipContent(tooltipHtml);
                this.animateMarkerTo(currentPoint);
            }

            this.lastRatio = ratio;

            return {
                ratio,
                percent,
                currentPoint,
                status
            };
        },

        /**
         * Trượt pin radar tới toạ độ mới bằng requestAnimationFrame thay vì nhảy cóc.
         * Chỉ animate khi quãng nhảy đủ lớn để tránh giật vặt khi polling.
         */
        animateMarkerTo(targetPoint, duration = 700) {
            if (!this.radarMarker || !targetPoint) return;

            if (this.markerAnimFrame) {
                cancelAnimationFrame(this.markerAnimFrame);
                this.markerAnimFrame = null;
            }

            const from = this.radarMarker.getLatLng();
            const toLat = targetPoint[0];
            const toLng = targetPoint[1];

            const delta = Math.abs(from.lat - toLat) + Math.abs(from.lng - toLng);
            if (delta < 0.0005) {
                this.radarMarker.setLatLng(targetPoint);
                return;
            }

            const startTime = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - startTime) / duration);
                // Hàm easing ease-in-out để chuyển động tự nhiên
                const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                if (!this.radarMarker) return;
                this.radarMarker.setLatLng([
                    from.lat + (toLat - from.lat) * eased,
                    from.lng + (toLng - from.lng) * eased
                ]);
                if (t < 1) {
                    this.markerAnimFrame = requestAnimationFrame(step);
                } else {
                    this.markerAnimFrame = null;
                }
            };
            this.markerAnimFrame = requestAnimationFrame(step);
        },

        // Vẽ tuyến luân chuyển hàng đa tầng: Bưu cục gửi -> Kho Tổng gửi -> Tuyến trục -> Kho Tổng nhận -> Bưu cục phát -> Người nhận
        async renderRoute(history = [], currentStatus = 'ROUTE_ASSIGNED', shouldFitBounds = true, extraMeta = {}) {
            if (!this.map) this.init();
            if (!this.map) return null;

            // Huỷ mọi lượt vẽ đang chạy dở và lấy token cho lượt hiện tại
            const token = this.cancelPendingRenders();
            const isStale = () => token !== this.renderToken || !this.map;

            // Xóa các mốc và tuyến cũ của đơn trước
            if (this.markersGroup) this.markersGroup.clearLayers();
            if (this.completedPolyline) {
                this.map.removeLayer(this.completedPolyline);
                this.completedPolyline = null;
            }
            if (this.remainingPolyline) {
                this.map.removeLayer(this.remainingPolyline);
                this.remainingPolyline = null;
            }
            if (this.feederOriginPolyline) {
                this.map.removeLayer(this.feederOriginPolyline);
                this.feederOriginPolyline = null;
            }
            if (this.feederDestPolyline) {
                this.map.removeLayer(this.feederDestPolyline);
                this.feederDestPolyline = null;
            }
            if (this.lastMilePolyline) {
                this.map.removeLayer(this.lastMilePolyline);
                this.lastMilePolyline = null;
            }
            if (this.shipperMarker) {
                this.map.removeLayer(this.shipperMarker);
                this.shipperMarker = null;
            }
            if (this.radarMarker) {
                this.map.removeLayer(this.radarMarker);
                this.radarMarker = null;
            }

            // Reset tuyến
            this.routePoints = [];
            this.lastRatio = 0;
            this.originPostCoord = null;
            this.sourceCoord = null;
            this.destCoord = null;
            this.destPostCoord = null;
            this.recipientCoord = null;

            let sourceHub = null;
            let destHub = null;
            let originPostOffice = null;
            let destPostOffice = null;
            let routeCode = null;

            // 1. Phân tích từ lịch sử tracking
            (Array.isArray(history) ? history : []).forEach(item => {
                const text = item && (item.node || item.note);
                if (text && text.includes('ROUTE-')) {
                    const match = text.match(/ROUTE-([A-Z0-9-]+)-TO-([A-Z0-9-]+)/);
                    if (match) {
                        sourceHub = match[1];
                        destHub = match[2];
                        routeCode = match[0];
                    }
                    const postMatch = text.match(/(POST-[A-Z0-9-]+).*?(POST-[A-Z0-9-]+)/);
                    if (postMatch) {
                        originPostOffice = postMatch[1];
                        destPostOffice = postMatch[2];
                    }
                }
            });

            // 2. Bổ sung từ metadata đơn hàng nếu lịch sử chưa có
            if (!originPostOffice && extraMeta?.originPostOffice) originPostOffice = extraMeta.originPostOffice;
            if (!destPostOffice && extraMeta?.destPostOffice) destPostOffice = extraMeta.destPostOffice;

            if (!originPostOffice && extraMeta?.senderAddress) {
                const found = this.getPostOfficeForAddress(extraMeta.senderAddress, sourceHub);
                if (found) originPostOffice = found.code;
            }
            if (!destPostOffice && extraMeta?.receiverAddress) {
                const found = this.getPostOfficeForAddress(extraMeta.receiverAddress, destHub);
                if (found) destPostOffice = found.code;
            }

            const sourceCoord = this.getHubCoord(sourceHub);
            const destCoord = this.getHubCoord(destHub);
            const originPostCoord = this.getHubCoord(originPostOffice);
            const destPostCoord = this.getHubCoord(destPostOffice);

            if (!sourceCoord || !destCoord) {
                this.setLoading('Chưa có tuyến Hub đã xác thực để hiển thị trên bản đồ.');
                return null;
            }

            // Tọa độ nhà người nhận
            let recipientCoord = null;
            if (extraMeta?.receiverLatitude && extraMeta?.receiverLongitude) {
                recipientCoord = [extraMeta.receiverLatitude, extraMeta.receiverLongitude];
            } else if (extraMeta?.verifiedAddress?.lat && extraMeta?.verifiedAddress?.lon) {
                recipientCoord = [parseFloat(extraMeta.verifiedAddress.lat), parseFloat(extraMeta.verifiedAddress.lon)];
            }

            this.originPostCoord = originPostCoord;
            this.sourceCoord = sourceCoord;
            this.destCoord = destCoord;
            this.destPostCoord = destPostCoord;
            this.recipientCoord = recipientCoord;

            // 3. Đặt các mốc điểm (Markers) trên bản đồ
            // Mốc 1: Bưu Cục Gửi (Tiếp nhận Cấp 2/3)
            if (originPostCoord && (originPostCoord.lat !== sourceCoord.lat || originPostCoord.lng !== sourceCoord.lng)) {
                const origIcon = L.divIcon({ className: 'hub-pin-postoffice', iconSize: [14, 14], iconAnchor: [7, 7] });
                L.marker([originPostCoord.lat, originPostCoord.lng], { icon: origIcon })
                    .bindPopup(`
                        <div class="text-xs p-1 min-w-[210px]">
                            <div class="font-bold text-purple-700 text-[11.5px] uppercase tracking-wider">Bưu Cục Tiếp Nhận (Gửi)</div>
                            <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${originPostCoord.name} <span class="text-purple-600 font-mono text-[10.5px]">(${originPostOffice})</span></div>
                            <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${originPostCoord.address || 'Đang cập nhật địa chỉ'}</div>
                            ${originPostCoord.district ? `<div class="text-slate-400 text-[10px] mt-0.5">Quận/Huyện: ${originPostCoord.district}</div>` : ''}
                        </div>
                    `)
                    .addTo(this.markersGroup);
            }

            // Mốc 2: Kho Tổng Gửi (Cấp 1)
            const sourceIcon = L.divIcon({ className: 'hub-pin-source', iconSize: [16, 16], iconAnchor: [8, 8] });
            L.marker([sourceCoord.lat, sourceCoord.lng], { icon: sourceIcon })
                .bindPopup(`
                    <div class="text-xs p-1 min-w-[210px]">
                        <div class="font-bold text-blue-700 text-[11.5px] uppercase tracking-wider">Kho Tổng Xuất Phát (Cấp 1)</div>
                        <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${sourceCoord.name} <span class="text-blue-600 font-mono text-[10.5px]">(${sourceHub})</span></div>
                        <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${sourceCoord.address || 'Đang cập nhật địa chỉ'}</div>
                    </div>
                `)
                .addTo(this.markersGroup);

            // Mốc 3: Kho Tổng Đích (Cấp 1)
            const destIcon = L.divIcon({ className: 'hub-pin-dest', iconSize: [16, 16], iconAnchor: [8, 8] });
            L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
                .bindPopup(`
                    <div class="text-xs p-1 min-w-[210px]">
                        <div class="font-bold text-amber-700 text-[11.5px] uppercase tracking-wider">Kho Tổng Đích (Cấp 1)</div>
                        <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${destCoord.name} <span class="text-amber-600 font-mono text-[10.5px]">(${destHub})</span></div>
                        <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${destCoord.address || 'Đang cập nhật địa chỉ'}</div>
                    </div>
                `)
                .addTo(this.markersGroup);

            // Mốc 4: Bưu Cục Phát (Đích địa phương Cấp 2/3)
            if (destPostCoord && (destPostCoord.lat !== destCoord.lat || destPostCoord.lng !== destCoord.lng)) {
                const destPostIcon = L.divIcon({ className: 'hub-pin-delivery-post', iconSize: [14, 14], iconAnchor: [7, 7] });
                L.marker([destPostCoord.lat, destPostCoord.lng], { icon: destPostIcon })
                    .bindPopup(`
                        <div class="text-xs p-1 min-w-[210px]">
                            <div class="font-bold text-emerald-700 text-[11.5px] uppercase tracking-wider">Bưu Cục Phát Địa Phương</div>
                            <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${destPostCoord.name} <span class="text-emerald-600 font-mono text-[10.5px]">(${destPostOffice})</span></div>
                            <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${destPostCoord.address || 'Đang cập nhật địa chỉ'}</div>
                            ${destPostCoord.district ? `<div class="text-slate-400 text-[10px] mt-0.5">Quận/Huyện: ${destPostCoord.district}</div>` : ''}
                        </div>
                    `)
                    .addTo(this.markersGroup);
            }

            // Mốc 5: Địa Chỉ Người Nhận (Khách hàng)
            if (recipientCoord) {
                const custIcon = L.divIcon({ className: 'customer-pin', iconSize: [16, 16], iconAnchor: [8, 8] });
                const receiverLabel = extraMeta?.receiverAddress || 'Điểm giao hàng tận tay người nhận';
                L.marker(recipientCoord, { icon: custIcon })
                    .bindPopup(`
                        <div class="text-xs p-1 min-w-[210px]">
                            <div class="font-bold text-emerald-700 text-[11.5px] uppercase tracking-wider">Điểm Giao Tận Tay Khách Hàng</div>
                            <div class="text-slate-800 text-[11px] mt-0.5 font-semibold">${extraMeta?.receiverName ? extraMeta.receiverName + ' - ' : ''}${receiverLabel}</div>
                        </div>
                    `)
                    .addTo(this.markersGroup);
            }

            // Mốc 6: Nếu tuyến Bắc - Nam đi qua Đà Nẵng, hoặc có trạm trung gian trong lịch sử
            const renderedHubCodes = new Set([sourceHub, destHub]);
            const isNorthSouth = (sourceHub === 'HUB-HN-01' && destHub === 'HUB-HCM-01') || (sourceHub === 'HUB-HCM-01' && destHub === 'HUB-HN-01');
            if (isNorthSouth) {
                const dnCoord = this.getHubCoord('HUB-DN-01');
                if (dnCoord) {
                    renderedHubCodes.add('HUB-DN-01');
                    const transitIcon = L.divIcon({ className: 'hub-pin-transit', iconSize: [12, 12], iconAnchor: [6, 6] });
                    L.marker([dnCoord.lat, dnCoord.lng], { icon: transitIcon })
                        .bindPopup(`
                            <div class="text-xs p-1 min-w-[210px]">
                                <div class="font-bold text-slate-800 text-[11.5px] uppercase tracking-wider">Trạm Trung Chuyển Miền Trung</div>
                                <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${dnCoord.name} <span class="text-slate-500 font-mono text-[10.5px]">(HUB-DN-01)</span></div>
                                <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${dnCoord.address || 'Đang cập nhật địa chỉ'}</div>
                            </div>
                        `)
                        .addTo(this.markersGroup);
                }
            }

            // Quét lịch sử bổ sung bất kỳ Hub trung gian nào xe đã ghé qua
            (Array.isArray(history) ? history : []).forEach(item => {
                const loc = item && (item.locationCode || item.location);
                if (loc && loc.startsWith('HUB-') && !renderedHubCodes.has(loc)) {
                    renderedHubCodes.add(loc);
                    const transCoord = this.getHubCoord(loc);
                    if (transCoord) {
                        const transitIcon = L.divIcon({ className: 'hub-pin-transit', iconSize: [12, 12], iconAnchor: [6, 6] });
                        L.marker([transCoord.lat, transCoord.lng], { icon: transitIcon })
                            .bindPopup(`
                                <div class="text-xs p-1 min-w-[210px]">
                                    <div class="font-bold text-amber-700 text-[11.5px] uppercase tracking-wider">Trạm Trung Chuyển Dọc Tuyến</div>
                                    <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${transCoord.name} <span class="text-amber-600 font-mono text-[10.5px]">(${loc})</span></div>
                                    <div class="text-slate-600 text-[10.5px] mt-1 leading-relaxed"><b>Địa chỉ:</b> ${transCoord.address || 'Đang cập nhật địa chỉ'}</div>
                                </div>
                            `)
                            .addTo(this.markersGroup);
                    }
                }
            });

            // 4. Vẽ các chặng gom và chặng phát đa tầng
            // Chặng gom: Bưu cục gửi -> Kho Tổng gửi (Nét tím)
            if (originPostCoord && (originPostCoord.lat !== sourceCoord.lat || originPostCoord.lng !== sourceCoord.lng)) {
                const isOriginCompleted = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(currentStatus);
                this.feederOriginPolyline = L.polyline([
                    [originPostCoord.lat, originPostCoord.lng],
                    [sourceCoord.lat, sourceCoord.lng]
                ], {
                    color: '#7c3aed',
                    weight: isOriginCompleted ? 4.5 : 3.5,
                    opacity: isOriginCompleted ? 0.95 : 0.75,
                    dashArray: isOriginCompleted ? null : '4, 4',
                    lineJoin: 'round'
                }).addTo(this.map);
            }

            // Chặng chuyển: Kho Tổng đích -> Bưu cục phát (Nét cam)
            if (destPostCoord && (destPostCoord.lat !== destCoord.lat || destPostCoord.lng !== destCoord.lng)) {
                const isDestCompleted = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(currentStatus);
                this.feederDestPolyline = L.polyline([
                    [destCoord.lat, destCoord.lng],
                    [destPostCoord.lat, destPostCoord.lng]
                ], {
                    color: '#ea580c',
                    weight: isDestCompleted ? 4.5 : 3.5,
                    opacity: isDestCompleted ? 0.95 : 0.75,
                    dashArray: isDestCompleted ? null : '4, 4',
                    lineJoin: 'round'
                }).addTo(this.map);
            }

            // Chặng phát: Bưu cục phát -> Người nhận (Nét xanh lục)
            if (recipientCoord && destPostCoord) {
                const isDelivered = currentStatus === 'DELIVERED';
                const isDelivering = currentStatus === 'OUT_FOR_DELIVERY';
                this.lastMilePolyline = L.polyline([
                    [destPostCoord.lat, destPostCoord.lng],
                    recipientCoord
                ], {
                    color: '#059669',
                    weight: isDelivered ? 4.5 : (isDelivering ? 4 : 2.5),
                    opacity: (isDelivered || isDelivering) ? 0.95 : 0.45,
                    dashArray: isDelivered ? null : (isDelivering ? '4, 4' : '6, 8'),
                    lineJoin: 'round'
                }).addTo(this.map);

                // Nếu đang đi phát (OUT_FOR_DELIVERY): đặt biểu tượng Shipper xe máy đang chạy
                if (currentStatus === 'OUT_FOR_DELIVERY') {
                    const shipperLat = (destPostCoord.lat + recipientCoord[0]) / 2;
                    const shipperLng = (destPostCoord.lng + recipientCoord[1]) / 2;
                    const shipperIcon = L.divIcon({
                        className: 'shipper-motorcycle-pin',
                        html: '<svg style="width:14px;height:14px;" fill="currentColor" viewBox="0 0 24 24"><path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.18c.41 1.16 1.51 2 2.82 2 1.66 0 3-1.34 3-3s-1.34-3-3-3c-.41 0-.79.09-1.14.24L17.65 9H19V7zM7 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>',
                        iconSize: [26, 26],
                        iconAnchor: [13, 13]
                    });
                    this.shipperMarker = L.marker([shipperLat, shipperLng], { icon: shipperIcon, zIndexOffset: 1200 })
                        .bindTooltip('<div style="font-size:11px;font-weight:700;color:#059669;">Bưu Tá Đang Đi Phát</div><div style="font-size:10px;color:#64748b;">Chặng cuối tới người nhận</div>', { permanent: true, direction: 'top', className: 'radar-tooltip' })
                        .addTo(this.map);
                }
            }

            let distanceKm = null;
            let durationHours = null;
            let isRealRoad = false;

            // 5. Tính tuyến xe trục Linehaul giữa 2 Kho Tổng (Ghim chặt trong lãnh thổ VN)
            const cacheKey = `${sourceHub}_${destHub}`;
            const cached = this.routeCache[cacheKey] || this.readPersistedRoute(cacheKey);

            if (cached) {
                this.routeCache[cacheKey] = cached;
                this.routePoints = cached.routePoints;
                distanceKm = cached.distanceKm;
                durationHours = cached.durationHours;
                isRealRoad = cached.isRealRoad;
            } else {
                this.setLoading('Đang tính tuyến đường bộ nội địa…');

                let osrmPoints = null;
                try {
                    const waypoints = this.buildVietnamWaypoints(sourceCoord, destCoord);
                    const waypointsQuery = waypoints.map(pt => `${pt.lng},${pt.lat}`).join(';');
                    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypointsQuery}?overview=full&geometries=geojson`;

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000);

                    const res = await fetch(osrmUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const data = await res.json();
                        if (data.routes && data.routes.length > 0) {
                            const route = data.routes[0];
                            distanceKm = Math.round(route.distance / 1000);
                            durationHours = Math.max(1, Math.round(route.duration / 3600));
                            isRealRoad = true;
                            osrmPoints = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);
                        }
                    }
                } catch (e) {
                    console.warn('[MapManager] OSRM không phản hồi hoặc bị gián đoạn, chuyển sang fallback hành lang:', e);
                }

                this.setLoading(null);

                if (isStale()) return null;

                if (osrmPoints && osrmPoints.length > 0) {
                    this.routePoints = osrmPoints;
                    const payload = { routePoints: osrmPoints, distanceKm, durationHours, isRealRoad: true };
                    this.routeCache[cacheKey] = payload;
                    this.persistRoute(cacheKey, payload);
                } else {
                    const fallbackWps = this.buildVietnamWaypoints(sourceCoord, destCoord);
                    const points = [];
                    for (let w = 0; w < fallbackWps.length - 1; w++) {
                        const p1 = fallbackWps[w];
                        const p2 = fallbackWps[w + 1];
                        for (let i = 0; i <= 10; i++) {
                            const t = i / 10;
                            points.push([
                                p1.lat + (p2.lat - p1.lat) * t,
                                p1.lng + (p2.lng - p1.lng) * t
                            ]);
                        }
                    }
                    this.routePoints = points;
                    isRealRoad = false;
                }
            }

            if (isStale()) return null;

            this.currentRouteKey = cacheKey;

            // 6. Cập nhật phân đoạn và vị trí Pin Radar theo trạng thái hiện tại
            let latestLoc = null;
            let latestNote = '';
            if (Array.isArray(history) && history.length > 0) {
                const lastItem = history[history.length - 1];
                latestLoc = lastItem.locationCode || null;
                latestNote = lastItem.node || lastItem.note || '';
            }
            this.updateProgress(currentStatus, latestNote, latestLoc);

            // 7. Căn góc nhìn ôm sát tuyến đường
            if (shouldFitBounds) {
                try {
                    this.fitRouteView();
                } catch (e) {}
            }

            return {
                sourceHub,
                destHub,
                originPostOffice,
                destPostOffice,
                routeCode,
                distanceKm,
                durationHours,
                isRealRoad
            };
        }
    };

    window.MapManager = MapManager;
})();
