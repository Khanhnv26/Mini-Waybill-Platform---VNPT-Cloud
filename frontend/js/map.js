/**
 * VNPT CLOUD - BẢN ĐỒ ĐỊNH VỊ & ĐIỀU PHỐI TUYẾN ĐƯỜNG (LEAFLET)
 * Tích hợp dữ liệu bản đồ tiếng Việt (Google Maps Tiles hl=vi)
 * Khẳng định chủ quyền biển đảo toàn vẹn lãnh thổ Việt Nam (Hoàng Sa & Trường Sa)
 */

(function () {
    const MapManager = {
        map: null,
        polylineLayer: null,
        markersGroup: null,
        baseLayers: {},
        layerControl: null,
        hubCoordinates: {
            'HUB-HN-01': { name: 'Kho Tổng Hà Nội', lat: 21.028511, lng: 105.782000 },
            'HUB-HP-01': { name: 'Kho Tổng Hải Phòng', lat: 20.844912, lng: 106.688084 },
            'HUB-DN-01': { name: 'Kho Tổng Đà Nẵng', lat: 16.054407, lng: 108.202167 },
            'HUB-HCM-01': { name: 'Kho Tổng TP. Hồ Chí Minh', lat: 10.823099, lng: 106.629664 },
            'HUB-CT-01': { name: 'Kho Tổng Cần Thơ', lat: 10.045162, lng: 105.746857 }
        },

        currentContainerId: null,
        routeCache: {},
        vietnamCorridorWaypoints: [
            { name: 'Vinh (Nghệ An)', lat: 18.6796, lng: 105.6813 },
            { name: 'Đồng Hới (Quảng Bình)', lat: 17.4740, lng: 106.6225 },
            { name: 'Huế', lat: 16.4637, lng: 107.5905 },
            { name: 'Đà Nẵng', lat: 16.054407, lng: 108.202167 },
            { name: 'Quy Nhơn (Bình Định)', lat: 13.7830, lng: 109.2197 },
            { name: 'Nha Trang (Khánh Hòa)', lat: 12.2388, lng: 109.1967 },
            { name: 'Phan Thiết (Bình Thuận)', lat: 10.9274, lng: 108.1021 }
        ],

        // Xây dựng danh sách trạm mốc hành lang giao thông đường bộ Việt Nam (QL1A & Cao tốc Bắc - Nam CT01)
        buildVietnamWaypoints(sourceCoord, destCoord) {
            const isNorthToSouth = sourceCoord.lat > destCoord.lat;
            const minLat = Math.min(sourceCoord.lat, destCoord.lat);
            const maxLat = Math.max(sourceCoord.lat, destCoord.lat);

            // Lọc các điểm chốt hành lang nằm giữa điểm đi và điểm đến
            const intermediates = this.vietnamCorridorWaypoints.filter(wp => {
                return wp.lat > minLat + 0.25 && wp.lat < maxLat - 0.25;
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

            // Nếu đổi sang container khác hoặc map cũ bị mất, dọn dẹp an toàn
            if (this.map) {
                try {
                    this.map.remove();
                } catch (e) {
                    console.warn('[MapManager] Dọn dẹp map cũ:', e);
                }
                this.map = null;
            }

            this.currentContainerId = containerId;

            // 1. Khởi tạo đối tượng Map Leaflet
            this.map = L.map(containerId, {
                zoomControl: true,
                minZoom: 4,
                maxZoom: 20
            });

            // 2. Cấu hình Tile Layers tiếng Việt (Google Maps hl=vi không cần API key, tên đường và tỉnh thành 100% chuẩn Việt Nam)
            const roadLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
                attribution: '&copy; Google Bản đồ Việt Nam | Bưu chính VNPT',
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20
            });

            const hybridLayer = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&hl=vi', {
                attribution: '&copy; Google Vệ tinh | Bưu chính VNPT',
                subdomains: ['0', '1', '2', '3'],
                maxZoom: 20
            });

            // Mặc định nạp bản đồ đường bộ tiếng Việt
            roadLayer.addTo(this.map);

            this.baseLayers = {
                'Bản đồ đường bộ': roadLayer,
                'Ảnh vệ tinh': hybridLayer
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
            hubs.forEach(h => {
                if (h.hubCode && h.latitude && h.longitude) {
                    this.hubCoordinates[h.hubCode] = {
                        name: h.hubName + ' (' + h.hubCode + ')',
                        lat: h.latitude,
                        lng: h.longitude,
                        province: h.province
                    };
                }
            });
        },

        // Lấy thông tin tọa độ bưu cục
        getHubCoord(hubCode, fallbackCode = 'HUB-HN-01') {
            return this.hubCoordinates[hubCode] || this.hubCoordinates[fallbackCode] || { name: hubCode, lat: 21.028511, lng: 105.782000 };
        },

        // Cập nhật tiến độ bưu kiện trên từng chặng OSRM thời gian thực
        updateProgress(status, note = '') {
            if (!this.map || !this.routePoints || this.routePoints.length === 0) return null;

            const statusRatios = {
                'CREATED': 0.02,
                'PENDING_ROUTING': 0.04,
                'ROUTE_ASSIGNED': 0.08,
                'PICKED_UP': 0.20,
                'IN_TRANSIT': 0.55,
                'ARRIVED_DEST_HUB': 0.88,
                'DELIVERING': 0.95,
                'DELIVERED': 1.0,
                'CANCELLED': 0.0
            };

            const ratio = statusRatios[status] !== undefined ? statusRatios[status] : 0.5;
            const targetIdx = Math.min(this.routePoints.length - 1, Math.max(0, Math.floor(ratio * (this.routePoints.length - 1))));
            const currentPoint = this.routePoints[targetIdx];

            // 1. Cập nhật phân đoạn đã hoàn thành (Xanh dương đậm)
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

            // 2. Cập nhật phân đoạn còn lại (Nét đứt xám nhạt)
            const remainingCoords = this.routePoints.slice(targetIdx);
            if (!this.remainingPolyline) {
                this.remainingPolyline = L.polyline(remainingCoords, {
                    color: '#94a3b8',
                    weight: 3.5,
                    opacity: 0.75,
                    dashArray: '5, 8',
                    lineJoin: 'round',
                    lineCap: 'round'
                }).addTo(this.map);
            } else {
                this.remainingPolyline.setLatLngs(remainingCoords);
            }

            // 3. Cập nhật Pin Radar phát sóng di động
            const statusNames = {
                'CREATED': 'Đã Tiếp Nhận Bưu Gửi',
                'PENDING_ROUTING': 'Đang Phân Tuyến OSRM',
                'ROUTE_ASSIGNED': 'Đã Thiết Lập Tuyến',
                'PICKED_UP': 'Đã Rời Bưu Cục Xuất Phát',
                'IN_TRANSIT': 'Đang Vận Chuyển Trên Tuyến',
                'ARRIVED_DEST_HUB': 'Đã Nhập Bưu Cục Đích',
                'DELIVERING': 'Bưu Tá Đang Giao Tận Nơi',
                'DELIVERED': 'Giao Hàng Thành Công',
                'CANCELLED': 'Hành Trình Bị Hủy'
            };

            const percent = Math.round(ratio * 100);
            const labelText = statusNames[status] || status;
            const tooltipHtml = `
                <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${labelText}</div>
                <div style="font-size: 10px; color: #0066cc; font-family: monospace; font-weight: 600;">TIẾN ĐỘ: ${percent}%</div>
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
                this.radarMarker.setLatLng(currentPoint);
                this.radarMarker.setTooltipContent(tooltipHtml);
            }

            return {
                ratio,
                percent,
                currentPoint,
                status
            };
        },

        // Vẽ tuyến luân chuyển hàng giữa các Hub (Hỗ trợ OSRM vẽ đường bộ thực tế & nhiều chặng)
        async renderRoute(history = [], currentStatus = 'ROUTE_ASSIGNED', shouldFitBounds = true) {
            if (!this.map) this.init();
            if (!this.map) return null;

            // Xóa các mốc và tuyến cũ của đơn trước
            if (this.markersGroup) this.markersGroup.clearLayers();
            if (this.completedPolyline && this.map) {
                this.map.removeLayer(this.completedPolyline);
                this.completedPolyline = null;
            }
            if (this.remainingPolyline && this.map) {
                this.map.removeLayer(this.remainingPolyline);
                this.remainingPolyline = null;
            }
            if (this.radarMarker && this.map) {
                this.map.removeLayer(this.radarMarker);
                this.radarMarker = null;
            }

            let sourceHub = 'HUB-HN-01';
            let destHub = 'HUB-HCM-01';
            let routeCode = 'ROUTE-HUB-HN-01-TO-HUB-HCM-01';

            // Phân tích từ lịch sử tracking
            history.forEach(item => {
                if (item.node && item.node.includes('ROUTE-')) {
                    const match = item.node.match(/ROUTE-([A-Z0-9-]+)-TO-([A-Z0-9-]+)/);
                    if (match) {
                        sourceHub = match[1];
                        destHub = match[2];
                        routeCode = match[0];
                    }
                }
            });

            const sourceCoord = this.getHubCoord(sourceHub, 'HUB-HN-01');
            const destCoord = this.getHubCoord(destHub, 'HUB-HCM-01');

            // 1. Mốc điểm gửi (Source Hub)
            const sourceIcon = L.divIcon({ className: 'hub-pin-source', iconSize: [16, 16] });
            L.marker([sourceCoord.lat, sourceCoord.lng], { icon: sourceIcon })
                .bindPopup(`<b>Bưu Cục Gửi (Tiếp nhận):</b><br/>${sourceCoord.name}`)
                .addTo(this.markersGroup);

            // 2. Mốc điểm nhận (Destination Hub)
            const destIcon = L.divIcon({ className: 'hub-pin-dest', iconSize: [16, 16] });
            L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
                .bindPopup(`<b>Bưu Cục Phát (Đích đến):</b><br/>${destCoord.name}`)
                .addTo(this.markersGroup);

            // 3. Nếu tuyến Bắc - Nam đi qua Đà Nẵng, hiển thị mốc trung chuyển miền Trung
            const isNorthSouth = (sourceHub === 'HUB-HN-01' && destHub === 'HUB-HCM-01') || (sourceHub === 'HUB-HCM-01' && destHub === 'HUB-HN-01');
            if (isNorthSouth) {
                const dnCoord = this.getHubCoord('HUB-DN-01');
                const transitIcon = L.divIcon({ className: 'hub-pin-transit', iconSize: [12, 12], iconAnchor: [6, 6] });
                L.marker([dnCoord.lat, dnCoord.lng], { icon: transitIcon })
                    .bindPopup(`<b>Trạm Trung Chuyển Miền Trung:</b><br/>${dnCoord.name}`)
                    .addTo(this.markersGroup);
            }

            let distanceKm = null;
            let durationHours = null;
            let isRealRoad = false;

            // 4. Kiểm tra bộ nhớ đệm (Cache) để nạp tức thì
            const cacheKey = `${sourceHub}_${destHub}`;
            if (this.routeCache[cacheKey]) {
                const cached = this.routeCache[cacheKey];
                this.routePoints = cached.routePoints;
                distanceKm = cached.distanceKm;
                durationHours = cached.durationHours;
                isRealRoad = cached.isRealRoad;
            } else {
                // Gọi API OSRM kèm theo các điểm chốt hành lang nội địa Việt Nam (QL1A & CT01)
                try {
                    const waypoints = this.buildVietnamWaypoints(sourceCoord, destCoord);
                    const waypointsQuery = waypoints.map(pt => `${pt.lng},${pt.lat}`).join(';');
                    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${waypointsQuery}?overview=full&geometries=geojson`;

                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 4500);

                    const res = await fetch(osrmUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const data = await res.json();
                        if (data.routes && data.routes.length > 0) {
                            const route = data.routes[0];
                            distanceKm = Math.round(route.distance / 1000);
                            durationHours = Math.max(1, Math.round(route.duration / 3600));
                            isRealRoad = true;

                            // Chuyển đổi GeoJSON [lng, lat] thành danh sách Leaflet [lat, lng]
                            this.routePoints = route.geometry.coordinates.map(pt => [pt[1], pt[0]]);

                            // Lưu vào bộ nhớ đệm (Cache)
                            this.routeCache[cacheKey] = {
                                routePoints: this.routePoints,
                                distanceKm,
                                durationHours,
                                isRealRoad: true
                            };
                        }
                    }
                } catch (e) {
                    console.warn('[MapManager] OSRM không phản hồi hoặc bị gián đoạn, chuyển sang fallback hành lang:', e);
                }

                // Fallback nếu OSRM lỗi mạng: Nối theo chuỗi waypoints nội địa Việt Nam
                if (!this.routePoints || this.routePoints.length === 0) {
                    const fallbackWps = this.buildVietnamWaypoints(sourceCoord, destCoord);
                    this.routePoints = [];
                    for (let w = 0; w < fallbackWps.length - 1; w++) {
                        const p1 = fallbackWps[w];
                        const p2 = fallbackWps[w + 1];
                        for (let i = 0; i <= 10; i++) {
                            const t = i / 10;
                            this.routePoints.push([
                                p1.lat + (p2.lat - p1.lat) * t,
                                p1.lng + (p2.lng - p1.lng) * t
                            ]);
                        }
                    }
                }
            }

            // 5. Cập nhật phân đoạn và vị trí Pin Radar theo trạng thái hiện tại
            this.updateProgress(currentStatus);

            // 6. Căn góc nhìn ôm sát tuyến đường (chỉ khi có yêu cầu)
            if (shouldFitBounds) {
                try {
                    this.fitRouteView();
                } catch (e) {}
            }

            return {
                sourceHub,
                destHub,
                routeCode,
                distanceKm,
                durationHours,
                isRealRoad
            };
        }
    };

    window.MapManager = MapManager;
})();
