/**
 * VNPT CLOUD - ROUTING SERVICE CLIENT
 * Quản lý Hubs, Điều phối Chuyến xe trục (Trips) & Gom đơn liên tỉnh
 */

(function () {
    const RoutingService = {
        async getAllHubs() {
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (typeof Auth !== 'undefined') {
                    const token = Auth.getToken();
                    if (token) headers['Authorization'] = `Bearer ${token}`;
                }
                const base = window.location.port === '3000' ? '' : 'http://localhost:8080';
                const response = await fetch(`${base}/api/routing/hubs`, { headers });
                if (!response.ok) return [];
                return await response.json();
            } catch (e) {
                return [];
            }
        },

        async getAllTrips() {
            const response = await Api.get('/api/routing/trips');
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tải danh sách chuyến xe');
            }
            return response.json();
        },

        async getTripDetail(tripId) {
            const response = await Api.get(`/api/routing/trips/${tripId}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tải chi tiết chuyến xe');
            }
            return response.json();
        },

        async createTrip(tripData) {
            const response = await Api.post('/api/routing/trips', tripData);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi khởi tạo chuyến xe');
            }
            return response.json();
        },

        async autoConsolidate(tripId, requestData = null) {
            const response = await Api.post(`/api/routing/trips/${tripId}/consolidate`, requestData || {});
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi gom đơn lên chuyến xe');
            }
            return response.json();
        },

        async removeManifestItem(tripId, trackingCode) {
            const response = await Api.post(`/api/routing/trips/${tripId}/remove-item?trackingCode=${encodeURIComponent(trackingCode)}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi gỡ kiện hàng khỏi chuyến xe');
            }
            return response.json();
        },

        async departTrip(tripId) {
            const response = await Api.post(`/api/routing/trips/${tripId}/depart`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi xuất bến chuyến xe');
            }
            return response.json();
        },

        async arriveAtStop(tripId, hubCode) {
            const response = await Api.post(`/api/routing/trips/${tripId}/arrive?hubCode=${encodeURIComponent(hubCode)}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi cập bến trạm dừng');
            }
            return response.json();
        },

        async consolidateAllTrips() {
            const response = await Api.post('/api/routing/trips/consolidate-all');
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Lỗi khi kích hoạt gom đơn tự động toàn hệ thống');
            }
            return response.json();
        },

        async getSchedulerConfig() {
            const response = await Api.get('/api/routing/scheduler/config');
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tải cấu hình bộ lập lịch');
            }
            return response.json();
        },

        async updateSchedulerConfig(configData) {
            const response = await Api.post('/api/routing/scheduler/config', configData);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể cập nhật cấu hình bộ lập lịch');
            }
            return response.json();
        },

        async getEligibleAssignments(tripId) {
            const response = await Api.get(`/api/routing/trips/${tripId}/eligible-assignments`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || 'Không thể tải danh sách đơn chờ khả dụng');
            }
            return response.json();
        }
    };

    window.RoutingService = RoutingService;
})();
