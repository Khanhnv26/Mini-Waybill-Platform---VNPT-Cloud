/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: KHAI THÁC & TIẾP NHẬN BƯU GỬI TẠI BƯU CỤC (POST OFFICE OPS)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_POST_OFFICE_OPERATOR / ROLE_ADMIN (Quyền: tracking:update_post_office)
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const PostOfficeOpsView = {
        name: 'PostOfficeOpsView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const currentSubtab = ref('scan'); // 'scan' | 'feeder' | 'inventory'
            const isLoading = ref(false);
            const isActionRunning = ref(false);

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const scanInputCode = ref('');
            const selectedStatusFilter = ref('ALL');
            const normalizeCode = (value) => typeof value === 'string' ? value.trim() : '';
            const searchQuery = ref('');

            const getAuthUser = () => {
                try {
                    return typeof Auth !== 'undefined' && typeof Auth.getUser === 'function'
                        ? (Auth.getUser() || {})
                        : {};
                } catch (err) {
                    console.warn('[PostOfficeOpsView] Không đọc được thông tin phiên:', err);
                    return {};
                }
            };

            const getAuthClaims = () => {
                try {
                    return typeof Auth !== 'undefined' && typeof Auth.decodeJwtPayload === 'function'
                        ? (Auth.decodeJwtPayload() || {})
                        : {};
                } catch (err) {
                    return {};
                }
            };

            const authUser = getAuthUser();
            const authClaims = getAuthClaims();
            const isAdmin = computed(() => {
                if (typeof Auth !== 'undefined' && typeof Auth.hasRole === 'function') {
                    try {
                        if (Auth.hasRole('ROLE_ADMIN') || Auth.hasRole('ADMIN')) return true;
                    } catch (err) {
                        // Continue with the locally available role claims.
                    }
                }
                const roles = [];
                if (typeof Auth !== 'undefined' && typeof Auth.getRoles === 'function') {
                    try {
                        const authRoles = Auth.getRoles();
                        roles.push(...(Array.isArray(authRoles) ? authRoles : (authRoles ? [authRoles] : [])));
                    } catch (err) {
                        // Fall through to the user and JWT claims below.
                    }
                }
                const declaredRoles = [
                    authUser.roles,
                    authUser.role,
                    authUser.authorities,
                    authClaims.roles,
                    authClaims.role,
                    authClaims.authorities
                ].flatMap(value => Array.isArray(value) ? value : (value ? [value] : []));
                roles.push(...declaredRoles);
                return roles.some(role => {
                    const normalizedRole = String(role?.authority || role?.name || role).toUpperCase();
                    return normalizedRole === 'ROLE_ADMIN' || normalizedRole === 'ADMIN';
                });
            });

            const firstNonBlank = (...values) => values
                .map(normalizeCode)
                .find(value => value && value.toUpperCase() !== 'ALL') || '';

            const stationCode = computed(() => firstNonBlank(
                authUser.locationCode,
                authUser.postOfficeCode,
                authUser.profile?.locationCode,
                authUser.profile?.postOfficeCode,
                authUser.postOffice?.locationCode,
                authUser.postOffice?.code,
                authClaims.locationCode,
                authClaims.postOfficeCode,
                authClaims.profile?.locationCode,
                authClaims.profile?.postOfficeCode
            ));

            const stationName = computed(() => {
                const code = stationCode.value;
                return code && window.MapManager?.hubCoordinates?.[code]?.name
                    ? window.MapManager.hubCoordinates[code].name
                    : code || 'Chưa được gán bưu cục';
            });

            // ALL chỉ là phạm vi của quản trị viên. Nhân viên luôn thao tác tại
            // locationCode/postOfficeCode được cấp trong phiên đăng nhập.
            const selectedPostOffice = ref(isAdmin.value ? 'ALL' : stationCode.value);

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);

            const syncStationSelection = () => {
                if (isAdmin.value) {
                    if (!selectedPostOffice.value) selectedPostOffice.value = 'ALL';
                    return;
                }
                selectedPostOffice.value = stationCode.value;
            };
            syncStationSelection();

            const getOriginPostOfficeInfo = (item) => {
                if (!item) return { code: '', name: 'Chưa xác định' };
                if (item.originPostOffice) {
                    const code = normalizeCode(item.originPostOffice);
                    const name = window.MapManager?.hubCoordinates?.[code]?.name || code || 'Chưa xác định';
                    return { code, name };
                }
                if (item.senderAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.senderAddress);
                    if (found) return { code: normalizeCode(found.code), name: found.name || found.code || 'Chưa xác định' };
                }
                return { code: '', name: 'Chưa xác định' };
            };

            const getDestPostOfficeInfo = (item) => {
                if (!item) return { code: '', name: 'Chưa xác định' };
                if (item.destPostOffice) {
                    const code = normalizeCode(item.destPostOffice);
                    const name = window.MapManager?.hubCoordinates?.[code]?.name || code || 'Chưa xác định';
                    return { code, name };
                }
                if (item.receiverAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(item.receiverAddress);
                    if (found) return { code: normalizeCode(found.code), name: found.name || found.code || 'Chưa xác định' };
                }
                return { code: '', name: 'Chưa xác định' };
            };

            const getInventoryStatus = (item) => normalizeCode(
                item?.inventoryStatus || item?.inventory_status || item?.inventoryState
            ).toUpperCase();

            const isAtPostOffice = (item) => {
                if (!item) return false;
                const loc = (item.locationCode || '').toUpperCase();
                return loc.startsWith('POST-') || loc === 'DELIVERY_OFFICE';
            };

            const getCourierId = () => {
                const sources = [
                    authUser,
                    authUser.profile,
                    authUser.courier,
                    authUser.employee,
                    authClaims,
                    authClaims.profile,
                    authClaims.courier,
                    authClaims.employee
                ].filter(Boolean);
                const fields = ['courierId', 'courierID', 'courierCode', 'deliveryAgentId', 'bikerId'];
                for (const source of sources) {
                    for (const field of fields) {
                        const value = normalizeCode(source[field]);
                        if (value) return value;
                    }
                }
                return '';
            };

            const courierId = computed(getCourierId);
            const operationStoragePrefix = 'post-office-ops.operation-id';
            const operationIdCache = new Map();

            const getSessionOperationId = async (trackingCode, operationName, context = {}) => {
                const cleanTrackingCode = normalizeCode(trackingCode);
                const cleanOperationName = normalizeCode(operationName).toLowerCase() || 'operation';
                // Scope an id to one physical handling context. Reusing a global
                // tracking-code key can suppress a later return/re-entry operation.
                const contextParts = [
                    context.locationCode,
                    context.transportLeg,
                    context.tripCode,
                    context.currentStatus,
                    context.inventoryStatus
                ].map(value => normalizeCode(value).toUpperCase() || 'UNKNOWN');
                const cacheKey = [cleanOperationName, cleanTrackingCode, ...contextParts].join(':');
                if (operationIdCache.has(cacheKey)) return operationIdCache.get(cacheKey);

                const storageKey = `${operationStoragePrefix}.${cacheKey}`;
                let operationId = '';
                try {
                    operationId = sessionStorage.getItem(storageKey) || '';
                } catch (err) {
                    operationId = '';
                }

                if (!normalizeCode(operationId)) {
                    const routingService = window.RoutingService;
                    if (routingService && typeof routingService.createOperationId === 'function') {
                        try {
                            operationId = routingService.createOperationId(`post-office-${cleanOperationName}`);
                        } catch (err) {
                            console.warn('[PostOfficeOpsView] Không tạo được operationId từ RoutingService:', err);
                        }
                    }
                }

                if (!normalizeCode(operationId)) {
                    const randomPart = window.crypto?.randomUUID
                        ? window.crypto.randomUUID()
                        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    operationId = `post-office-${cleanOperationName}-${randomPart}`;
                }
                operationId = normalizeCode(operationId);
                operationIdCache.set(cacheKey, operationId);
                try {
                    sessionStorage.setItem(storageKey, operationId);
                } catch (err) {
                    // Private browsing can disable sessionStorage; the in-memory ID is still stable.
                }
                return operationId;
            };

            const getRoutingService = () => window.RoutingService || null;
            const getShipmentService = () => window.ShipmentService || null;

            const KNOWN_POST_OFFICE_CODES = Object.freeze([
                'POST-HN-CG', 'POST-HN-DDA', 'POST-HN-HBT', 'POST-HN-TX', 'POST-HN-HD',
                'POST-HCM-Q1', 'POST-HCM-TB', 'POST-HCM-BT', 'POST-HCM-TD', 'POST-HCM-Q7',
                'POST-DN-HC', 'POST-DN-TK', 'POST-DN-ST', 'POST-HP-NQ', 'POST-HP-HB',
                'POST-CT-NK', 'POST-CT-CR'
            ]);

            const unwrapCollection = (value) => {
                if (Array.isArray(value)) return value;
                if (!value || typeof value !== 'object') return [];
                for (const key of ['items', 'inventory', 'shipments', 'content', 'data', 'results']) {
                    if (Array.isArray(value[key])) return value[key];
                }
                return value.trackingCode || value.code ? [value] : [];
            };

            const getErrorStatus = (error) => {
                const status = error?.status ?? error?.response?.status ?? error?.details?.status;
                const parsed = Number(status);
                return Number.isFinite(parsed) ? parsed : null;
            };

            const isMigrationUnavailable = (error) => [404, 405, 501].includes(getErrorStatus(error));

            const normalizeInventoryItem = (item) => {
                if (!item || typeof item !== 'object') return null;
                const nestedShipment = item.shipment || item.parcel || item.waybill;
                const normalized = nestedShipment && typeof nestedShipment === 'object'
                    ? { ...nestedShipment, ...item }
                    : { ...item };
                normalized.trackingCode = normalizeCode(
                    normalized.trackingCode || normalized.code || nestedShipment?.trackingCode
                );
                return normalized.trackingCode ? normalized : null;
            };

            const mergeInventoryWithShipmentProjection = (inventoryItems, shipmentItems) => {
                const projections = new Map(
                    shipmentItems
                        .map(normalizeInventoryItem)
                        .filter(Boolean)
                        .map(item => [item.trackingCode.toUpperCase(), item])
                );
                return inventoryItems.map(inventory => {
                    const projection = projections.get(inventory.trackingCode.toUpperCase()) || {};
                    // Shipment projection supplies customer-facing fields; routing inventory
                    // remains authoritative for location, inventory state and transport data.
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
                const shipmentService = getShipmentService();
                if (!shipmentService || typeof shipmentService.getAll !== 'function') return [];
                try {
                    return unwrapCollection(await shipmentService.getAll())
                        .map(normalizeInventoryItem)
                        .filter(Boolean);
                } catch (error) {
                    // Projection enrichment is optional; never replace authoritative routing
                    // inventory with an unscoped shipment list when this request fails.
                    console.warn('[PostOfficeOpsView] Không thể tải projection vận đơn để bổ sung thông tin:', error);
                    return [];
                }
            };

            const loadPostOfficeLocations = async (routingService) => {
                const discovered = [];
                if (routingService && typeof routingService.getAllHubs === 'function') {
                    try {
                        const hubs = unwrapCollection(await routingService.getAllHubs());
                        hubs.forEach(hub => {
                            const code = normalizeCode(hub?.hubCode || hub?.locationCode || hub?.code);
                            const type = String(hub?.hubType || hub?.type || '').toUpperCase();
                            if (code.startsWith('POST-') || type === 'POST_OFFICE') discovered.push(code);
                        });
                    } catch (error) {
                        console.warn('[PostOfficeOpsView] Không thể đọc danh mục bưu cục để tổng hợp tồn kho:', error);
                    }
                }
                return [...new Set([...discovered, ...KNOWN_POST_OFFICE_CODES])];
            };

            const loadRoutingInventory = async (routingService, location) => {
                const locations = location
                    ? [location]
                    : await loadPostOfficeLocations(routingService);
                if (locations.length === 0) {
                    const error = new Error('Chưa có danh sách bưu cục để tải tồn kho');
                    error.status = 501;
                    throw error;
                }
                const responses = await Promise.all(locations.map(async code => {
                    try {
                        return { available: true, data: await routingService.getInventory(code) };
                    } catch (error) {
                        if (isMigrationUnavailable(error)) return { available: false, data: [] };
                        throw error;
                    }
                }));
                // Do not turn a completely unavailable routing API into a successful
                // empty result; this keeps the legacy migration fallback reachable.
                if (responses.every(response => !response.available)) {
                    const error = new Error('Routing inventory API chưa khả dụng');
                    error.status = 501;
                    throw error;
                }
                return responses.flatMap(response => unwrapCollection(response.data))
                    .map(normalizeInventoryItem)
                    .filter(Boolean);
            };

            const loadAuthoritativeInventory = async () => {
                const routingService = getRoutingService();
                const location = isAdmin.value
                    ? (selectedPostOffice.value !== 'ALL' ? normalizeCode(selectedPostOffice.value) : '')
                    : stationCode.value;

                if (!isAdmin.value && !location) {
                    const error = new Error('Tài khoản chưa được gán bưu cục nên không thể tải tồn kho.');
                    error.status = 403;
                    throw error;
                }

                if (routingService && typeof routingService.getInventory === 'function') {
                    try {
                        const inventory = await loadRoutingInventory(routingService, location);
                        return mergeInventoryWithShipmentProjection(inventory, await loadShipmentProjections());
                    } catch (err) {
                        // ShipmentService is a migration fallback only for deployments where
                        // the routing inventory endpoint is not available at all.
                        if (!isMigrationUnavailable(err)) throw err;
                        console.warn('[PostOfficeOpsView] Routing inventory API chưa khả dụng, dùng nguồn di trú:', err);
                    }
                }

                const shipmentService = getShipmentService();
                if (!shipmentService || typeof shipmentService.getAll !== 'function') {
                    throw new Error('Chưa có nguồn dữ liệu tồn kho bưu cục');
                }
                const fallback = await shipmentService.getAll();
                return unwrapCollection(fallback).map(normalizeInventoryItem).filter(Boolean);
            };

            const isConflictError = (err) => {
                const status = err?.status || err?.statusCode || err?.response?.status;
                const text = String(err?.message || err || '').toLowerCase();
                return Number(status) === 409 || text.includes('409') || text.includes('conflict') ||
                    text.includes('already') || text.includes('đã được') || text.includes('đã tồn tại');
            };

            const getActionLocation = (targetStatus, customLocation, targetShipment) => {
                const requestedLocation = normalizeCode(customLocation);
                const currentStation = stationCode.value;

                if (!isAdmin.value) {
                    if (!currentStation) {
                        throw new Error('Tài khoản chưa được gán locationCode/postOfficeCode nên không thể thao tác.');
                    }
                    if (requestedLocation && requestedLocation !== currentStation) {
                        throw new Error(`Tài khoản chỉ được thao tác tại bưu cục ${currentStation}.`);
                    }
                    return currentStation;
                }

                if (requestedLocation && requestedLocation.toUpperCase() !== 'ALL') return requestedLocation;
                if (selectedPostOffice.value && selectedPostOffice.value !== 'ALL') {
                    return normalizeCode(selectedPostOffice.value);
                }

                let derivedLocation = '';
                if (targetStatus === 'PICKED_UP') {
                    derivedLocation = getOriginPostOfficeInfo(targetShipment).code;
                } else if (targetStatus === 'OUT_FOR_DELIVERY') {
                    derivedLocation = getDestPostOfficeInfo(targetShipment).code;
                } else {
                    derivedLocation = normalizeCode(targetShipment?.locationCode);
                }
                if (!derivedLocation || derivedLocation.toUpperCase() === 'ALL') {
                    throw new Error('Không xác định được bưu cục tác nghiệp từ dữ liệu vận đơn. Vui lòng chọn bưu cục cụ thể.');
                }
                return derivedLocation;
            };

            const callRoutingOperation = async (operationName, trackingCode, locationCode, operationId, extra = {}) => {
                const routingService = getRoutingService();
                const operation = routingService?.[operationName];
                if (typeof operation !== 'function') {
                    throw new Error(`RoutingService chưa hỗ trợ thao tác ${operationName}. Vui lòng cập nhật dịch vụ định tuyến.`);
                }

                if (operationName === 'handoffToCourier') {
                    const payload = {
                        trackingCode,
                        operationId,
                        note: extra.note,
                        courierId: extra.courierId
                    };
                    return operation.call(routingService, locationCode, payload, extra.courierId);
                }

                const payload = {
                    trackingCodes: [trackingCode],
                    operationId,
                    note: extra.note,
                    ...extra
                };
                return operation.call(routingService, locationCode, payload);
            };

            // Thống kê nhanh KPI Bưu Cục
            const kpiAwaitingIntake = computed(() => {
                return shipmentsList.value.filter(s => {
                    const matchStatus = s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING';
                    if (!matchStatus) return false;
                    if (selectedPostOffice.value === 'ALL') return true;
                    return getOriginPostOfficeInfo(s).code === selectedPostOffice.value;
                }).length;
            });

            const kpiStagedInOffice = computed(() => {
                return shipmentsList.value.filter(s => {
                    const matchStatus = s.currentStatus === 'PICKED_UP';
                    if (!matchStatus) return false;
                    if (selectedPostOffice.value === 'ALL') return true;
                    return (s.locationCode === selectedPostOffice.value) || (getOriginPostOfficeInfo(s).code === selectedPostOffice.value);
                }).length;
            });

            const kpiArrivedFromHub = computed(() => {
                return shipmentsList.value.filter(s => {
                    const matchStatus = s.currentStatus === 'ARRIVED_DEST_HUB';
                    if (!matchStatus) return false;
                    const loc = (s.locationCode || '').toUpperCase();
                    if (!loc.startsWith('POST-')) return false;
                    if (selectedPostOffice.value === 'ALL') return true;
                    return (s.locationCode === selectedPostOffice.value) || (getDestPostOfficeInfo(s).code === selectedPostOffice.value);
                }).length;
            });

            const kpiOutForDelivery = computed(() => {
                return shipmentsList.value.filter(s => {
                    const matchStatus = s.currentStatus === 'OUT_FOR_DELIVERY';
                    if (!matchStatus) return false;
                    if (selectedPostOffice.value === 'ALL') return true;
                    return (s.locationCode === selectedPostOffice.value) || (getDestPostOfficeInfo(s).code === selectedPostOffice.value);
                }).length;
            });

            // 1. Tải tồn kho từ RoutingService; ShipmentService chỉ là fallback migration.
            const loadShipmentsData = async (silent = false) => {
                if (!silent) isLoading.value = true;
                try {
                    syncStationSelection();
                    shipmentsList.value = await loadAuthoritativeInventory();
                } catch (err) {
                    console.error('[PostOfficeOpsView] Lỗi tải tồn kho bưu cục:', err);
                    if (!silent) {
                        Utils.showToast('Lỗi Tải Dữ Liệu', err.message || 'Không thể tải tồn kho bưu gửi', 'error');
                    }
                } finally {
                    if (!silent) isLoading.value = false;
                }
            };

            // 2. Lọc danh sách bưu gửi theo Bưu Cục
            const filteredShipments = computed(() => {
                let list = shipmentsList.value;

                if (selectedPostOffice.value !== 'ALL') {
                    const poCode = selectedPostOffice.value;
                    list = list.filter(s => {
                        if (s.locationCode === poCode) return true;
                        // Đơn mới gửi thuộc bưu cục này
                        if (s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING' || s.currentStatus === 'PICKED_UP') {
                            return getOriginPostOfficeInfo(s).code === poCode;
                        }
                        // Đơn phát về bưu cục này
                        if (s.currentStatus === 'ARRIVED_DEST_HUB' || s.currentStatus === 'OUT_FOR_DELIVERY') {
                            return getDestPostOfficeInfo(s).code === poCode;
                        }
                        return false;
                    });
                }

                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(s => s.currentStatus === selectedStatusFilter.value);
                }

                if (searchQuery.value.trim()) {
                    const q = searchQuery.value.trim().toLowerCase();
                    list = list.filter(s => 
                        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                        (s.senderName && s.senderName.toLowerCase().includes(q)) ||
                        (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                        (s.senderAddress && s.senderAddress.toLowerCase().includes(q)) ||
                        (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                    );
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

            watch([selectedPostOffice, selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
            });



            // 5. Thao tác nghiệp vụ Bưu Cục
            const executePhysicalOperation = async ({ cleanCode, targetStatus, locationCode, targetShipment, note }) => {
                let hadConflict = false;
                const run = async (operationName, extra = {}) => {
                    const operationId = await getSessionOperationId(cleanCode, operationName, {
                        locationCode,
                        transportLeg: targetShipment?.transportLeg,
                        tripCode: targetShipment?.tripCode || targetShipment?.activeTripCode,
                        currentStatus: targetShipment?.currentStatus,
                        inventoryStatus: getInventoryStatus(targetShipment)
                    });
                    try {
                        const publicStatuses = new Set([
                            'CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
                            'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED',
                            'CANCELLED', 'RETURNING', 'RETURNED'
                        ]);
                        const currentStatus = normalizeCode(targetShipment?.currentStatus).toUpperCase();
                        const operationExtra = { ...extra, note };
                        if (operationName !== 'handoffToCourier') {
                            // Receiving at the origin counter is the public transition
                            // from ROUTE_ASSIGNED/PENDING_ROUTING to PICKED_UP.
                            const receiveStatus = operationName === 'receiveAtLocation'
                                && ['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(currentStatus)
                                ? 'PICKED_UP'
                                : currentStatus;
                            operationExtra.shipmentStatus = publicStatuses.has(receiveStatus)
                                ? receiveStatus
                                : 'PICKED_UP';
                        }
                        return await callRoutingOperation(
                            operationName,
                            cleanCode,
                            locationCode,
                            operationId,
                            operationExtra
                        );
                    } catch (err) {
                        if (!isConflictError(err)) throw err;
                        hadConflict = true;
                        return null;
                    }
                };

                if (targetStatus === 'PICKED_UP') {
                    // Receiving and storing are deliberately separate physical steps.
                    await run('receiveAtLocation');
                } else if (targetStatus === 'OUT_FOR_DELIVERY') {
                    const currentCourierId = courierId.value || getCourierId();
                    if (!currentCourierId) {
                        throw new Error('Chưa có courierId của bưu tá trong tài khoản/profile. Vui lòng bổ sung mã bưu tá trước khi bàn giao.');
                    }
                    // The backend requires STORED inventory for handoff. The UI
                    // exposes a separate "Lưu Kho" action before this operation.
                    await run('handoffToCourier', { courierId: currentCourierId });
                } else if (targetStatus === 'STORED' || targetStatus === 'IN_STORAGE') {
                    await run('storeAtLocation');
                } else {
                    throw new Error(`Thao tác vật lý không hỗ trợ trạng thái ${targetStatus}.`);
                }

                return { hadConflict };
            };

            const handleUpdateStatus = async (trackingCode, targetStatus, customLocation, customNote) => {
                if (isActionRunning.value) return;
                if (!trackingCode || !trackingCode.trim()) {
                    Utils.showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }

                const cleanCode = trackingCode.trim();
                const targetShipment = shipmentsList.value.find(s => s.trackingCode === cleanCode);
                if (!targetShipment) {
                    Utils.showToast('Không Tìm Thấy', `Không tìm thấy bưu gửi ${cleanCode} trong tồn kho hoặc projection hiện tại. Vui lòng làm mới dữ liệu trước khi tác nghiệp.`, 'warning');
                    return;
                }
                let locationCode;
                try {
                    locationCode = getActionLocation(targetStatus, customLocation, targetShipment);
                } catch (err) {
                    Utils.showToast('Thiếu Ngữ Cảnh Bưu Cục', err.message, 'warning');
                    return;
                }

                if (targetShipment && targetStatus === 'OUT_FOR_DELIVERY') {
                    const currentLoc = (targetShipment.locationCode || '').toUpperCase();
                    if (!currentLoc.startsWith('POST-')) {
                        Utils.showToast('Chưa Thể Bàn Giao', `Bưu gửi ${cleanCode} chưa được xe Feeder dỡ vào kho bưu cục. Hiện tại bưu gửi vẫn đang tại [${currentLoc || 'Kho Tổng / Trên Tuyến'}].`, 'warning');
                        return;
                    }
                    if (getInventoryStatus(targetShipment) !== 'STORED') {
                        Utils.showToast('Chưa Thể Bàn Giao', `Bưu gửi ${cleanCode} chưa được xác nhận nhập kho tại ${currentLoc}. Hãy thực hiện Lưu Kho trước khi bàn giao bưu tá.`, 'warning');
                        return;
                    }
                }

                isActionRunning.value = true;
                try {
                    const result = await executePhysicalOperation({
                        cleanCode,
                        targetStatus,
                        locationCode,
                        targetShipment,
                        note: customNote || `Khai thác tại bưu cục ${locationCode}: ${Utils.formatStatusText(targetStatus)}`
                    });

                    // Always reconcile with the backend. Do not leave a local
                    // optimistic status as the source of truth after an action.
                    await loadShipmentsData(true);
                    if (result.hadConflict) {
                        Utils.showToast('Đã Đồng Bộ', `Bưu gửi ${cleanCode} đã được xử lý trước đó; tồn kho đã được tải lại.`, 'warning');
                    } else {
                        Utils.showToast('Thành Công', `Bưu gửi ${cleanCode} đã hoàn tất tác nghiệp tại ${locationCode}.`);
                    }
                    scanInputCode.value = '';
                } catch (err) {
                    console.error('[PostOfficeOpsView] Lỗi tác nghiệp:', err);
                    // A receive/store chain can partially succeed, so reconcile even
                    // when the final helper reports a non-conflict failure.
                    await loadShipmentsData(true);
                    if (isConflictError(err)) {
                        Utils.showToast('Đã Có Thay Đổi', `Bưu gửi ${cleanCode} đã thay đổi trên máy chủ; dữ liệu đã được làm mới.`, 'warning');
                    } else {
                        Utils.showToast('Thất Bại', err.message || 'Không thể hoàn tất tác nghiệp bưu cục', 'error');
                    }
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleStoreAtLocation = (trackingCode, customLocation, customNote) => {
                return handleUpdateStatus(
                    trackingCode,
                    'STORED',
                    customLocation,
                    customNote || 'Bưu cục đã xác nhận lưu kho tại địa điểm tác nghiệp'
                );
            };

            // Quét mã nhanh từ ô Input
            const handleQuickScan = (targetStatus) => {
                if (!scanInputCode.value.trim()) {
                    Utils.showToast('Yêu Cầu Nhập Mã', 'Vui lòng quét hoặc nhập mã vận đơn để thực hiện tác nghiệp', 'warning');
                    return;
                }
                const poCode = selectedPostOffice.value !== 'ALL' ? selectedPostOffice.value : 'Bưu Cục Gốc';
                let note = '';
                if (targetStatus === 'PICKED_UP') {
                    note = `Bưu cục [${poCode}] đã tiếp nhận bưu phẩm tại quầy từ người gửi`;
                } else if (targetStatus === 'OUT_FOR_DELIVERY') {
                    note = `Bưu cục [${poCode}] đã bàn giao bưu phẩm cho bưu tá đi phát chặng cuối`;
                }
                handleUpdateStatus(scanInputCode.value, targetStatus, selectedPostOffice.value !== 'ALL' ? selectedPostOffice.value : null, note);
            };

            // Mở chi tiết hành trình & bản đồ
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'post-office');
                }
            };

            onMounted(() => {
                loadShipmentsData();
            });

            return {
                currentSubtab,
                isLoading,
                isActionRunning,
                shipmentsList,
                scanInputCode,
                selectedPostOffice,
                selectedStatusFilter,
                searchQuery,
                isAdmin,
                stationCode,
                stationName,
                courierId,
                currentPage,
                pageSize,
                totalPages,
                filteredShipments,
                paginatedShipments,
                kpiAwaitingIntake,
                kpiStagedInOffice,
                kpiArrivedFromHub,
                kpiOutForDelivery,
                getOriginPostOfficeInfo,
                getDestPostOfficeInfo,
                getInventoryStatus,
                isAtPostOffice,
                loadShipmentsData,
                handleUpdateStatus,
                handleStoreAtLocation,
                handleQuickScan,
                viewTrackingDetail,
                Utils
            };
        },
        template: `
        <div class="space-y-3.5 pb-8 text-slate-800">
            <!-- 1. HERO BANNER: THIẾT KẾ VNPT GRADIENT DÀNH CHO BƯU CỤC GIAO DỊCH -->
            <div class="rounded-xl bg-gradient-to-r from-teal-800 via-cyan-800 to-blue-900 text-white p-4 sm:p-5 shadow-md shadow-cyan-950/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                Bưu Cục Giao Dịch &amp; Phát (Cấp 2/3)
                            </span>
                            <span class="text-cyan-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Khai Thác &amp; Tiếp Nhận Bưu Gửi Tại Bưu Cục
                        </h1>
                        <p class="text-xs text-cyan-100/90 mt-0.5 leading-normal">
                            Bàn tác nghiệp giao dịch viên: Tiếp nhận bưu gửi tại quầy, xuất xe gom trung chuyển lên Kho Tổng và bàn giao bưu tá phát.
                        </p>
                        <p class="text-[11px] text-cyan-100 mt-1 font-semibold">
                            <span v-if="isAdmin">Phạm vi: Toàn mạng lưới (quản trị viên)</span>
                            <span v-else>Đang làm việc tại: {{ stationName }}<span v-if="stationCode"> ({{ stationCode }})</span></span>
                        </p>
                    </div>

                    <!-- Thống kê nhanh KPI Bưu Cục -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-1.5">
                        <div class="px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ kpiAwaitingIntake }}</div>
                            <div class="text-[9.5px] text-cyan-100 font-medium uppercase mt-0.5">Chờ Nhận Quầy</div>
                        </div>
                        <div class="px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiStagedInOffice }}</div>
                            <div class="text-[9.5px] text-cyan-100 font-medium uppercase mt-0.5">Tồn Chờ Gom</div>
                        </div>
                        <div class="px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">{{ kpiArrivedFromHub }}</div>
                            <div class="text-[9.5px] text-cyan-100 font-medium uppercase mt-0.5">Đã Về Bưu Cục</div>
                        </div>
                        <div class="px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-blue-200">{{ kpiOutForDelivery }}</div>
                            <div class="text-[9.5px] text-cyan-100 font-medium uppercase mt-0.5">Đang Đi Phát</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG GẠCH CHÂN -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto pb-px">
                    <button 
                        @click="currentSubtab = 'scan'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'scan' 
                                ? 'border-cyan-600 text-cyan-800' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUÉT TIẾP NHẬN &amp; BÀN GIAO PHÁT</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'inventory'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'inventory' 
                                ? 'border-cyan-600 text-cyan-800' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUẢN LÝ TỒN KHO BƯU CỤC</span>
                        <span v-if="kpiStagedInOffice > 0" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Chờ xe: {{ kpiStagedInOffice }}
                        </span>
                        <span v-if="kpiArrivedFromHub > 0" class="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Chờ phát: {{ kpiArrivedFromHub }}
                        </span>
                    </button>
                </div>

                <button 
                    @click="loadShipmentsData()" 
                    :disabled="isLoading"
                    class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 border border-slate-200"
                >
                    <span v-if="isLoading" class="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Làm Mới</span>
                </button>
            </div>

            <!-- =============================================================== -->
            <!-- SUBTAB 1: QUÉT TIẾP NHẬN & BÀN GIAO PHÁT                      -->
            <!-- =============================================================== -->
            <div v-if="currentSubtab === 'scan'" class="space-y-3">
                <!-- THANH TÁC NGHIỆP ĐẦU ĐỌC MÃ BARCODE -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div class="flex items-center space-x-2">
                        <span class="w-2 h-2 rounded-full bg-cyan-600"></span>
                        <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            Quét Mã Vạch Tiếp Nhận Quầy / Bàn Giao
                        </span>
                        <span class="text-slate-400 text-xs font-normal">(Quét bằng máy đọc hoặc gõ mã)</span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        <input 
                            v-model="scanInputCode"
                            @keyup.enter="handleQuickScan('PICKED_UP')"
                            type="text" 
                            placeholder="Nhập hoặc quét mã bưu gửi..." 
                            class="pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-cyan-800 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 outline-none w-56 transition"
                        />
                        <button 
                            @click="handleQuickScan('PICKED_UP')"
                            :disabled="isActionRunning"
                            class="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 flex items-center space-x-1"
                            title="Tiếp nhận bưu gửi mới gửi tại quầy"
                        >
                            <span>Tiếp Nhận Quầy</span>
                        </button>
                        <button 
                            @click="handleQuickScan('OUT_FOR_DELIVERY')"
                            :disabled="isActionRunning"
                            class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition shadow-sm disabled:opacity-50 flex items-center space-x-1"
                            title="Bàn giao bưu gửi cho bưu tá đi phát"
                        >
                            <span>Bàn Giao Bưu Tá</span>
                        </button>
                    </div>
                </div>

                <!-- THANH SEARCH & FILTER BƯU CỤC -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <!-- Ô tìm kiếm -->
                        <div class="relative w-52 sm:w-56">
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Tìm mã vận đơn, người gửi, địa chỉ..."
                                class="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600 outline-none transition"
                            />
                        </div>

                        <!-- Lựa chọn Bưu Cục Làm Việc (Chỉ hiển thị các bưu cục POST-*) -->
                        <select
                            v-model="selectedPostOffice"
                            :disabled="!isAdmin"
                            class="px-3 py-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-xs font-bold text-cyan-900 focus:bg-white focus:border-cyan-600 outline-none transition disabled:opacity-80 disabled:cursor-not-allowed"
                        >
                            <option v-if="isAdmin" value="ALL">Toàn Bộ Mạng Lưới Bưu Cục</option>
                            <option v-if="!isAdmin && stationCode" :value="stationCode">{{ stationCode }} - {{ stationName }}</option>
                            <option v-if="!isAdmin && !stationCode" value="">Chưa được gán bưu cục</option>
                            <optgroup v-if="isAdmin" label="Bưu Cục Giao Dịch & Phát (Hà Nội)">
                                <option value="POST-HN-CG">POST-HN-CG - Bưu Cục Cầu Giấy</option>
                                <option value="POST-HN-DDA">POST-HN-DDA - Bưu Cục Đống Đa</option>
                                <option value="POST-HN-HBT">POST-HN-HBT - Bưu Cục Hai Bà Trưng</option>
                                <option value="POST-HN-TX">POST-HN-TX - Bưu Cục Thanh Xuân</option>
                                <option value="POST-HN-HD">POST-HN-HD - Bưu Cục Hà Đông</option>
                            </optgroup>
                            <optgroup v-if="isAdmin" label="Bưu Cục Giao Dịch & Phát (Đà Nẵng)">
                                <option value="POST-DN-HC">POST-DN-HC - Bưu Cục Hải Châu</option>
                                <option value="POST-DN-TK">POST-DN-TK - Bưu Cục Thanh Khê</option>
                                <option value="POST-DN-ST">POST-DN-ST - Bưu Cục Sơn Trà</option>
                            </optgroup>
                            <optgroup v-if="isAdmin" label="Bưu Cục Giao Dịch & Phát (TP.HCM)">
                                <option value="POST-HCM-Q1">POST-HCM-Q1 - Bưu Cục Quận 1</option>
                                <option value="POST-HCM-TB">POST-HCM-TB - Bưu Cục Tân Bình</option>
                                <option value="POST-HCM-BT">POST-HCM-BT - Bưu Cục Bình Thạnh</option>
                                <option value="POST-HCM-TD">POST-HCM-TD - Bưu Cục Thủ Đức</option>
                                <option value="POST-HCM-Q7">POST-HCM-Q7 - Bưu Cục Quận 7</option>
                            </optgroup>
                        </select>

                        <!-- Lọc trạng thái -->
                        <select 
                            v-model="selectedStatusFilter"
                            class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-cyan-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ROUTE_ASSIGNED">Chờ Tiếp Nhận Quầy</option>
                            <option value="PICKED_UP">Đã Nhập Kho Bưu Cục</option>
                            <option value="IN_TRANSIT">Đang Luân Chuyển / Feeder</option>
                            <option value="ARRIVED_DEST_HUB">Đã Về Bưu Cục Phát</option>
                            <option value="OUT_FOR_DELIVERY">Bưu Tá Đang Đi Phát</option>
                            <option value="DELIVERED">Phát Thành Công</option>
                        </select>

                        <!-- Lọc số bản ghi -->
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

                <!-- BẢNG DANH SÁCH BƯU GỬI TẠI BƯU CỤC -->
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <div v-if="isLoading" class="p-8 text-center text-slate-400">
                        <div class="animate-spin w-6 h-6 border-2 border-cyan-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <span>Đang tải dữ liệu bưu gửi bưu cục...</span>
                    </div>

                    <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                        <span>Không tìm thấy bưu gửi nào phù hợp với bộ lọc bưu cục.</span>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <th class="py-2.5 px-3">Số Hiệu Bưu Gửi</th>
                                    <th class="py-2.5 px-3">Bưu Cục Gốc</th>
                                    <th class="py-2.5 px-3">Bưu Cục Phát</th>
                                    <th class="py-2.5 px-3">Khối Lượng</th>
                                    <th class="py-2.5 px-3">Tiền COD</th>
                                    <th class="py-2.5 px-3">Trạng Thái Hiện Tại</th>
                                    <th class="py-2.5 px-3 text-right">Tác Nghiệp Bưu Cục</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-cyan-50/30 transition">
                                    <td class="py-2.5 px-3">
                                        <button 
                                            type="button"
                                            @click="viewTrackingDetail(item.trackingCode)"
                                            class="font-mono font-bold text-cyan-700 hover:text-cyan-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                            title="Xem chi tiết hành trình & bản đồ"
                                        >
                                            <span>{{ item.trackingCode }}</span>
                                            <span class="text-[11px] text-cyan-500 opacity-60 group-hover:opacity-100 transition-all">↗</span>
                                        </button>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-700">
                                        <div class="font-bold">{{ getOriginPostOfficeInfo(item).name }}</div>
                                        <div class="text-[10px] font-mono text-slate-400">{{ getOriginPostOfficeInfo(item).code }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-800">
                                        <div class="font-bold">{{ getDestPostOfficeInfo(item).name }}</div>
                                        <div class="text-[10px] text-slate-500 truncate max-w-xs">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 font-mono text-slate-700">
                                        {{ item.weight ? item.weight + ' kg' : '0 kg' }}
                                    </td>
                                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                        {{ Utils.formatCurrency(item.codAmount) }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <span :class="['px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border inline-block', Utils.getStatusBadgeClass(item.currentStatus)]">
                                            {{ Utils.formatStatusText(item.currentStatus) }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                                        <!-- 1. Khi đơn mới tạo: Tiếp nhận vào bưu cục -->
                                        <template v-if="item.currentStatus === 'ROUTE_ASSIGNED' || item.currentStatus === 'PENDING_ROUTING'">
                                            <button 
                                                @click="handleUpdateStatus(item.trackingCode, 'PICKED_UP', getOriginPostOfficeInfo(item).code, 'Bưu cục đã tiếp nhận bưu phẩm tại quầy từ người gửi')"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold transition shadow-sm text-[11px]"
                                                :title="'Tiếp nhận vào bưu cục ' + getOriginPostOfficeInfo(item).name"
                                            >
                                                Tiếp Nhận Quầy
                                            </button>
                                        </template>

                                        <!-- 2. Khi đã tiếp nhận tại bưu cục: phải xác nhận lưu kho riêng -->
                                        <template v-else-if="item.currentStatus === 'PICKED_UP' && getInventoryStatus(item) !== 'STORED'">
                                            <button
                                                @click="handleStoreAtLocation(item.trackingCode, item.locationCode || selectedPostOffice, 'Bưu cục đã xác nhận lưu kho sau khi tiếp nhận tại quầy')"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition shadow-sm text-[11px] disabled:opacity-50"
                                                title="Xác nhận bưu gửi đã được nhập kho bưu cục"
                                            >
                                                Lưu Kho
                                            </button>
                                        </template>
                                        <template v-else-if="item.currentStatus === 'PICKED_UP'">
                                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                Lưu Kho (Chờ Xe Gom)
                                            </span>
                                        </template>

                                        <!-- 3. Khi đang trung chuyển / xe trục -->
                                        <template v-else-if="item.currentStatus === 'IN_TRANSIT'">
                                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200">
                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                Đang Luân Chuyển
                                            </span>
                                        </template>

                                        <!-- 4. Khi hàng đã đến Kho Tổng / Bưu cục phát (ARRIVED_DEST_HUB) -->
                                        <template v-else-if="item.currentStatus === 'ARRIVED_DEST_HUB'">
                                            <template v-if="(item.locationCode || '').toUpperCase().startsWith('POST-')">
                                                <button
                                                    v-if="getInventoryStatus(item) === 'RECEIVED'"
                                                    @click="handleStoreAtLocation(item.trackingCode, item.locationCode, 'Bưu cục phát xác nhận nhập kho sau khi nhận từ xe trung chuyển')"
                                                    :disabled="isActionRunning"
                                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-bold transition shadow-sm text-[11px] disabled:opacity-50"
                                                    title="Xác nhận nhập kho bưu cục phát trước khi bàn giao"
                                                >
                                                    Lưu Kho
                                                </button>
                                                <button
                                                    v-else-if="getInventoryStatus(item) === 'STORED'"
                                                    @click="handleUpdateStatus(item.trackingCode, 'OUT_FOR_DELIVERY', item.locationCode, 'Bưu cục đã bàn giao bưu gửi cho bưu tá đi phát')"
                                                    :disabled="isActionRunning"
                                                    class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition shadow-sm text-[11px] disabled:opacity-50"
                                                    title="Bàn giao bưu phẩm cho bưu tá phát chặng cuối"
                                                >
                                                    Bàn Giao Bưu Tá
                                                </button>
                                                <span v-else class="text-slate-400 text-[11px]">Đang đồng bộ tồn kho</span>
                                            </template>
                                            <span v-else class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200" title="Bưu phẩm đã dỡ tại Kho Tổng đích, chờ xe Feeder chuyển về bưu cục">
                                                <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                                                Tại Kho Tổng (Chờ Feeder Về)
                                            </span>
                                        </template>

                                        <!-- 5. Khi đang đi phát -->
                                        <template v-else-if="item.currentStatus === 'OUT_FOR_DELIVERY'">
                                            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                                Bưu Tá Đang Phát
                                            </span>
                                        </template>

                                        <!-- 6. Phát thành công -->
                                        <template v-else-if="item.currentStatus === 'DELIVERED'">
                                            <span class="text-slate-400 font-medium text-[11px]">Hoàn Tất</span>
                                        </template>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- THANH PHÂN TRANG -->
                    <div class="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang {{ currentPage }} / {{ totalPages }} (Tổng số {{ filteredShipments.length }} kết quả)
                        </div>
                        <div class="flex items-center space-x-1">
                            <button 
                                @click="currentPage--"
                                :disabled="currentPage <= 1"
                                class="px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40"
                            >
                                Trước
                            </button>
                            <button 
                                v-for="p in totalPages" 
                                :key="p"
                                @click="currentPage = p"
                                :class="[
                                    'px-2.5 py-1 rounded-md text-xs font-bold transition',
                                    currentPage === p 
                                        ? 'bg-cyan-600 text-white border border-cyan-600 shadow-sm' 
                                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                ]"
                            >
                                {{ p }}
                            </button>
                            <button 
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


            <!-- =============================================================== -->
            <!-- SUBTAB 3: QUẢN LÝ TỒN KHO BƯU CỤC                              -->
            <!-- =============================================================== -->
            <div v-else-if="currentSubtab === 'inventory'" class="space-y-3">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                            Kiểm Soát Tồn Kho Bưu Cục
                        </h2>
                        <p class="text-slate-500 text-[11px] mt-0.5">
                            Giám sát toàn bộ bưu phẩm đang lưu giữ tại quầy bưu cục (hàng gửi đi chờ gom và hàng phát chờ bưu tá)
                        </p>
                    </div>

                    <div class="flex items-center space-x-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <div><span class="text-slate-500">Chờ xe gom về Hub:</span> <strong class="text-cyan-800 font-bold">{{ kpiStagedInOffice }} kiện</strong></div>
                        <div class="w-px h-4 bg-slate-300"></div>
                        <div><span class="text-slate-500">Hàng về chờ phát:</span> <strong class="text-emerald-700 font-bold">{{ kpiArrivedFromHub }} kiện</strong></div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Phân Loại Tồn</th>
                                <th class="py-2.5 px-3">Người Nhận &amp; Địa Chỉ</th>
                                <th class="py-2.5 px-3">Khối Lượng</th>
                                <th class="py-2.5 px-3">Tiền COD</th>
                                <th class="py-2.5 px-3 text-right">Tác Nghiệp</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in filteredShipments.filter(s => s.currentStatus === 'PICKED_UP' || s.currentStatus === 'ARRIVED_DEST_HUB')" :key="item.id" class="hover:bg-cyan-50/30">
                                <td class="py-2.5 px-3">
                                    <button 
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-cyan-700 hover:underline"
                                    >
                                        {{ item.trackingCode }}
                                    </button>
                                </td>
                                <td class="py-2.5 px-3">
                                    <span v-if="item.currentStatus === 'PICKED_UP'" class="px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        Hàng Gửi Đi (Chờ Gom Hub)
                                    </span>
                                    <span v-else-if="(item.locationCode || '').toUpperCase().startsWith('POST-')" class="px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        Hàng Đến (Chờ Giao Bưu Tá)
                                    </span>
                                    <span v-else class="px-2 py-0.5 rounded text-[10.5px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                        Tại Kho Tổng Đích (Chờ Feeder Về)
                                    </span>
                                </td>
                                <td class="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                                    <span class="font-bold">{{ item.receiverName }}</span> - {{ item.receiverAddress }}
                                </td>
                                <td class="py-2.5 px-3 font-mono">
                                    {{ item.weight || 0 }} kg
                                </td>
                                <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                    {{ Utils.formatCurrency(item.codAmount) }}
                                </td>
                                <td class="py-2.5 px-3 text-right">
                                    <span 
                                        v-if="item.currentStatus === 'PICKED_UP'"
                                        class="text-amber-700 font-semibold text-[11px]"
                                    >
                                        Chờ Điều Phối Xe
                                    </span>
                                    <button
                                        v-else-if="(item.locationCode || '').toUpperCase().startsWith('POST-')"
                                        @click="handleUpdateStatus(item.trackingCode, 'OUT_FOR_DELIVERY', getDestPostOfficeInfo(item).code, 'Bàn giao bưu phẩm cho bưu tá đi phát')"
                                        :disabled="isActionRunning"
                                        class="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-bold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Giao Bưu Tá
                                    </button>
                                    <span v-else class="text-indigo-600 font-semibold text-[11px]">
                                        Chờ Xe Feeder
                                    </span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `
    };

    window.PostOfficeOpsView = PostOfficeOpsView;
})();
