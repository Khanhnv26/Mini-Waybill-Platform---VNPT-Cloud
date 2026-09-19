/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: KHAI THÁC & TIẾP NHẬN BƯU GỬI TẠI BƯU CỤC (POST OFFICE OPS)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_POST_OFFICE_OPERATOR / ROLE_ADMIN (Quyền: tracking:update_post_office)
 * ==============================================================================
 */

(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const PostOfficeOpsView = {
        name: 'PostOfficeOpsView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const currentSubtab = ref('outbound'); // 'outbound' (Cửa gửi đi) | 'inbound' (Cửa trả phát) | 'inventory'
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

            const stationCode = computed(() => {
                let authoritative = '';
                try {
                    authoritative = typeof Auth !== 'undefined' && typeof Auth.getLocationCode === 'function'
                        ? firstNonBlank(Auth.getLocationCode())
                        : '';
                } catch (err) {
                    authoritative = '';
                }
                if (authoritative) return authoritative;
                return firstNonBlank(
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
                );
            });

            const stationName = computed(() => {
                const code = stationCode.value;
                return code && window.MapManager?.hubCoordinates?.[code]?.name
                    ? window.MapManager.hubCoordinates[code].name
                    : code || 'Chưa được gán bưu cục';
            });

            // ALL là phạm vi toàn mạng lưới hoặc mặc định khi chưa được gán bưu cục cụ thể.
            const selectedPostOffice = ref(isAdmin.value ? 'ALL' : (stationCode.value || 'ALL'));

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);
            const selectedTrackingCodes = ref(new Set());

            const syncStationSelection = () => {
                if (isAdmin.value) {
                    if (!selectedPostOffice.value) selectedPostOffice.value = 'ALL';
                    return;
                }
                selectedPostOffice.value = stationCode.value || 'ALL';
            };
            syncStationSelection();

            const inferDefaultPostOfficeFromAddress = (address) => {
                if (!address || typeof address !== 'string') return null;
                const lower = address.toLowerCase();
                if (lower.includes('hà nội') || lower.includes('ha noi')) {
                    return { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy (Hà Nội)' };
                }
                if (lower.includes('hồ chí minh') || lower.includes('ho chi minh') || lower.includes('hcm') || lower.includes('sài gòn') || lower.includes('sai gon')) {
                    return { code: 'POST-HCM-Q1', name: 'Bưu Cục Bến Nghé - Quận 1 (TP.HCM)' };
                }
                if (lower.includes('đà nẵng') || lower.includes('da nang')) {
                    return { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu (Đà Nẵng)' };
                }
                if (lower.includes('hải phòng') || lower.includes('hai phong')) {
                    return { code: 'POST-HP-NQ', name: 'Bưu Cục Ngô Quyền (Hải Phòng)' };
                }
                if (lower.includes('cần thơ') || lower.includes('can tho')) {
                    return { code: 'POST-CT-NK', name: 'Bưu Cục Ninh Kiều (Cần Thơ)' };
                }
                return null;
            };

            const getOriginPostOfficeInfo = (item) => {
                if (!item) return { code: '', name: 'Chưa xác định' };
                const directCode = normalizeCode(item.originPostOffice || item.origin_post_office || item.sourcePostOffice);
                if (directCode) {
                    const name = window.MapManager?.hubCoordinates?.[directCode]?.name || directCode || 'Chưa xác định';
                    return { code: directCode, name };
                }
                if (item.senderAddress) {
                    if (window.MapManager?.getPostOfficeForAddress) {
                        const found = window.MapManager.getPostOfficeForAddress(item.senderAddress);
                        if (found) return { code: normalizeCode(found.code), name: found.name || found.code || 'Chưa xác định' };
                    }
                    const fallback = inferDefaultPostOfficeFromAddress(item.senderAddress);
                    if (fallback) return fallback;
                }
                return { code: '', name: 'Chưa xác định' };
            };

            const getDestPostOfficeInfo = (item) => {
                if (!item) return { code: '', name: 'Chưa xác định' };
                const directCode = normalizeCode(item.destPostOffice || item.dest_post_office || item.destinationPostOffice);
                if (directCode) {
                    const name = window.MapManager?.hubCoordinates?.[directCode]?.name || directCode || 'Chưa xác định';
                    return { code: directCode, name };
                }
                if (item.receiverAddress) {
                    if (window.MapManager?.getPostOfficeForAddress) {
                        const found = window.MapManager.getPostOfficeForAddress(item.receiverAddress);
                        if (found) return { code: normalizeCode(found.code), name: found.name || found.code || 'Chưa xác định' };
                    }
                    const fallback = inferDefaultPostOfficeFromAddress(item.receiverAddress);
                    if (fallback) return fallback;
                }
                return { code: '', name: 'Chưa xác định' };
            };

            const getInventoryStatus = (item) => normalizeCode(
                item?.inventoryStatus || item?.inventory_status || item?.inventoryState
            ).toUpperCase();

            const isShipmentInSelectedPostOfficeScope = (item) => {
                const selected = normalizeCode(selectedPostOffice.value).toUpperCase();
                if (!selected || selected === 'ALL' || !item) return false;

                const location = normalizeCode(item.locationCode).toUpperCase();
                // 1. Tồn kho bưu cục: BẮT BUỘC 100% kiện phải thực tế nằm tại kho của bưu cục này
                if (currentSubtab.value === 'inventory') {
                    return location === selected;
                }

                // 2. Khai thác đi: Phải xuất phát từ bưu cục này và đang tại bưu cục hoặc vừa xuất bến
                if (currentSubtab.value === 'outbound') {
                    const originPo = normalizeCode(getOriginPostOfficeInfo(item).code).toUpperCase();
                    if (originPo !== selected && location !== selected) return false;
                    return location === selected || ['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'PICKED_UP', 'IN_TRANSIT'].includes(
                        normalizeCode(item.currentStatus || item.status).toUpperCase()
                    );
                }

                // 3. Khai thác đến: Phải có điểm đích là bưu cục này và đã cập bến/đang phát
                if (currentSubtab.value === 'inbound') {
                    const destPo = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
                    if (destPo !== selected) return false;
                    return location === selected || !location.startsWith('HUB-');
                }

                // 4. Quản lý quỹ COD: Phải phát sinh tiền COD và thuộc bưu cục phát / tác nghiệp này
                if (currentSubtab.value === 'cod-settlement') {
                    const destPo = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
                    if (destPo !== selected && location !== selected) return false;
                    return Number(item.codAmount) > 0;
                }

                // Mặc định chung cho tra cứu: chỉ nhận kiện liên quan
                const originPo = normalizeCode(getOriginPostOfficeInfo(item).code).toUpperCase();
                const destPo = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
                return location === selected || originPo === selected || destPo === selected;
            };

            // Bucket trạng thái là nguồn chân lý duy nhất: dùng chung cho bộ lọc,
            // số đếm trên nút lọc và KPI để con số luôn khớp danh sách hiển thị.
            const getShipmentStatusText = (item) => normalizeCode(item?.currentStatus || item?.status).toUpperCase();

            const isOutboundStaged = (item) => {
                if (!item) return false;
                const status = getShipmentStatusText(item);
                const inventory = getInventoryStatus(item);
                if (['LOADED', 'RESERVED'].includes(inventory)) return false;
                if (status === 'PICKED_UP') return true;
                return inventory === 'STORED'
                    && ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED'].includes(status);
            };

            const isWaitingHandoff = (item) => {
                if (!item) return false;
                if (getShipmentStatusText(item) !== 'ARRIVED_DEST_HUB') return false;
                const inventory = getInventoryStatus(item);
                // Kiện còn trên xe trung chuyển chưa được dỡ xuống bưu cục.
                if (['LOADED', 'RESERVED'].includes(inventory)) return false;
                const location = normalizeCode(item.locationCode).toUpperCase();
                // Loại kiện còn nằm ở kho tổng, chỉ nhận kiện đã thực sự về bưu cục.
                return !location.startsWith('HUB-');
            };

            const getOutboundBucket = (item) => {
                if (!item) return '';
                const status = getShipmentStatusText(item);
                const inventory = getInventoryStatus(item);
                if (['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED'].includes(status)) return 'WAITING_INTAKE';
                if (isOutboundStaged(item)) return 'STORED_OFFICE';
                if (status === 'IN_TRANSIT' || ['LOADED', 'RESERVED'].includes(inventory)) return 'IN_TRANSIT';
                return '';
            };

            const getInboundBucket = (item) => {
                if (!item) return '';
                const status = getShipmentStatusText(item);
                if (isWaitingHandoff(item)) return 'WAITING_HANDOFF';
                if (status === 'OUT_FOR_DELIVERY') return 'OUT_FOR_DELIVERY';
                if (status === 'DELIVERED') return 'DELIVERED';
                if (['DELIVERY_FAILED', 'RETURNING', 'RETURNED'].includes(status)) return 'FAILED';
                return '';
            };

            const getInventoryBucket = (item) => {
                if (!item) return '';
                if (isOutboundStaged(item)) return 'STORED_OFFICE';
                if (isWaitingHandoff(item)) return 'WAITING_HANDOFF';
                return '';
            };

            // Phân định chuẩn theo luồng nghiệp vụ logistics:
            // 1. Khai thác đi: Chỉ nhận kiện có điểm gửi thuộc trạm này
            const isOutboundShipment = (item) => {
                if (!item) return false;
                const poCode = normalizeCode(selectedPostOffice.value).toUpperCase();
                if (poCode && poCode !== 'ALL') {
                    const originPo = normalizeCode(getOriginPostOfficeInfo(item).code).toUpperCase();
                    const loc = normalizeCode(item.locationCode).toUpperCase();
                    if (originPo !== poCode && loc !== poCode) return false;
                }
                return Boolean(getOutboundBucket(item));
            };

            // 2. Khai thác đến: Chỉ nhận kiện có điểm nhận thuộc trạm này
            const isInboundShipment = (item) => {
                if (!item) return false;
                const poCode = normalizeCode(selectedPostOffice.value).toUpperCase();
                if (poCode && poCode !== 'ALL') {
                    const destPo = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
                    if (destPo !== poCode) return false;
                }
                return Boolean(getInboundBucket(item));
            };

            // 3. Quản lý tồn kho: BẮT BUỘC 100% kiện phải thực tế nằm tại kho bưu cục (Physical Location)
            const isInventoryShipment = (item) => {
                if (!item) return false;
                const poCode = normalizeCode(selectedPostOffice.value).toUpperCase();
                const loc = normalizeCode(item.locationCode).toUpperCase();
                if (poCode && poCode !== 'ALL') {
                    if (loc !== poCode) return false;
                } else {
                    if (!loc.startsWith('POST-') && loc !== 'DELIVERY_OFFICE') return false;
                }
                return Boolean(getInventoryBucket(item));
            };

            // 4. Quản lý quỹ & đối soát COD: Kiện có phát sinh tiền COD thuộc bưu cục phát này
            const isCodSettlementShipment = (item) => {
                if (!item || !(Number(item.codAmount) > 0)) return false;
                const poCode = normalizeCode(selectedPostOffice.value).toUpperCase();
                if (poCode && poCode !== 'ALL') {
                    const destPo = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
                    const loc = normalizeCode(item.locationCode).toUpperCase();
                    if (destPo !== poCode && loc !== poCode) return false;
                }
                const status = getShipmentStatusText(item);
                return ['DELIVERED', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(status) || Boolean(item.codSettlementStatus);
            };

            // Bộ lọc phạm vi bưu cục: Chỉ lấy kiện thuộc luồng đi, luồng đến, thực tế tồn kho hoặc đối soát COD của trạm
            const scopedShipments = computed(() => {
                const poCode = normalizeCode(selectedPostOffice.value).toUpperCase();
                if (!poCode || poCode === 'ALL') return shipmentsList.value;
                return shipmentsList.value.filter(s => {
                    return isOutboundShipment(s) || isInboundShipment(s) || isInventoryShipment(s) || isCodSettlementShipment(s);
                });
            });

            // UI-only resolver: luôn đưa ra một hành động kế tiếp, không thay đổi state machine.
            const getNextPostOfficeAction = (item) => {
                if (!item) return { key: 'LOOKUP', label: 'Tra cứu bưu gửi', targetStatus: '' };
                const status = normalizeCode(item.currentStatus || item.status).toUpperCase();
                const inventory = getInventoryStatus(item);
                const location = normalizeCode(item.locationCode).toUpperCase();
                const atPostOffice = location.startsWith('POST-') || location === 'DELIVERY_OFFICE';

                if (['DELIVERED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNED'].includes(status)) {
                    return { key: 'DONE', label: 'Đã hoàn tất', targetStatus: '' };
                }
                if (status === 'OUT_FOR_DELIVERY') {
                    return { key: 'IN_PROGRESS', label: 'Đang đi phát', targetStatus: '' };
                }
                if (status === 'IN_TRANSIT') {
                    return { key: 'WAITING', label: 'Đang luân chuyển', targetStatus: '' };
                }
                if (status === 'ARRIVED_DEST_HUB' && atPostOffice) {
                    return { key: 'HANDOFF', label: 'Bàn giao bưu tá (1-Click)', targetStatus: 'OUT_FOR_DELIVERY' };
                }
                if (['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'CREATED'].includes(status)) {
                    return { key: 'RECEIVE_ORIGIN', label: 'Tiếp nhận tại quầy', targetStatus: 'PICKED_UP' };
                }
                if (status === 'PICKED_UP' && inventory !== 'STORED') {
                    return { key: 'STORE_ORIGIN', label: 'Lưu kho bưu cục', targetStatus: 'STORED' };
                }
                if (status === 'PICKED_UP') {
                    return { key: 'WAITING_FEEDER', label: 'Chờ xe gom', targetStatus: '' };
                }
                return { key: 'REVIEW', label: 'Kiểm tra chi tiết', targetStatus: '' };
            };

            const scannedItem = computed(() => {
                const code = normalizeCode(scanInputCode.value).toUpperCase();
                if (!code) return null;
                return shipmentsList.value.find(item => {
                    if (normalizeCode(item.trackingCode).toUpperCase() !== code) return false;
                    // Keep ALL useful for lookup, but only a concrete station scope
                    // may produce an actionable scanner result.
                    return selectedPostOffice.value === 'ALL' || isShipmentInSelectedPostOfficeScope(item);
                }) || null;
            });
            const scannedAction = computed(() => getNextPostOfficeAction(scannedItem.value));

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
                const normalizedShipments = shipmentItems
                    .map(normalizeInventoryItem)
                    .filter(Boolean);
                const projections = new Map(
                    normalizedShipments.map(item => [item.trackingCode.toUpperCase(), item])
                );
                const processedTrackingCodes = new Set();
                const merged = inventoryItems.map(inventory => {
                    const trackingCode = (inventory.trackingCode || '').toUpperCase();
                    if (trackingCode) processedTrackingCodes.add(trackingCode);
                    const projection = projections.get(trackingCode) || {};
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

                // Bổ sung các vận đơn mới tạo từ ShipmentService chưa có bản ghi tồn kho vật lý
                // để giao dịch viên có thể thấy ở mục "Chờ Tiếp Nhận Quầy" và thực hiện tiếp nhận
                normalizedShipments.forEach(shipment => {
                    const code = (shipment.trackingCode || '').toUpperCase();
                    if (code && !processedTrackingCodes.has(code)) {
                        const originPo = getOriginPostOfficeInfo(shipment).code;
                        const destPo = getDestPostOfficeInfo(shipment).code;
                        const locationCode = shipment.locationCode || (
                            ['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'PICKED_UP'].includes(shipment.currentStatus)
                                ? originPo
                                : destPo
                        );
                        merged.push({
                            ...shipment,
                            locationCode,
                            originPostOffice: originPo,
                            destPostOffice: destPo,
                            inventoryStatus: shipment.inventoryStatus || 'AWAITING_INTAKE'
                        });
                        processedTrackingCodes.add(code);
                    }
                });

                return merged;
            };

            const loadShipmentProjections = async () => {
                const shipmentService = getShipmentService();
                if (!shipmentService || typeof shipmentService.getAll !== 'function') return [];
                try {
                    return unwrapCollection(await shipmentService.getAll({ skip403Toast: true }))
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
                // Luôn nạp phạm vi đầy đủ (admin: toàn mạng; tài khoản trạm: đúng trạm)
                // để bộ lọc bưu cục chạy client-side, không phải gọi lại mạng mỗi lần đổi filter.
                const location = isAdmin.value ? '' : normalizeCode(stationCode.value);

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

                // ALL is a reporting scope for administrators, never a mutation scope.
                // Requiring an explicit selector also protects table actions that pass
                // a location inferred from the shipment.
                if (selectedPostOffice.value === 'ALL') {
                    throw new Error('Vui lòng chọn một bưu cục cụ thể trước khi tác nghiệp.');
                }

                if (requestedLocation && requestedLocation.toUpperCase() !== 'ALL') return requestedLocation;
                if (selectedPostOffice.value && selectedPostOffice.value !== 'ALL') {
                    return normalizeCode(selectedPostOffice.value);
                }

                let derivedLocation = '';
                if (targetStatus === 'PICKED_UP') {
                    derivedLocation = getOriginPostOfficeInfo(targetShipment).code;
                } else if (targetStatus === 'OUT_FOR_DELIVERY' || targetStatus === 'ARRIVED_DEST_HUB') {
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

            // Thống kê nhanh KPI Bưu Cục (cùng bucket predicate với bộ lọc)
            const kpiAwaitingIntake = computed(() =>
                scopedShipments.value.filter(s => isOutboundShipment(s) && getOutboundBucket(s) === 'WAITING_INTAKE').length
            );

            const kpiStagedInOffice = computed(() =>
                scopedShipments.value.filter(s => isOutboundShipment(s) && getOutboundBucket(s) === 'STORED_OFFICE').length
            );

            const kpiInTransitOutbound = computed(() =>
                scopedShipments.value.filter(s => isOutboundShipment(s) && getOutboundBucket(s) === 'IN_TRANSIT').length
            );

            const kpiArrivedFromHub = computed(() =>
                scopedShipments.value.filter(s => isInboundShipment(s) && getInboundBucket(s) === 'WAITING_HANDOFF').length
            );

            const kpiOutForDelivery = computed(() =>
                scopedShipments.value.filter(s => isInboundShipment(s) && getInboundBucket(s) === 'OUT_FOR_DELIVERY').length
            );

            const kpiDeliveredInbound = computed(() =>
                scopedShipments.value.filter(s => isInboundShipment(s) && getInboundBucket(s) === 'DELIVERED').length
            );

            const inventoryStagedCount = computed(() =>
                scopedShipments.value.filter(s => isInventoryShipment(s) && getInventoryBucket(s) === 'STORED_OFFICE').length
            );

            const inventoryWaitingHandoffCount = computed(() =>
                scopedShipments.value.filter(s => isInventoryShipment(s) && getInventoryBucket(s) === 'WAITING_HANDOFF').length
            );

            const currentSubtabCount = computed(() => {
                if (currentSubtab.value === 'outbound') return outboundCount.value;
                if (currentSubtab.value === 'inbound') return inboundCount.value;
                if (currentSubtab.value === 'inventory') return inventoryCount.value;
                return codSettlementPendingCount.value;
            });

            // 1. Tải tồn kho từ RoutingService; ShipmentService chỉ là fallback migration.
            // requestId đảm bảo chỉ kết quả của lần tải mới nhất được áp dụng (chống ghi đè).
            let latestLoadRequestId = 0;
            const loadShipmentsData = async (silent = false) => {
                const requestId = ++latestLoadRequestId;
                if (!silent) isLoading.value = true;
                try {
                    syncStationSelection();
                    const data = await loadAuthoritativeInventory();
                    if (requestId !== latestLoadRequestId) return;
                    shipmentsList.value = data;
                } catch (err) {
                    if (requestId !== latestLoadRequestId) return;
                    console.error('[PostOfficeOpsView] Lỗi tải tồn kho bưu cục:', err);
                    if (!silent) {
                        Utils.showToast('Lỗi Tải Dữ Liệu', err.message || 'Không thể tải tồn kho bưu gửi', 'error');
                    }
                } finally {
                    if (!silent && requestId === latestLoadRequestId) isLoading.value = false;
                }
            };

            // 2. Lọc danh sách bưu gửi theo Bưu Cục & Luồng Tác Nghiệp (Dual-Stream + Inventory + COD)
            const filteredShipments = computed(() => {
                let list = scopedShipments.value;

                // Phân luồng Cửa Gửi Đi vs Cửa Trả Phát vs Quản Lý Tồn Kho vs Quản Lý Quỹ COD
                if (currentSubtab.value === 'outbound') {
                    list = list.filter(s => isOutboundShipment(s));
                } else if (currentSubtab.value === 'inbound') {
                    list = list.filter(s => isInboundShipment(s));
                } else if (currentSubtab.value === 'inventory') {
                    list = list.filter(s => isInventoryShipment(s));
                } else if (currentSubtab.value === 'cod-settlement') {
                    list = list.filter(s => isCodSettlementShipment(s));
                }

                // Bộ lọc trạng thái chi tiết: so khớp đúng bucket của từng luồng,
                // nhờ vậy số trên nút lọc luôn bằng số dòng hiển thị.
                const sf = normalizeCode(selectedStatusFilter.value).toUpperCase();
                if (sf && sf !== 'ALL') {
                    if (currentSubtab.value === 'cod-settlement') {
                        if (sf === 'PENDING_SETTLEMENT') {
                            list = list.filter(s => s.codSettlementStatus === 'PENDING_SETTLEMENT');
                        } else if (sf === 'SETTLED') {
                            list = list.filter(s => s.codSettlementStatus === 'SETTLED');
                        } else if (sf === 'UNSETTLED') {
                            list = list.filter(s => getShipmentStatusText(s) === 'DELIVERED' && (!s.codSettlementStatus || s.codSettlementStatus === 'UNSETTLED'));
                        }
                    } else {
                        list = list.filter(s => {
                            const bucket = currentSubtab.value === 'outbound'
                                ? getOutboundBucket(s)
                                : currentSubtab.value === 'inbound'
                                    ? getInboundBucket(s)
                                    : getInventoryBucket(s);
                            if (bucket) return bucket === sf;
                            return getShipmentStatusText(s) === sf;
                        });
                    }
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

            const outboundCount = computed(() => scopedShipments.value.filter(s => isOutboundShipment(s)).length);
            const inboundCount = computed(() => scopedShipments.value.filter(s => isInboundShipment(s)).length);
            const inventoryCount = computed(() => scopedShipments.value.filter(s => isInventoryShipment(s)).length);
            const allShipmentsCount = computed(() => scopedShipments.value.length);

            // Quản lý Quỹ & Đối Soát Tiền Thu Hộ COD Bưu Cục
            const allOfficeCodShipments = computed(() => scopedShipments.value.filter(s => isCodSettlementShipment(s)));
            const codSettlementPendingShipments = computed(() => allOfficeCodShipments.value.filter(s => s.codSettlementStatus === 'PENDING_SETTLEMENT'));
            const codSettlementPendingCount = computed(() => codSettlementPendingShipments.value.length);
            const codSettledShipments = computed(() => allOfficeCodShipments.value.filter(s => s.codSettlementStatus === 'SETTLED'));
            const codSettledCount = computed(() => codSettledShipments.value.length);
            const codUnsettledShipments = computed(() => allOfficeCodShipments.value.filter(s => {
                const st = getShipmentStatusText(s);
                return st === 'DELIVERED' && (!s.codSettlementStatus || s.codSettlementStatus === 'UNSETTLED');
            }));
            const codUnsettledCount = computed(() => codUnsettledShipments.value.length);

            const totalOfficeCodAmount = computed(() => allOfficeCodShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0));
            const pendingCodTotalAmount = computed(() => codSettlementPendingShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0));
            const settledCodTotalAmount = computed(() => codSettledShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0));
            const unsettledCodTotalAmount = computed(() => codUnsettledShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0));

            const selectedCodSettlementCodes = ref([]);
            const isAllCodSettlementSelected = computed(() => {
                const pendings = codSettlementPendingShipments.value;
                if (pendings.length === 0) return false;
                return pendings.every(s => selectedCodSettlementCodes.value.includes(s.trackingCode));
            });

            const toggleSelectAllCodSettlement = () => {
                if (isAllCodSettlementSelected.value) {
                    selectedCodSettlementCodes.value = [];
                } else {
                    selectedCodSettlementCodes.value = codSettlementPendingShipments.value.map(s => s.trackingCode);
                }
            };

            const toggleSelectCodSettlement = (code) => {
                const idx = selectedCodSettlementCodes.value.indexOf(code);
                if (idx > -1) {
                    selectedCodSettlementCodes.value.splice(idx, 1);
                } else {
                    selectedCodSettlementCodes.value.push(code);
                }
            };

            const selectedCodSettlementTotalAmount = computed(() => {
                return shipmentsList.value
                    .filter(s => selectedCodSettlementCodes.value.includes(s.trackingCode))
                    .reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const showCodConfirmModal = ref(false);
            const isConfirmingSettlement = ref(false);
            const codTargetTrackingCodes = ref([]);

            const codTargetTrackingTotalAmount = computed(() => {
                return shipmentsList.value
                    .filter(s => codTargetTrackingCodes.value.includes(s.trackingCode))
                    .reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const openCodConfirmModal = (code) => {
                codTargetTrackingCodes.value = [code];
                showCodConfirmModal.value = true;
            };

            const openBulkCodConfirmModal = () => {
                if (selectedCodSettlementCodes.value.length === 0) {
                    Utils.showToast('Chưa Chọn Đơn', 'Vui lòng chọn ít nhất 1 vận đơn để thu quỹ', 'warning');
                    return;
                }
                codTargetTrackingCodes.value = [...selectedCodSettlementCodes.value];
                showCodConfirmModal.value = true;
            };

            const openAllPendingCodConfirmModal = () => {
                const pendings = codSettlementPendingShipments.value;
                if (pendings.length === 0) {
                    Utils.showToast('Không Có Đơn', 'Hiện không có đơn nào đang chờ duyệt nộp quỹ', 'info');
                    return;
                }
                codTargetTrackingCodes.value = pendings.map(s => s.trackingCode);
                showCodConfirmModal.value = true;
            };

            const executeConfirmCodSettlement = async () => {
                if (!codTargetTrackingCodes.value || codTargetTrackingCodes.value.length === 0) return;
                isConfirmingSettlement.value = true;
                try {
                    const officerId = authUser.email || authUser.fullName || stationCode.value || 'Giao dịch viên bưu cục';
                    const targetCodes = [...codTargetTrackingCodes.value];
                    const totalAmt = codTargetTrackingTotalAmount.value;
                    await ShipmentService.confirmCodSettlement(targetCodes, officerId);

                    targetCodes.forEach(code => {
                        const target = shipmentsList.value.find(s => s.trackingCode === code);
                        if (target) {
                            target.codSettlementStatus = 'SETTLED';
                            target.codSettledAt = new Date().toISOString();
                            target.codSettledBy = officerId;
                        }
                    });

                    window.dispatchEvent(new CustomEvent('system-notification-created', {
                        detail: {
                            title: 'Thu quỹ COD bưu cục thành công',
                            message: `Đã xác nhận thu quỹ COD thành công cho ${targetCodes.length} đơn (${Utils.formatCurrency(totalAmt)}).`
                        }
                    }));

                    Utils.showToast(
                        'Thu Quỹ Thành Công',
                        `Đã xác nhận thu quỹ ${targetCodes.length} vận đơn (${Utils.formatCurrency(totalAmt)}) vào két bưu cục.`,
                        'success'
                    );

                    selectedCodSettlementCodes.value = [];
                    showCodConfirmModal.value = false;
                    await loadShipmentsData(true);
                } catch (err) {
                    console.error('[PostOfficeOpsView] Lỗi xác nhận thu quỹ COD:', err);
                    Utils.showToast('Lỗi Xác Nhận Thu Quỹ', err.message || 'Không thể xác nhận thu quỹ COD', 'error');
                } finally {
                    isConfirmingSettlement.value = false;
                }
            };

            const getCodSettlementVisuals = (status) => {
                const s = (status || 'UNSETTLED').toUpperCase();
                if (s === 'SETTLED') {
                    return {
                        label: 'Đã Thu Quỹ Bưu Cục',
                        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        isPulse: false
                    };
                }
                if (s === 'PENDING_SETTLEMENT') {
                    return {
                        label: 'Chờ Bưu Cục Xác Nhận',
                        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                        isPulse: true
                    };
                }
                return {
                    label: 'Chưa Nộp Quỹ Bưu Cục',
                    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                    isPulse: false
                };
            };

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

            const BULK_POST_OFFICE_ACTION_KEYS = Object.freeze([
                'RECEIVE_ORIGIN', 'RECEIVE_DESTINATION', 'STORE_ORIGIN', 'STORE_DESTINATION', 'HANDOFF'
            ]);
            const isBulkPostOfficeAction = (item) => BULK_POST_OFFICE_ACTION_KEYS
                .includes(getNextPostOfficeAction(item).key);
            const selectablePostOfficeItems = computed(() => paginatedShipments.value.filter(item =>
                isBulkPostOfficeAction(item) && isShipmentInSelectedPostOfficeScope(item)
            ));
            const selectedPostOfficeItems = computed(() => shipmentsList.value.filter(item =>
                selectedTrackingCodes.value.has(normalizeCode(item.trackingCode).toUpperCase())
            ));
            const selectedPostOfficeAction = computed(() => {
                const actions = new Set(selectedPostOfficeItems.value
                    .map(item => getNextPostOfficeAction(item).key)
                    .filter(key => BULK_POST_OFFICE_ACTION_KEYS.includes(key)));
                if (actions.size === 0) return '';
                if ([...actions].every(key => key === 'HANDOFF')) return 'handoff';
                if ([...actions].every(key => key.startsWith('RECEIVE'))) return 'receive';
                if ([...actions].every(key => key.startsWith('STORE'))) return 'store';
                return '';
            });
            const handoffSelectedItems = computed(() => selectedPostOfficeItems.value.filter(item =>
                getNextPostOfficeAction(item).key === 'HANDOFF' && isShipmentInSelectedPostOfficeScope(item)
            ));
            const handoffBulkTotals = computed(() => {
                const items = handoffSelectedItems.value;
                return {
                    count: items.length,
                    cod: items.reduce((sum, item) => sum + (Number(item.codAmount) || 0), 0),
                    weight: items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0)
                };
            });
            const selectedPostOfficeWeight = computed(() => selectedPostOfficeItems.value.reduce(
                (total, item) => total + (Number(item.weight) || 0), 0
            ));

            const togglePostOfficeSelection = (item) => {
                const code = normalizeCode(item?.trackingCode).toUpperCase();
                if (!code || !isBulkPostOfficeAction(item) || !isShipmentInSelectedPostOfficeScope(item)) return;
                const next = new Set(selectedTrackingCodes.value);
                if (next.has(code)) next.delete(code); else next.add(code);
                selectedTrackingCodes.value = next;
            };
            const toggleAllPostOfficeSelection = () => {
                const visible = selectablePostOfficeItems.value;
                const next = new Set(selectedTrackingCodes.value);
                const allSelected = visible.length > 0 && visible.every(item => next.has(normalizeCode(item.trackingCode).toUpperCase()));
                visible.forEach(item => {
                    const code = normalizeCode(item.trackingCode).toUpperCase();
                    if (allSelected) next.delete(code); else next.add(code);
                });
                selectedTrackingCodes.value = next;
            };
            const clearPostOfficeSelection = () => { selectedTrackingCodes.value = new Set(); };

            watch(selectedPostOffice, () => {
                currentPage.value = 1;
                clearPostOfficeSelection();
                selectedCodSettlementCodes.value = [];
            });

            watch(currentSubtab, () => {
                selectedStatusFilter.value = 'ALL';
                currentPage.value = 1;
                clearPostOfficeSelection();
                selectedCodSettlementCodes.value = [];
            });

            watch([selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
                clearPostOfficeSelection();
                selectedCodSettlementCodes.value = [];
            });



            // 5. Thao tác nghiệp vụ Bưu Cục
            const executePhysicalOperation = async ({ cleanCode, targetStatus, locationCode, targetShipment, note, courierId: customCourierId }) => {
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

                if (targetStatus === 'PICKED_UP' || targetStatus === 'ARRIVED_DEST_HUB') {
                    // Receiving and storing are deliberately separate physical steps.
                    await run('receiveAtLocation');
                } else if (targetStatus === 'OUT_FOR_DELIVERY') {
                    const currentCourierId = customCourierId || courierId.value || getCourierId();
                    if (!currentCourierId) {
                        throw new Error('Chưa có mã bưu tá nhận hàng. Vui lòng chọn hoặc nhập mã bưu tá.');
                    }
                    // Tự động hoàn tất ngầm các bước tiếp nhận và lưu kho bưu cục nếu chưa qua STORED
                    const currentInv = getInventoryStatus(targetShipment);
                    if (currentInv !== 'STORED') {
                        if (currentInv !== 'RECEIVED') {
                            try {
                                await run('receiveAtLocation');
                            } catch (ignore) {
                                // Bỏ qua nếu đã tiếp nhận trước đó
                            }
                        }
                        try {
                            await run('storeAtLocation');
                        } catch (ignore) {
                            // Bỏ qua nếu đã lưu kho trước đó
                        }
                    }
                    await run('handoffToCourier', { courierId: currentCourierId });
                } else if (targetStatus === 'STORED' || targetStatus === 'IN_STORAGE') {
                    await run('storeAtLocation');
                } else {
                    throw new Error(`Thao tác vật lý không hỗ trợ trạng thái ${targetStatus}.`);
                }

                return { hadConflict };
            };

            const handleUpdateStatus = async (trackingCode, targetStatus, customLocation, customNote, customCourierId) => {
                if (isActionRunning.value) return;
                if (!trackingCode || !trackingCode.trim()) {
                    Utils.showToast('Thông Báo', 'Vui lòng nhập mã bưu gửi cần xử lý', 'warning');
                    return;
                }

                const cleanCode = trackingCode.trim();
                const targetShipment = shipmentsList.value.find(s =>
                    normalizeCode(s.trackingCode).toUpperCase() === cleanCode.toUpperCase()
                );
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
                }

                isActionRunning.value = true;
                try {
                    const result = await executePhysicalOperation({
                        cleanCode,
                        targetStatus,
                        locationCode,
                        targetShipment,
                        note: customNote || `Khai thác tại bưu cục ${locationCode}: ${Utils.formatStatusText(targetStatus, locationCode)}`,
                        courierId: customCourierId
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

            // Danh mục bưu tá giao hàng dự phòng phân theo bưu cục
            const COURIER_PRESETS = [
                // Hà Nội
                { code: 'BT-HN-CG-01', name: 'Nguyễn Văn Nam', phone: '0912.345.678', station: 'POST-HN-CG', area: 'Cầu Giấy', hasLinkedTelegram: false },
                { code: 'BT-HN-CG-02', name: 'Đỗ Văn Hùng', phone: '0912.345.679', station: 'POST-HN-CG', area: 'Dịch Vọng', hasLinkedTelegram: false },
                { code: 'BT-HN-DDA-01', name: 'Lê Văn Cường', phone: '0912.345.680', station: 'POST-HN-DDA', area: 'Đống Đa', hasLinkedTelegram: false },
                { code: 'BT-HN-HBT-01', name: 'Trần Văn Mạnh', phone: '0912.345.681', station: 'POST-HN-HBT', area: 'Hai Bà Trưng', hasLinkedTelegram: false },
                { code: 'BT-HN-TX-01', name: 'Vũ Văn Long', phone: '0912.345.682', station: 'POST-HN-TX', area: 'Thanh Xuân', hasLinkedTelegram: false },
                { code: 'BT-HN-HD-01', name: 'Bùi Văn Tuấn', phone: '0912.345.683', station: 'POST-HN-HD', area: 'Hà Đông', hasLinkedTelegram: false },

                // Đà Nẵng
                { code: 'BT-DN-HC-01', name: 'Phan Văn Sơn', phone: '0913.456.789', station: 'POST-DN-HC', area: 'Hải Châu', hasLinkedTelegram: false },
                { code: 'BT-DN-TK-01', name: 'Ngô Văn Đức', phone: '0913.456.790', station: 'POST-DN-TK', area: 'Thanh Khê', hasLinkedTelegram: false },
                { code: 'BT-DN-ST-01', name: 'Hoàng Văn Thái', phone: '0913.456.791', station: 'POST-DN-ST', area: 'Sơn Trà', hasLinkedTelegram: false },

                // TP.HCM
                { code: 'BT-HCM-Q1-01', name: 'Nguyễn Văn Phát', phone: '0918.765.432', station: 'POST-HCM-Q1', area: 'Bến Nghé - Bến Thành (Quận 1)', hasLinkedTelegram: false },
                { code: 'BT-HCM-Q1-02', name: 'Trần Thanh Bình', phone: '0918.765.433', station: 'POST-HCM-Q1', area: 'Đa Kao - Tân Định (Quận 1)', hasLinkedTelegram: false },
                { code: 'BT-HCM-TB-01', name: 'Phạm Văn Minh', phone: '0918.765.434', station: 'POST-HCM-TB', area: 'Tân Bình', hasLinkedTelegram: false },
                { code: 'BT-HCM-BT-01', name: 'Đặng Văn Khoa', phone: '0918.765.435', station: 'POST-HCM-BT', area: 'Bình Thạnh', hasLinkedTelegram: false },
                { code: 'BT-HCM-TD-01', name: 'Trịnh Văn Sang', phone: '0918.765.436', station: 'POST-HCM-TD', area: 'Thủ Đức', hasLinkedTelegram: false },
                { code: 'BT-HCM-Q7-01', name: 'Lý Văn Hải', phone: '0918.765.437', station: 'POST-HCM-Q7', area: 'Quận 7', hasLinkedTelegram: false },

                // Toàn quốc / Tài khoản mẫu hệ thống
                { code: 'shipper@waybill.vn', name: 'Bưu Tá Hệ Thống (Mẫu RBAC)', phone: '0909.000.999', station: 'ALL', area: 'Toàn Mạng Lưới', hasLinkedTelegram: false }
            ];

            // Danh bạ bưu tá nạp động từ shipper-service
            const shippersList = ref([]);
            const isShippersLoading = ref(false);

            const loadShippers = async (silent = false) => {
                if (!silent) isShippersLoading.value = true;
                try {
                    if (typeof Api !== 'undefined' && Api.get) {
                        const res = await Api.get('/api/shippers', {}, { skip403Toast: true });
                        if (res.ok) {
                            const data = await res.json();
                            if (Array.isArray(data) && data.length > 0) {
                                shippersList.value = data.map(s => ({
                                    code: s.courierCode,
                                    name: s.fullName,
                                    phone: s.phone,
                                    station: s.stationCode,
                                    area: s.stationCode || 'Khu vực bưu cục',
                                    hasLinkedTelegram: Boolean(s.hasLinkedTelegram),
                                    status: s.status
                                }));
                                return;
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[PostOfficeOpsView] Không nạp được danh bạ từ shipper-service, dùng danh bạ dự phòng:', err);
                } finally {
                    if (!silent) isShippersLoading.value = false;
                }
                if (shippersList.value.length === 0) {
                    shippersList.value = [...COURIER_PRESETS];
                }
            };

            const showHandoffModal = ref(false);
            const handoffForm = reactive({
                trackingCode: '',
                postOfficeCode: '',
                postOfficeName: '',
                receiverAddress: '',
                codAmount: 0,
                weight: 0,
                selectedCourier: '',
                customCourierId: '',
                note: '',
                bulkMode: false,
                bulkCodes: []
            });

            const availableCouriers = computed(() => {
                const po = (handoffForm.postOfficeCode || selectedPostOffice.value || '').toUpperCase();
                const source = shippersList.value.length > 0 ? shippersList.value : COURIER_PRESETS;
                const matched = source.filter(c => (c.station || '').toUpperCase() === po || (c.station || '').toUpperCase() === 'ALL');
                const others = source.filter(c => (c.station || '').toUpperCase() !== po && (c.station || '').toUpperCase() !== 'ALL');
                return [...matched, ...others];
            });

            const selectedCourierInfo = computed(() => {
                if (!handoffForm.selectedCourier || handoffForm.selectedCourier === 'CUSTOM') return null;
                return availableCouriers.value.find(c => c.code === handoffForm.selectedCourier) || null;
            });

            const openHandoffModal = (item) => {
                if (!item) return;
                const poInfo = getDestPostOfficeInfo(item);
                const poCode = item.locationCode || poInfo.code || selectedPostOffice.value;
                handoffForm.bulkMode = false;
                handoffForm.bulkCodes = [];
                handoffForm.trackingCode = item.trackingCode;
                handoffForm.postOfficeCode = poCode;
                handoffForm.postOfficeName = poInfo.name || poCode;
                handoffForm.receiverAddress = item.receiverAddress || '';
                handoffForm.codAmount = item.codAmount || 0;
                handoffForm.weight = item.weight || 0;

                const matched = availableCouriers.value.find(c => (c.station || '').toUpperCase() === String(poCode).toUpperCase());
                handoffForm.selectedCourier = matched ? matched.code : (availableCouriers.value[0]?.code || 'shipper@waybill.vn');
                handoffForm.customCourierId = '';
                handoffForm.note = `Bưu cục [${poInfo.name || poCode}] bàn giao bưu gửi cho bưu tá đi phát chặng cuối`;
                showHandoffModal.value = true;
            };

            // Bàn giao hàng loạt: 1 bưu tá + 1 ghi chú chung cho tất cả kiện đã chọn.
            const openBulkHandoffModal = () => {
                const items = handoffSelectedItems.value;
                if (!items.length) {
                    Utils.showToast('Chưa Chọn Kiện', 'Chọn các kiện "Chờ giao bưu tá" cùng một bưu cục trước khi bàn giao hàng loạt.', 'warning');
                    return;
                }
                if (isAdmin.value && selectedPostOffice.value === 'ALL') {
                    Utils.showToast('Chỉ Xem Tổng Hợp', 'Hãy chọn một bưu cục cụ thể trước khi bàn giao hàng loạt.', 'warning');
                    return;
                }

                const first = items[0];
                const poInfo = getDestPostOfficeInfo(first);
                const poCode = first.locationCode || poInfo.code || selectedPostOffice.value;

                handoffForm.bulkMode = true;
                handoffForm.bulkCodes = items
                    .map(item => normalizeCode(item.trackingCode))
                    .filter(Boolean);
                handoffForm.trackingCode = `${handoffForm.bulkCodes.length} bưu gửi`;
                handoffForm.postOfficeCode = poCode;
                handoffForm.postOfficeName = poInfo.name || poCode;
                handoffForm.receiverAddress = '';
                handoffForm.codAmount = handoffBulkTotals.value.cod;
                handoffForm.weight = handoffBulkTotals.value.weight;

                const matched = COURIER_PRESETS.find(c => c.station === poCode);
                handoffForm.selectedCourier = matched ? matched.code : (COURIER_PRESETS[0]?.code || 'shipper@waybill.vn');
                handoffForm.customCourierId = '';
                handoffForm.note = `Bưu cục [${poInfo.name || poCode}] bàn giao ${handoffForm.bulkCodes.length} bưu gửi cho bưu tá đi phát chặng cuối`;
                showHandoffModal.value = true;
            };

            const confirmHandoff = async () => {
                const courierCode = handoffForm.selectedCourier === 'CUSTOM'
                    ? handoffForm.customCourierId.trim()
                    : handoffForm.selectedCourier.trim();
                if (!courierCode) {
                    Utils.showToast('Thiếu Thông Tin', 'Vui lòng chọn hoặc nhập mã bưu tá nhận đơn', 'warning');
                    return;
                }

                const defaultNote = handoffForm.note
                    || `Bưu cục [${handoffForm.postOfficeCode}] bàn giao bưu gửi cho bưu tá [${courierCode}]`;

                if (handoffForm.bulkMode) {
                    const codes = [...handoffForm.bulkCodes];
                    if (!codes.length) return;
                    isActionRunning.value = true;
                    let success = 0;
                    let failed = 0;
                    try {
                        for (const code of codes) {
                            const item = shipmentsList.value.find(current =>
                                normalizeCode(current.trackingCode).toUpperCase() === String(code).toUpperCase()
                            );
                            if (!item) {
                                failed += 1;
                                continue;
                            }
                            try {
                                await executePhysicalOperation({
                                    cleanCode: code,
                                    targetStatus: 'OUT_FOR_DELIVERY',
                                    locationCode: item.locationCode || handoffForm.postOfficeCode,
                                    targetShipment: item,
                                    note: defaultNote,
                                    courierId: courierCode
                                });
                                success += 1;
                            } catch (err) {
                                console.error('[PostOfficeOpsView] Lỗi bàn giao hàng loạt:', code, err);
                                failed += 1;
                            }
                        }
                        Utils.showToast(
                            failed > 0 ? 'Bàn Giao Một Phần' : 'Bàn Giao Thành Công',
                            `${success}/${codes.length} bưu gửi đã bàn giao cho bưu tá ${courierCode}${failed > 0 ? ` (${failed} kiện lỗi)` : ''}.`,
                            failed > 0 ? 'warning' : 'success'
                        );
                        showHandoffModal.value = false;
                        clearPostOfficeSelection();
                        await loadShipmentsData(true);
                    } finally {
                        isActionRunning.value = false;
                    }
                    return;
                }

                try {
                    await handleUpdateStatus(
                        handoffForm.trackingCode,
                        'OUT_FOR_DELIVERY',
                        handoffForm.postOfficeCode,
                        defaultNote,
                        courierCode
                    );
                    showHandoffModal.value = false;
                } catch (err) {
                    // handleUpdateStatus already shows error toast
                }
            };

            // Quét mã nhanh: tự chọn đúng transition kế tiếp theo trạng thái vật lý.
            const handleQuickScan = (requestedStatus = '') => {
                const cleanCode = normalizeCode(scanInputCode.value);
                if (!cleanCode) {
                    Utils.showToast('Yêu Cầu Nhập Mã', 'Vui lòng quét hoặc nhập mã vận đơn để thực hiện tác nghiệp', 'warning');
                    return;
                }
                const target = scannedItem.value;
                if (!target) {
                    const existsOutsideScope = shipmentsList.value.some(item =>
                        normalizeCode(item.trackingCode).toUpperCase() === cleanCode.toUpperCase()
                    );
                    Utils.showToast(
                        existsOutsideScope && selectedPostOffice.value !== 'ALL'
                            ? 'Sai Phạm Vi Bưu Cục'
                            : 'Không Tìm Thấy',
                        existsOutsideScope && selectedPostOffice.value !== 'ALL'
                            ? `Bưu gửi ${cleanCode} không thuộc bưu cục đang chọn (${selectedPostOffice.value}).`
                            : `Không tìm thấy bưu gửi ${cleanCode}. Hãy làm mới dữ liệu trước khi tác nghiệp.`,
                        'warning'
                    );
                    return;
                }

                // Tự động chuyển sang subtab phù hợp với bưu gửi vừa quét
                if (isInboundShipment(target)) {
                    currentSubtab.value = 'inbound';
                } else if (isOutboundShipment(target)) {
                    currentSubtab.value = 'outbound';
                }

                const action = getNextPostOfficeAction(target);
                const targetStatus = requestedStatus || action.targetStatus;
                if (!targetStatus) {
                    Utils.showToast('Chưa Có Tác Vụ', `${cleanCode}: ${action.label}. Không cần cập nhật trạng thái tại bưu cục.`, 'info');
                    return;
                }
                if (targetStatus === 'OUT_FOR_DELIVERY') {
                    openHandoffModal(target);
                    return;
                }

                const poCode = selectedPostOffice.value !== 'ALL' ? selectedPostOffice.value : 'bưu cục trong dữ liệu vận đơn';
                const note = targetStatus === 'PICKED_UP'
                    ? `Bưu cục [${poCode}] đã tiếp nhận bưu phẩm tại quầy từ người gửi`
                    : targetStatus === 'ARRIVED_DEST_HUB'
                        ? `Bưu cục [${poCode}] đã tiếp nhận bưu phẩm đến từ xe trung chuyển / Kho Tổng`
                        : `Bưu cục [${poCode}] đã xác nhận lưu kho bưu gửi`;
                if (targetStatus === 'STORED') {
                    return handleStoreAtLocation(target.trackingCode, selectedPostOffice.value !== 'ALL' ? selectedPostOffice.value : target.locationCode, note);
                }
                return handleUpdateStatus(target.trackingCode, targetStatus, selectedPostOffice.value !== 'ALL' ? selectedPostOffice.value : null, note);
            };

            const handleBulkPostOfficeOperation = async (operation) => {
                if (isActionRunning.value) return;
                if (isAdmin.value && selectedPostOffice.value === 'ALL') {
                    Utils.showToast('Chỉ Xem Tổng Hợp', 'Hãy chọn một bưu cục cụ thể trước khi xử lý hàng loạt.', 'warning');
                    return;
                }
                const selected = selectedPostOfficeItems.value.filter(item => {
                    const actionKey = getNextPostOfficeAction(item).key;
                    const matchesOperation = operation === 'receive'
                        ? actionKey.startsWith('RECEIVE')
                        : actionKey.startsWith('STORE');
                    return matchesOperation && isShipmentInSelectedPostOfficeScope(item);
                });
                if (!selected.length) {
                    Utils.showToast('Chưa Chọn Kiện', 'Chọn các kiện cùng thao tác nhận hoặc lưu kho trước khi xử lý.', 'warning');
                    return;
                }
                const groups = new Map();
                selected.forEach(item => {
                    const action = getNextPostOfficeAction(item);
                    const targetStatus = action.targetStatus;
                    const operationName = action.key.startsWith('RECEIVE') ? 'receiveAtLocation' : 'storeAtLocation';
                    const locationCode = selectedPostOffice.value;
                    const key = `${operationName}|${locationCode}|${targetStatus}`;
                    if (!groups.has(key)) groups.set(key, { operationName, locationCode, targetStatus, items: [] });
                    groups.get(key).items.push(item);
                });

                isActionRunning.value = true;
                let processed = 0;
                try {
                    for (const group of groups.values()) {
                        const first = group.items[0];
                        const operationId = typeof Utils !== 'undefined' && typeof Utils.createOperationId === 'function'
                            ? Utils.createOperationId(`post-office-${group.operationName}`)
                            : `post-office-${Date.now()}`;
                        const currentStatus = normalizeCode(first.currentStatus || first.status).toUpperCase();
                        const receiveStatus = group.operationName === 'receiveAtLocation'
                            && ['ROUTE_ASSIGNED', 'PENDING_ROUTING'].includes(currentStatus)
                            ? 'PICKED_UP'
                            : currentStatus;
                        const shipmentStatus = ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'CANCELLED', 'RETURNING', 'RETURNED'].includes(receiveStatus)
                            ? receiveStatus
                            : 'PICKED_UP';
                        await callRoutingOperation(
                            group.operationName,
                            normalizeCode(first.trackingCode),
                            group.locationCode,
                            operationId,
                            {
                                trackingCodes: group.items.map(item => normalizeCode(item.trackingCode)),
                                shipmentStatus,
                                note: group.operationName === 'receiveAtLocation'
                                    ? `Bưu cục ${group.locationCode} tiếp nhận hàng loạt`
                                    : `Bưu cục ${group.locationCode} lưu kho hàng loạt`
                            }
                        );
                        processed += group.items.length;
                    }
                    clearPostOfficeSelection();
                    Utils.showToast('Hoàn Tất', `${processed} kiện đã được xử lý tại bưu cục ${selectedPostOffice.value}.`);
                } catch (err) {
                    console.error('[PostOfficeOpsView] Lỗi tác nghiệp hàng loạt:', err);
                    Utils.showToast('Tác Nghiệp Thất Bại', err.message || 'Một nhóm tác nghiệp đã bị từ chối; dữ liệu sẽ được đồng bộ lại.', 'error');
                } finally {
                    await loadShipmentsData(true);
                    isActionRunning.value = false;
                }
            };

            // Mở chi tiết hành trình & bản đồ
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'post-office');
                }
            };

            onMounted(() => {
                syncStationSelection();
                if (!selectedPostOffice.value) {
                    selectedPostOffice.value = stationCode.value || 'ALL';
                }
                loadShipmentsData();
                loadShippers(true);
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
                outboundCount,
                inboundCount,
                allShipmentsCount,
                inventoryCount,
                kpiAwaitingIntake,
                kpiStagedInOffice,
                kpiInTransitOutbound,
                kpiArrivedFromHub,
                kpiOutForDelivery,
                kpiDeliveredInbound,
                inventoryStagedCount,
                inventoryWaitingHandoffCount,
                currentSubtabCount,
                getOriginPostOfficeInfo,
                getDestPostOfficeInfo,
                getInventoryStatus,
                getNextPostOfficeAction,
                scannedItem,
                scannedAction,
                isAtPostOffice,
                isBulkPostOfficeAction,
                isShipmentInSelectedPostOfficeScope,
                selectedTrackingCodes,
                selectablePostOfficeItems,
                selectedPostOfficeItems,
                selectedPostOfficeAction,
                selectedPostOfficeWeight,
                handoffSelectedItems,
                handoffBulkTotals,
                togglePostOfficeSelection,
                toggleAllPostOfficeSelection,
                clearPostOfficeSelection,
                handleBulkPostOfficeOperation,
                loadShipmentsData,
                handleUpdateStatus,
                handleStoreAtLocation,
                handleQuickScan,
                viewTrackingDetail,
                showHandoffModal,
                handoffForm,
                availableCouriers,
                shippersList,
                isShippersLoading,
                loadShippers,
                selectedCourierInfo,
                openHandoffModal,
                openBulkHandoffModal,
                confirmHandoff,
                isOutboundShipment,
                isInboundShipment,
                isInventoryShipment,
                isCodSettlementShipment,
                allOfficeCodShipments,
                codSettlementPendingShipments,
                codSettlementPendingCount,
                codSettledShipments,
                codSettledCount,
                codUnsettledShipments,
                codUnsettledCount,
                totalOfficeCodAmount,
                pendingCodTotalAmount,
                settledCodTotalAmount,
                unsettledCodTotalAmount,
                selectedCodSettlementCodes,
                isAllCodSettlementSelected,
                toggleSelectAllCodSettlement,
                toggleSelectCodSettlement,
                selectedCodSettlementTotalAmount,
                showCodConfirmModal,
                isConfirmingSettlement,
                codTargetTrackingCodes,
                codTargetTrackingTotalAmount,
                openCodConfirmModal,
                openBulkCodConfirmModal,
                openAllPendingCodConfirmModal,
                executeConfirmCodSettlement,
                getCodSettlementVisuals,
                Utils
            };
        },
        template: `
        <div class="space-y-3.5 pb-8 text-slate-800">
            <!-- 1. HERO BANNER: CHUẨN VNPT GRADIENT ĐỒNG BỘ HỆ THỐNG -->
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-sm relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded bg-white/15 text-white text-[10.5px] uppercase font-bold tracking-wider border border-white/20">
                                Bưu Cục Giao Dịch
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Khai Thác &amp; Tiếp Nhận Bưu Gửi Tại Bưu Cục
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Bàn tác nghiệp: Tiếp nhận bưu gửi tại quầy, quản lý xuất xe gom và bàn giao bưu tá phát chặng cuối.
                        </p>
                        <p class="text-[11px] text-blue-100 mt-1.5 font-medium flex items-center space-x-2">
                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span v-if="isAdmin">Phạm vi: Toàn mạng lưới (quản trị viên)</span>
                            <span v-else>Đang làm việc tại: <strong>{{ stationName }}<span v-if="stationCode"> ({{ stationCode }})</span></strong></span>
                        </p>
                    </div>

                    <!-- 4 Khối KPI Tinh Gọn Chuẩn Nghiệp Vụ Bưu Chính -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 self-start sm:self-auto">
                        <div class="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[85px]">
                            <div class="text-base sm:text-lg font-bold leading-tight text-white">{{ kpiAwaitingIntake }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Chấp Nhận</div>
                        </div>
                        <div class="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[85px]">
                            <div class="text-base sm:text-lg font-bold leading-tight text-white">{{ kpiStagedInOffice }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Tồn Chờ Gom Xe</div>
                        </div>
                        <div class="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[85px]">
                            <div class="text-base sm:text-lg font-bold leading-tight text-white">{{ kpiArrivedFromHub }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Giao Bưu Tá</div>
                        </div>
                        <div class="px-3 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[85px]">
                            <div class="text-base sm:text-lg font-bold leading-tight text-white">{{ kpiOutForDelivery }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Phát Tận Nơi</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG TINH GỌN (CHỈ TÊN TAB + SỐ ĐẾM ĐƠN SẮC) -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar pb-px flex-1 min-w-0 mr-3">
                    <button 
                        @click="currentSubtab = 'outbound'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all duration-200 border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer',
                            currentSubtab === 'outbound' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>KHAI THÁC ĐI (CHẤP NHẬN GỬI)</span>
                        <span :class="[currentSubtab === 'outbound' ? 'bg-blue-100 text-blue-700 font-bold scale-105 shadow-xs' : 'bg-slate-100 text-slate-600', 'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-200 inline-block']">
                            {{ outboundCount }}
                        </span>
                    </button>

                    <button 
                        @click="currentSubtab = 'inbound'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all duration-200 border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer',
                            currentSubtab === 'inbound' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>KHAI THÁC ĐẾN &amp; BÀN GIAO PHÁT</span>
                        <span :class="[currentSubtab === 'inbound' ? 'bg-blue-100 text-blue-700 font-bold scale-105 shadow-xs' : 'bg-slate-100 text-slate-600', 'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-200 inline-block']">
                            {{ inboundCount }}
                        </span>
                    </button>

                    <button 
                        @click="currentSubtab = 'inventory'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all duration-200 border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer',
                            currentSubtab === 'inventory' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>KIỂM KÊ TỒN BƯU CỤC</span>
                        <span :class="[currentSubtab === 'inventory' ? 'bg-blue-100 text-blue-700 font-bold scale-105 shadow-xs' : 'bg-slate-100 text-slate-600', 'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-200 inline-block']">
                            {{ inventoryCount }}
                        </span>
                    </button>

                    <button 
                        @click="currentSubtab = 'cod-settlement'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all duration-200 border-b-2 flex items-center space-x-2 whitespace-nowrap cursor-pointer',
                            currentSubtab === 'cod-settlement' 
                                ? 'border-blue-600 text-blue-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUẢN LÝ QUỸ &amp; ĐỐI SOÁT COD</span>
                        <span :class="[currentSubtab === 'cod-settlement' ? 'bg-blue-100 text-blue-700 font-bold scale-105 shadow-xs' : 'bg-slate-100 text-slate-600', 'px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all duration-200 inline-block']">
                            {{ codSettlementPendingCount }}
                        </span>
                    </button>
                </div>

                <button 
                    @click="loadShipmentsData()" 
                    :disabled="isLoading"
                    class="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center space-x-1 border border-slate-200 shadow-xs cursor-pointer"
                >
                    <span v-if="isLoading" class="w-2.5 h-2.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
                    <span>Làm Mới</span>
                </button>
            </div>

            <div
                v-if="isAdmin && selectedPostOffice === 'ALL'"
                class="rounded-xl border border-amber-300 bg-amber-50/90 p-3 text-xs text-amber-900 flex items-start justify-between gap-3 shadow-xs"
            >
                <div class="flex items-start gap-2.5">
                    <span class="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold uppercase text-[10px] shrink-0">Chế độ tổng hợp</span>
                    <div>
                        <strong class="font-bold">Đang xem dữ liệu toàn bộ mạng lưới bưu cục.</strong>
                        <p class="text-amber-800 text-[11px] mt-0.5">Để thực hiện tác nghiệp tiếp nhận tại quầy, lưu kho hoặc bàn giao bưu tá, vui lòng chọn một bưu cục cụ thể từ danh sách.</p>
                    </div>
                </div>
                <span class="font-mono font-bold text-amber-900 shrink-0 bg-amber-200/60 px-2.5 py-1 rounded-md">{{ filteredShipments.length }} bưu gửi</span>
            </div>

            <!-- 3. THANH CÔNG CỤ TẬP TRUNG (TOOLBAR): TÌM KIẾM, BƯU CỤC, PILLS LỌC & SCAN -->
            <div class="b2b-card p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs shadow-xs">
                <div class="flex flex-wrap items-center gap-2.5 flex-1">
                    <!-- Ô Tìm Kiếm -->
                    <div class="relative w-52 sm:w-60">
                        <input 
                            v-model="searchQuery"
                            type="text" 
                            placeholder="Tìm mã vận đơn, người gửi, địa chỉ..."
                            class="w-full pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                        />
                        <span v-if="searchQuery" @click="searchQuery = ''" class="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer font-bold">X</span>
                    </div>

                    <!-- Lựa chọn Bưu Cục Làm Việc -->
                    <select
                        v-model="selectedPostOffice"
                        :disabled="!isAdmin && Boolean(stationCode)"
                        aria-label="Chọn bưu cục làm việc"
                        class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:bg-white focus:border-blue-600 outline-none transition disabled:opacity-80 disabled:cursor-not-allowed max-w-[210px] sm:max-w-xs truncate"
                    >
                        <option value="ALL">Toàn Bộ Mạng Lưới Bưu Cục (ALL)</option>
                        <option v-if="stationCode" :value="stationCode">{{ stationCode }} - {{ stationName }}</option>
                        <optgroup label="Bưu Cục Hà Nội">
                            <option value="POST-HN-CG">POST-HN-CG - Bưu Cục Cầu Giấy</option>
                            <option value="POST-HN-DDA">POST-HN-DDA - Bưu Cục Đống Đa</option>
                            <option value="POST-HN-HBT">POST-HN-HBT - Bưu Cục Hai Bà Trưng</option>
                            <option value="POST-HN-TX">POST-HN-TX - Bưu Cục Thanh Xuân</option>
                            <option value="POST-HN-HD">POST-HN-HD - Bưu Cục Hà Đông</option>
                        </optgroup>
                        <optgroup label="Bưu Cục Đà Nẵng">
                            <option value="POST-DN-HC">POST-DN-HC - Bưu Cục Hải Châu</option>
                            <option value="POST-DN-TK">POST-DN-TK - Bưu Cục Thanh Khê</option>
                            <option value="POST-DN-ST">POST-DN-ST - Bưu Cục Sơn Trà</option>
                        </optgroup>
                        <optgroup label="Bưu Cục TP. Hồ Chí Minh">
                            <option value="POST-HCM-Q1">POST-HCM-Q1 - Bưu Cục Quận 1 (Bến Nghé)</option>
                            <option value="POST-HCM-TB">POST-HCM-TB - Bưu Cục Tân Bình</option>
                            <option value="POST-HCM-BT">POST-HCM-BT - Bưu Cục Bình Thạnh</option>
                            <option value="POST-HCM-TD">POST-HCM-TD - Bưu Cục Thủ Đức</option>
                            <option value="POST-HCM-Q7">POST-HCM-Q7 - Bưu Cục Quận 7</option>
                        </optgroup>
                        <optgroup label="Bưu Cục Hải Phòng">
                            <option value="POST-HP-NQ">POST-HP-NQ - Bưu Cục Ngô Quyền</option>
                            <option value="POST-HP-HB">POST-HP-HB - Bưu Cục Hồng Bàng</option>
                        </optgroup>
                        <optgroup label="Bưu Cục Cần Thơ">
                            <option value="POST-CT-NK">POST-CT-NK - Bưu Cục Ninh Kiều</option>
                            <option value="POST-CT-CR">POST-CT-CR - Bưu Cục Cái Răng</option>
                        </optgroup>
                    </select>

                    <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>

                    <!-- HÀNG NÚT LỌC NHANH (SEGMENTED PILLS) -->
                    <transition name="subtab" mode="out-in">
                        <div v-if="currentSubtab === 'outbound'" key="pills-outbound" class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                                @click="selectedStatusFilter = 'ALL'; currentPage = 1"
                                :class="selectedStatusFilter === 'ALL' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Tất cả ({{ outboundCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'WAITING_INTAKE'; currentPage = 1"
                                :class="selectedStatusFilter === 'WAITING_INTAKE' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Chờ chấp nhận ({{ kpiAwaitingIntake }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'STORED_OFFICE'; currentPage = 1"
                                :class="selectedStatusFilter === 'STORED_OFFICE' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Tồn kho chờ gom xe ({{ kpiStagedInOffice }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'IN_TRANSIT'; currentPage = 1"
                                :class="selectedStatusFilter === 'IN_TRANSIT' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Đang vận chuyển trung chuyển ({{ kpiInTransitOutbound }})
                            </button>
                        </div>

                        <div v-else-if="currentSubtab === 'inbound'" key="pills-inbound" class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                                @click="selectedStatusFilter = 'ALL'; currentPage = 1"
                                :class="selectedStatusFilter === 'ALL' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Tất cả ({{ inboundCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'WAITING_HANDOFF'; currentPage = 1"
                                :class="selectedStatusFilter === 'WAITING_HANDOFF' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Chờ bàn giao bưu tá ({{ kpiArrivedFromHub }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'OUT_FOR_DELIVERY'; currentPage = 1"
                                :class="selectedStatusFilter === 'OUT_FOR_DELIVERY' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Đang phát tận nơi ({{ kpiOutForDelivery }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'DELIVERED'; currentPage = 1"
                                :class="selectedStatusFilter === 'DELIVERED' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Phát thành công ({{ kpiDeliveredInbound }})
                            </button>
                        </div>

                        <div v-else-if="currentSubtab === 'inventory'" key="pills-inventory" class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                                @click="selectedStatusFilter = 'ALL'; currentPage = 1"
                                :class="selectedStatusFilter === 'ALL' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Tất cả tồn kho ({{ inventoryCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'STORED_OFFICE'; currentPage = 1"
                                :class="selectedStatusFilter === 'STORED_OFFICE' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Hàng quầy chờ gom xe ({{ inventoryStagedCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'WAITING_HANDOFF'; currentPage = 1"
                                :class="selectedStatusFilter === 'WAITING_HANDOFF' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Hàng đến chờ bàn giao bưu tá ({{ inventoryWaitingHandoffCount }})
                            </button>
                        </div>

                        <div v-else-if="currentSubtab === 'cod-settlement'" key="pills-cod" class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                            <button 
                                @click="selectedStatusFilter = 'ALL'; currentPage = 1"
                                :class="selectedStatusFilter === 'ALL' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Tất cả COD ({{ allOfficeCodShipments.length }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'PENDING_SETTLEMENT'; currentPage = 1"
                                :class="selectedStatusFilter === 'PENDING_SETTLEMENT' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Chờ duyệt thu quỹ ({{ codSettlementPendingCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'SETTLED'; currentPage = 1"
                                :class="selectedStatusFilter === 'SETTLED' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Đã vào quỹ bưu cục ({{ codSettledCount }})
                            </button>
                            <button 
                                @click="selectedStatusFilter = 'UNSETTLED'; currentPage = 1"
                                :class="selectedStatusFilter === 'UNSETTLED' ? 'bg-white text-blue-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                class="px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer"
                            >
                                Bưu tá chưa nộp ({{ codUnsettledCount }})
                            </button>
                        </div>
                    </transition>

                    <!-- Dropdown Phân Trang (Số dòng trên trang) -->
                    <select 
                        v-model.number="pageSize"
                        class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                    >
                        <option :value="10">10 / trang</option>
                        <option :value="25">25 / trang</option>
                        <option :value="50">50 / trang</option>
                        <option :value="-1">Tất cả</option>
                    </select>
                </div>

                <!-- Ô Quét Mã Vạch Nhanh -->
                <div class="flex items-center gap-2 border-t lg:border-t-0 pt-2 lg:pt-0 border-slate-100">
                    <input
                        v-model="scanInputCode"
                        @keyup.enter="handleQuickScan()"
                        type="text"
                        placeholder="Quét mã vạch / gõ mã..."
                        class="w-48 pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                    />
                    <button
                        @click="handleQuickScan()"
                        :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL') || !scannedItem || !scannedAction.targetStatus"
                        class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs transition shadow-xs disabled:opacity-50 whitespace-nowrap"
                        title="Thực hiện tác vụ kế tiếp hợp lệ của bưu gửi"
                    >
                        <span>{{ scannedAction.targetStatus ? scannedAction.label : 'Quét Xử Lý' }}</span>
                    </button>
                </div>
            </div>

            <!-- =============================================================== -->
            <!-- BẢNG DỮ LIỆU ĐỒNG NHẤT (CỬA GỬI ĐI, CỬA TRẢ PHÁT, TỒN KHO, QUỸ COD) -->
            <!-- =============================================================== -->
            <transition name="subtab" mode="out-in">
                <!-- =============================================================== -->
                <!-- LUỒNG 4: QUẢN LÝ QUỸ & ĐỐI SOÁT COD BƯU CỤC                    -->
                <!-- =============================================================== -->
                <div v-if="currentSubtab === 'cod-settlement'" key="cod-settlement" class="space-y-3.5">
                    <!-- 1. KPI STRIP FOR COD SETTLEMENT -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Tổng COD Cần Quản Lý</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    {{ allOfficeCodShipments.length }} đơn
                                </span>
                            </div>
                            <div class="font-mono text-lg font-bold text-slate-800 mt-1.5">
                                {{ Utils.formatCurrency(totalOfficeCodAmount) }}
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Chờ Bưu Cục Xác Nhận</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center">
                                    <span class="live-pulse-dot mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                    {{ codSettlementPendingCount }} đơn
                                </span>
                            </div>
                            <div class="font-mono text-lg font-bold text-blue-600 mt-1.5">
                                {{ Utils.formatCurrency(pendingCodTotalAmount) }}
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Đã Vào Quỹ Bưu Cục</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {{ codSettledCount }} đơn
                                </span>
                            </div>
                            <div class="font-mono text-lg font-bold text-emerald-600 mt-1.5">
                                {{ Utils.formatCurrency(settledCodTotalAmount) }}
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500 font-medium">Bưu Tá Chưa Nộp</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    {{ codUnsettledCount }} đơn
                                </span>
                            </div>
                            <div class="font-mono text-lg font-bold text-amber-600 mt-1.5">
                                {{ Utils.formatCurrency(unsettledCodTotalAmount) }}
                            </div>
                        </div>
                    </div>

                    <!-- 2. OPERATION ACTION BAR CHO QUẢN LÝ QUỸ COD -->
                    <div class="operation-action-bar p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div class="flex items-center space-x-2 text-xs">
                            <input 
                                type="checkbox" 
                                id="po-select-all-cod"
                                :checked="isAllCodSettlementSelected" 
                                @change="toggleSelectAllCodSettlement"
                                :disabled="codSettlementPendingShipments.length === 0"
                                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40 w-4 h-4"
                            />
                            <label for="po-select-all-cod" class="font-semibold text-slate-700 cursor-pointer select-none">
                                Chọn tất cả chờ duyệt ({{ codSettlementPendingCount }})
                            </label>
                            <span v-if="selectedCodSettlementCodes.length > 0" class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium text-[11px]">
                                Đã chọn: <strong class="font-mono font-bold">{{ selectedCodSettlementCodes.length }}</strong> đơn — <strong class="font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(selectedCodSettlementTotalAmount) }}</strong>
                            </span>
                        </div>

                        <div class="flex items-center space-x-2 w-full sm:w-auto">
                            <button 
                                @click="openBulkCodConfirmModal" 
                                :disabled="selectedCodSettlementCodes.length === 0 || isConfirmingSettlement || (isAdmin && selectedPostOffice === 'ALL')"
                                class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span>Xác Nhận Thu Quỹ Đã Chọn ({{ selectedCodSettlementCodes.length }})</span>
                            </button>
                            <button 
                                @click="openAllPendingCodConfirmModal" 
                                :disabled="codSettlementPendingCount === 0 || isConfirmingSettlement || (isAdmin && selectedPostOffice === 'ALL')"
                                class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5"
                            >
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                <span>Duyệt Thu Toàn Bộ ({{ codSettlementPendingCount }})</span>
                            </button>
                        </div>
                    </div>

                    <!-- 3. BẢNG DỮ LIỆU ĐỐI SOÁT QUỸ COD -->
                    <div class="b2b-card overflow-hidden text-xs shadow-xs">
                        <div v-if="isLoading" class="p-8 text-center text-slate-400">
                            <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <span>Đang tải dữ liệu quỹ COD...</span>
                        </div>

                        <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                            <span>Không có vận đơn COD nào phù hợp với bộ lọc hiện tại.</span>
                        </div>

                        <div v-else class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                        <th class="py-3 px-3.5 w-10 text-center">
                                            <input 
                                                type="checkbox" 
                                                :checked="isAllCodSettlementSelected" 
                                                @change="toggleSelectAllCodSettlement"
                                                :disabled="codSettlementPendingShipments.length === 0"
                                                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                                            />
                                        </th>
                                        <th class="py-3 px-3.5">Mã Vận Đơn</th>
                                        <th class="py-3 px-3.5">Bưu Cục Gửi &amp; Người Gửi</th>
                                        <th class="py-3 px-3.5">Người Nhận &amp; Địa Chỉ</th>
                                        <th class="py-3 px-3.5">Tiền COD Thu Hộ</th>
                                        <th class="py-3 px-3.5 text-center">Tình Trạng Quỹ COD</th>
                                        <th class="py-3 px-3.5 text-right">Tác Nghiệp Bưu Cục</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 font-medium">
                                    <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-3.5 text-center">
                                            <input 
                                                v-if="item.codSettlementStatus === 'PENDING_SETTLEMENT'"
                                                type="checkbox" 
                                                :checked="selectedCodSettlementCodes.includes(item.trackingCode)" 
                                                @change="toggleSelectCodSettlement(item.trackingCode)"
                                                class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span v-else class="text-slate-300 text-xs">—</span>
                                        </td>
                                        <td class="py-3 px-3.5">
                                            <button 
                                                type="button"
                                                @click="viewTrackingDetail(item.trackingCode)"
                                                class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors whitespace-nowrap"
                                                title="Xem chi tiết hành trình & bản đồ"
                                            >
                                                <span>{{ item.trackingCode }}</span>
                                            </button>
                                        </td>
                                        <td class="py-3 px-3.5 text-slate-700">
                                            <div class="font-bold text-slate-800">{{ item.senderName || 'Người gửi' }}</div>
                                            <div class="text-[10.5px] text-slate-400">{{ getOriginPostOfficeInfo(item).name }}</div>
                                        </td>
                                        <td class="py-3 px-3.5 text-slate-700">
                                            <div class="font-bold text-slate-800">{{ item.receiverName || 'Người nhận' }}</div>
                                            <div class="text-[10.5px] text-slate-500 truncate max-w-xs">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                        </td>
                                        <td class="py-3 px-3.5 font-mono font-bold text-emerald-700 text-sm">
                                            {{ Utils.formatCurrency(item.codAmount) }}
                                        </td>
                                        <td class="py-3 px-3.5 text-center whitespace-nowrap">
                                            <span :class="['px-2.5 py-1 rounded-md text-[10.5px] font-bold border inline-flex items-center', getCodSettlementVisuals(item.codSettlementStatus).badgeClass]">
                                                <span v-if="getCodSettlementVisuals(item.codSettlementStatus).isPulse" class="live-pulse-dot mr-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                                {{ getCodSettlementVisuals(item.codSettlementStatus).label }}
                                            </span>
                                            <div v-if="item.codSettledAt" class="text-[10px] text-slate-400 mt-0.5 font-mono">
                                                {{ new Date(item.codSettledAt).toLocaleString('vi-VN') }}
                                            </div>
                                        </td>
                                        <td class="py-3 px-3.5 text-right whitespace-nowrap">
                                            <button 
                                                v-if="item.codSettlementStatus === 'PENDING_SETTLEMENT'"
                                                @click="openCodConfirmModal(item.trackingCode)"
                                                :disabled="isConfirmingSettlement || (isAdmin && selectedPostOffice === 'ALL')"
                                                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition shadow-xs inline-flex items-center space-x-1"
                                                title="Xác nhận đã nhận đủ tiền mặt vào quỹ bưu cục"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                                <span>Xác Nhận Thu Quỹ</span>
                                            </button>
                                            <span v-else-if="item.codSettlementStatus === 'SETTLED'" class="text-emerald-600 text-[11px] font-semibold inline-flex items-center">
                                                <svg class="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                                Đã thu vào quỹ
                                            </span>
                                            <span v-else class="text-amber-600 text-[11px] font-medium">
                                                Bưu tá chưa nộp
                                            </span>
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
                                            ? 'bg-blue-600 text-white border border-blue-600 shadow-xs' 
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

                <!-- CÁC SUBTAB KHAI THÁC HIỆN CÓ (OUTBOUND, INBOUND, INVENTORY) -->
                <div v-else :key="currentSubtab" class="space-y-3">
                
                <!-- BẢNG DANH SÁCH BƯU GỬI TẠI BƯU CỤC -->
                <div v-if="selectedPostOfficeItems.length" class="selection-summary-bar px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                        <strong>{{ selectedPostOfficeItems.length }} kiện đã chọn</strong>
                        <span class="text-slate-500 ml-1">({{ selectedPostOfficeWeight.toFixed(1) }} kg)</span>
                        <span v-if="!selectedPostOfficeAction" class="text-amber-700 ml-2">Chỉ chọn các kiện cùng thao tác.</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button v-if="selectedPostOfficeAction === 'handoff'" type="button" @click="openBulkHandoffModal()" :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')" class="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50 shadow-xs">Bàn giao bưu tá ({{ handoffBulkTotals.count }})</button>
                        <button type="button" @click="handleBulkPostOfficeOperation('receive')" :disabled="isActionRunning || selectedPostOfficeAction !== 'receive' || (isAdmin && selectedPostOffice === 'ALL')" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 shadow-xs">Tiếp nhận</button>
                        <button type="button" @click="handleBulkPostOfficeOperation('store')" :disabled="isActionRunning || selectedPostOfficeAction !== 'store' || (isAdmin && selectedPostOffice === 'ALL')" class="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold transition disabled:opacity-50 shadow-xs">Lưu kho</button>
                        <button type="button" @click="clearPostOfficeSelection" class="px-2.5 py-1 rounded border border-slate-200 bg-white text-slate-600 font-medium">Bỏ chọn</button>
                    </div>
                </div>

                <div class="b2b-card overflow-hidden text-xs shadow-xs">
                    <div v-if="isLoading" class="p-8 text-center text-slate-400">
                        <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <span>Đang tải dữ liệu bưu gửi bưu cục...</span>
                    </div>

                    <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                        <span>Không tìm thấy bưu gửi nào phù hợp với bộ lọc hiện tại.</span>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <th class="py-3 px-3.5 w-10">
                                        <input type="checkbox" :checked="selectablePostOfficeItems.length > 0 && selectablePostOfficeItems.every(item => selectedTrackingCodes.has(String(item.trackingCode || '').trim().toUpperCase()))" @change="toggleAllPostOfficeSelection" :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')" aria-label="Chọn tất cả kiện có thể tác nghiệp" class="rounded text-blue-600" />
                                    </th>
                                    <th class="py-3 px-3.5">Mã Vận Đơn</th>
                                    <th class="py-3 px-3.5">Bưu Cục Gửi</th>
                                    <th class="py-3 px-3.5">Bưu Cục Nhận</th>
                                    <th class="py-3 px-3.5">Khối Lượng</th>
                                    <th class="py-3 px-3.5">Tiền COD</th>
                                    <th class="py-3 px-3.5 whitespace-nowrap w-28">Trạng Thái</th>
                                    <th class="py-3 px-3.5 text-right">Tác Nghiệp</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-slate-50/60 transition">
                                    <td class="py-3 px-3.5 align-top">
                                        <input type="checkbox" :checked="selectedTrackingCodes.has(String(item.trackingCode || '').trim().toUpperCase())" @change="togglePostOfficeSelection(item)" :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL') || !isBulkPostOfficeAction(item) || !isShipmentInSelectedPostOfficeScope(item)" :aria-label="'Chọn ' + item.trackingCode" class="rounded text-blue-600" />
                                    </td>
                                    <td class="py-3 px-3.5">
                                        <button 
                                            type="button"
                                            @click="viewTrackingDetail(item.trackingCode)"
                                            class="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors whitespace-nowrap"
                                            title="Xem chi tiết hành trình & bản đồ"
                                        >
                                            <span>{{ item.trackingCode }}</span>
                                        </button>
                                    </td>
                                    <td class="py-3 px-3.5 text-slate-700">
                                        <div class="font-bold text-slate-800">{{ getOriginPostOfficeInfo(item).name }}</div>
                                        <div class="text-[10.5px] font-mono text-slate-400">{{ getOriginPostOfficeInfo(item).code }}</div>
                                    </td>
                                    <td class="py-3 px-3.5 text-slate-700">
                                        <div class="font-bold text-slate-800">{{ getDestPostOfficeInfo(item).name }}</div>
                                        <div class="text-[10.5px] text-slate-500 truncate max-w-xs">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                    </td>
                                    <td class="py-3 px-3.5 font-mono text-slate-700">
                                        {{ item.weight ? item.weight + ' kg' : '0 kg' }}
                                    </td>
                                    <td class="py-3 px-3.5 font-mono font-bold text-slate-900">
                                        {{ Utils.formatCurrency(item.codAmount) }}
                                    </td>
                                    <td class="py-3 px-3.5 whitespace-nowrap">
                                        <span :class="['px-2 py-0.5 rounded text-[10.5px] font-semibold border inline-flex items-center whitespace-nowrap', Utils.getStatusBadgeClass(item.currentStatus || item.status)]">
                                            {{ Utils.formatStatusText(item.currentStatus || item.status, item.locationCode) }}
                                        </span>
                                    </td>
                                    <td class="py-3 px-3.5 text-right whitespace-nowrap">
                                        <!-- LUỒNG 1: CỬA GỬI ĐI TẠI QUẦY (OUTBOUND) -->
                                        <template v-if="currentSubtab === 'outbound'">
                                            <!-- Đơn mới: Tiếp nhận tại quầy -->
                                            <template v-if="['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'CREATED'].includes(item.currentStatus || item.status)">
                                                <button 
                                                    @click="handleUpdateStatus(item.trackingCode, 'PICKED_UP', getOriginPostOfficeInfo(item).code, 'Bưu cục đã tiếp nhận bưu phẩm tại quầy từ người gửi')"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition shadow-xs"
                                                    :title="'Tiếp nhận vào bưu cục ' + getOriginPostOfficeInfo(item).name"
                                                >
                                                    Chấp Nhận Bưu Gửi
                                                </button>
                                            </template>

                                            <!-- Đã nhận quầy: Lưu kho bưu cục chờ xe gom -->
                                            <template v-else-if="(item.currentStatus || item.status) === 'PICKED_UP' && getInventoryStatus(item) !== 'STORED'">
                                                <button 
                                                    @click="handleStoreAtLocation(item.trackingCode, item.locationCode || selectedPostOffice, 'Bưu cục đã xác nhận lưu kho sau khi tiếp nhận tại quầy')"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold transition shadow-xs disabled:opacity-50"
                                                    title="Xác nhận bưu gửi đã được nhập kho bưu cục"
                                                >
                                                    Nhập Kho Bưu Cục
                                                </button>
                                            </template>

                                            <!-- Đã xong tác vụ (đã lưu kho, đang vận chuyển): Hiển thị dấu gạch mờ, KHÔNG GẮN BADGE LẶP LẠI -->
                                            <template v-else>
                                                <span class="text-slate-400 font-mono text-[11px]">—</span>
                                            </template>
                                        </template>

                                        <!-- LUỒNG 2: CỬA TRẢ HÀNG PHÁT (INBOUND) -->
                                        <template v-else-if="currentSubtab === 'inbound'">
                                            <!-- Hàng đến bưu cục phát: Bàn giao bưu tá -->
                                            <template v-if="(item.currentStatus || item.status) === 'ARRIVED_DEST_HUB'">
                                                <button 
                                                    @click="openHandoffModal(item)"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition shadow-xs disabled:opacity-50 inline-flex items-center gap-1"
                                                    title="Bàn giao bưu gửi cho bưu tá phát chặng cuối"
                                                >
                                                    <span>Bàn Giao Bưu Tá</span>
                                                </button>
                                            </template>

                                            <!-- Phát thất bại: Nút phát lại -->
                                            <template v-else-if="['DELIVERY_FAILED', 'RETURNING', 'RETURNED'].includes(item.currentStatus || item.status)">
                                                <button 
                                                    @click="openHandoffModal(item)"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition shadow-xs"
                                                    title="Bàn giao bưu tá tái phát"
                                                >
                                                    Tái Bàn Giao Phát
                                                </button>
                                            </template>

                                            <!-- Đã xong tác vụ (đang đi phát, đã phát thành công): Hiển thị dấu gạch mờ, KHÔNG GẮN BADGE LẶP LẠI -->
                                            <template v-else>
                                                <span class="text-slate-400 font-mono text-[11px]">—</span>
                                            </template>
                                        </template>

                                        <!-- LUỒNG 3: QUẢN LÝ TỒN KHO BƯU CỤC (INVENTORY) -->
                                        <template v-else-if="currentSubtab === 'inventory'">
                                            <template v-if="['ROUTE_ASSIGNED', 'PENDING_ROUTING', 'CREATED'].includes(item.currentStatus || item.status)">
                                                <button 
                                                    @click="handleUpdateStatus(item.trackingCode, 'PICKED_UP', getOriginPostOfficeInfo(item).code, 'Bưu cục đã tiếp nhận bưu phẩm tại quầy')"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition shadow-xs"
                                                >
                                                    Chấp Nhận Bưu Gửi
                                                </button>
                                            </template>
                                            <template v-else-if="(item.currentStatus || item.status) === 'PICKED_UP' && getInventoryStatus(item) !== 'STORED'">
                                                <button 
                                                    @click="handleStoreAtLocation(item.trackingCode, item.locationCode || selectedPostOffice, 'Bưu cục đã xác nhận lưu kho')"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-semibold transition shadow-xs"
                                                >
                                                    Nhập Kho Bưu Cục
                                                </button>
                                            </template>
                                            <template v-else-if="(item.currentStatus || item.status) === 'ARRIVED_DEST_HUB'">
                                                <button 
                                                    v-if="getInventoryStatus(item) !== 'STORED'"
                                                    @click="handleStoreAtLocation(item.trackingCode, item.locationCode || getDestPostOfficeInfo(item).code, 'Bưu cục phát lưu kho bưu gửi chờ phát (dữ liệu di trú)')"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-[11px] font-medium transition disabled:opacity-50 mr-1 shadow-xs"
                                                    title="Chỉ dùng cho hàng chưa lưu kho (di trú); hàng về theo chuyến đã tự lưu kho"
                                                >
                                                    Nhập Kho
                                                </button>
                                                <button 
                                                    @click="openHandoffModal(item)"
                                                    :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-semibold transition shadow-xs inline-flex items-center gap-1"
                                                    title="Bàn giao bưu gửi cho bưu tá phát chặng cuối"
                                                >
                                                    <span>Bàn Giao Bưu Tá</span>
                                                </button>
                                            </template>
                                            <template v-else>
                                                <span class="text-slate-400 font-mono text-[11px]">—</span>
                                            </template>
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
                                        ? 'bg-blue-600 text-white border border-blue-600 shadow-xs' 
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
            </transition>

            <!-- =============================================================== -->
            <!-- MODAL: BÀN GIAO BƯU PHẨM CHO BƯU TÁ ĐI PHÁT (OUT_FOR_DELIVERY)   -->
            <!-- =============================================================== -->
            <teleport to="body">
                <div v-if="showHandoffModal" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div>
                                <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider">
                                    {{ handoffForm.bulkMode ? 'Lập Bảng Kê Bàn Giao Bưu Tá' : 'Bàn Giao Bưu Gửi Cho Bưu Tá' }}
                                </h3>
                                <p class="text-xs text-slate-500 mt-0.5">
                                    <template v-if="handoffForm.bulkMode">Lô bàn giao: <span class="font-bold text-indigo-600">{{ handoffForm.bulkCodes.length }} bưu gửi</span></template>
                                    <template v-else>Mã bưu gửi: <span class="font-mono font-bold text-blue-600 whitespace-nowrap">{{ handoffForm.trackingCode }}</span></template>
                                </p>
                            </div>
                            <button @click="showHandoffModal = false" class="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition" aria-label="Đóng">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>

                        <div class="py-3 space-y-3">
                            <!-- Thông tin bưu gửi tóm tắt -->
                            <div class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Bưu cục phát:</span>
                                    <span class="font-semibold text-slate-800">{{ handoffForm.postOfficeName }} ({{ handoffForm.postOfficeCode }})</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">Địa chỉ phát:</span>
                                    <span v-if="!handoffForm.bulkMode" class="font-medium text-slate-700 truncate max-w-[220px]" :title="handoffForm.receiverAddress">{{ handoffForm.receiverAddress || 'N/A' }}</span>
                                    <span v-else class="font-medium text-slate-700">{{ handoffForm.bulkCodes.length }} bưu gửi trong lô</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500">{{ handoffForm.bulkMode ? 'Tổng khối lượng / Tổng COD:' : 'Khối lượng / COD:' }}</span>
                                    <span class="font-mono font-bold text-slate-700">
                                        {{ handoffForm.weight ? handoffForm.weight + ' kg' : '0 kg' }} &bull; 
                                        <span class="text-slate-900 font-bold">{{ Utils.formatCurrency(handoffForm.codAmount) }}</span>
                                    </span>
                                </div>
                            </div>

                            <!-- Chọn Bưu Tá -->
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-xs font-bold text-slate-700">
                                        Bưu Tá Tiếp Nhận Phát:
                                    </label>
                                    <button 
                                        type="button"
                                        @click="loadShippers(true)" 
                                        :disabled="isShippersLoading"
                                        class="text-[11px] text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 transition"
                                        title="Làm mới danh sách bưu tá từ máy chủ"
                                    >
                                        <svg :class="['w-3 h-3', isShippersLoading ? 'animate-spin' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                        <span>Làm mới</span>
                                    </button>
                                </div>
                                <select 
                                    v-model="handoffForm.selectedCourier"
                                    class="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-600 outline-none transition"
                                >
                                    <option v-for="c in availableCouriers" :key="c.code" :value="c.code">
                                        {{ c.code }} - {{ c.name }} ({{ c.area }}) {{ c.hasLinkedTelegram ? '• [Telegram Bot]' : '' }}
                                    </option>
                                    <option value="CUSTOM">Khác (Chỉ định mã bưu tá thủ công)...</option>
                                </select>
                            </div>

                            <!-- Hiển thị trạng thái Telegram Bot của Bưu tá đã chọn -->
                            <div v-if="selectedCourierInfo && handoffForm.selectedCourier !== 'CUSTOM'" class="p-2.5 rounded-lg border text-xs" :class="selectedCourierInfo.hasLinkedTelegram ? 'bg-blue-50/70 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600'">
                                <div class="flex items-center justify-between">
                                    <span class="font-semibold">Kênh thông báo Telegram Bot:</span>
                                    <span v-if="selectedCourierInfo.hasLinkedTelegram" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                                        Đã liên kết
                                    </span>
                                    <span v-else class="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-700">
                                        Chưa liên kết bot
                                    </span>
                                </div>
                                <p class="text-[11px] mt-1 text-slate-500" v-if="selectedCourierInfo.hasLinkedTelegram">
                                    Bưu tá sẽ nhận được thông báo điều phối tự động kèm định vị địa chỉ người nhận qua Telegram.
                                </p>
                                <p class="text-[11px] mt-1 text-slate-400" v-else>
                                    Bưu tá chưa kích hoạt Telegram Bot. Bưu tá có thể liên kết tài khoản qua mã liên kết trong trang cá nhân.
                                </p>
                            </div>

                            <!-- Ô nhập mã tùy chọn nếu chọn CUSTOM -->
                            <div v-if="handoffForm.selectedCourier === 'CUSTOM'">
                                <label class="block text-xs font-medium text-slate-600 mb-1">Mã bưu tá / Số điện thoại:</label>
                                <input 
                                    v-model="handoffForm.customCourierId"
                                    type="text" 
                                    placeholder="Ví dụ: SHIPPER_01, 0912345678..."
                                    class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono font-bold text-blue-800 focus:border-blue-600 outline-none"
                                />
                            </div>

                            <!-- Ghi chú bàn giao -->
                            <div>
                                <label class="block text-xs font-medium text-slate-600 mb-1">Ghi chú bàn giao:</label>
                                <input 
                                    v-model="handoffForm.note"
                                    type="text" 
                                    placeholder="Ghi chú tác nghiệp bàn giao..."
                                    class="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-blue-600 outline-none"
                                />
                            </div>
                        </div>

                        <div class="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
                            <button 
                                @click="showHandoffModal = false"
                                class="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Hủy Bỏ
                            </button>
                            <button 
                                @click="confirmHandoff"
                                :disabled="isActionRunning || (isAdmin && selectedPostOffice === 'ALL')"
                                class="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center space-x-1"
                            >
                                <span v-if="isActionRunning">Đang xử lý...</span>
                                <span v-else>{{ handoffForm.bulkMode ? 'Xác Nhận Bàn Giao (' + handoffForm.bulkCodes.length + ')' : 'Xác Nhận Bàn Giao' }}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </teleport>

            <!-- =============================================================== -->
            <!-- MODAL: XÁC NHẬN THU QUỸ TIỀN MẶT COD BƯU CỤC                    -->
            <!-- =============================================================== -->
            <teleport to="body">
                <Transition name="modal">
                    <div v-if="showCodConfirmModal" class="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-5 border border-slate-200 text-xs space-y-4">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div class="flex items-center space-x-2">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    </div>
                                    <div>
                                        <h3 class="font-bold text-sm text-slate-900 uppercase tracking-wider">
                                            Xác Nhận Thu Quỹ COD Bưu Cục
                                        </h3>
                                        <p class="text-[11px] text-slate-500 mt-0.5">Kiểm soát viên / Thủ quỹ ghi nhận tiền mặt vào két</p>
                                    </div>
                                </div>
                                <button @click="showCodConfirmModal = false" class="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition" aria-label="Đóng">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <div class="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600">Số lượng vận đơn:</span>
                                    <span class="font-mono font-bold text-slate-900 text-sm">{{ codTargetTrackingCodes.length }} kiện</span>
                                </div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-600">Tổng tiền mặt thu vào quỹ:</span>
                                    <span class="font-mono font-extrabold text-emerald-700 text-base">{{ Utils.formatCurrency(codTargetTrackingTotalAmount) }}</span>
                                </div>
                                <div class="flex justify-between items-center text-[11px]">
                                    <span class="text-slate-500">Bưu cục thu quỹ:</span>
                                    <span class="font-semibold text-slate-700">{{ stationName }} ({{ stationCode || selectedPostOffice }})</span>
                                </div>
                                <div class="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 leading-relaxed">
                                    ✅ <strong>Xác nhận:</strong> Tôi đã kiểm đếm đầy đủ và thu đúng số tiền mặt trên từ bưu tá để nhập quỹ bưu cục.
                                </div>
                            </div>

                            <div class="flex items-center justify-end space-x-2 border-t border-slate-100 pt-3">
                                <button 
                                    @click="showCodConfirmModal = false" 
                                    :disabled="isConfirmingSettlement"
                                    class="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition"
                                >
                                    Hủy Bỏ
                                </button>
                                <button 
                                    @click="executeConfirmCodSettlement()" 
                                    :disabled="isConfirmingSettlement"
                                    class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm disabled:opacity-50 inline-flex items-center justify-center min-w-[160px]"
                                >
                                    <span>{{ isConfirmingSettlement ? 'Đang Xử Lý...' : 'Xác Nhận Đã Thu Quỹ' }}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </Transition>
            </teleport>
        </div>
        `
    };

    window.PostOfficeOpsView = PostOfficeOpsView;
})();
