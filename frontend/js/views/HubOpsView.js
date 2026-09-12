/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: KHAI THÁC & CHIA CHỌN BƯU GỬI TẠI HUB (HUB OPERATIONS)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_HUB_OPERATOR / ROLE_ADMIN (Quyền: tracking:update_hub)
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const asNonBlankString = (value) => {
        if (value === undefined || value === null) return '';
        const text = String(value).trim();
        return text;
    };

    const asCode = (value) => asNonBlankString(value).toUpperCase();

    const readFirstField = (source, keys) => {
        if (!source || typeof source !== 'object') return '';
        for (const key of keys) {
            const value = source[key];
            if (value !== undefined && value !== null && asNonBlankString(value) !== '') {
                return value;
            }
        }
        return '';
    };

    const readLocationCode = (source) => {
        if (!source || typeof source !== 'object') return '';

        const direct = readFirstField(source, [
            'locationCode',
            'stationCode',
            'hubCode',
            'assignedLocationCode',
            'assignedStationCode',
            'assignedHubCode',
            'workLocationCode',
            'operationalLocationCode',
            'postOfficeCode'
        ]);
        if (direct && typeof direct !== 'object') return asCode(direct);

        const nested = [source.location, source.station, source.hub, source.workLocation];
        for (const value of nested) {
            if (typeof value === 'string' && asNonBlankString(value)) return asCode(value);
            if (value && typeof value === 'object') {
                const nestedCode = readFirstField(value, ['code', 'locationCode', 'stationCode', 'hubCode']);
                if (nestedCode) return asCode(nestedCode);
            }
        }
        return '';
    };

    const resolveStationContext = () => {
        let user = null;
        let claims = null;

        try {
            if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') {
                user = Auth.getUser();
            }
            if (typeof Auth !== 'undefined' && typeof Auth.decodeJwtPayload === 'function') {
                claims = Auth.decodeJwtPayload();
            }
        } catch (error) {
            console.warn('[HubOpsView] Không thể đọc ngữ cảnh trạm từ Auth:', error);
        }

        const sources = [
            user,
            user?.profile,
            user?.station,
            user?.hub,
            claims,
            claims?.user,
            claims?.profile,
            claims?.station,
            claims?.hub
        ];

        for (const source of sources) {
            const code = readLocationCode(source);
            if (code) {
                const label = readFirstField(source, [
                    'locationName',
                    'stationName',
                    'hubName',
                    'assignedLocationName',
                    'workLocationName',
                    'name'
                ]);
                return {
                    code,
                    label: asNonBlankString(label) || code
                };
            }
        }

        return { code: '', label: '' };
    };

    const rawValueText = (value) => {
        if (value === undefined || value === null || value === '') return '';
        if (typeof value === 'object') {
            const code = readFirstField(value, ['code', 'name', 'value', 'tripCode', 'id']);
            if (code !== '') return String(code);
            try {
                return JSON.stringify(value);
            } catch (error) {
                return String(value);
            }
        }
        return String(value);
    };

    const KNOWN_HUB_CODES = Object.freeze([
        'HUB-HN-01', 'HUB-DN-01', 'HUB-HCM-01', 'HUB-HP-01', 'HUB-CT-01'
    ]);

    const unwrapCollection = (value) => {
        if (Array.isArray(value)) return value;
        if (!value || typeof value !== 'object') return [];
        for (const key of ['items', 'content', 'inventory', 'shipments', 'results', 'data']) {
            if (value[key] !== undefined) return unwrapCollection(value[key]);
        }
        return value.trackingCode || value.code || value.hubCode ? [value] : [];
    };

    const errorStatus = (error) => {
        const status = error?.status
            ?? error?.response?.status
            ?? error?.details?.status
            ?? error?.details?.statusCode;
        const parsed = Number(status);
        return Number.isFinite(parsed) ? parsed : null;
    };

    const errorMessage = (error, fallback) => {
        if (error?.message) return error.message;
        if (typeof error === 'string') return error;
        return fallback;
    };

    const HubOpsView = {
        name: 'HubOpsView',
        emits: ['view-tracking', 'request-trips'],
        setup(props, { emit }) {
            const currentSubtab = ref('scan'); // 'scan' | 'inventory'
            const isLoading = ref(false);
            const isActionRunning = ref(false);
            const inventorySource = ref('shipment-fallback');
            const tripsNotice = ref('');

            // Dữ liệu vận hành. Khi có RoutingService, các bản ghi tồn kho là nguồn chính.
            const shipmentsList = ref([]);
            const hubsList = ref([]);
            const scanInputCode = ref('');
            const stationContext = ref(resolveStationContext());
            const isAdmin = computed(() => {
                try {
                    if (typeof Auth !== 'undefined' && typeof Auth.hasRole === 'function'
                        && (Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ADMIN'))) return true;
                    const user = typeof Auth !== 'undefined' && typeof Auth.getUser === 'function'
                        ? (Auth.getUser() || {}) : {};
                    const claims = typeof Auth !== 'undefined' && typeof Auth.decodeJwtPayload === 'function'
                        ? (Auth.decodeJwtPayload() || {}) : {};
                    const roles = [
                        user.roles, user.role, user.authorities,
                        claims.roles, claims.role, claims.authorities
                    ].flatMap(value => Array.isArray(value) ? value : (value ? [value] : []));
                    return roles.some(role => {
                        const normalized = String(role?.authority || role?.name || role).toUpperCase();
                        return normalized === 'ROLE_ADMIN' || normalized === 'ADMIN';
                    });
                } catch (error) {
                    return false;
                }
            });
            const selectedHub = ref(stationContext.value.code || (isAdmin.value ? 'ALL' : ''));
            const selectedStatusFilter = ref('ALL');
            const searchQuery = ref('');

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);

            const showToast = (title, message, type = 'success') => {
                if (typeof Utils !== 'undefined' && typeof Utils.showToast === 'function') {
                    Utils.showToast(title, message, type);
                }
            };

            const getStationName = (code) => {
                const normalizedCode = asCode(code);
                if (!normalizedCode) return '';
                const found = hubsList.value.find(hub => asCode(
                    readFirstField(hub, ['hubCode', 'stationCode', 'locationCode', 'code'])
                ) === normalizedCode);
                return asNonBlankString(readFirstField(found, ['hubName', 'stationName', 'locationName', 'name'])) || normalizedCode;
            };

            const availableStations = computed(() => {
                const stations = new Map();
                const addStation = (code, name) => {
                    const normalizedCode = asCode(code);
                    if (!normalizedCode || !normalizedCode.startsWith('HUB-')) return;
                    stations.set(normalizedCode, asNonBlankString(name) || getStationName(normalizedCode) || normalizedCode);
                };

                addStation(stationContext.value.code, stationContext.value.label);
                hubsList.value.forEach(hub => {
                    addStation(
                        readFirstField(hub, ['hubCode', 'stationCode', 'locationCode', 'code']),
                        readFirstField(hub, ['hubName', 'stationName', 'locationName', 'name'])
                    );
                });
                shipmentsList.value.forEach(item => addStation(item.locationCode, item.locationCode));

                return Array.from(stations, ([code, name]) => ({ code, name }))
                    .sort((left, right) => left.code.localeCompare(right.code));
            });

            const currentActionLocation = computed(() => {
                if (selectedHub.value !== 'ALL') return asCode(selectedHub.value);
                // ALL is an aggregation scope, never an implicit mutation location.
                return isAdmin.value ? '' : asCode(stationContext.value.code);
            });

            const operationalStatus = (item) => asCode(
                item?.currentStatus || item?.status || item?.shipmentStatus || item?.inventoryStatus
            );

            const locationForDisplay = (item) => asCode(
                item?.locationCode || item?.location || item?.currentLocationCode
            );

            const getInventoryStatus = (item) => rawValueText(
                item?.rawInventoryStatus ?? item?.inventoryStatus ?? item?.inventory_status
            );

            const getTransportLeg = (item) => rawValueText(item?.transportLeg ?? item?.transport_leg ?? item?.leg);
            const getTripCode = (item) => rawValueText(item?.tripCode ?? item?.trip_code ?? item?.activeTripCode);

            const normalizeInventoryItem = (rawItem, source) => {
                const item = rawItem && typeof rawItem === 'object' ? rawItem : {};
                const shipment = item.shipment && typeof item.shipment === 'object' ? item.shipment : {};
                const trip = item.trip && typeof item.trip === 'object' ? item.trip : {};
                const activeTrip = item.activeTrip && typeof item.activeTrip === 'object' ? item.activeTrip : {};
                const inventoryStatus = readFirstField(item, [
                    'inventoryStatus',
                    'inventory_status',
                    'inventoryState',
                    'warehouseStatus'
                ]) || readFirstField(shipment, ['inventoryStatus', 'inventory_status']);
                const currentStatus = readFirstField(item, [
                    'currentStatus',
                    'shipmentStatus',
                    'lifecycleStatus'
                ]) || readFirstField(shipment, ['currentStatus', 'shipmentStatus', 'lifecycleStatus']);
                const transportLeg = readFirstField(item, ['transportLeg', 'transport_leg', 'leg'])
                    || readFirstField(trip, ['transportLeg', 'leg']);
                const tripCode = readFirstField(item, ['tripCode', 'trip_code', 'activeTripCode'])
                    || readFirstField(trip, ['tripCode', 'code'])
                    || readFirstField(activeTrip, ['tripCode', 'code']);
                const locationCode = readFirstField(item, [
                    'locationCode',
                    'location_code',
                    'currentLocationCode',
                    'location'
                ]) || readFirstField(shipment, ['locationCode', 'location_code']);

                return {
                    ...shipment,
                    ...item,
                    trackingCode: readFirstField(item, ['trackingCode', 'tracking_code', 'code'])
                        || readFirstField(shipment, ['trackingCode', 'tracking_code', 'code']),
                    currentStatus: currentStatus || readFirstField(item, ['status']) || readFirstField(shipment, ['status']),
                    inventoryStatus: inventoryStatus || '',
                    rawInventoryStatus: inventoryStatus || '',
                    transportLeg,
                    tripCode,
                    locationCode,
                    sourceHub: item.sourceHub || shipment.sourceHub,
                    destinationHub: item.destinationHub || shipment.destinationHub,
                    _inventorySource: source
                };
            };

            const normalizeCollection = (data, source) => unwrapCollection(data)
                .map(item => normalizeInventoryItem(item, source))
                .filter(item => asNonBlankString(item.trackingCode));

            const mergeInventoryWithShipmentProjection = (inventoryItems, shipmentItems) => {
                const projections = new Map(
                    shipmentItems
                        .map(item => normalizeInventoryItem(item, 'shipment-projection'))
                        .filter(Boolean)
                        .map(item => [asCode(item.trackingCode), item])
                );
                return inventoryItems.map(inventory => {
                    const projection = projections.get(asCode(inventory.trackingCode)) || {};
                    return {
                        ...projection,
                        ...inventory,
                        trackingCode: inventory.trackingCode || projection.trackingCode,
                        currentStatus: inventory.currentStatus || projection.currentStatus,
                        status: inventory.status || projection.status
                    };
                });
            };

            const loadShipmentProjections = async () => {
                if (typeof ShipmentService === 'undefined' || typeof ShipmentService.getAll !== 'function') return [];
                try {
                    return normalizeCollection(await ShipmentService.getAll(), 'shipment-projection');
                } catch (error) {
                    console.warn('[HubOpsView] Không thể tải projection vận đơn để bổ sung thông tin:', error);
                    return [];
                }
            };

            const loadHubLocations = async () => {
                let knownHubs = hubsList.value;
                if (knownHubs.length === 0 && typeof RoutingService !== 'undefined'
                    && typeof RoutingService.getAllHubs === 'function') {
                    try {
                        const data = await RoutingService.getAllHubs();
                        knownHubs = unwrapCollection(data);
                        hubsList.value = knownHubs;
                    } catch (error) {
                        console.warn('[HubOpsView] Không thể đọc danh mục hub khi tổng hợp tồn kho:', error);
                    }
                }
                const discovered = knownHubs
                    .map(hub => asCode(readFirstField(hub, ['hubCode', 'locationCode', 'code'])))
                    .filter(code => code.startsWith('HUB-'));
                if (discovered.length > 0) return [...new Set(discovered)];
                return [...KNOWN_HUB_CODES];
            };

            const loadRoutingInventory = async (routingService, location) => {
                const locations = location ? [location] : await loadHubLocations();
                if (locations.length === 0) return [];
                const responses = await Promise.all(locations.map(async code => {
                    try {
                        return { available: true, data: await routingService.getInventory(code) };
                    } catch (error) {
                        if (errorStatus(error) === 404 || errorStatus(error) === 405 || errorStatus(error) === 501) {
                            return { available: false, data: [] };
                        }
                        throw error;
                    }
                }));
                // Keep the migration fallback reachable when every routing endpoint
                // is absent instead of treating an unavailable API as empty stock.
                if (responses.every(response => !response.available)) {
                    const error = new Error('Routing inventory API chưa khả dụng');
                    error.status = 501;
                    throw error;
                }
                return responses.flatMap(response => unwrapCollection(response.data))
                    .map(item => normalizeInventoryItem(item, 'routing'))
                    .filter(item => asNonBlankString(item.trackingCode));
            };

            const mergeOptimisticItems = (nextItems) => {
                const now = Date.now();
                return nextItems.map(item => {
                    const existing = shipmentsList.value.find(
                        current => current.trackingCode === item.trackingCode
                    );
                    if (!existing || !existing._optimisticTimestamp || now - existing._optimisticTimestamp >= 4000) {
                        return item;
                    }
                    return {
                        ...item,
                        currentStatus: existing.currentStatus || item.currentStatus,
                        status: existing.status || item.status,
                        inventoryStatus: existing.inventoryStatus || item.inventoryStatus,
                        rawInventoryStatus: existing.rawInventoryStatus || item.rawInventoryStatus,
                        locationCode: existing.locationCode || item.locationCode,
                        _optimisticTimestamp: existing._optimisticTimestamp
                    };
                });
            };

            const isMigrationUnavailable = (error) => {
                const status = errorStatus(error);
                return status === 404 || status === 405 || status === 501;
            };

            const showLoadError = (error) => {
                const status = errorStatus(error);
                if (status === 403) {
                    showToast('Không Có Quyền (403)', 'Tài khoản không được phép xem tồn kho tại trạm này.', 'error');
                    return;
                }
                if (status === 409) {
                    showToast('Dữ Liệu Đã Thay Đổi (409)', 'Tồn kho vừa thay đổi. Vui lòng làm mới lại dữ liệu.', 'warning');
                    return;
                }
                showToast('Lỗi Tải Dữ Liệu', errorMessage(error, 'Không thể tải tồn kho tại trạm'), 'error');
            };

            const loadHubsData = async () => {
                if (typeof RoutingService === 'undefined' || typeof RoutingService.getAllHubs !== 'function') return;
                try {
                    const data = await RoutingService.getAllHubs();
                    hubsList.value = Array.isArray(data) ? data : unwrapCollection(data);
                } catch (error) {
                    // Danh bạ hub chỉ bổ trợ cho bộ lọc; không che mất dữ liệu tồn kho.
                    console.warn('[HubOpsView] Không thể tải danh bạ trạm:', error);
                }
            };

            const loadShipmentFallback = async () => {
                if (typeof ShipmentService === 'undefined' || typeof ShipmentService.getAll !== 'function') {
                    throw new Error('Không có nguồn dữ liệu vận đơn tương thích để tải tồn kho.');
                }
                const data = await ShipmentService.getAll();
                inventorySource.value = 'shipment-fallback';
                shipmentsList.value = mergeOptimisticItems(normalizeCollection(data, 'shipment-fallback'));
            };

            // Tồn kho RoutingService là nguồn chính. ShipmentService chỉ còn là đường di trú.
            const loadShipmentsData = async (silent = false) => {
                if (!silent) isLoading.value = true;
                try {
                    if (!isAdmin.value && !currentActionLocation.value) {
                        throw new Error('Tài khoản chưa được gán hub nên không thể tải tồn kho.');
                    }
                    const routingService = typeof RoutingService !== 'undefined' ? RoutingService : null;
                    if (routingService && typeof routingService.getInventory === 'function') {
                        try {
                            const location = selectedHub.value !== 'ALL' ? asCode(selectedHub.value) : '';
                            const inventory = await loadRoutingInventory(routingService, location);
                            const projections = await loadShipmentProjections();
                            inventorySource.value = 'routing';
                            shipmentsList.value = mergeOptimisticItems(
                                mergeInventoryWithShipmentProjection(inventory, projections)
                            );
                            return;
                        } catch (error) {
                            // Không che lỗi phân quyền/xung đột bằng dữ liệu cũ. Chỉ fallback khi endpoint chưa có.
                            if (!isMigrationUnavailable(error)) {
                                if (!silent) showLoadError(error);
                                return;
                            }
                            console.warn('[HubOpsView] Inventory API chưa khả dụng, dùng nguồn di trú:', error);
                        }
                    }

                    await loadShipmentFallback();
                } catch (error) {
                    console.error('[HubOpsView] Lỗi tải dữ liệu vận hành:', error);
                    if (!silent) showLoadError(error);
                } finally {
                    if (!silent) isLoading.value = false;
                }
            };

            // 1. Thống kê nhanh KPI theo dữ liệu thô của tồn kho
            const kpiTotalInHub = computed(() => shipmentsList.value.filter(item => {
                const status = operationalStatus(item);
                const inventoryStatus = getInventoryStatus(item);
                return ['RECEIVED', 'STORED', 'PICKED_UP', 'ARRIVED_DEST_HUB'].includes(status)
                    || ['RECEIVED', 'STORED'].includes(asCode(inventoryStatus));
            }).length);

            const kpiAwaitingIntake = computed(() => shipmentsList.value.filter(item =>
                ['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(operationalStatus(item))
            ).length);

            const kpiInTransit = computed(() => shipmentsList.value.filter(item =>
                operationalStatus(item) === 'IN_TRANSIT'
            ).length);

            // 2. Lọc danh sách bưu gửi đa điều kiện
            const filteredShipments = computed(() => {
                let list = shipmentsList.value;

                if (selectedHub.value !== 'ALL') {
                    const station = asCode(selectedHub.value);
                    list = list.filter(item => {
                        const location = locationForDisplay(item);
                        if (location === station) return true;

                        // Dữ liệu di trú thường chỉ có source/destination hub.
                        const status = operationalStatus(item);
                        if (['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'PICKED_UP'].includes(status)) {
                            return asCode(item.sourceHub) === station;
                        }
                        if (['IN_TRANSIT', 'ARRIVED_DEST_HUB'].includes(status)) {
                            return asCode(item.destinationHub) === station;
                        }
                        return false;
                    });
                }

                if (selectedStatusFilter.value !== 'ALL') {
                    const status = asCode(selectedStatusFilter.value);
                    list = list.filter(item => operationalStatus(item) === status
                        || asCode(getInventoryStatus(item)) === status);
                }

                const query = searchQuery.value.trim().toLowerCase();
                if (query) {
                    list = list.filter(item => [
                        item.trackingCode,
                        item.senderName,
                        item.receiverName,
                        item.senderAddress,
                        item.receiverAddress,
                        item.locationCode,
                        item.transportLeg,
                        item.tripCode,
                        item.inventoryStatus
                    ].some(value => rawValueText(value).toLowerCase().includes(query)));
                }

                return list;
            });

            // 3. Phân trang
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(filteredShipments.value.length / pageSize.value) || 1;
            });

            const paginatedShipments = computed(() => {
                if (pageSize.value === -1) return filteredShipments.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return filteredShipments.value.slice(start, start + pageSize.value);
            });

            watch([selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
            });

            watch(selectedHub, () => {
                currentPage.value = 1;
                loadShipmentsData();
            });

            watch(() => stationContext.value.code, (newCode) => {
                if (!isAdmin.value && newCode) selectedHub.value = newCode;
            });

            const canReceive = (item) => ['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(operationalStatus(item))
                || asCode(getInventoryStatus(item)) === 'ROUTE_ASSIGNED';

            const canStore = (item) => operationalStatus(item) === 'PICKED_UP'
                || asCode(getInventoryStatus(item)) === 'RECEIVED';

            const makeOperationPayload = (item, operation, note) => {
                const publicStatuses = new Set([
                    'CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
                    'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED',
                    'CANCELLED', 'RETURNING', 'RETURNED'
                ]);
                const currentStatus = asCode(item?.currentStatus);
                const payload = {
                    trackingCodes: [asNonBlankString(item?.trackingCode)],
                    // Hub handling changes physical inventory only. Keep the public
                    // shipment status from the projection instead of forcing IN_TRANSIT.
                    shipmentStatus: publicStatuses.has(currentStatus) ? currentStatus : 'IN_TRANSIT',
                    note
                };
                const transportLeg = getTransportLeg(item);
                const tripCode = getTripCode(item);
                if (transportLeg) payload.transportLeg = transportLeg;
                if (tripCode) payload.tripCode = tripCode;
                return payload;
            };

            const ensureSuccessfulOperationResult = async (result) => {
                if (!result || result.ok !== false) return result;
                if (typeof Api !== 'undefined' && typeof Api.parseError === 'function') {
                    throw await Api.parseError(result, 'Tác nghiệp không thành công');
                }
                const error = new Error('Tác nghiệp không thành công');
                error.status = result.status;
                throw error;
            };

            const showOperationError = (error) => {
                const status = errorStatus(error);
                if (status === 403) {
                    showToast('Không Có Quyền (403)', 'Tài khoản không được phép tác nghiệp tại trạm này.', 'error');
                    return;
                }
                if (status === 409) {
                    showToast('Xung Đột Tồn Kho (409)', 'Bưu gửi đã được tác nghiệp hoặc đang ở trạng thái khác. Vui lòng làm mới dữ liệu.', 'warning');
                    return;
                }
                showToast('Tác Nghiệp Thất Bại', errorMessage(error, 'Không thể cập nhật tồn kho'), 'error');
            };

            const refreshAfterOperation = async () => {
                await loadShipmentsData(true);
                // Consumer/lifecycle có thể commit chậm hơn thao tác HTTP một nhịp.
                setTimeout(() => {
                    loadShipmentsData(true).catch(error => console.warn('[HubOpsView] Refresh nền thất bại:', error));
                }, 600);
            };

            // 4. Tác nghiệp kho phải đi qua RoutingService, không giả lập bằng tracking status.
            const handleInventoryOperation = async (item, operation) => {
                if (isActionRunning.value) return;
                const cleanCode = asNonBlankString(item?.trackingCode);
                if (!cleanCode) {
                    showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }

                const locationCode = currentActionLocation.value;
                if (!locationCode) {
                    showToast('Thiếu Ngữ Cảnh Trạm', 'Không xác định được trạm làm việc từ tài khoản. Vui lòng chọn đúng trạm trước khi tác nghiệp.', 'warning');
                    return;
                }

                const methodName = operation === 'receive' ? 'receiveAtLocation' : 'storeAtLocation';
                if (typeof RoutingService === 'undefined' || typeof RoutingService[methodName] !== 'function') {
                    showToast('Phân Hệ Chưa Sẵn Sàng', 'RoutingService chưa hỗ trợ tác nghiệp tồn kho; không thực hiện chuyển trạng thái tạm thời.', 'warning');
                    return;
                }

                const note = operation === 'receive'
                    ? `Tiếp nhận bưu gửi tại trạm ${locationCode}`
                    : `Lưu kho bưu gửi tại trạm ${locationCode}`;
                const targetItem = shipmentsList.value.find(current => current.trackingCode === cleanCode) || item;
                const payload = makeOperationPayload({ ...targetItem, trackingCode: cleanCode }, operation, note);

                isActionRunning.value = true;
                try {
                    const result = await RoutingService[methodName].call(RoutingService, locationCode, payload);
                    await ensureSuccessfulOperationResult(result);

                    if (targetItem) {
                        targetItem.locationCode = locationCode;
                        targetItem.inventoryStatus = operation === 'receive' ? 'RECEIVED' : 'STORED';
                        targetItem.rawInventoryStatus = targetItem.inventoryStatus;
                        const existingStatus = operationalStatus(targetItem);
                        if (existingStatus && !['RECEIVED', 'STORED'].includes(existingStatus)) {
                            targetItem.currentStatus = existingStatus;
                            targetItem.status = existingStatus;
                        }
                        targetItem._optimisticTimestamp = Date.now();
                    }

                    showToast(
                        'Thành Công',
                        `Bưu gửi ${cleanCode} đã ${operation === 'receive' ? 'được tiếp nhận' : 'được lưu kho'} tại ${locationCode}.`
                    );
                    scanInputCode.value = '';
                    await refreshAfterOperation();
                } catch (error) {
                    console.error('[HubOpsView] Lỗi tác nghiệp tồn kho:', error);
                    showOperationError(error);
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleReceive = (item) => handleInventoryOperation(item, 'receive');
            const handleStore = (item) => handleInventoryOperation(item, 'store');

            const handleQuickScan = (operation) => {
                const cleanCode = asNonBlankString(scanInputCode.value);
                if (!cleanCode) {
                    showToast('Yêu Cầu Nhập Mã', 'Vui lòng quét hoặc nhập mã vận đơn để thực hiện tác nghiệp', 'warning');
                    return;
                }
                const item = shipmentsList.value.find(current => current.trackingCode === cleanCode);
                if (!item) {
                    showToast('Không Tìm Thấy', `Không tìm thấy bưu gửi ${cleanCode} trong tồn kho hoặc projection hiện tại. Vui lòng làm mới dữ liệu trước khi tác nghiệp.`, 'warning');
                    return;
                }
                return handleInventoryOperation(item, operation);
            };

            // Mở chi tiết hành trình & bản đồ tại TrackingView.
            const viewTrackingDetail = (code) => {
                const cleanCode = asNonBlankString(code);
                if (cleanCode) emit('view-tracking', cleanCode, 'hub-ops');
            };

            // TripsView không được nhúng tại đây. Event cho phép host xử lý nếu có, còn view này luôn có fallback an toàn.
            const requestTrips = () => {
                tripsNotice.value = 'Phân hệ điều phối chuyến xe chưa được nhúng trong màn hình này. Bạn vẫn có thể xem trip code và transport leg từ tồn kho.';
                emit('request-trips');
            };

            const dismissTripsNotice = () => {
                tripsNotice.value = '';
            };

            onMounted(async () => {
                stationContext.value = resolveStationContext();
                if (!isAdmin.value && stationContext.value.code) {
                    selectedHub.value = stationContext.value.code;
                }
                await Promise.all([
                    loadHubsData(),
                    loadShipmentsData()
                ]);
            });

            return {
                currentSubtab,
                isLoading,
                isActionRunning,
                inventorySource,
                tripsNotice,
                shipmentsList,
                scanInputCode,
                stationContext,
                isAdmin,
                selectedHub,
                selectedStatusFilter,
                searchQuery,
                currentPage,
                pageSize,
                totalPages,
                filteredShipments,
                paginatedShipments,
                availableStations,
                currentActionLocation,
                kpiTotalInHub,
                kpiAwaitingIntake,
                kpiInTransit,
                getStationName,
                getInventoryStatus,
                getTransportLeg,
                getTripCode,
                locationForDisplay,
                operationalStatus,
                canReceive,
                canStore,
                loadShipmentsData,
                handleQuickScan,
                handleReceive,
                handleStore,
                viewTrackingDetail,
                requestTrips,
                dismissTripsNotice,
                Utils
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
                                Hub Operations
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Khai Thác &amp; Quản Lý Tồn Bãi Tại Hub
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Dữ liệu tồn kho từ RoutingService, tác nghiệp theo đúng trạm làm việc và giữ nguyên thông tin vận tải của từng bưu gửi.
                        </p>
                        <div class="mt-2 flex flex-wrap items-center gap-2 text-[10.5px]">
                            <span class="px-2 py-1 rounded-md bg-white/10 border border-white/20">
                                Trạm: <strong>{{ currentActionLocation || 'Chưa xác định' }}</strong>
                            </span>
                            <span v-if="inventorySource === 'shipment-fallback'" class="px-2 py-1 rounded-md bg-amber-400/20 border border-amber-200/30 text-amber-50">
                                Nguồn tương thích di trú
                            </span>
                            <span v-else class="px-2 py-1 rounded-md bg-emerald-400/20 border border-emerald-200/30 text-emerald-50">
                                Nguồn tồn kho RoutingService
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiTotalInHub }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tồn Bãi</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiAwaitingIntake }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Nhập</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiInTransit }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Luân Chuyển</div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="tripsNotice" class="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <span>{{ tripsNotice }}</span>
                <button type="button" @click="dismissTripsNotice" class="font-bold text-blue-600 hover:text-blue-900">Đóng</button>
            </div>

            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto pb-px">
                    <button
                        type="button"
                        @click="currentSubtab = 'scan'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap',
                            currentSubtab === 'scan' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        QUÉT TÁC NGHIỆP KHO
                    </button>
                    <button
                        type="button"
                        @click="currentSubtab = 'inventory'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap',
                            currentSubtab === 'inventory' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        QUẢN LÝ TỒN BÃI
                    </button>
                    <button
                        type="button"
                        @click="requestTrips"
                        class="pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 border-transparent text-slate-500 hover:text-slate-800 whitespace-nowrap"
                    >
                        ĐIỀU PHỐI CHUYẾN XE
                    </button>
                </div>
                <button
                    type="button"
                    @click="loadShipmentsData()"
                    :disabled="isLoading"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 border border-slate-200"
                >
                    <span v-if="isLoading" class="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <span v-else>↻</span>
                    <span>Làm Mới</span>
                </button>
            </div>

            <div v-if="currentSubtab === 'scan'" class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <div class="flex items-center space-x-2">
                        <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">Đầu Đọc Mã Vạch / Tác Nghiệp Tồn Kho</span>
                    </div>
                    <p class="text-[11px] text-slate-500 mt-1">
                        Trạm tác nghiệp: <strong class="font-mono text-blue-700">{{ currentActionLocation || 'Chưa xác định' }}</strong>
                    </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <input
                        v-model="scanInputCode"
                        @keyup.enter="handleQuickScan('receive')"
                        type="text"
                        placeholder="Nhập hoặc quét mã bưu gửi..."
                        class="pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none w-56 transition"
                    />
                    <button
                        type="button"
                        @click="handleQuickScan('receive')"
                        :disabled="isActionRunning || !currentActionLocation"
                        class="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Tiếp Nhận
                    </button>
                    <button
                        type="button"
                        @click="handleQuickScan('store')"
                        :disabled="isActionRunning || !currentActionLocation"
                        class="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Lưu Kho
                    </button>
                </div>
            </div>

            <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                <div class="flex flex-wrap items-center gap-2 flex-1">
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Tìm mã vận đơn, chuyến, vị trí..."
                        class="w-56 sm:w-64 pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                    />
                    <select
                        v-model="selectedHub"
                        :disabled="!isAdmin"
                        class="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-80 disabled:cursor-not-allowed"
                    >
                        <option v-if="isAdmin" value="ALL">Tất cả trạm</option>
                        <option v-for="station in availableStations" :key="station.code" :value="station.code">
                            {{ station.code }} - {{ station.name }}
                        </option>
                    </select>
                    <select
                        v-model="selectedStatusFilter"
                        class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="ROUTE_ASSIGNED">ROUTE_ASSIGNED</option>
                        <option value="PENDING_ROUTING">PENDING_ROUTING</option>
                        <option value="RECEIVED">RECEIVED</option>
                        <option value="STORED">STORED</option>
                        <option value="PICKED_UP">PICKED_UP</option>
                        <option value="IN_TRANSIT">IN_TRANSIT</option>
                        <option value="ARRIVED_DEST_HUB">ARRIVED_DEST_HUB</option>
                    </select>
                    <select
                        v-model.number="pageSize"
                        class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                    >
                        <option :value="10">10 bản ghi / trang</option>
                        <option :value="25">25 bản ghi / trang</option>
                        <option :value="50">50 bản ghi / trang</option>
                        <option :value="-1">Tất cả bản ghi</option>
                    </select>
                </div>
                <div class="text-[11px] text-slate-500 font-medium">
                    Tổng số: <strong class="text-slate-800">{{ filteredShipments.length }}</strong> bưu gửi
                </div>
            </div>

            <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                <div v-if="isLoading" class="p-8 text-center text-slate-400">
                    <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <span>Đang nạp dữ liệu tồn kho...</span>
                </div>
                <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                    <span>Không tìm thấy bưu gửi nào phù hợp với bộ lọc.</span>
                </div>
                <div v-else class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận</th>
                                <th class="py-2.5 px-3">Trạng Thái Vận Đơn</th>
                                <th class="py-2.5 px-3">Tồn Kho (Raw)</th>
                                <th class="py-2.5 px-3">Transport Leg / Trip</th>
                                <th class="py-2.5 px-3">Location</th>
                                <th class="py-2.5 px-3 text-right">Tác Nghiệp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in paginatedShipments" :key="item.id || item.trackingCode" class="hover:bg-blue-50/30 transition">
                                <td class="py-2.5 px-3">
                                    <button
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                        title="Click để xem chi tiết hành trình & bản đồ"
                                    >
                                        <span>{{ item.trackingCode }}</span>
                                        <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 transition-all">↗</span>
                                    </button>
                                    <div v-if="item.senderName" class="text-[10px] text-slate-500 mt-1">Gửi: {{ item.senderName }}</div>
                                </td>
                                <td class="py-2.5 px-3 text-slate-800 max-w-xs">
                                    <div class="font-bold truncate">{{ item.receiverName || 'Chưa cập nhật' }}</div>
                                    <div class="text-[10.5px] text-slate-500 truncate">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                </td>
                                <td class="py-2.5 px-3">
                                    <span :class="['px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border inline-block', Utils.getStatusBadgeClass(operationalStatus(item))]">
                                        {{ operationalStatus(item) || '—' }}
                                    </span>
                                    <div v-if="operationalStatus(item)" class="text-[10px] text-slate-500 mt-1">{{ Utils.formatStatusText(operationalStatus(item)) }}</div>
                                </td>
                                <td class="py-2.5 px-3 align-top">
                                    <span v-if="getInventoryStatus(item)" class="font-mono font-bold text-slate-800" :title="getInventoryStatus(item)">
                                        {{ getInventoryStatus(item) }}
                                    </span>
                                    <span v-else class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 align-top text-[10.5px]">
                                    <div v-if="getTransportLeg(item)" class="font-mono text-slate-700">{{ getTransportLeg(item) }}</div>
                                    <div v-if="getTripCode(item)" class="font-mono font-bold text-indigo-700 mt-0.5">Trip: {{ getTripCode(item) }}</div>
                                    <span v-if="!getTransportLeg(item) && !getTripCode(item)" class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 align-top">
                                    <span v-if="locationForDisplay(item)" class="font-mono text-slate-700">{{ locationForDisplay(item) }}</span>
                                    <span v-else class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 text-right whitespace-nowrap">
                                    <button
                                        v-if="canReceive(item)"
                                        type="button"
                                        @click="handleReceive(item)"
                                        :disabled="isActionRunning"
                                        class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold hover:bg-amber-100 transition shadow-sm disabled:opacity-50"
                                    >
                                        Tiếp Nhận
                                    </button>
                                    <button
                                        v-else-if="canStore(item)"
                                        type="button"
                                        @click="handleStore(item)"
                                        :disabled="isActionRunning"
                                        class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold hover:bg-blue-100 transition shadow-sm disabled:opacity-50"
                                    >
                                        Lưu Kho
                                    </button>
                                    <span v-else class="text-slate-400 text-[11px]">Theo dõi</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div class="text-slate-500">
                        Hiển thị trang {{ currentPage }} / {{ totalPages }} (Tổng số {{ filteredShipments.length }} kết quả)
                    </div>
                    <div class="flex items-center space-x-1">
                        <button
                            type="button"
                            @click="currentPage--"
                            :disabled="currentPage <= 1"
                            class="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
                        >
                            Trước
                        </button>
                        <button
                            v-for="p in totalPages"
                            :key="p"
                            type="button"
                            @click="currentPage = p"
                            :class="[
                                'px-2.5 py-1 rounded-md text-xs font-bold transition',
                                currentPage === p ? 'bg-blue-600 text-white border border-blue-600 shadow-sm' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            ]"
                        >
                            {{ p }}
                        </button>
                        <button
                            type="button"
                            @click="currentPage++"
                            :disabled="currentPage >= totalPages"
                            class="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
                        >
                            Sau
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.HubOpsView = HubOpsView;
})();
