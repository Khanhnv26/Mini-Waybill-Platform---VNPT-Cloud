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

    const asHubCode = (value) => {
        const code = asCode(value);
        return code.startsWith('HUB-') ? code : '';
    };

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
        try {
            if (typeof Auth !== 'undefined' && typeof Auth.getLocationCode === 'function') {
                const authoritativeCode = asCode(Auth.getLocationCode());
                if (authoritativeCode && authoritativeCode !== 'ALL') {
                    return { code: authoritativeCode, label: authoritativeCode };
                }
            }
        } catch (error) {
            console.warn('[HubOpsView] Không thể đọc location authoritative:', error);
        }

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
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const currentSubtab = ref('scan'); // 'scan' | 'inventory'
            const isLoading = ref(false);
            const isActionRunning = ref(false);
            const inventorySource = ref('shipment-fallback');

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
            // Filter mặc định mỗi lần vào trang: admin xem toàn bộ trạm tổng,
            // thủ kho bám đúng hub được gán (mã POST-* không lọt vào phạm vi kho).
            const resolveDefaultHub = () => {
                if (isAdmin.value) return 'ALL';
                return asHubCode(stationContext.value.code) || 'ALL';
            };
            const selectedHub = ref(resolveDefaultHub());
            const selectedStatusFilter = ref('ALL');
            const searchQuery = ref('');

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);
            const selectedTrackingCodes = ref(new Set());

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
                // Giữ option khớp với giá trị đang chọn để select không bao giờ trống.
                addStation(selectedHub.value, getStationName(selectedHub.value));
                KNOWN_HUB_CODES.forEach(code => addStation(code, getStationName(code)));
                hubsList.value.forEach(hub => {
                    addStation(
                        readFirstField(hub, ['hubCode', 'stationCode', 'locationCode', 'code']),
                        readFirstField(hub, ['hubName', 'stationName', 'locationName', 'name'])
                    );
                });
                shipmentsList.value.forEach(item => {
                    addStation(item.locationCode, item.locationCode);
                    addStation(item.sourceHub, item.sourceHub);
                    addStation(item.destinationHub, item.destinationHub);
                });

                return Array.from(stations, ([code, name]) => ({ code, name }))
                    .sort((left, right) => left.code.localeCompare(right.code));
            });

            const currentActionLocation = computed(() => {
                if (selectedHub.value !== 'ALL') return asCode(selectedHub.value);
                // ALL is an aggregation scope, never an implicit mutation location.
                return isAdmin.value ? '' : asHubCode(stationContext.value.code);
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

            // Bucket trạng thái duy nhất cho từng kiện: ưu tiên trạng thái tồn kho
            // thực tế, chỉ fallback sang trạng thái vận đơn khi chưa có bản ghi tồn kho.
            // Nhờ vậy bộ lọc, KPI và danh sách luôn khớp nhau và không chồng chéo.
            const resolveHubBucket = (item) => {
                if (!item) return '';
                const inventory = asCode(getInventoryStatus(item));
                if (inventory === 'RECEIVED') return 'RECEIVED';
                if (inventory === 'STORED') return 'STORED';
                if (inventory === 'RESERVED' || inventory === 'LOADED') return 'IN_TRANSIT';
                if (inventory === 'HANDED_TO_COURIER') return 'HANDED_TO_COURIER';
                if (inventory === 'CANCELLED') return 'CANCELLED';

                const status = operationalStatus(item);
                if (['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'CREATED'].includes(status)) return 'WAITING_INTAKE';
                if (status === 'PICKED_UP') return 'PICKED_UP';
                if (status === 'IN_TRANSIT') return 'IN_TRANSIT';
                if (status === 'ARRIVED_DEST_HUB') return 'ARRIVED_DEST_HUB';
                if (status === 'HANDED_TO_COURIER') return 'HANDED_TO_COURIER';
                return '';
            };

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
                    if (!isAdmin.value && stationContext.value.code && !currentActionLocation.value) {
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

            // 1. Thống kê nhanh KPI theo cùng bucket với bộ lọc
            const kpiTotalInHub = computed(() => shipmentsList.value.filter(item =>
                ['RECEIVED', 'STORED'].includes(resolveHubBucket(item))
            ).length);

            const kpiAwaitingIntake = computed(() => shipmentsList.value.filter(item =>
                resolveHubBucket(item) === 'WAITING_INTAKE'
            ).length);

            // Hàng mới dỡ xuống khu tiếp nhận, chờ thủ kho xác nhận lưu kho.
            const kpiAwaitingStore = computed(() => shipmentsList.value.filter(item =>
                resolveHubBucket(item) === 'RECEIVED'
            ).length);

            const kpiInTransit = computed(() => shipmentsList.value.filter(item =>
                resolveHubBucket(item) === 'IN_TRANSIT'
            ).length);

            // 2. Lọc danh sách bưu gửi đa điều kiện
            const filteredShipments = computed(() => {
                let list = shipmentsList.value;

                if (selectedHub.value && selectedHub.value !== 'ALL') {
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
                    const bucket = asCode(selectedStatusFilter.value);
                    list = list.filter(item => resolveHubBucket(item) === bucket);
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
                selectedTrackingCodes.value = new Set();
            });

            watch(selectedHub, () => {
                currentPage.value = 1;
                selectedTrackingCodes.value = new Set();
                loadShipmentsData();
            });

            watch(() => stationContext.value.code, (newCode) => {
                const hubCode = asHubCode(newCode);
                if (!isAdmin.value && hubCode && hubCode !== selectedHub.value) {
                    selectedHub.value = hubCode;
                }
            });

            const canReceive = (item) => {
                const inventory = asCode(getInventoryStatus(item));
                if (['RECEIVED', 'STORED', 'RESERVED', 'LOADED', 'HANDED_TO_COURIER'].includes(inventory)) return false;
                const status = operationalStatus(item);
                // Route-assigned parcels at the origin post office belong to PO ops,
                // not hub intake, even when migration projections are incomplete.
                if (['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(status)) {
                    const location = locationForDisplay(item);
                    return !location.startsWith('POST-') && asCode(item.sourceHub) === asCode(currentActionLocation.value);
                }
                return ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB'].includes(status)
                    && inventory !== 'RECEIVED';
            };

            const canStore = (item) => {
                const inventory = asCode(getInventoryStatus(item));
                return inventory === 'RECEIVED';
            };

            const isShipmentInSelectedHubScope = (item) => {
                const selected = asCode(currentActionLocation.value);
                if (!selected || !item) return false;

                const location = locationForDisplay(item);
                if (location === selected) return true;

                const status = operationalStatus(item);
                if (['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'PICKED_UP'].includes(status)) {
                    return asCode(item.sourceHub) === selected;
                }
                if (['IN_TRANSIT', 'ARRIVED_DEST_HUB'].includes(status)) {
                    return asCode(item.destinationHub) === selected;
                }
                return false;
            };

            // UI-only resolver: ô quét luôn hướng tới thao tác vật lý kế tiếp.
            const getNextHubAction = (item) => {
                if (!item) return { key: 'LOOKUP', label: 'Tra cứu bưu gửi', operation: '' };
                const status = operationalStatus(item);
                const inventory = asCode(getInventoryStatus(item));
                if (['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED'].includes(status)) {
                    return { key: 'DONE', label: 'Đã hoàn tất', operation: '' };
                }
                if (canReceive(item)) return { key: 'RECEIVE', label: 'Tiếp nhận vào hub', operation: 'receive' };
                if (canStore(item)) return { key: 'STORE', label: 'Lưu kho tại hub', operation: 'store' };
                if (inventory === 'STORED' || status === 'IN_TRANSIT' || status === 'ARRIVED_DEST_HUB') {
                    return { key: 'WAITING', label: inventory === 'STORED' ? 'Đã lưu kho' : 'Đang luân chuyển', operation: '' };
                }
                return { key: 'REVIEW', label: 'Kiểm tra chi tiết', operation: '' };
            };

            const scannedItem = computed(() => {
                const code = asCode(scanInputCode.value);
                if (!code) return null;
                return shipmentsList.value.find(item => {
                    if (asCode(item.trackingCode) !== code) return false;
                    // ALL remains available for lookup, but a concrete hub scope
                    // is required before the scanner can expose a mutation CTA.
                    return selectedHub.value === 'ALL' || isShipmentInSelectedHubScope(item);
                }) || null;
            });
            const scannedAction = computed(() => getNextHubAction(scannedItem.value));

            const makeOperationPayload = (item, operation, note) => {
                const currentStatus = operationalStatus(item);
                const inventory = asCode(getInventoryStatus(item));
                const publicStatuses = new Set(['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB']);
                // Routing inventory accepts only operational public statuses. A
                // migration projection may still expose route-assigned while the
                // physical hub intake is the next valid operation.
                const shipmentStatus = ['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(currentStatus)
                    && !inventory.startsWith('RECEIVED')
                    ? 'PICKED_UP'
                    : (publicStatuses.has(currentStatus) ? currentStatus : '');
                if (!shipmentStatus) return null;
                const payload = {
                    trackingCodes: [asNonBlankString(item?.trackingCode)],
                    shipmentStatus,
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
            const isConflictError = (error) => {
                const status = errorStatus(error);
                const text = String(error?.message || error || '').toLowerCase();
                return status === 409 || text.includes('409') || text.includes('conflict')
                    || text.includes('đã được') || text.includes('đã tồn tại');
            };

            // Một bước vật lý đơn lẻ (không tự làm mới danh sách).
            const runInventoryStep = async (item, operation) => {
                const cleanCode = asNonBlankString(item?.trackingCode);
                if (!cleanCode) {
                    showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return false;
                }

                const locationCode = currentActionLocation.value;
                if (!locationCode) {
                    showToast('Thiếu Ngữ Cảnh Trạm', 'Không xác định được trạm làm việc từ tài khoản. Vui lòng chọn đúng trạm trước khi tác nghiệp.', 'warning');
                    return false;
                }

                const methodName = operation === 'receive' ? 'receiveAtLocation' : 'storeAtLocation';
                if (typeof RoutingService === 'undefined' || typeof RoutingService[methodName] !== 'function') {
                    showToast('Phân Hệ Chưa Sẵn Sàng', 'RoutingService chưa hỗ trợ tác nghiệp tồn kho; không thực hiện chuyển trạng thái tạm thời.', 'warning');
                    return false;
                }

                const note = operation === 'receive'
                    ? `Tiếp nhận bưu gửi tại trạm ${locationCode}`
                    : `Lưu kho bưu gửi tại trạm ${locationCode}`;
                const targetItem = shipmentsList.value.find(current => asCode(current.trackingCode) === asCode(cleanCode)) || item;
                if (!isShipmentInSelectedHubScope(targetItem)) {
                    showToast('Sai Phạm Vi Hub', `Bưu gửi ${cleanCode} không thuộc hub đang chọn (${locationCode}).`, 'warning');
                    return false;
                }
                const eligible = operation === 'receive' ? canReceive(targetItem) : canStore(targetItem);
                if (!eligible) {
                    showToast('Sai Trình Tự', `${cleanCode} hiện không còn ở bước “${getNextHubAction(targetItem).label}”.`, 'warning');
                    return false;
                }
                const payload = makeOperationPayload({ ...targetItem, trackingCode: cleanCode }, operation, note);
                if (!payload) {
                    showToast('Thiếu Trạng Thái', `Không thể xác định trạng thái vận đơn hợp lệ cho ${cleanCode}.`, 'warning');
                    return false;
                }

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
                return true;
            };

            const handleInventoryOperation = async (item, operation) => {
                if (isActionRunning.value) return;
                const cleanCode = asNonBlankString(item?.trackingCode);
                if (!cleanCode) {
                    showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }

                isActionRunning.value = true;
                try {
                    const done = await runInventoryStep(item, operation);
                    if (!done) return;
                    showToast(
                        'Thành Công',
                        `Bưu gửi ${cleanCode} đã ${operation === 'receive' ? 'được tiếp nhận' : 'được lưu kho'} tại ${currentActionLocation.value}.`
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

            // 1-Click: tiếp nhận xong lưu kho ngay (bỏ qua bước đã hoàn tất).
            const handleReceiveAndStore = async (item) => {
                if (isActionRunning.value) return;
                const cleanCode = asNonBlankString(item?.trackingCode);
                if (!cleanCode) {
                    showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }
                const locationCode = currentActionLocation.value;

                isActionRunning.value = true;
                let receivedNow = false;
                let storedNow = false;
                try {
                    if (canReceive(item)) {
                        try {
                            receivedNow = await runInventoryStep(item, 'receive');
                        } catch (error) {
                            if (!isConflictError(error)) throw error;
                        }
                        if (receivedNow) await loadShipmentsData(true);
                    }

                    const current = shipmentsList.value.find(
                        shipment => asCode(shipment.trackingCode) === asCode(cleanCode)
                    ) || item;
                    if (canStore(current)) {
                        try {
                            storedNow = await runInventoryStep(current, 'store');
                        } catch (error) {
                            if (!isConflictError(error)) throw error;
                        }
                    }

                    if (!receivedNow && !storedNow) {
                        showToast('Chưa Có Tác Vụ', `Bưu gửi ${cleanCode} đã ở trạng thái lưu kho, không cần cập nhật.`, 'info');
                        return;
                    }
                    showToast('Thành Công', `Bưu gửi ${cleanCode} đã được tiếp nhận & lưu kho tại ${locationCode}.`);
                    scanInputCode.value = '';
                    await refreshAfterOperation();
                } catch (error) {
                    console.error('[HubOpsView] Lỗi tiếp nhận & lưu kho:', error);
                    showOperationError(error);
                    await refreshAfterOperation();
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleReceive = (item) => handleInventoryOperation(item, 'receive');
            const handleStore = (item) => handleInventoryOperation(item, 'store');

            const selectableHubItems = computed(() => paginatedShipments.value.filter(item =>
                isShipmentInSelectedHubScope(item) && (canReceive(item) || canStore(item))
            ));
            const selectedHubItems = computed(() => shipmentsList.value.filter(item =>
                selectedTrackingCodes.value.has(asCode(item.trackingCode))
            ));
            const selectedHubAction = computed(() => {
                const items = selectedHubItems.value;
                if (!items.length) return '';
                const actions = new Set(items.map(item => getNextHubAction(item).operation).filter(Boolean));
                return actions.size === 1 ? [...actions][0] : '';
            });
            const selectedHubWeight = computed(() => selectedHubItems.value.reduce(
                (total, item) => total + (Number(item.weight) || 0), 0
            ));

            const toggleHubSelection = (item) => {
                const code = asCode(item?.trackingCode);
                if (!code || (!canReceive(item) && !canStore(item)) || !isShipmentInSelectedHubScope(item)) return;
                const next = new Set(selectedTrackingCodes.value);
                if (next.has(code)) next.delete(code); else next.add(code);
                selectedTrackingCodes.value = next;
            };

            const toggleAllHubSelection = () => {
                const visible = selectableHubItems.value;
                const next = new Set(selectedTrackingCodes.value);
                const allSelected = visible.length > 0 && visible.every(item => next.has(asCode(item.trackingCode)));
                visible.forEach(item => {
                    const code = asCode(item.trackingCode);
                    if (allSelected) next.delete(code); else next.add(code);
                });
                selectedTrackingCodes.value = next;
            };

            const clearHubSelection = () => {
                selectedTrackingCodes.value = new Set();
            };

            const buildOperationGroups = (items, operation, note, locationCode) => {
                const groups = new Map();
                items.forEach(item => {
                    const basePayload = makeOperationPayload(item, operation, note);
                    if (!basePayload) return;
                    const key = `${locationCode}|${basePayload.shipmentStatus}`;
                    if (!groups.has(key)) groups.set(key, { basePayload, items: [] });
                    groups.get(key).items.push(item);
                });
                return groups;
            };

            const runBulkOperation = async (items, operation, locationCode, note) => {
                const methodName = operation === 'receive' ? 'receiveAtLocation' : 'storeAtLocation';
                const groups = buildOperationGroups(items, operation, note, locationCode);
                let processed = 0;
                for (const group of groups.values()) {
                    const payload = {
                        ...group.basePayload,
                        trackingCodes: group.items.map(item => asNonBlankString(item.trackingCode)),
                        operationId: typeof Utils !== 'undefined' && typeof Utils.createOperationId === 'function'
                            ? Utils.createOperationId(`hub-${operation}`)
                            : `hub-${operation}-${Date.now()}`
                    };
                    const result = await RoutingService[methodName](locationCode, payload);
                    await ensureSuccessfulOperationResult(result);
                    processed += group.items.length;
                }
                return processed;
            };

            // Hàng loạt 1-Click: tiếp nhận trước, làm mới, rồi lưu kho các kiện vừa nhận.
            const handleBulkReceiveAndStore = async (locationCode) => {
                const items = selectedHubItems.value.filter(item =>
                    isShipmentInSelectedHubScope(item) && canReceive(item)
                );
                if (!items.length) {
                    showToast('Chưa Chọn Kiện', 'Chọn các kiện chưa được tiếp nhận để nhận & lưu kho hàng loạt.', 'warning');
                    return 0;
                }
                let processed = await runBulkOperation(
                    items, 'receive', locationCode, `Tiếp nhận hàng loạt tại hub ${locationCode}`
                );
                await loadShipmentsData(true);
                const codes = new Set(items.map(item => asCode(item.trackingCode)));
                const storeItems = shipmentsList.value.filter(item =>
                    codes.has(asCode(item.trackingCode)) && isShipmentInSelectedHubScope(item) && canStore(item)
                );
                if (storeItems.length) {
                    processed += await runBulkOperation(
                        storeItems, 'store', locationCode, `Lưu kho hàng loạt tại hub ${locationCode}`
                    );
                }
                return processed;
            };

            const handleBulkInventoryOperation = async (operation) => {
                if (isActionRunning.value) return;
                if (isAdmin.value && selectedHub.value === 'ALL') {
                    showToast('Chỉ Xem Tổng Hợp', 'Hãy chọn một hub cụ thể trước khi xử lý hàng loạt.', 'warning');
                    return;
                }
                const locationCode = currentActionLocation.value;
                if (!locationCode) {
                    showToast('Thiếu Ngữ Cảnh Trạm', 'Không xác định được trạm làm việc từ tài khoản. Vui lòng chọn đúng trạm trước khi tác nghiệp.', 'warning');
                    return;
                }

                isActionRunning.value = true;
                try {
                    if (operation === 'receive-store') {
                        const processed = await handleBulkReceiveAndStore(locationCode);
                        if (processed === 0) {
                            showToast('Thiếu Trạng Thái', 'Không có nhóm kiện với trạng thái vận đơn hợp lệ.', 'warning');
                            return;
                        }
                        clearHubSelection();
                        showToast('Hoàn Tất', `${processed} kiện đã được tiếp nhận & lưu kho tại ${locationCode}.`);
                        await refreshAfterOperation();
                        return;
                    }

                    const items = selectedHubItems.value.filter(item =>
                        isShipmentInSelectedHubScope(item)
                        && (operation === 'receive' ? canReceive(item) : canStore(item))
                    );
                    if (!items.length) {
                        showToast('Chưa Chọn Kiện', 'Chọn các kiện cùng một thao tác hợp lệ trước khi xử lý.', 'warning');
                        return;
                    }
                    const processed = await runBulkOperation(
                        items,
                        operation,
                        locationCode,
                        operation === 'receive'
                            ? `Tiếp nhận hàng loạt tại hub ${locationCode}`
                            : `Lưu kho hàng loạt tại hub ${locationCode}`
                    );
                    clearHubSelection();
                    showToast('Hoàn Tất', `${processed} kiện đã ${operation === 'receive' ? 'được tiếp nhận' : 'được lưu kho'} tại ${locationCode}.`);
                    await refreshAfterOperation();
                } catch (error) {
                    console.error('[HubOpsView] Lỗi tác nghiệp hàng loạt:', error);
                    showOperationError(error);
                    await refreshAfterOperation();
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleQuickScan = (requestedOperation = '') => {
                const cleanCode = asNonBlankString(scanInputCode.value);
                if (!cleanCode) {
                    showToast('Yêu Cầu Nhập Mã', 'Vui lòng quét hoặc nhập mã vận đơn để thực hiện tác nghiệp', 'warning');
                    return;
                }
                const item = scannedItem.value;
                if (!item) {
                    const existsOutsideScope = shipmentsList.value.some(current =>
                        asCode(current.trackingCode) === asCode(cleanCode)
                    );
                    showToast(
                        existsOutsideScope && selectedHub.value !== 'ALL'
                            ? 'Sai Phạm Vi Hub'
                            : 'Không Tìm Thấy',
                        existsOutsideScope && selectedHub.value !== 'ALL'
                            ? `Bưu gửi ${cleanCode} không thuộc hub đang chọn (${selectedHub.value}).`
                            : `Không tìm thấy bưu gửi ${cleanCode} trong tồn kho hoặc projection hiện tại. Vui lòng làm mới dữ liệu trước khi tác nghiệp.`,
                        'warning'
                    );
                    return;
                }
                const action = getNextHubAction(item);
                const operation = requestedOperation || action.operation;
                if (!operation) {
                    showToast('Chưa Có Tác Vụ', `${cleanCode}: ${action.label}. Không cần cập nhật tồn kho tại hub.`, 'info');
                    return;
                }
                if (requestedOperation && requestedOperation !== action.operation) {
                    showToast('Sai Trình Tự', `${cleanCode} đang ở bước “${action.label}”. Hãy thực hiện đúng hành động được đề xuất.`, 'warning');
                    return;
                }
                if (operation === 'receive') {
                    return handleReceiveAndStore(item);
                }
                return handleInventoryOperation(item, operation);
            };

            // Mở chi tiết hành trình & bản đồ tại TrackingView.
            const viewTrackingDetail = (code) => {
                const cleanCode = asNonBlankString(code);
                if (cleanCode) emit('view-tracking', cleanCode, 'hub-ops');
            };

            onMounted(async () => {
                stationContext.value = resolveStationContext();
                // Mỗi lần vào trang đều trả bộ lọc về mặc định thay vì bám mã tài khoản.
                selectedHub.value = resolveDefaultHub();
                selectedStatusFilter.value = 'ALL';
                searchQuery.value = '';
                currentPage.value = 1;
                selectedTrackingCodes.value = new Set();
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
                kpiAwaitingStore,
                kpiInTransit,
                getStationName,
                getInventoryStatus,
                getNextHubAction,
                scannedItem,
                scannedAction,
                getTransportLeg,
                getTripCode,
                locationForDisplay,
                operationalStatus,
                canReceive,
                canStore,
                isShipmentInSelectedHubScope,
                selectableHubItems,
                selectedHubItems,
                selectedHubAction,
                selectedHubWeight,
                selectedTrackingCodes,
                toggleHubSelection,
                toggleAllHubSelection,
                clearHubSelection,
                handleBulkInventoryOperation,
                loadShipmentsData,
                handleQuickScan,
                handleReceive,
                handleStore,
                handleReceiveAndStore,
                viewTrackingDetail,
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
                            Khai Thác &amp; Quản Lý Tồn Kho Tại Hub Chia Chọn
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
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tồn Kho Hub</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-amber-200/40 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ kpiAwaitingStore }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Nhập Kho</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiAwaitingIntake }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Tiếp Nhận</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[72px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiInTransit }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Luân Chuyển</div>
                        </div>
                    </div>
                </div>
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
                        QUÉT TIẾP NHẬN &amp; NHẬP KHO
                    </button>
                    <button
                        type="button"
                        @click="currentSubtab = 'inventory'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 whitespace-nowrap',
                            currentSubtab === 'inventory' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        QUẢN LÝ TỒN KHO HUB
                    </button>
                </div>
                <button
                    type="button"
                    @click="loadShipmentsData()"
                    :disabled="isLoading"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 border border-slate-200"
                >
                    <span v-if="isLoading" class="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                    <span>Làm Mới</span>
                </button>
            </div>

            <div v-if="isAdmin && selectedHub === 'ALL'" class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 flex items-center justify-between gap-2">
                <span><strong>Chỉ xem tổng hợp:</strong> chọn một hub cụ thể trước khi tiếp nhận hoặc lưu kho.</span>
                <span class="font-mono font-bold">{{ filteredShipments.length }} kiện</span>
            </div>

            <div v-if="currentSubtab === 'scan'" class="b2b-card operation-action-bar bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                        @keyup.enter="handleQuickScan()"
                        type="text"
                        placeholder="Quét mã để nhận hành động kế tiếp..."
                        class="pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none w-56 transition"
                    />
                    <span v-if="scanInputCode" class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                        {{ scannedItem ? 'Đề xuất: ' + scannedAction.label : 'Đang tra cứu mã...' }}
                    </span>
                    <button
                        type="button"
                        @click="handleQuickScan()"
                        :disabled="isActionRunning || !currentActionLocation || !scannedItem || !scannedAction.operation"
                        :class="scannedAction.key === 'RECEIVE' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'"
                        class="px-3.5 py-1.5 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {{ scannedAction.operation ? (scannedAction.operation === 'receive' ? 'Tiếp Nhận & Nhập Kho' : scannedAction.label) : 'Chỉ theo dõi' }}
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
                    <div class="relative">
                        <select
                            v-model="selectedHub"
                            :disabled="!isAdmin && Boolean(stationContext.code)"
                            aria-label="Chọn kho tổng"
                            class="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-900 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-80 disabled:cursor-not-allowed"
                        >
                            <option value="ALL">Tất cả trạm tổng kho (ALL)</option>
                            <optgroup label="Danh Sách Siêu Hub Khai Thác">
                                <option v-for="station in availableStations" :key="station.code" :value="station.code">
                                    {{ station.code }} - {{ station.name }}
                                </option>
                            </optgroup>
                        </select>
                    </div>
                    <select
                        v-model="selectedStatusFilter"
                        class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="WAITING_INTAKE">Chờ nhập kho</option>
                        <option value="RECEIVED">Đã tiếp nhận</option>
                        <option value="STORED">Đang lưu kho</option>
                        <option value="IN_TRANSIT">Đang luân chuyển</option>
                        <option value="ARRIVED_DEST_HUB">Đã đến hub đích</option>
                        <option value="HANDED_TO_COURIER">Đã bàn giao bưu tá</option>
                        <option value="PICKED_UP">Đã lấy hàng (chưa nhập hub)</option>
                        <option value="CANCELLED">Đã hủy</option>
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
                <div v-else>
                    <div v-if="selectedHubItems.length" class="selection-summary-bar mx-3 mt-3 px-3 py-2 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div>
                            <strong>{{ selectedHubItems.length }} kiện</strong>
                            <span class="text-slate-500 ml-1">({{ selectedHubWeight.toFixed(1) }} kg)</span>
                            <span v-if="!selectedHubAction" class="text-amber-700 ml-2">Chỉ chọn các kiện cùng thao tác.</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" @click="handleBulkInventoryOperation('store')" :disabled="isActionRunning || selectedHubAction !== 'store' || (isAdmin && selectedHub === 'ALL')" class="px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-200 font-bold disabled:opacity-50">Nhập Kho Hub</button>
                            <button type="button" @click="clearHubSelection" class="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-600 font-semibold">Bỏ chọn</button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3 w-10">
                                    <input type="checkbox" :checked="selectableHubItems.length > 0 && selectableHubItems.every(item => selectedTrackingCodes.has(String(item.trackingCode || '').trim().toUpperCase()))" @change="toggleAllHubSelection" :disabled="isActionRunning || (isAdmin && selectedHub === 'ALL')" aria-label="Chọn tất cả kiện có thể tác nghiệp" />
                                </th>
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận</th>
                                <th class="py-2.5 px-3 whitespace-nowrap w-28">Trạng Thái Vận Đơn</th>
                                <th class="py-2.5 px-3">Trạng Thái Tồn Kho</th>
                                <th class="py-2.5 px-3">Transport Leg / Trip</th>
                                <th class="py-2.5 px-3">Location</th>
                                <th class="py-2.5 px-3 text-right">Tác Nghiệp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in paginatedShipments" :key="item.id || item.trackingCode" class="hover:bg-blue-50/30 transition">
                                <td class="py-2.5 px-3 align-top">
                                    <input type="checkbox" :checked="selectedTrackingCodes.has(String(item.trackingCode || '').trim().toUpperCase())" @change="toggleHubSelection(item)" :disabled="isActionRunning || (isAdmin && selectedHub === 'ALL') || !canReceive(item) && !canStore(item) || !isShipmentInSelectedHubScope(item)" :aria-label="'Chọn ' + item.trackingCode" />
                                </td>
                                <td class="py-2.5 px-3 align-top">
                                    <button 
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors whitespace-nowrap"
                                        title="Click để xem chi tiết hành trình & bản đồ"
                                    >
                                        <span>{{ item.trackingCode }}</span>
                                    </button>
                                    <div v-if="item.senderName" class="text-[10px] text-slate-500 mt-1">Gửi: {{ item.senderName }}</div>
                                </td>
                                <td class="py-2.5 px-3 align-top text-slate-800 max-w-xs">
                                    <div class="font-bold truncate">{{ item.receiverName || 'Chưa cập nhật' }}</div>
                                    <div class="text-[10.5px] text-slate-500 truncate">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                </td>
                                <td class="py-2.5 px-3 align-top whitespace-nowrap">
                                    <span :class="['px-2 py-0.5 rounded-md text-[10.5px] font-bold border inline-flex items-center whitespace-nowrap', Utils.getStatusBadgeClass(operationalStatus(item))]">
                                        {{ Utils.formatStatusText(operationalStatus(item), locationForDisplay(item)) || '—' }}
                                    </span>
                                </td>
                                <td class="py-2.5 px-3 align-top whitespace-nowrap">
                                    <span v-if="getInventoryStatus(item)" 
                                        :class="String(getInventoryStatus(item) || '').toUpperCase() === 'RECEIVED' ? 'bg-amber-50 text-amber-700 border-amber-200' : (String(getInventoryStatus(item) || '').toUpperCase() === 'STORED' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-700 border-slate-200')"
                                        class="px-2 py-0.5 rounded text-[10.5px] font-bold border inline-flex items-center whitespace-nowrap"
                                        :title="getInventoryStatus(item)">
                                        {{ Utils.formatInventoryStatus(getInventoryStatus(item)) }}
                                    </span>
                                    <span v-else class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 align-top text-[10.5px]">
                                    <div v-if="getTransportLeg(item)" class="text-slate-700">{{ Utils.formatTransportLeg(getTransportLeg(item)) }}</div>
                                    <div v-if="getTripCode(item)" class="font-mono font-bold text-indigo-700 mt-0.5">Trip: {{ getTripCode(item) }}</div>
                                    <span v-if="!getTransportLeg(item) && !getTripCode(item)" class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 align-top">
                                    <span v-if="locationForDisplay(item)" class="font-mono text-slate-700">{{ Utils.formatLocationCode(locationForDisplay(item)) }}</span>
                                    <span v-else class="text-slate-400">—</span>
                                </td>
                                <td class="py-2.5 px-3 align-top text-right whitespace-nowrap">
                                    <button
                                        v-if="canReceive(item)"
                                        type="button"
                                        @click="handleReceiveAndStore(item)"
                                        :disabled="isActionRunning || (isAdmin && selectedHub === 'ALL') || !isShipmentInSelectedHubScope(item)"
                                        class="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-bold hover:bg-amber-100 transition shadow-sm disabled:opacity-50"
                                        title="Tiếp nhận vào hub và lưu kho ngay trong 1 lần bấm"
                                    >
                                        Tiếp Nhận &amp; Nhập Kho
                                    </button>
                                    <button
                                        v-else-if="canStore(item)"
                                        type="button"
                                        @click="handleStore(item)"
                                        :disabled="isActionRunning || (isAdmin && selectedHub === 'ALL') || !isShipmentInSelectedHubScope(item)"
                                        class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md font-bold hover:bg-blue-100 transition shadow-sm disabled:opacity-50"
                                    >
                                        Nhập Kho Hub
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
