/**
 * VNPT CLOUD - BẢN ĐỒ ĐỊNH VỊ & ĐIỀU PHỐI TUYẾN ĐƯỜNG (LEAFLET)
 * Quản lý vẽ tuyến đường, cắm mốc bưu cục và nạp tọa độ động từ Hubs Database
 */

(function () {
    const MapManager = {
        map: null,
        polylineLayer: null,
        markersGroup: null,
        hubCoordinates: {
            'HUB-HN-01': { name: 'Kho Tổng Hà Nội', lat: 21.028511, lng: 105.782000 },
            'HUB-HP-01': { name: 'Kho Tổng Hải Phòng', lat: 20.844912, lng: 106.688084 },
            'HUB-DN-01': { name: 'Kho Tổng Đà Nẵng', lat: 16.054407, lng: 108.202167 },
            'HUB-HCM-01': { name: 'Kho Tổng TP. Hồ Chí Minh', lat: 10.823099, lng: 106.629664 },
            'HUB-CT-01': { name: 'Kho Tổng Cần Thơ', lat: 10.045162, lng: 105.746857 }
        },

        // Khởi tạo bản đồ Leaflet
        init(containerId = 'tracking-map') {
            const el = document.getElementById(containerId);
            if (!el) return;

            // Nếu map đã tồn tại trên DOM này, hủy bỏ trước để tránh lỗi "Map container is already initialized"
            if (this.map) {
                try {
                    this.map.remove();
                } catch (e) {
                    console.warn('[MapManager] Dọn dẹp map cũ:', e);
                }
                this.map = null;
            }

            this.map = L.map(containerId, { zoomControl: true }).setView([16.054407, 108.202167], 6);

            // Bản đồ OpenStreetMap HOT: Màu sắc tươi sáng, sinh động, không cần API Key, không watermark
            L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team',
                subdomains: 'abc',
                maxZoom: 19
            }).addTo(this.map);

            this.markersGroup = L.layerGroup().addTo(this.map);

            // Cho Leaflet cập nhật kích thước chuẩn xác
            setTimeout(() => {
                if (this.map) {
                    this.map.invalidateSize();
                }
            }, 250);
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

        // Vẽ tuyến luân chuyển hàng giữa các Hub (Hỗ trợ OSRM vẽ đường bộ thực tế)
        async renderRoute(history = []) {
            if (!this.map) this.init();
            if (!this.map) return null;

            if (this.markersGroup) this.markersGroup.clearLayers();
            if (this.polylineLayer && this.map) {
                this.map.removeLayer(this.polylineLayer);
                this.polylineLayer = null;
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

            // 1. Mốc điểm gửi (Source)
            const sourceIcon = L.divIcon({ className: 'hub-pin-source', iconSize: [16, 16] });
            L.marker([sourceCoord.lat, sourceCoord.lng], { icon: sourceIcon })
                .bindPopup(`<b>Bưu Cục Gửi (Tiếp nhận):</b><br/>${sourceCoord.name}`)
                .addTo(this.markersGroup);

            // 2. Mốc điểm nhận (Destination)
            const destIcon = L.divIcon({ className: 'hub-pin-dest', iconSize: [16, 16] });
            L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
                .bindPopup(`<b>Bưu Cục Phát (Đích đến):</b><br/>${destCoord.name}`)
                .addTo(this.markersGroup);

            let distanceKm = null;
            let durationHours = null;
            let isRealRoad = false;

            // 3. Gọi API OSRM miễn phí vẽ đường bộ thực tế (Quốc lộ / Cao tốc Việt Nam)
            try {
                // Tọa độ OSRM: {lng},{lat};{lng},{lat}
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${sourceCoord.lng},${sourceCoord.lat};${destCoord.lng},${destCoord.lat}?overview=full&geometries=geojson`;
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 4000);

                const res = await fetch(osrmUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json();
                    if (data.routes && data.routes.length > 0) {
                        const route = data.routes[0];
                        distanceKm = Math.round(route.distance / 1000);
                        durationHours = Math.max(1, Math.round(route.duration / 3600));
                        isRealRoad = true;

                        // Vẽ tuyến đường uốn lượn GeoJSON
                        this.polylineLayer = L.geoJSON(route.geometry, {
                            style: {
                                color: '#0066cc',
                                weight: 4,
                                opacity: 0.85
                            }
                        }).addTo(this.map);

                        this.map.fitBounds(this.polylineLayer.getBounds(), { padding: [40, 40] });
                    }
                }
            } catch (e) {
                console.warn('[MapManager] OSRM không phản hồi, chuyển sang fallback đường thẳng:', e);
            }

            // Fallback: Vẽ đường thẳng nét đứt nếu OSRM chưa phản hồi
            if (!this.polylineLayer) {
                const latlngs = [
                    [sourceCoord.lat, sourceCoord.lng],
                    [destCoord.lat, destCoord.lng]
                ];

                this.polylineLayer = L.polyline(latlngs, {
                    color: '#0066cc',
                    weight: 3,
                    opacity: 0.85,
                    dashArray: '6, 8'
                }).addTo(this.map);

                try {
                    this.map.fitBounds(latlngs, { padding: [40, 40] });
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
