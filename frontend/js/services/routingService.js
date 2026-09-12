/**
 * VNPT CLOUD - ROUTING SERVICE CLIENT
 * Quản lý Hubs, Điều phối Chuyến xe trục (Trips) & Gom đơn liên tỉnh
 */

(function () {
    const encodePath = (value) => encodeURIComponent(String(value ?? ''));

    // Mỗi lần tác nghiệp có một operationId để backend xử lý idempotent khi retry.
    const createOperationId = (prefix = 'operation') => {
        if (typeof window !== 'undefined'
            && window.Utils
            && typeof window.Utils.createOperationId === 'function') {
            return window.Utils.createOperationId(prefix);
        }
        const safePrefix = String(prefix || 'operation').replace(/[^a-zA-Z0-9_-]/g, '-');
        const cryptoSource = typeof crypto !== 'undefined' ? crypto : null;
        if (cryptoSource && typeof cryptoSource.randomUUID === 'function') {
            return `${safePrefix}-${cryptoSource.randomUUID()}`;
        }
        return `${safePrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    };

    const ensureOperationId = (payload, prefix = 'operation') => {
        const result = payload && typeof payload === 'object' ? { ...payload } : {};
        if (!result.operationId || !String(result.operationId).trim()) {
            result.operationId = createOperationId(prefix);
        }
        return result;
    };

    const normalizeInventoryRequest = (requestData, extra = {}, prefix = 'inventory') => {
        let payload;
        if (Array.isArray(requestData)) {
            payload = { trackingCodes: requestData };
        } else if (typeof requestData === 'string') {
            payload = { trackingCodes: [requestData] };
        } else {
            payload = requestData && typeof requestData === 'object' ? { ...requestData } : {};
        }
        if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
            payload = { ...payload, ...extra };
        }
        return ensureOperationId(payload, prefix);
    };

    const normalizeHandoffRequest = (requestData, courierId, extra = {}) => {
        let payload;
        if (typeof requestData === 'string') {
            payload = { trackingCode: requestData };
            if (typeof courierId === 'string') {
                payload.courierId = courierId;
            }
        } else {
            payload = requestData && typeof requestData === 'object' ? { ...requestData } : {};
            if (typeof courierId === 'string' && !payload.courierId) {
                payload.courierId = courierId;
            } else if (courierId && typeof courierId === 'object' && !Array.isArray(courierId)) {
                payload = { ...payload, ...courierId };
            }
        }
        if (typeof extra === 'string') {
            payload.note = extra;
        } else if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
            payload = { ...payload, ...extra };
        }
        return ensureOperationId(payload, 'handoff');
    };

    const normalizeProgressRequest = (requestData, progressPercent, latitude, longitude, note, operationId) => {
        let payload;
        if (requestData && typeof requestData === 'object' && !Array.isArray(requestData)) {
            payload = { ...requestData };
        } else if (typeof requestData === 'string') {
            payload = { locationCode: requestData };
        } else if (typeof requestData === 'number') {
            payload = { progressPercent: requestData };
        } else {
            payload = {};
        }

        const positionalValues = {
            progressPercent,
            latitude,
            longitude,
            note,
            operationId
        };
        Object.keys(positionalValues).forEach(key => {
            if (positionalValues[key] !== undefined && positionalValues[key] !== null) {
                payload[key] = positionalValues[key];
            }
        });
        return ensureOperationId(payload, 'trip-progress');
    };

    const isSuccessfulResponse = (response) => {
        if (!response) return false;
        if (response.ok === false) return false;
        return !(typeof response.status === 'number' && response.status >= 400);
    };

    const parseResponse = async (response, fallbackMessage = 'Yêu cầu định tuyến không thành công') => {
        if (!isSuccessfulResponse(response)) {
            if (typeof Api !== 'undefined' && typeof Api.parseError === 'function') {
                throw await Api.parseError(response, fallbackMessage);
            }
            const error = new Error(fallbackMessage);
            error.status = response?.status ?? null;
            error.code = null;
            error.details = null;
            throw error;
        }
        if (response.status === 204) return null;
        if (typeof response.json !== 'function') return response;
        return response.json();
    };

    const RoutingService = {
        createOperationId,
        ensureOperationId,
        parseResponse,

        async getAllHubs() {
            const response = await Api.get('/api/routing/hubs');
            return parseResponse(response, 'Không thể tải danh sách hub');
        },

        async getAllTrips() {
            const response = await Api.get('/api/routing/trips');
            return parseResponse(response, 'Không thể tải danh sách chuyến xe');
        },

        async getTripDetail(tripId) {
            const response = await Api.get(`/api/routing/trips/${encodePath(tripId)}`);
            return parseResponse(response, 'Không thể tải chi tiết chuyến xe');
        },

        async getAssignment(trackingCode) {
            const response = await Api.get(
                `/api/routing/shipments/${encodePath(trackingCode)}/assignment`
            );
            return parseResponse(response, 'Không thể tải phân tuyến bưu gửi');
        },

        async createTrip(tripData) {
            const response = await Api.post('/api/routing/trips', tripData);
            return parseResponse(response, 'Lỗi khi khởi tạo chuyến xe');
        },

        async autoConsolidate(tripId, requestData = null) {
            // Keep the no-argument automatic mode as an empty request body. The
            // backend uses the absence of selected items to enforce its cutoff rule.
            const response = await Api.post(
                `/api/routing/trips/${encodePath(tripId)}/consolidate`,
                requestData
            );
            return parseResponse(response, 'Lỗi khi gom đơn lên chuyến xe');
        },

        async removeManifestItem(tripId, trackingCode) {
            const response = await Api.post(
                `/api/routing/trips/${encodePath(tripId)}/remove-item?trackingCode=${encodePath(trackingCode)}`
            );
            return parseResponse(response, 'Lỗi khi gỡ kiện hàng khỏi chuyến xe');
        },

        async departTrip(tripId) {
            const response = await Api.post(`/api/routing/trips/${encodePath(tripId)}/depart`);
            return parseResponse(response, 'Lỗi khi xuất bến chuyến xe');
        },

        async arriveAtStop(tripId, hubCode) {
            const response = await Api.post(
                `/api/routing/trips/${encodePath(tripId)}/arrive?hubCode=${encodePath(hubCode)}`
            );
            return parseResponse(response, 'Lỗi khi cập bến trạm dừng');
        },

        async consolidateAllTrips() {
            const response = await Api.post('/api/routing/trips/consolidate-all');
            return parseResponse(response, 'Lỗi khi kích hoạt gom đơn tự động toàn hệ thống');
        },

        async getSchedulerConfig() {
            const response = await Api.get('/api/routing/scheduler/config');
            return parseResponse(response, 'Không thể tải cấu hình bộ lập lịch');
        },

        async updateSchedulerConfig(configData) {
            const response = await Api.post('/api/routing/scheduler/config', configData);
            return parseResponse(response, 'Không thể cập nhật cấu hình bộ lập lịch');
        },

        async getEligibleAssignments(tripId) {
            const response = await Api.get(`/api/routing/trips/${encodePath(tripId)}/eligible-assignments`);
            return parseResponse(response, 'Không thể tải danh sách đơn chờ khả dụng');
        },

        async receiveAtLocation(locationCode, requestData = {}, extra = {}) {
            const payload = normalizeInventoryRequest(requestData, extra, 'receive');
            const response = await Api.post(
                `/api/routing/locations/${encodePath(locationCode)}/receive`,
                payload
            );
            return parseResponse(response, 'Không thể tiếp nhận bưu gửi tại địa điểm');
        },

        async storeAtLocation(locationCode, requestData = {}, extra = {}) {
            const payload = normalizeInventoryRequest(requestData, extra, 'store');
            const response = await Api.post(
                `/api/routing/locations/${encodePath(locationCode)}/store`,
                payload
            );
            return parseResponse(response, 'Không thể nhập kho bưu gửi tại địa điểm');
        },

        async handoffToCourier(locationCode, requestData = {}, courierId = null, extra = {}) {
            const payload = normalizeHandoffRequest(requestData, courierId, extra);
            const response = await Api.post(
                `/api/routing/locations/${encodePath(locationCode)}/handoff`,
                payload
            );
            return parseResponse(response, 'Không thể bàn giao bưu gửi cho bưu tá');
        },

        async getInventory(locationCode, inventoryStatus = null) {
            const normalizedLocation = String(locationCode ?? '').trim();
            if (!normalizedLocation || normalizedLocation.toUpperCase() === 'ALL') {
                throw new Error('locationCode cụ thể là bắt buộc khi tải tồn kho');
            }
            const status = inventoryStatus && typeof inventoryStatus === 'object'
                ? (inventoryStatus.status || inventoryStatus.inventoryStatus)
                : inventoryStatus;
            const query = status && String(status).toUpperCase() !== 'ALL'
                ? `?status=${encodePath(status)}`
                : '';
            const response = await Api.get(
                `/api/routing/locations/${encodePath(normalizedLocation)}/inventory${query}`
            );
            return parseResponse(response, 'Không thể tải tồn kho tại địa điểm');
        },

        async getOperationHistory(trackingCode) {
            const response = await Api.get(
                `/api/routing/shipments/${encodePath(trackingCode)}/operations`
            );
            return parseResponse(response, 'Không thể tải lịch sử tác nghiệp của bưu gửi');
        },

        async updateTripProgress(
            tripId,
            requestData = {},
            progressPercent,
            latitude,
            longitude,
            note,
            operationId
        ) {
            const payload = normalizeProgressRequest(
                requestData,
                progressPercent,
                latitude,
                longitude,
                note,
                operationId
            );
            const response = await Api.patch(
                `/api/routing/trips/${encodePath(tripId)}/progress`,
                payload
            );
            return parseResponse(response, 'Không thể cập nhật tiến độ chuyến xe');
        }
    };

    window.RoutingService = RoutingService;
})();
