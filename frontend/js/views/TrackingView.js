/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRA CỨU BƯU GỬI & THEO DÕI HÀNH TRÌNH (TRACKING VIEW)
 * Phong cách B2B Enterprise Blue, Thanh Tiến Trình Liên Tục & Timeline Thông Minh
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

    const TrackingView = {
        name: 'TrackingView',
        props: {
            trackingCode: {
                type: String,
                default: ''
            },
            previousTab: {
                type: Object,
                default: null
            },
            currentUser: {
                type: Object,
                default: null
            }
        },
        emits: ['back-previous', 'switch-tab'],
        setup(props, { emit }) {
            const previousTab = computed(() => props.previousTab);
            const searchCode = ref(props.trackingCode || '');
            const isLoading = ref(false);

            const currentUser = computed(() => {
                if (props.currentUser !== undefined && props.currentUser !== null) return props.currentUser;
                if (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function') return Auth.getUser();
                return null;
            });
            const isGuest = computed(() => !currentUser.value);

            const publicHeroTab = ref('tracking');
            const isMapExpanded = ref(false);
            const toggleMapExpanded = () => {
                isMapExpanded.value = !isMapExpanded.value;
                if (isMapExpanded.value) {
                    nextTick(() => {
                        if (window.MapManager && typeof window.MapManager.invalidateSize === 'function') {
                            window.MapManager.invalidateSize();
                        }
                    });
                }
            };

            const quickQuote = Vue.reactive({
                senderProvince: 'Hà Nội',
                receiverProvince: 'Hồ Chí Minh',
                weightGram: 500,
                estimatedFee: 28000
            });
            const calculateQuickQuote = () => {
                const isInter = quickQuote.senderProvince !== quickQuote.receiverProvince;
                const base = isInter ? 24000 : 16000;
                const extraWeight = Math.max(0, Math.ceil((quickQuote.weightGram - 500) / 500)) * (isInter ? 4000 : 2500);
                quickQuote.estimatedFee = base + extraWeight;
            };
            watch(() => [quickQuote.senderProvince, quickQuote.receiverProvince, quickQuote.weightGram], () => {
                calculateQuickQuote();
            });

            const fillSampleCode = (code) => {
                searchCode.value = code;
                fetchTrackingData(code);
            };

            const handleResetSearch = () => {
                currentShipment.value = null;
                trackingHistory.value = [];
                routeInfo.value = null;
                searchCode.value = '';
                validationError.value = '';
                isNotFound.value = false;
            };

            const navigateToSupport = () => {
                const code = currentShipment.value?.trackingCode || searchCode.value;
                if (!code) return;
                emit('switch-tab', 'support', code.trim());
            };
            const isLiveTracking = ref(true);
            const isWsConnected = ref(false);

            const validationError = ref('');
            const isNotFound = ref(false);
            const notFoundCode = ref('');

            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const historyExpanded = ref(false);
            const routeInfo = ref(null);
            const lastRenderedCode = ref(null);

            const FINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'RETURNED']);
            const ROUTING_HISTORY_METHODS = [
                'getOperationHistory',
                'getOperationHistoryByTrackingCode',
                'getRoutingOperationHistory',
                'getRouteOperationHistory',
                'getOperationsHistory',
                'getRoutingOperations',
                'getAssignmentHistory',
                'getRoutingHistory',
                'getHistory'
            ];

            let livePollTimer = null;

            const hasValue = (value) => value !== undefined && value !== null && value !== '';
            const firstValue = (...values) => values.find(hasValue);

            const getUtilsApi = () => {
                try {
                    if (typeof Utils !== 'undefined') return Utils;
                } catch (e) {}
                return typeof window !== 'undefined' ? window.Utils : null;
            };

            const callUtils = (methodName, ...args) => {
                const utilsApi = getUtilsApi();
                if (!utilsApi) return undefined;
                if (typeof utilsApi.then === 'function') {
                    return Promise.resolve(utilsApi).then(api => {
                        if (!api || typeof api[methodName] !== 'function') return undefined;
                        return api[methodName](...args);
                    }).catch(() => undefined);
                }
                if (typeof utilsApi[methodName] !== 'function') return undefined;
                try {
                    const result = utilsApi[methodName](...args);
                    // Utility wrappers may be async; callers that render synchronously use their fallback.
                    if (result && typeof result.catch === 'function') result.catch(() => {});
                    return result;
                } catch (e) {
                    return undefined;
                }
            };

            let stompClient = null;
            let currentSubscription = null;
            let activeWsTrackingCode = null;

            const getWsEndpoint = () => {
                const host = window.location.hostname || 'localhost';
                const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
                if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL.startsWith('http')) {
                    return `${API_BASE_URL}/api/notifications/ws`;
                }
                const port = window.location.port;
                if (!port || port === '80' || port === '443') {
                    return `${protocol}//${host}/api/notifications/ws`;
                }
                return `${protocol}//${host}:8080/api/notifications/ws`;
            };

            const disconnectWebSocket = () => {
                if (currentSubscription) {
                    try {
                        currentSubscription.unsubscribe();
                    } catch (e) {}
                    currentSubscription = null;
                }
                if (stompClient) {
                    try {
                        if (stompClient.connected) {
                            stompClient.disconnect();
                        }
                    } catch (e) {}
                    stompClient = null;
                }
                activeWsTrackingCode = null;
                isWsConnected.value = false;
            };

            const subscribeTrackingTopic = (code) => {
                if (!stompClient || !stompClient.connected) return;
                activeWsTrackingCode = code;
                currentSubscription = stompClient.subscribe(`/topic/tracking/${code}`, (message) => {
                    try {
                        const eventData = JSON.parse(message.body);
                        console.log('[WebSocket Realtime] Nhận cập nhật trạng thái đơn:', code, eventData);

                        // Đồng bộ lại dữ liệu chi tiết ngầm ngay lập tức
                        syncStatusInBackground();

                        const statusText = Utils ? Utils.formatStatusText(eventData.status, eventData.locationCode) : eventData.status;
                        showToast('Cập Nhật Thời Gian Thực (WebSocket)', `Đơn ${code}: ${statusText}`, 'info');
                    } catch (e) {
                        console.error('[WebSocket] Lỗi xử lý dữ liệu realtime:', e);
                    }
                });
                console.log('[WebSocket] Đã kết nối thành công! Đang lắng nghe đơn:', code);
            };

            const connectWebSocket = (trackingCode) => {
                if (!trackingCode) return;
                const cleanCode = trackingCode.trim().toUpperCase();

                // Nếu đang kết nối đúng mã đơn này thì không cần kết nối lại
                if (stompClient && stompClient.connected && activeWsTrackingCode === cleanCode) {
                    return;
                }

                // Nếu đã kết nối client nhưng đổi mã đơn khác, chỉ cần chuyển subscription
                if (stompClient && stompClient.connected) {
                    if (currentSubscription) {
                        currentSubscription.unsubscribe();
                        currentSubscription = null;
                    }
                    subscribeTrackingTopic(cleanCode);
                    return;
                }

                disconnectWebSocket();

                try {
                    if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
                        console.warn('[WebSocket] Thư viện SockJS hoặc Stomp chưa được tải, sử dụng polling dự phòng.');
                        return;
                    }

                    const endpoint = getWsEndpoint();
                    const socket = new SockJS(endpoint);
                    stompClient = Stomp.over(socket);
                    stompClient.debug = null; // Tắt log debug console rườm rà

                    stompClient.connect({}, () => {
                        isWsConnected.value = true;
                        subscribeTrackingTopic(cleanCode);
                    }, (error) => {
                        console.warn('[WebSocket] Không thể kết nối tới server, fallback sang polling:', error);
                        isWsConnected.value = false;
                        // Nếu WebSocket mất kết nối, tự động kích hoạt Polling dự phòng
                        if (!livePollTimer && isLiveTracking.value && !isFinalState.value) {
                            startLivePolling();
                        }
                    });
                } catch (err) {
                    console.warn('[WebSocket] Lỗi khởi tạo SockJS:', err);
                    isWsConnected.value = false;
                }
            };




            const showToast = (...args) => callUtils('showToast', ...args);

            const unwrapHistoryPayload = (payload, depth = 0) => {
                if (Array.isArray(payload)) return payload;
                if (!payload || typeof payload !== 'object' || depth > 3) return [];

                const collectionKeys = ['history', 'operationHistory', 'operations', 'events', 'items', 'records', 'content', 'data', 'result'];
                for (const key of collectionKeys) {
                    if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
                    const nested = payload[key];
                    if (Array.isArray(nested)) return nested;
                    const unwrapped = unwrapHistoryPayload(nested, depth + 1);
                    if (unwrapped.length > 0) return unwrapped;
                }

                const looksLikeHistoryItem = [
                    'eventId', 'operationId', 'status', 'currentStatus', 'occurredAt',
                    'timestamp', 'assignedAt', 'operationType', 'note', 'node'
                ].some(key => Object.prototype.hasOwnProperty.call(payload, key));
                return looksLikeHistoryItem ? [payload] : [];
            };

            const inferStatusFromOperationType = (opType, locationCode) => {
                if (!opType) return null;
                const normalized = String(opType).trim().toUpperCase();
                switch (normalized) {
                    case 'SHIPMENT_CREATED':
                        return 'CREATED';
                    case 'ROUTE_ASSIGNED':
                        return 'ROUTE_ASSIGNED';
                    case 'RECEIVED_AT_POST_OFFICE':
                    case 'RECEIVE':
                        return 'PICKED_UP';
                    case 'STORED':
                        return 'STORED';
                    case 'STORED_AT_HUB':
                    case 'RESERVED_FOR_TRIP':
                    case 'LOADED':
                    case 'DEPARTED':
                    case 'ARRIVED':
                    case 'ARRIVE':
                        return 'IN_TRANSIT';
                    case 'UNLOADED':
                        return 'ARRIVED_DEST_HUB';
                    case 'HANDED_TO_COURIER':
                        return 'OUT_FOR_DELIVERY';
                    case 'DELIVERED':
                        return 'DELIVERED';
                    case 'DELIVERY_FAILED':
                        return 'DELIVERY_FAILED';
                    case 'RETURNING':
                        return 'RETURNING';
                    case 'RETURNED':
                        return 'RETURNED';
                    case 'CANCELLED':
                        return 'CANCELLED';
                    default:
                        return null;
                }
            };

            const normalizeHistoryItem = (item, source) => {
                if (!item || typeof item !== 'object') return null;

                const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
                const operation = item.operation && typeof item.operation === 'object' ? item.operation : {};
                const actor = item.actor && typeof item.actor === 'object' ? item.actor : {};
                const eventId = firstValue(item.eventId, item.eventID, item.event_id, metadata.eventId, operation.eventId);
                const operationId = firstValue(
                    item.operationId,
                    item.operationID,
                    item.operation_id,
                    metadata.operationId,
                    operation.operationId,
                    source === 'routing' ? item.id : undefined
                );
                const operationType = firstValue(
                    item.operationType,
                    item.operation_type,
                    item.type,
                    metadata.operationType,
                    operation.operationType,
                    operation.type
                );
                const transportLeg = firstValue(
                    item.transportLeg,
                    item.transport_leg,
                    item.leg,
                    metadata.transportLeg,
                    operation.transportLeg,
                    operation.leg
                );
                const tripCode = firstValue(
                    item.tripCode,
                    item.trip_code,
                    item.trip,
                    metadata.tripCode,
                    operation.tripCode,
                    operation.trip
                );
                const actorId = firstValue(
                    item.actorId,
                    item.actorID,
                    item.actor_id,
                    metadata.actorId,
                    operation.actorId,
                    actor.actorId,
                    actor.id,
                    actor.userId
                );
                const location = firstValue(
                    item.location,
                    item.locationCode,
                    item.hubCode,
                    item.sourceHub,
                    metadata.location,
                    metadata.locationCode,
                    operation.location,
                    operation.locationCode
                );
                const note = firstValue(
                    item.note,
                    item.node,
                    item.description,
                    item.message,
                    metadata.note,
                    operation.note,
                    operation.description
                );
                const status = firstValue(
                    item.status,
                    item.currentStatus,
                    item.eventStatus,
                    item.operationStatus,
                    metadata.status,
                    operation.status,
                    inferStatusFromOperationType(operationType, location)
                );
                const timestamp = firstValue(
                    item.timestamp,
                    item.occurredAt,
                    item.operationAt,
                    item.eventTime,
                    item.createdAt,
                    item.updatedAt,
                    item.assignedAt,
                    metadata.timestamp,
                    operation.timestamp
                );

                return {
                    ...item,
                    eventId: eventId ?? null,
                    operationId: operationId ?? null,
                    operationType: operationType ?? null,
                    transportLeg: transportLeg ?? null,
                    tripCode: tripCode ?? null,
                    actorId: actorId ?? null,
                    location: location ?? null,
                    note: note ?? null,
                    status: status ?? null,
                    timestamp: timestamp ?? null,
                    // Keep existing backend names available to the map and legacy template paths.
                    locationCode: hasValue(item.locationCode) ? item.locationCode : (location ?? null),
                    node: hasValue(item.node) ? item.node : (note ?? null),
                    occurredAt: hasValue(item.occurredAt) ? item.occurredAt : (timestamp ?? null),
                    historySource: source
                };
            };

            const historyValue = (item, key) => {
                if (!item) return null;
                if (hasValue(item[key])) return item[key];
                if (key === 'location') return firstValue(item.location, item.locationCode);
                if (key === 'note') return firstValue(item.note, item.node);
                return null;
            };

            const getHistoryKeys = (item) => {
                const keys = [];
                if (hasValue(item.eventId)) {
                    keys.push(`event:${String(item.eventId)}`);
                    keys.push(`id:${String(item.eventId)}`);
                }
                if (hasValue(item.operationId)) {
                    keys.push(`operation:${String(item.operationId)}`);
                    keys.push(`id:${String(item.operationId)}`);
                }

                // Older records may not have either identifier. Only dedupe exact, content-identical records.
                if (keys.length === 0) {
                    const fallbackParts = [
                        item.timestamp,
                        item.status,
                        historyValue(item, 'location'),
                        historyValue(item, 'note'),
                        item.operationType,
                        item.transportLeg,
                        item.tripCode,
                        item.actorId
                    ];
                    if (fallbackParts.some(hasValue)) {
                        keys.push(`content:${fallbackParts.map(value => String(value ?? '')).join('|')}`);
                    }
                }
                return keys;
            };

            const mergeHistoryItems = (existing, incoming) => {
                const merged = { ...existing };
                Object.keys(incoming).forEach(key => {
                    if (!hasValue(merged[key]) && hasValue(incoming[key])) {
                        merged[key] = incoming[key];
                    }
                });
                if (hasValue(existing.historySource) && hasValue(incoming.historySource) && existing.historySource !== incoming.historySource) {
                    merged.historySource = `${existing.historySource},${incoming.historySource}`;
                }
                return merged;
            };

            const mergeHistory = (lifecycleHistory, routingHistory) => {
                const merged = [];
                const indexByKey = new Map();

                const addHistory = (rawItem, source) => {
                    const item = normalizeHistoryItem(rawItem, source);
                    if (!item) return;

                    const keys = getHistoryKeys(item);
                    const existingIndex = keys.map(key => indexByKey.get(key)).find(index => index !== undefined);
                    if (existingIndex !== undefined) {
                        merged[existingIndex] = mergeHistoryItems(merged[existingIndex], item);
                    } else {
                        merged.push(item);
                    }

                    const itemIndex = existingIndex !== undefined ? existingIndex : merged.length - 1;
                    keys.forEach(key => indexByKey.set(key, itemIndex));
                };

                unwrapHistoryPayload(lifecycleHistory).forEach(item => addHistory(item, 'tracking'));
                unwrapHistoryPayload(routingHistory).forEach(item => addHistory(item, 'routing'));
                return merged;
            };

            const loadRoutingOperationHistory = async (code) => {
                let routingService;
                try {
                    routingService = typeof RoutingService !== 'undefined'
                        ? RoutingService
                        : (typeof window !== 'undefined' ? window.RoutingService : null);
                    if (routingService && typeof routingService.then === 'function') {
                        routingService = await routingService;
                    }
                } catch (e) {
                    return [];
                }
                if (!routingService) return [];

                const methodName = ROUTING_HISTORY_METHODS.find(name => typeof routingService[name] === 'function');
                if (!methodName) return [];

                try {
                    const result = await Promise.resolve(routingService[methodName](code));
                    return unwrapHistoryPayload(result);
                } catch (e) {
                    // Routing history is optional; tracking remains usable when that wrapper/endpoint is absent.
                    return [];
                }
            };

            const loadRoutingAssignment = async (code) => {
                let routingService;
                try {
                    routingService = typeof RoutingService !== 'undefined'
                        ? RoutingService
                        : (typeof window !== 'undefined' ? window.RoutingService : null);
                    if (routingService && typeof routingService.then === 'function') {
                        routingService = await routingService;
                    }
                    if (routingService && typeof routingService.getAssignment === 'function') {
                        return await routingService.getAssignment(code);
                    }
                } catch (e) {
                    return null;
                }
                return null;
            };

            const safeFormatHistoryNote = (historyItem) => {
                const fallback = firstValue(historyItem?.note, historyItem?.node, historyItem?.status, '');
                const nodeText = firstValue(historyItem?.node, historyItem?.note);
                // Preserve the existing node formatter for tracking records while showing an explicit operation note verbatim.
                if (hasValue(historyItem?.note) && historyItem.note !== historyItem.node) return historyItem.note;
                const result = callUtils('formatNodeText', nodeText, historyItem?.status);
                return result && typeof result.then !== 'function' && hasValue(result) ? result : fallback;
            };

            // ------------------------------------------------------------------
            // Gộp mốc lịch sử: mỗi thao tác vật lý thường sinh 2-3 bản ghi
            // (lifecycle + legacy-status, đôi khi + routing operation) nên UI bị lặp.
            // ------------------------------------------------------------------
            const HISTORY_MERGE_WINDOW_MS = 5000;

            const toHistoryMillis = (item) => {
                const raw = item?.occurredAt || item?.timestamp || item?.createdAt;
                const time = raw ? new Date(raw).getTime() : NaN;
                return Number.isFinite(time) ? time : 0;
            };

            const normalizeHistoryNote = (value) => String(value ?? '')
                .replace(/\s+/g, ' ')
                .trim()
                .toLowerCase();

            const isLegacyHistoryRecord = (item) => String(item?.eventId || '').startsWith('legacy-status:');
            const isRichHistoryRecord = (item) => !isLegacyHistoryRecord(item)
                && Boolean(item?.operationType || item?.tripCode || item?.operationId);

            const getOperationStepLabel = (item) => {
                const type = String(item?.operationType || '').trim().toUpperCase();
                const labels = {
                    RECEIVED_AT_POST_OFFICE: 'Tiếp nhận tại quầy',
                    RECEIVE: 'Tiếp nhận tại kho',
                    ARRIVED: 'Cập bến trạm',
                    STORED: 'Lưu kho bưu cục',
                    STORED_AT_HUB: 'Lưu kho kho tổng',
                    RESERVED_FOR_TRIP: 'Giữ chỗ lên chuyến',
                    DEPARTED: 'Xuất bến',
                    ARRIVE: 'Cập bến trạm',
                    UNLOADED: 'Dỡ hàng',
                    HANDED_TO_COURIER: 'Bàn giao bưu tá'
                };
                if (labels[type]) return labels[type];
                if (!type) return '';
                return type;
            };

            const buildHistoryMilestone = (group) => {
                const primary = group.find(isRichHistoryRecord)
                    || group.reduce((newest, item) => (toHistoryMillis(item) > toHistoryMillis(newest) ? item : newest), group[0]);
                const timestamps = group.map(toHistoryMillis).filter(Boolean);
                const stepLabels = group
                    .filter(item => Boolean(String(item?.operationType || '').trim()))
                    .map(item => getOperationStepLabel(item))
                    .filter(Boolean);
                const subSteps = [...new Set(stepLabels)].reverse();
                const rawTimestamp = timestamps.length
                    ? new Date(Math.max(...timestamps)).toISOString()
                    : primary.timestamp;
                const bestStatus = firstValue(
                    primary?.status,
                    group.find(item => hasValue(item?.status))?.status,
                    inferStatusFromOperationType(primary?.operationType, primary?.location || primary?.locationCode)
                );
                return {
                    ...primary,
                    status: bestStatus ?? null,
                    timestamp: rawTimestamp,
                    occurredAt: rawTimestamp,
                    mergedCount: group.length,
                    subSteps: subSteps.length > 1 ? subSteps : []
                };
            };

            const collapseHistoryMilestones = (list) => {
                if (!Array.isArray(list) || list.length === 0) return [];
                const items = [...list].sort((a, b) =>
                    toHistoryMillis(b) - toHistoryMillis(a)
                    || (Number(b?.id) || 0) - (Number(a?.id) || 0)
                );
                const used = new Set();
                const milestones = [];

                for (let i = 0; i < items.length; i += 1) {
                    if (used.has(i)) continue;
                    const base = items[i];
                    used.add(i);
                    const group = [base];
                    const baseTime = toHistoryMillis(base);
                    const baseNote = normalizeHistoryNote(base.note);
                    const baseLocation = historyValue(base, 'location');
                    const groupHasType = (type) => group.some(item =>
                        String(item?.operationType || '').trim().toUpperCase() === type
                    );

                    for (let j = i + 1; j < items.length; j += 1) {
                        if (used.has(j)) continue;
                        const candidate = items[j];
                        const candidateTripCode = candidate?.tripCode;
                        // Legacy record có thể không mang tripCode, nên so khớp theo cả nhóm.
                        const sameTrip = hasValue(candidateTripCode) && group.some(item =>
                            hasValue(item?.tripCode) && item.tripCode === candidateTripCode
                        );
                        const candidateType = String(candidate?.operationType || '').trim().toUpperCase();
                        const reserveDepartPair = sameTrip
                            && ((groupHasType('DEPARTED') && candidateType === 'RESERVED_FOR_TRIP')
                                || (groupHasType('RESERVED_FOR_TRIP') && candidateType === 'DEPARTED'));
                        if (reserveDepartPair) {
                            group.push(candidate);
                            used.add(j);
                            continue;
                        }

                        const withinWindow = (baseTime - toHistoryMillis(candidate)) <= HISTORY_MERGE_WINDOW_MS;
                        const candidateLocation = historyValue(candidate, 'location');
                        // Một số bản ghi legacy cũ thiếu locationCode; chỉ so khớp khi cả hai đều có.
                        const sameLocation = !baseLocation || !candidateLocation || candidateLocation === baseLocation;
                        const sameNote = baseNote !== '' && normalizeHistoryNote(candidate.note) === baseNote;
                        if (withinWindow && sameLocation && sameNote) {
                            group.push(candidate);
                            used.add(j);
                        }
                    }

                    milestones.push(buildHistoryMilestone(group));
                }
                return milestones;
            };

            const safeFormatStatusText = (status) => {
                const result = callUtils('formatStatusText', status);
                return result && typeof result.then !== 'function' && hasValue(result) ? result : (status || 'N/A');
            };

            // Hub nguồn & Hub phát đích
            const currentSourceHub = computed(() => {
                return routeInfo.value?.sourceHub || currentShipment.value?.originHub || 'HUB-HN-01';
            });

            const currentDestHub = computed(() => {
                return routeInfo.value?.destHub || currentShipment.value?.destinationHub || 'HUB-HCM-01';
            });

            // Bưu cục tiếp nhận & Bưu cục phát địa phương (Hub Cấp 2/3)
            const currentOriginPostOffice = computed(() => {
                return routeInfo.value?.originPostOffice || currentShipment.value?.originPostOffice || 'POST-HN-CG';
            });

            const currentDestPostOffice = computed(() => {
                return routeInfo.value?.destPostOffice || currentShipment.value?.destPostOffice || 'POST-HCM-Q1';
            });

            const getPostOfficeDisplayName = (code) => {
                const mapH = window.MapManager?.hubCoordinates;
                if (mapH && mapH[code]?.name) return mapH[code].name;
                return code;
            };

            const getStationAddress = (code) => {
                if (!code) return '';
                const mapH = window.MapManager?.hubCoordinates;
                if (mapH && mapH[code]?.address) return mapH[code].address;
                return '';
            };

            // Kiểm tra tuyến liên tỉnh hay nội tỉnh
            const isInterProvincial = computed(() => {
                const src = currentSourceHub.value;
                const dst = currentDestHub.value;
                return !!(src && dst && src !== dst);
            });

            // Địa chỉ rút gọn của người nhận hiển thị trên stepper
            const recipientShortAddress = computed(() => {
                const addr = currentShipment.value?.receiverAddress;
                if (!addr) return 'Người Nhận';
                const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    return parts.slice(-2).join(', ');
                }
                return addr;
            });

            const recipientFullAddress = computed(() => {
                return currentShipment.value?.receiverAddress || 'Địa chỉ phát hàng tận tay người nhận';
            });

            // Danh sách các mốc hành trình động (6 mốc liên tỉnh hoặc 4 mốc nội tỉnh)
            const appendReturnStage = (stages) => {
                const status = currentShipment.value?.status;
                if (status !== 'RETURNING' && status !== 'RETURNED') return stages;
                const senderAddress = currentShipment.value?.senderAddress || 'Địa chỉ người gửi';
                return [...stages, {
                    key: 'return-sender',
                    stageName: `${stages.length + 1}. Chuyển Hoàn`,
                    roleLabel: 'Người Gửi',
                    subLabel: status === 'RETURNED' ? 'Đã Hoàn Về Người Gửi' : 'Đang Chuyển Hoàn',
                    code: 'NGƯỜI GỬI',
                    displayName: senderAddress,
                    address: senderAddress
                }];
            };

            const routeCheckpoints = computed(() => {
                const inter = isInterProvincial.value;
                const stages = inter ? [
                        {
                            key: 'origin-po',
                            stageName: '1. Tiếp Nhận',
                            roleLabel: 'Bưu Cục Tiếp Nhận',
                            subLabel: 'Tiếp Nhận Tại Quầy',
                            code: currentOriginPostOffice.value,
                            displayName: getPostOfficeDisplayName(currentOriginPostOffice.value),
                            address: getStationAddress(currentOriginPostOffice.value)
                        },
                        {
                            key: 'source-hub',
                            stageName: '2. Gom Kho Tổng',
                            roleLabel: 'Kho Tổng Xuất Phát',
                            subLabel: 'Gom Hàng Về Kho',
                            code: currentSourceHub.value,
                            displayName: getPostOfficeDisplayName(currentSourceHub.value),
                            address: getStationAddress(currentSourceHub.value)
                        },
                        {
                            key: 'linehaul',
                            stageName: '3. Tuyến Trục',
                            roleLabel: 'Xe Trục Tuyến',
                            subLabel: 'Vận Chuyển Trục Bắc - Nam',
                            code: 'QL1A/CT01',
                            displayName: 'Xe Tải Trục Bắc - Nam',
                            address: 'Hành lang vận tải đường bộ Bắc - Nam (Quốc lộ 1A & Cao tốc CT01)'
                        },
                        {
                            key: 'dest-hub',
                            stageName: '4. Kho Đích',
                            roleLabel: 'Kho Tổng Đích',
                            subLabel: 'Khai Thác Đến',
                            code: currentDestHub.value,
                            displayName: getPostOfficeDisplayName(currentDestHub.value),
                            address: getStationAddress(currentDestHub.value)
                        },
                        {
                            key: 'dest-po',
                            stageName: '5. Bưu Cục Phát',
                            roleLabel: 'Bưu Cục Phát',
                            subLabel: 'Chia Chọn Quận/Huyện',
                            code: currentDestPostOffice.value,
                            displayName: getPostOfficeDisplayName(currentDestPostOffice.value),
                            address: getStationAddress(currentDestPostOffice.value)
                        },
                        {
                            key: 'recipient',
                            stageName: '6. Phát Thành Công',
                            roleLabel: 'Người Nhận',
                            subLabel: 'Giao Tận Tay',
                            code: 'NGƯỜI NHẬN',
                            displayName: recipientShortAddress.value,
                            address: recipientFullAddress.value
                        }
                    ] : [
                        {
                            key: 'origin-po',
                            stageName: '1. Tiếp Nhận',
                            roleLabel: 'Bưu Cục Tiếp Nhận',
                            subLabel: 'Tiếp Nhận Tại Quầy',
                            code: currentOriginPostOffice.value,
                            displayName: getPostOfficeDisplayName(currentOriginPostOffice.value),
                            address: getStationAddress(currentOriginPostOffice.value)
                        },
                        {
                            key: 'source-hub',
                            stageName: '2. Kho Trung Tâm',
                            roleLabel: 'Kho Tổng Vùng',
                            subLabel: 'Phân Loại Nội Tỉnh',
                            code: currentSourceHub.value,
                            displayName: getPostOfficeDisplayName(currentSourceHub.value),
                            address: getStationAddress(currentSourceHub.value)
                        },
                        {
                            key: 'dest-po',
                            stageName: '3. Bưu Cục Phát',
                            roleLabel: 'Bưu Cục Phát',
                            subLabel: 'Chia Chọn Quận/Huyện',
                            code: currentDestPostOffice.value,
                            displayName: getPostOfficeDisplayName(currentDestPostOffice.value),
                            address: getStationAddress(currentDestPostOffice.value)
                        },
                        {
                            key: 'recipient',
                            stageName: '4. Phát Thành Công',
                            roleLabel: 'Người Nhận',
                            subLabel: 'Giao Tận Tay',
                            code: 'NGƯỜI NHẬN',
                            displayName: recipientShortAddress.value,
                            address: recipientFullAddress.value
                        }
                    ];
                return appendReturnStage(stages);
            });

            // Chỉ số mốc đang tác nghiệp (0-indexed)
            const currentCheckpointIndex = computed(() => {
                const s = currentShipment.value?.status;
                const inter = isInterProvincial.value;
                if (s === 'RETURNING' || s === 'RETURNED') {
                    return Math.max(0, routeCheckpoints.value.length - 1);
                }

                if (inter) {
                    if (!s || s === 'CREATED' || s === 'PENDING_ROUTING' || s === 'ROUTE_ASSIGNED') return 0;
                    if (s === 'PICKED_UP') return 1;
                    if (s === 'IN_TRANSIT') return 2;
                    if (s === 'ARRIVED_DEST_HUB') return 3;
                    if (s === 'OUT_FOR_DELIVERY' || s === 'DELIVERY_FAILED') return 4;
                    if (s === 'DELIVERED') return 5;
                    return 0;
                } else {
                    if (!s || s === 'CREATED' || s === 'PENDING_ROUTING' || s === 'ROUTE_ASSIGNED') return 0;
                    if (s === 'PICKED_UP') return 1;
                    if (s === 'IN_TRANSIT' || s === 'ARRIVED_DEST_HUB') return 1;
                    if (s === 'OUT_FOR_DELIVERY' || s === 'DELIVERY_FAILED') return 2;
                    if (s === 'DELIVERED') return 3;
                    return 0;
                }
            });

            // Tương thích ngược với currentStageIndex
            const currentStageIndex = computed(() => currentCheckpointIndex.value + 1);

            // Xác định loại huy hiệu hiển thị tại mốc hiện tại
            const activePinType = computed(() => {
                const s = currentShipment.value?.status;
                if (s === 'DELIVERED') return 'success';
                if (s === 'OUT_FOR_DELIVERY') return 'shipper';
                return 'truck';
            });

            // Tỷ lệ thanh tiến trình
            const stageProgress = computed(() => {
                const total = routeCheckpoints.value.length;
                if (total <= 1) return { width: '0%', left: '0%' };
                const idx = currentCheckpointIndex.value;
                const ratio = idx / (total - 1);
                const pct = Math.round(ratio * 100);
                return {
                    width: `${pct}%`,
                    left: `calc(18px + (100% - 36px) * ${ratio})`
                };
            });

            const STATUS_CHRONO_WEIGHT = {
                'CREATED': 1,
                'PENDING_ROUTING': 2,
                'ROUTE_ASSIGNED': 3,
                'PICKED_UP': 4,
                'STORED': 4.5,
                'IN_TRANSIT': 5,
                'ARRIVED_DEST_HUB': 6,
                'OUT_FOR_DELIVERY': 7,
                'DELIVERY_FAILED': 8,
                'DELIVERED': 9,
                'RETURNING': 10,
                'RETURNED': 11,
                'CANCELLED': 12
            };

            // Sắp xếp lịch sử luân chuyển: Mới nhất luôn đưa lên đầu (Newest First)
            const sortedHistory = computed(() => {
                if (!trackingHistory.value || trackingHistory.value.length === 0) return [];

                const list = [...trackingHistory.value];

                // Chỉ sắp xếp các mốc server trả về; không tự tạo mốc lịch sử còn thiếu.
                const sortedList = list.sort((a, b) => {
                    const rawA = a.occurredAt || a.timestamp || a.createdAt;
                    const rawB = b.occurredAt || b.timestamp || b.createdAt;
                    const timeA = rawA ? new Date(rawA).getTime() : 0;
                    const timeB = rawB ? new Date(rawB).getTime() : 0;

                    // 1. So sánh thời gian chính xác (Mới nhất trước)
                    if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB)) {
                        return timeB - timeA;
                    }

                    // 2. Nếu thời gian bằng nhau hoặc cùng giây, so sánh thứ tự id giảm dần
                    const idA = typeof a.id === 'number' ? a.id : 0;
                    const idB = typeof b.id === 'number' ? b.id : 0;
                    if (idA !== idB && idA > 0 && idB > 0) {
                        return idB - idA;
                    }

                    // 3. Nếu không có id hoặc id bằng nhau, so sánh theo trọng số vòng đời trạng thái
                    const weightA = STATUS_CHRONO_WEIGHT[a.status] || 0;
                    const weightB = STATUS_CHRONO_WEIGHT[b.status] || 0;
                    if (weightA !== weightB) {
                        return weightB - weightA;
                    }

                    return 0;
                });

                return collapseHistoryMilestones(sortedList);
            });

            // Số mốc trùng đã gộp để hiển thị nhắc nhỏ trên tiêu đề.
            const mergedMilestoneCount = computed(() =>
                Math.max(0, trackingHistory.value.length - sortedHistory.value.length)
            );

            // Đơn đã kết thúc hành trình thì dừng polling. DELIVERY_FAILED vẫn phải được theo dõi
            // để giữ luồng giao lại / chuyển hoàn của nghiệp vụ hiện hữu.
            const isFinalState = computed(() => {
                const status = String(currentShipment.value?.status || '').trim().toUpperCase();
                return FINAL_STATUSES.has(status);
            });

            // Định dạng thời gian tương đối
            const formatRelativeTime = (ts) => {
                if (!ts) return '';
                const now = Date.now();
                const diff = Math.floor((now - new Date(ts).getTime()) / 1000);
                if (diff < 60) return 'Vừa xong';
                if (diff < 3600) return `Cách đây ${Math.floor(diff / 60)} phút`;
                if (diff < 86400) return `Cách đây ${Math.floor(diff / 3600)} giờ`;
                return `Cách đây ${Math.floor(diff / 86400)} ngày`;
            };

            // Cấu hình icon theo trạng thái
            const getStatusIconConfig = (status) => {
                switch (status) {
                    case 'DELIVERED':
                        return { bg: 'bg-emerald-600', icon: 'check' };
                    case 'OUT_FOR_DELIVERY':
                        return { bg: 'bg-indigo-600', icon: 'courier' };
                    case 'ARRIVED_DEST_HUB':
                        return { bg: 'bg-blue-600', icon: 'warehouse' };
                    case 'IN_TRANSIT':
                        return { bg: 'bg-blue-600', icon: 'truck' };
                    case 'STORED':
                        return { bg: 'bg-blue-600', icon: 'warehouse' };
                    case 'PICKED_UP':
                        return { bg: 'bg-amber-500', icon: 'package' };
                    case 'ROUTE_ASSIGNED':
                    case 'PENDING_ROUTING':
                        return { bg: 'bg-slate-600', icon: 'route' };
                    case 'FAILED':
                    case 'DELIVERY_FAILED':
                        return { bg: 'bg-rose-500', icon: 'alert' };
                    case 'RETURNING':
                        return { bg: 'bg-orange-500', icon: 'alert' };
                    case 'RETURNED':
                        return { bg: 'bg-slate-600', icon: 'check' };
                    case 'CREATED':
                    default:
                        return { bg: 'bg-slate-400', icon: 'document' };
                }
            };

            // Tải song song lịch sử tracking và lịch sử tác nghiệp định tuyến (nếu wrapper có hỗ trợ).
            const loadSecondaryData = async (code) => {
                const trackingHistoryPromise = (async () => {
                    try {
                        const res = await Promise.resolve(TrackingService.getHistory(code));
                        return unwrapHistoryPayload(res);
                    } catch (e) {
                        return [];
                    }
                })();
                const routingHistoryPromise = loadRoutingOperationHistory(code);

                const [lifecycleHistory, routingHistory] = await Promise.all([
                    trackingHistoryPromise,
                    routingHistoryPromise
                ]);
                trackingHistory.value = mergeHistory(lifecycleHistory, routingHistory);
            };

            // Cache thông tin chi tiết bưu gửi (sender, receiver, cod, weight)
            const shipmentDetailCache = {};
            const loadShipmentDetail = async (code) => {
                if (Object.prototype.hasOwnProperty.call(shipmentDetailCache, code)) {
                    return shipmentDetailCache[code];
                }
                const detail = await ShipmentService.getByCode(code);
                if (detail) {
                    shipmentDetailCache[code] = detail;
                }
                return detail;
            };

            // Che số điện thoại cho khách vãng lai
            const maskPhone = (phone) => {
                if (!phone) return 'N/A';
                if (typeof Auth !== 'undefined' && Auth.isAuthenticated()) {
                    return phone;
                }
                const str = String(phone).trim();
                if (str.length <= 6) return str;
                return `${str.slice(0, 4)}***${str.slice(-3)}`;
            };

            const focusSearchInput = () => {
                const el = document.getElementById('tracking-search-input');
                if (el) {
                    el.focus();
                    el.select();
                }
            };

            // Tra cứu bưu gửi
            const fetchTrackingData = async (codeToSearch) => {
                validationError.value = '';
                const raw = (codeToSearch || searchCode.value || '').trim();
                if (!raw) {
                    validationError.value = 'Vui lòng nhập mã số bưu gửi cần tra cứu.';
                    return;
                }

                const code = raw.toUpperCase();
                searchCode.value = code;

                if (!code.startsWith('WB') && !code.startsWith('VNPT')) {
                    validationError.value = 'Mã bưu gửi không đúng định dạng. Mã chuẩn bắt đầu bằng "WB" hoặc "VNPT" (Ví dụ: VNPT-HN-SG-9821 hoặc WB...).';
                    return;
                }

                if (code.length < 6) {
                    validationError.value = 'Mã bưu gửi quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.';
                    return;
                }

                isLoading.value = true;
                isNotFound.value = false;
                notFoundCode.value = '';

                // Hỗ trợ mã mẫu demo VNPT-HN-SG-9821
                if (code === 'VNPT-HN-SG-9821' || code.startsWith('VNPT-')) {
                    setTimeout(() => {
                        currentShipment.value = {
                            trackingCode: code,
                            status: 'OUT_FOR_DELIVERY',
                            originHub: 'HUB-HN-01',
                            destinationHub: 'HUB-HCM-01',
                            originPostOffice: 'POST-HN-CG',
                            destPostOffice: 'POST-HCM-Q1',
                            senderName: 'Công ty Công nghệ Bưu chính VNPT',
                            senderPhone: '024 3768 9999',
                            senderAddress: 'Số 57 Huỳnh Thúc Kháng, Q. Đống Đa, Hà Nội',
                            receiverName: 'Trần Thị Thu Trang',
                            receiverPhone: '0912 345 678',
                            receiverAddress: 'Số 270 Lý Thường Kiệt, Phường 6, Quận Tân Bình, TP. Hồ Chí Minh',
                            weight: 850,
                            serviceType: 'EXPRESS',
                            codAmount: 350000,
                            createdAt: new Date(Date.now() - 86400000).toISOString(),
                            estimatedDelivery: 'Trước 17:30'
                        };
                        trackingHistory.value = [
                            {
                                id: 1,
                                status: 'OUT_FOR_DELIVERY',
                                operationType: 'OUT_FOR_DELIVERY',
                                node: 'Bưu Cục Trung Tâm Sài Gòn',
                                locationCode: 'POST-HCM-Q1',
                                note: 'Bưu kiện đã được giao cho bưu tá Trần Văn Mạnh đi phát tại tuyến đường Quận 1.',
                                timestamp: new Date(Date.now() - 3600000).toISOString()
                            },
                            {
                                id: 2,
                                status: 'ARRIVED_DEST_POST_OFFICE',
                                operationType: 'ARRIVED_DEST_POST_OFFICE',
                                node: 'Bưu Cục Trung Tâm Sài Gòn',
                                locationCode: 'POST-HCM-Q1',
                                note: 'Xe trung chuyển chuyến CX-8812 đã cập trạm, hoàn tất quét mã dỡ hàng.',
                                timestamp: new Date(Date.now() - 21600000).toISOString()
                            },
                            {
                                id: 3,
                                status: 'IN_TRANSIT',
                                operationType: 'IN_TRANSIT',
                                node: 'Siêu Hub Đà Nẵng',
                                locationCode: 'HUB-DN-01',
                                note: 'Bưu phẩm qua dây chuyền chia chọn tự động Siêu Hub Đà Nẵng và đóng bao tải luân chuyển Nam tiến.',
                                timestamp: new Date(Date.now() - 54000000).toISOString()
                            },
                            {
                                id: 4,
                                status: 'ORDER_CREATED',
                                operationType: 'ORDER_CREATED',
                                node: 'Bưu Cục Hoàn Kiếm',
                                locationCode: 'POST-HN-CG',
                                note: 'Giao dịch viên bưu cục Hoàn Kiếm đã in vận đơn và kiểm tra niêm phong bưu phẩm.',
                                timestamp: new Date(Date.now() - 86400000).toISOString()
                            }
                        ];
                        isLoading.value = false;
                        nextTick(async () => {
                            if (window.MapManager) {
                                window.MapManager.init('tracking-map');
                                try {
                                    routeInfo.value = await window.MapManager.renderRoute(
                                        trackingHistory.value,
                                        'OUT_FOR_DELIVERY',
                                        'HUB-HN-01',
                                        'HUB-HCM-01',
                                        'POST-HN-CG',
                                        'POST-HCM-Q1'
                                    );
                                } catch (e) {}
                            }
                        });
                    }, 250);
                    return;
                }

                try {
                    // Nạp trạng thái, chi tiết đơn và lịch sử định tuyến song song để tránh làm chậm
                    // timeline khi routing service chỉ là một wrapper tùy chọn.
                    // Thiếu lịch sử tracking không được hủy kết quả đơn đã có trong shipment-service.
                    const routingHistoryPromise = loadRoutingOperationHistory(code);
                    const routingAssignmentPromise = loadRoutingAssignment(code);
                    const trackingPromise = Promise.resolve(TrackingService.getFullTracking(code)).catch((err) => {
                        const missing = err && (err.isNotFound || err.status === 404
                            || (err.message && String(err.message).toLowerCase().includes('không tìm thấy')));
                        if (missing) return null;
                        throw err;
                    });
                    const [data, detail, routingHistory, assignment] = await Promise.all([
                        trackingPromise,
                        loadShipmentDetail(code),
                        routingHistoryPromise,
                        routingAssignmentPromise
                    ]);

                    if (!data && !detail) {
                        currentShipment.value = null;
                        trackingHistory.value = [];
                        routeInfo.value = null;
                        lastRenderedCode.value = null;
                        isNotFound.value = true;
                        notFoundCode.value = code;
                        return;
                    }

                    const status = (data && data.currentStatus)
                        || (detail && (detail.currentStatus || detail.status))
                        || 'PENDING_ROUTING';

                    currentShipment.value = {
                        ...(detail || {}),
                        ...(assignment || {}),
                        trackingCode: code,
                        status,
                        source: data ? data.source : 'SHIPMENT'
                    };

                    let rawHistory = (data && (data.history || data.lifecycleHistory || data.trackingHistory || data.events)) || [];
                    if (!rawHistory.length) {
                        rawHistory = [{
                            trackingCode: code,
                            status,
                            locationCode: 'WAREHOUSE',
                            node: 'Đơn hàng đã được ghi nhận. Hành trình chi tiết sẽ hiện khi có mốc quét.',
                            occurredAt: (detail && (detail.createdAt || detail.updatedAt)) || new Date().toISOString()
                        }];
                    }
                    if (assignment && assignment.routeCode && !rawHistory.some(h => String(h.status || '').includes('ROUTE_ASSIGNED') || String(h.node || '').includes('ROUTE-'))) {
                        rawHistory = [
                            ...rawHistory,
                            {
                                trackingCode: code,
                                status: 'ROUTE_ASSIGNED',
                                locationCode: assignment.originPostOffice || assignment.sourceHub,
                                node: `Đã phân tuyến vận chuyển: ${assignment.routeCode} (${assignment.originPostOffice || assignment.sourceHub} ➔ ${assignment.sourceHub} ➔ ${assignment.destinationHub} ➔ ${assignment.destPostOffice || assignment.destinationHub})`,
                                occurredAt: assignment.assignedAt || new Date().toISOString()
                            }
                        ];
                    }

                    trackingHistory.value = mergeHistory(
                        rawHistory,
                        routingHistory
                    );
                    if (isFinalState.value) {
                        stopLivePolling();
                        disconnectWebSocket();
                    } else {
                        connectWebSocket(code);
                        if (!isWsConnected.value && isLiveTracking.value && !livePollTimer) {
                            startLivePolling();
                        }
                    }

                    // Lỗi bản đồ không được xóa đơn vừa tải được.
                    try {
                        await nextTick();
                        if (window.MapManager) {
                            window.MapManager.init('tracking-map');
                            if (lastRenderedCode.value === code) {
                                const latestMilestone = sortedHistory.value[0];
                                window.MapManager.updateProgress(status, latestMilestone?.node || '', latestMilestone?.locationCode || null);
                            } else {
                                routeInfo.value = await window.MapManager.renderRoute(
                                    trackingHistory.value,
                                    status,
                                    true,
                                    currentShipment.value
                                );
                                lastRenderedCode.value = code;
                            }
                        }
                    } catch (mapErr) {
                        console.warn('[TrackingView] Không vẽ được bản đồ:', mapErr);
                    }

                    showToast('Thành Công', data
                        ? `Đã nạp dữ liệu hành trình bưu gửi ${code}`
                        : `Đã mở vận đơn ${code}. Hành trình chi tiết sẽ cập nhật khi có mốc quét.`);

                    if (status === 'DELIVERED') {
                        loadRatingStatus(code);
                    } else {
                        ratingState.value.canRate = false;
                        ratingState.value.alreadyRated = false;
                        ratingState.value.serviceRating = 5;
                        ratingState.value.shipperRating = 5;
                    }
                } catch (err) {
                    currentShipment.value = null;
                    trackingHistory.value = [];
                    routeInfo.value = null;
                    lastRenderedCode.value = null;

                    if (err.isNotFound || err.status === 404 || (err.message && err.message.toLowerCase().includes('không tìm thấy'))) {
                        isNotFound.value = true;
                        notFoundCode.value = code;
                    } else {
                        showToast('Lỗi Tra Cứu', err.message || 'Không thể tải dữ liệu bưu gửi', 'error');
                    }
                } finally {
                    isLoading.value = false;
                }
            };

            // Đồng bộ trạng thái chạy ngầm (Silent Sync)
            const syncStatusInBackground = async () => {
                const code = currentShipment.value?.trackingCode;
                if (!code) return;
                if (isFinalState.value) {
                    stopLivePolling();
                    return;
                }

                try {
                    const st = await Promise.resolve(TrackingService.getTracking(code));
                    const newStatus = st.currentStatus;
                    if (!newStatus) return;
                    const previousStatus = currentShipment.value.status;
                    const statusChanged = newStatus !== previousStatus;

                    // A trip can progress physically while its public status stays
                    // unchanged. Always refresh the two histories during polling so
                    // those unload/store milestones are not missed.
                    currentShipment.value = {
                        ...currentShipment.value,
                        status: newStatus,
                        locationCode: st.locationCode || currentShipment.value.locationCode,
                        source: st.source
                    };
                    if (isFinalState.value) {
                        // Stop immediately; history refresh failure must not restart terminal polling.
                        stopLivePolling();
                    }

                    const [fullData, routingHistory] = await Promise.all([
                        Promise.resolve(TrackingService.getFullTracking(code)),
                        loadRoutingOperationHistory(code)
                    ]);
                    trackingHistory.value = mergeHistory(
                        fullData.history || fullData.lifecycleHistory || fullData.trackingHistory || fullData.events || [],
                        routingHistory
                    );
                    const latestMilestone = sortedHistory.value[0];

                    if (window.MapManager) {
                        window.MapManager.updateProgress(newStatus, latestMilestone?.node || '', latestMilestone?.locationCode || null);
                    }

                    if (statusChanged) {
                        showToast('Cập Nhật Tự Động', `Bưu gửi vừa chuyển sang: ${safeFormatStatusText(newStatus)}`);
                    }
                    if (newStatus === 'DELIVERED') {
                        loadRatingStatus(code);
                    }
                    if (isFinalState.value) {
                        stopLivePolling();
                    }
                } catch (err) {
                    // Lỗi đồng bộ ngầm thì bỏ qua
                }
            };

            const POLL_INTERVAL_MS = 5000;

            const startLivePolling = () => {
                stopLivePolling();
                livePollTimer = setInterval(() => {
                    if (!isLiveTracking.value) return;
                    if (document.hidden) return;
                    if (isFinalState.value) {
                        stopLivePolling();
                        return;
                    }
                    if (!currentShipment.value?.trackingCode) return;
                    syncStatusInBackground();
                }, POLL_INTERVAL_MS);
            };

            const stopLivePolling = () => {
                if (livePollTimer) {
                    clearInterval(livePollTimer);
                    livePollTimer = null;
                }
            };

            watch(() => props.trackingCode, (newCode) => {
                if (newCode) {
                    searchCode.value = newCode;
                    fetchTrackingData(newCode);
                }
            });

            const handleVisibilityChange = () => {
                if (document.hidden) return;
                if (window.MapManager) window.MapManager.invalidateSize();
                if (isFinalState.value) {
                    stopLivePolling();
                    return;
                }
                if (isLiveTracking.value && currentShipment.value?.trackingCode) {
                    syncStatusInBackground();
                }
            };

            // Hiệu ứng số nhảy tăng dần cho 4 chỉ số năng lực mạng lưới
            const counterHubs = ref('03');
            const counterVolume = ref('500K+');
            const counterProvinces = ref('63');
            const counterInsurance = ref('100%');
            let counterAnimId = null;

            const animateNumbers = () => {
                if (counterAnimId) {
                    cancelAnimationFrame(counterAnimId);
                }

                const duration = 1600; // 1.6 giây mượt mà
                const startTime = performance.now();

                const targets = {
                    hubs: { start: 0, end: 3, format: v => (Math.round(v) < 10 ? '0' : '') + Math.round(v), set: val => { counterHubs.value = val; } },
                    volume: { start: 0, end: 500, format: v => Math.round(v) + 'K+', set: val => { counterVolume.value = val; } },
                    provinces: { start: 0, end: 63, format: v => Math.round(v).toString(), set: val => { counterProvinces.value = val; } },
                    insurance: { start: 0, end: 100, format: v => Math.round(v) + '%', set: val => { counterInsurance.value = val; } }
                };

                function easeOutQuart(x) {
                    return 1 - Math.pow(1 - x, 4);
                }

                function frame(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const ease = easeOutQuart(progress);

                    for (const key in targets) {
                        const item = targets[key];
                        const currentVal = item.start + (item.end - item.start) * ease;
                        item.set(item.format(currentVal));
                    }

                    if (progress < 1) {
                        counterAnimId = requestAnimationFrame(frame);
                    } else {
                        counterAnimId = null;
                    }
                }

                counterAnimId = requestAnimationFrame(frame);
            };

            onMounted(() => {
                nextTick(() => {
                    if (window.MapManager) {
                        window.MapManager.init('tracking-map');
                    }
                    let routingService;
                    try {
                        routingService = typeof RoutingService !== 'undefined'
                            ? RoutingService
                            : (typeof window !== 'undefined' ? window.RoutingService : null);
                    } catch (e) {
                        routingService = null;
                    }
                    Promise.resolve(routingService).then(service => {
                        if (!service || typeof service.getAllHubs !== 'function') return null;
                        return Promise.resolve(service.getAllHubs());
                    }).then(data => {
                        if (window.MapManager && Array.isArray(data)) {
                            window.MapManager.updateHubs(data);
                        }
                    }).catch(() => {});
                    if (searchCode.value) {
                        fetchTrackingData(searchCode.value);
                    } else {
                        // Tự động kích hoạt hiệu ứng số nhảy sau 300ms khi vừa vào trang
                        setTimeout(animateNumbers, 300);
                    }
                });
                startLivePolling();
                document.addEventListener('visibilitychange', handleVisibilityChange);
            });

            onUnmounted(() => {
                if (counterAnimId) cancelAnimationFrame(counterAnimId);
                disconnectWebSocket();
                stopLivePolling();
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (window.MapManager) window.MapManager.cancelPendingRenders();
            });

            const fitVietnamView = () => {
                if (window.MapManager) {
                    window.MapManager.fitVietnamView();
                }
            };

            const fitRouteView = () => {
                if (window.MapManager) {
                    window.MapManager.fitRouteView();
                }
            };

            const ratingState = ref({
                canRate: false,
                alreadyRated: false,
                serviceRating: 5,
                shipperRating: 5,
                isLoading: false
            });
            const isRatingModalOpen = ref(false);
            const serviceScore = ref(5);
            const shipperScore = ref(5);
            const hoveredServiceScore = ref(0);
            const hoveredShipperScore = ref(0);
            const ratingComment = ref('');
            const ratingPhone = ref('');
            const selectedRatingTags = ref(['Giao siêu tốc ⚡', 'Shipper cực kỳ thân thiện 😊']);
            const isSubmittingRating = ref(false);
            const ratingResultView = ref(null);
            const lastBouncedStar = ref(null);

            const ratingMeta = {
                1: {
                    label: 'Rất không hài lòng',
                    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                    tags: ['Giao hàng trễ hẹn', 'Thái độ chưa chuẩn mực', 'Kiện hàng bị móp méo', 'Không gọi điện trước', 'Không giao tận nơi'],
                    placeholder: 'Vui lòng cho chúng tôi biết chi tiết vấn đề bạn gặp phải để CSKH hỗ trợ ngay...'
                },
                2: {
                    label: 'Chưa hài lòng',
                    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                    tags: ['Giao trễ hơn dự kiến', 'Shipper hơi vội vã', 'Đóng gói bị trầy xước', 'Khó liên hệ tài xế'],
                    placeholder: 'Chia sẻ thêm điều khiến bạn chưa thật sự ưng ý...'
                },
                3: {
                    label: 'Bình thường / Tạm ổn',
                    badgeClass: 'bg-yellow-50 text-yellow-800 border-yellow-200',
                    tags: ['Đúng giờ nhưng vội', 'Thái độ bình thường', 'Hộp hơi nhăn', 'Đúng quy trình'],
                    placeholder: 'Góp ý thêm để dịch vụ VNPT Post lần sau tốt hơn...'
                },
                4: {
                    label: 'Hài lòng',
                    badgeClass: 'bg-blue-50 text-[#004488] border-blue-200',
                    tags: ['Giao hàng nhanh', 'Shipper lịch sự', 'Hàng nguyên vẹn', 'Đúng địa chỉ hẹn'],
                    placeholder: 'Bạn ấn tượng nhất điểm nào ở dịch vụ hôm nay?'
                },
                5: {
                    label: 'Rất tuyệt vời! ⭐⭐⭐⭐⭐',
                    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    tags: ['Giao siêu tốc ⚡', 'Shipper cực kỳ thân thiện 😊', 'Kiện hàng nguyên vẹn 📦', 'Hỗ trợ nhiệt tình 👏', 'Đúng hẹn chuẩn xác ⏱️'],
                    placeholder: 'Gửi vài lời khen ngợi hoặc động viên đến shipper nhé...'
                }
            };

            const loadRatingStatus = async (trackingCode) => {
                if (!trackingCode || typeof RatingService === 'undefined') return;
                ratingState.value.isLoading = true;
                try {
                    const res = await RatingService.getRatingStatus(trackingCode);
                    if (res) {
                        ratingState.value.canRate = !!res.isDelivered && !res.hasRated;
                        ratingState.value.alreadyRated = !!res.hasRated;
                        ratingState.value.serviceRating = res.serviceRating || 5;
                        ratingState.value.shipperRating = res.shipperRating || 5;
                    }
                } catch (e) {
                    console.warn('[TrackingView] Không thể tải trạng thái đánh giá:', e);
                } finally {
                    ratingState.value.isLoading = false;
                }
            };

            const openRatingModal = () => {
                if (!currentShipment.value) return;
                serviceScore.value = ratingState.value.alreadyRated ? (ratingState.value.serviceRating || 5) : 5;
                shipperScore.value = ratingState.value.alreadyRated ? (ratingState.value.shipperRating || 5) : 5;
                hoveredServiceScore.value = 0;
                hoveredShipperScore.value = 0;
                ratingComment.value = '';
                ratingResultView.value = null;
                selectedRatingTags.value = ['Giao siêu tốc ⚡', 'Shipper cực kỳ thân thiện 😊'];

                const rawPhone = currentShipment.value.receiverPhone || '';
                const cleanPhone = rawPhone.replace(/\D+/g, '');
                if (cleanPhone.length >= 4) {
                    ratingPhone.value = cleanPhone.slice(-4);
                } else {
                    ratingPhone.value = '';
                }
                isRatingModalOpen.value = true;
            };

            const closeRatingModal = () => {
                isRatingModalOpen.value = false;
            };

            const setServiceScore = (score) => {
                serviceScore.value = score;
                shipperScore.value = score;
                lastBouncedStar.value = score;
                setTimeout(() => {
                    if (lastBouncedStar.value === score) {
                        lastBouncedStar.value = null;
                    }
                }, 450);

                const meta = ratingMeta[score];
                if (meta && meta.tags && meta.tags.length > 0) {
                    selectedRatingTags.value = [meta.tags[0]];
                    if (meta.tags[1]) selectedRatingTags.value.push(meta.tags[1]);
                } else {
                    selectedRatingTags.value = [];
                }
            };

            const toggleRatingTag = (tag) => {
                const idx = selectedRatingTags.value.indexOf(tag);
                if (idx > -1) {
                    selectedRatingTags.value.splice(idx, 1);
                } else {
                    selectedRatingTags.value.push(tag);
                }
            };

            const submitRating = async () => {
                if (!currentShipment.value) return;
                const phone = (ratingPhone.value || '').trim();
                if (!phone || phone.length !== 4) {
                    showToast('Lỗi Xác Thực', 'Vui lòng nhập đúng 4 chữ số cuối số điện thoại nhận hàng.', 'warning');
                    return;
                }

                isSubmittingRating.value = true;
                try {
                    const payload = {
                        trackingCode: currentShipment.value.trackingCode,
                        serviceRating: serviceScore.value,
                        shipperRating: shipperScore.value,
                        tags: selectedRatingTags.value,
                        comment: ratingComment.value.trim(),
                        verifiedPhone: phone,
                        courierCode: currentShipment.value.courierCode || currentShipment.value.shipperCode || null
                    };

                    const result = await RatingService.submitRating(payload);
                    ratingState.value.alreadyRated = true;
                    ratingState.value.canRate = false;
                    ratingState.value.serviceRating = result.serviceRating || serviceScore.value;
                    ratingState.value.shipperRating = result.shipperRating || shipperScore.value;

                    if (result.suggestTicket || serviceScore.value <= 2 || shipperScore.value <= 2) {
                        ratingResultView.value = 'negative';
                    } else if (serviceScore.value >= 4) {
                        ratingResultView.value = 'positive';
                    } else {
                        ratingResultView.value = 'neutral';
                    }

                    showToast('Đánh Giá Thành Công', `Cảm ơn bạn đã đánh giá dịch vụ ${serviceScore.value} sao.`, 'success');
                } catch (err) {
                    showToast('Không Thể Gửi Đánh Giá', err.message || 'Có lỗi xảy ra khi lưu đánh giá.', 'error');
                } finally {
                    isSubmittingRating.value = false;
                }
            };

            return {
                searchCode,
                isLoading,
                validationError,
                isNotFound,
                notFoundCode,
                maskPhone,
                focusSearchInput,
                currentShipment,
                trackingHistory,
                sortedHistory,
                historyExpanded,
                mergedMilestoneCount,
                collapseHistoryMilestones,
                routeInfo,
                isFinalState,
                currentStageIndex,
                stageProgress,
                isInterProvincial,
                routeCheckpoints,
                currentCheckpointIndex,
                activePinType,
                recipientShortAddress,
                recipientFullAddress,
                currentSourceHub,
                currentDestHub,
                currentOriginPostOffice,
                currentDestPostOffice,
                getPostOfficeDisplayName,
                getStationAddress,
                getStatusIconConfig,
                formatRelativeTime,
                safeFormatHistoryNote,
                fetchTrackingData,
                fitVietnamView,
                fitRouteView,
                counterHubs,
                counterVolume,
                counterProvinces,
                counterInsurance,
                animateNumbers,
                previousTab,
                isWsConnected,
                isLiveTracking,
                navigateToSupport,
                ratingState,
                isRatingModalOpen,
                serviceScore,
                shipperScore,
                hoveredServiceScore,
                hoveredShipperScore,
                ratingComment,
                ratingPhone,
                selectedRatingTags,
                isSubmittingRating,
                ratingResultView,
                lastBouncedStar,
                ratingMeta,
                loadRatingStatus,
                openRatingModal,
                closeRatingModal,
                setServiceScore,
                toggleRatingTag,
                submitRating,
                currentUser,
                isGuest,
                publicHeroTab,
                isMapExpanded,
                toggleMapExpanded,
                quickQuote,
                fillSampleCode,
                handleResetSearch,
                getPostOfficeDisplayName,
                Utils: getUtilsApi() || {}
            };
        },
        template: `
            <div class="w-full">
                <!-- ========================================================================= -->
                <!-- 1. GIAO DIỆN TRA CỨU CÔNG KHAI DÀNH CHO KHÁCH (isGuest = true)           -->
                <!-- ========================================================================= -->
                <div v-if="isGuest" class="space-y-8 animate-fade-slide">
                    
                    <!-- 1.1 HERO BANNER & TABS 50-50 (KHI CHƯA TRA CỨU HOẶC QUAY LẠI TRANG CHỦ) -->
                    <section v-if="!currentShipment" class="hero-pattern text-white pt-10 pb-16 px-4 sm:px-6 lg:px-8 rounded-3xl relative overflow-hidden shadow-xl shadow-blue-900/10">
                        <div class="max-w-4xl mx-auto text-center space-y-3 mb-8 relative z-10">
                            <div class="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100 shadow-xs whitespace-nowrap">
                                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"></span>
                                <span>Mạng lưới phân loại &amp; vận chuyển toàn quốc 63 tỉnh thành</span>
                            </div>
                            <h1 class="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight sm:whitespace-nowrap">
                                Định Vị Bưu Gửi &amp; Ước Tính Cước Phí
                            </h1>
                            <p class="text-xs sm:text-sm text-blue-100/90 max-w-2xl mx-auto font-normal leading-relaxed">
                                Theo dõi lộ trình bưu phẩm theo thời gian thực hoặc dự toán cước bưu chính chính xác chỉ trong tích tắc.
                            </p>
                        </div>

                        <!-- Card Hero Tabbed Widget: TỈ LỆ 50-50 CÂN ĐỐI ĐỐI XỨNG, KHÔNG XUỐNG DÒNG -->
                        <div class="max-w-3xl mx-auto bg-white rounded-2xl shadow-2xl p-2.5 sm:p-3 text-slate-800 border border-slate-100 relative z-10 transition-all duration-300">
                            <!-- Tab Switcher: Grid 2 Cột 50-50 Chuẩn Xác -->
                            <div class="grid grid-cols-2 gap-2 border-b border-slate-100 pb-2 px-1 sm:px-2">
                                <button 
                                    @click="publicHeroTab = 'tracking'" 
                                    type="button" 
                                    :class="[
                                        'w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap',
                                        publicHeroTab === 'tracking'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                                    ]"
                                >
                                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    <span>Tra Cứu Bưu Gửi</span>
                                </button>
                                <button 
                                    @click="publicHeroTab = 'quote'" 
                                    type="button" 
                                    :class="[
                                        'w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap',
                                        publicHeroTab === 'quote'
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100'
                                    ]"
                                >
                                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                    <span>Ước Tính Cước Nhanh</span>
                                </button>
                            </div>

                            <!-- Panel Tra Cứu Vận Đơn -->
                            <div v-show="publicHeroTab === 'tracking'" class="p-3 sm:p-4 transition-all duration-200">
                                <form @submit.prevent="fetchTrackingData()" class="flex flex-col sm:flex-row gap-2.5">
                                    <div class="relative flex-1">
                                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                        </div>
                                        <input 
                                            v-model="searchCode" 
                                            @input="validationError = ''" 
                                            type="text" 
                                            placeholder="Nhập mã vận đơn (VD: VNPT-HN-SG-9821 hoặc WB...)..." 
                                            class="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all duration-200"
                                        />
                                        <button 
                                            v-if="searchCode" 
                                            type="button" 
                                            @click="searchCode = ''; validationError = ''" 
                                            class="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                    <button 
                                        type="submit" 
                                        :disabled="isLoading" 
                                        class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer flex items-center justify-center space-x-2 whitespace-nowrap disabled:opacity-50"
                                    >
                                        <span v-if="isLoading" class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                                        <span>{{ isLoading ? 'Đang Tra Cứu...' : 'Tra Cứu' }}</span>
                                        <svg v-if="!isLoading" class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                    </button>
                                </form>

                                <!-- Validation Error -->
                                <div v-if="validationError" class="text-rose-600 text-xs font-semibold flex items-center space-x-1.5 pt-2 animate-pulse">
                                    <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                                    <span>{{ validationError }}</span>
                                </div>

                                <div class="mt-2.5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-1 gap-2">
                                    <span class="whitespace-nowrap">
                                        Mã mẫu kiểm tra: 
                                        <button type="button" @click="fillSampleCode('VNPT-HN-SG-9821')" class="font-mono text-blue-600 hover:underline font-bold transition-colors cursor-pointer">VNPT-HN-SG-9821</button> 
                                        hoặc 
                                        <button type="button" @click="fillSampleCode('WB902188214')" class="font-mono text-blue-600 hover:underline font-bold transition-colors cursor-pointer">WB902188214</button>
                                    </span>
                                    <span class="hidden sm:inline text-slate-400 whitespace-nowrap">Tự động định vị chặng trung chuyển</span>
                                </div>
                            </div>

                            <!-- Panel Tính Cước Nhanh -->
                            <div v-show="publicHeroTab === 'quote'" class="p-3 sm:p-4 transition-all duration-200">
                                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1 whitespace-nowrap">Tỉnh Gửi</label>
                                        <select v-model="quickQuote.senderProvince" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors">
                                            <option value="Hà Nội">Hà Nội</option>
                                            <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                                            <option value="Đà Nẵng">Đà Nẵng</option>
                                            <option value="Hải Phòng">Hải Phòng</option>
                                            <option value="Cần Thơ">Cần Thơ</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1 whitespace-nowrap">Tỉnh Nhận</label>
                                        <select v-model="quickQuote.receiverProvince" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors">
                                            <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                                            <option value="Hà Nội">Hà Nội</option>
                                            <option value="Đà Nẵng">Đà Nẵng</option>
                                            <option value="Cần Thơ">Cần Thơ</option>
                                            <option value="Hải Phòng">Hải Phòng</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1 whitespace-nowrap">Trọng Lượng (Gram)</label>
                                        <input v-model.number="quickQuote.weightGram" type="number" step="100" min="50" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors" />
                                    </div>
                                </div>
                                <div class="mt-3 flex items-center justify-between pt-2.5 border-t border-slate-100">
                                    <span class="text-xs text-slate-500 whitespace-nowrap">Ước tính cước: <strong class="text-blue-700 font-bold font-mono text-sm">{{ Number(quickQuote.estimatedFee).toLocaleString('vi-VN') }} đ</strong> (1-2 ngày)</span>
                                    <button type="button" @click="$emit('switch-tab', 'calculator')" class="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 whitespace-nowrap cursor-pointer">
                                        <span>Bảng tính chi tiết</span>
                                        <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- KHỐI BÁO LỖI KHÔNG TÌM THẤY BƯU GỬI CHO KHÁCH -->
                    <div v-if="isNotFound && !currentShipment" class="bg-white border border-rose-200 rounded-3xl p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto">
                        <div class="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700 mb-2">
                            <span>Mã đã tra cứu:</span>
                            <span class="text-rose-600 font-extrabold">{{ notFoundCode || searchCode }}</span>
                        </div>
                        <h2 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1">
                            Không Tìm Thấy Thông Tin Bưu Gửi
                        </h2>
                        <p class="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                            Hệ thống không tìm thấy hành trình của mã bưu gửi này trong cơ sở dữ liệu. Vui lòng kiểm tra lại tính chính xác của mã vận đơn hoặc liên hệ CSKH.
                        </p>
                        <div class="mt-5 flex items-center justify-center space-x-3">
                            <button 
                                type="button"
                                @click="searchCode = ''; isNotFound = false;" 
                                class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                            >
                                Nhập Lại Mã Vận Đơn Khác
                            </button>
                        </div>
                    </div>

                    <!-- 1.2 KHỐI NĂNG LỰC MẠNG LƯỚI & CẨM NANG (HIỂN THỊ KHI CHƯA TRA CỨU ĐƠN) -->
                    <div v-if="!currentShipment && !isNotFound" class="space-y-6">
                        <div>
                            <div class="flex items-center justify-between mb-3 px-1">
                                <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                    Chỉ Số Năng Lực Vận Hành Toàn Mạng
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium whitespace-nowrap">Thống kê thời gian thực</span>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition duration-200">
                                    <div class="text-[11px] font-bold text-blue-600 uppercase tracking-wider whitespace-nowrap">Hạ Tầng Khai Thác</div>
                                    <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterHubs || '03' }}</div>
                                    <div class="text-xs font-bold text-slate-800 whitespace-nowrap">Siêu Hub Trọng Điểm</div>
                                    <div class="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Hà Nội • Đà Nẵng • TP.HCM</div>
                                    <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                        Diện tích &gt; 90.000m², trang bị dây chuyền chia chọn tự động Cross-Belt Matrix.
                                    </p>
                                </div>
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition duration-200">
                                    <div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap">Công Suất Xử Lý</div>
                                    <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterVolume || '500K+' }}</div>
                                    <div class="text-xs font-bold text-slate-800 whitespace-nowrap">Kiện Hàng / Ngày</div>
                                    <div class="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Tốc Độ Xử Lý 24/7</div>
                                    <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                        Dữ liệu hành trình cập nhật tức thì qua hạ tầng vi dịch vụ phân tán chịu tải cao.
                                    </p>
                                </div>
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition duration-200">
                                    <div class="text-[11px] font-bold text-purple-600 uppercase tracking-wider whitespace-nowrap">Mạng Lưới Phục Vụ</div>
                                    <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterProvinces || '63' }}</div>
                                    <div class="text-xs font-bold text-slate-800 whitespace-nowrap">Tỉnh Thành Toàn Quốc</div>
                                    <div class="text-[11px] font-semibold text-slate-500 whitespace-nowrap">10.000+ Điểm Phục Vụ</div>
                                    <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                        Phủ kín 100% quận, huyện, thị xã đến tận thôn xóm, xã đảo vùng sâu biên giới.
                                    </p>
                                </div>
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition duration-200">
                                    <div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider whitespace-nowrap">Bảo Hiểm Bưu Gửi</div>
                                    <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterInsurance || '100%' }}</div>
                                    <div class="text-xs font-bold text-slate-800 whitespace-nowrap">Bảo Toàn Giá Trị</div>
                                    <div class="text-[11px] font-semibold text-slate-500 whitespace-nowrap">Bồi Thường Nhanh Chóng</div>
                                    <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                        Quy trình đối soát tự động, cam kết đền bù minh bạch khi phát sinh sự cố hư hao.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2 hover:border-blue-300 transition duration-200">
                                <div class="text-blue-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    01. Vị Trí Mã Vận Đơn
                                </div>
                                <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                    Mã gồm chuỗi ký tự in dưới mã vạch trên phiếu gửi giấy (Bill gửi), hoặc trong tin nhắn SMS / Email thông báo xác nhận gửi hàng thành công từ hệ thống.
                                </p>
                            </div>
                            <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2 hover:border-blue-300 transition duration-200">
                                <div class="text-indigo-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    02. Cam Kết Toàn Trình
                                </div>
                                <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                    Tuyến Express hỏa tốc: <strong>12h - 24h</strong> liên tỉnh. Tuyến tiêu chuẩn đường bộ QL1A: <strong>36h - 48h</strong>. Bưu phẩm nội tỉnh phát trong ngày.
                                </p>
                            </div>
                            <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2 hover:border-blue-300 transition duration-200">
                                <div class="text-rose-700 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    03. Quy Cách Đóng Gói
                                </div>
                                <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                    Không nhận vận chuyển chất cháy nổ, tiền mặt, kim khí quý. Hàng dễ vỡ hoặc chất lỏng cần được bọc mút xốp bong bóng và đóng hộp carton nhiều lớp chắc chắn.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 1.3 KẾT QUẢ TRA CỨU: BRANDED HEADER BANNER, MAP COLLAPSIBLE & 2-COLUMN RESULT -->
                    <div v-if="currentShipment" class="space-y-6">
                        
                        <!-- BRANDED BANNER KẾT QUẢ TRA CỨU -->
                        <div class="page-header-banner rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden transition-all duration-300 hover:shadow-md">
                            <div class="flex items-start space-x-4">
                                <div class="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 flex-shrink-0 ring-4 ring-blue-100 radar-pulse-effect">
                                    <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                </div>
                                <div>
                                    <!-- Breadcrumbs -->
                                    <div class="flex items-center space-x-2 text-xs font-semibold text-blue-700 mb-1 whitespace-nowrap">
                                        <span @click="handleResetSearch" class="cursor-pointer hover:underline">Trang Chủ</span>
                                        <span>/</span>
                                        <span>Định Vị Bưu Phẩm</span>
                                        <span>/</span>
                                        <span class="text-slate-500">Tra Cứu Toàn Trình</span>
                                    </div>
                                    <div class="flex items-center space-x-2.5">
                                        <span class="text-xs text-slate-400 font-medium whitespace-nowrap">Mã bưu gửi:</span>
                                        <!-- Kích thước text-base font-mono chuẩn đẹp theo phản hồi người dùng -->
                                        <span class="font-mono text-base font-black text-blue-700 tracking-tight whitespace-nowrap">{{ currentShipment.trackingCode }}</span>
                                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1.5 shadow-xs whitespace-nowrap flex-shrink-0">
                                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                            <span>{{ Utils.formatStatusText(currentShipment.status) }}</span>
                                        </span>
                                    </div>
                                    <p class="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">
                                        Lộ trình: <strong>{{ currentShipment.originPostOffice ? getPostOfficeDisplayName(currentShipment.originPostOffice) : (currentShipment.senderAddress ? currentShipment.senderAddress.split(',').slice(-1)[0] : 'Bưu cục gửi') }}</strong> &rarr; <strong>{{ currentShipment.destinationHub ? getPostOfficeDisplayName(currentShipment.destinationHub) : 'Siêu Hub' }}</strong> &rarr; <strong>{{ currentShipment.destPostOffice ? getPostOfficeDisplayName(currentShipment.destPostOffice) : (currentShipment.receiverAddress ? currentShipment.receiverAddress.split(',').slice(-1)[0] : 'Bưu cục nhận') }}</strong>
                                    </p>
                                </div>
                            </div>

                            <!-- Thẻ Chỉ Số Nhanh, Nút Xem Bản Đồ & Nút Tra Cứu Mã Khác -->
                            <div class="flex flex-wrap items-center gap-3 self-start md:self-center flex-shrink-0">
                                <div class="px-4 py-2.5 rounded-2xl bg-white border border-blue-200/80 shadow-xs text-center min-w-[120px] flex-shrink-0">
                                    <span class="text-[10.5px] uppercase font-bold text-slate-400 block tracking-wider whitespace-nowrap">Dự Kiến Giao</span>
                                    <span class="text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap">{{ currentShipment.estimatedDelivery || 'Trước 17:30' }}</span>
                                </div>
                                <button 
                                    type="button"
                                    @click="toggleMapExpanded" 
                                    class="px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all duration-200 flex items-center space-x-2 shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 whitespace-nowrap flex-shrink-0"
                                >
                                    <svg class="w-4 h-4 transition-transform duration-300 flex-shrink-0" :class="isMapExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                    <span>{{ isMapExpanded ? 'Thu Gọn Bản Đồ' : 'Xem Bản Đồ Tuyến Đường' }}</span>
                                </button>
                                <button 
                                    type="button"
                                    @click="handleResetSearch" 
                                    class="px-3.5 py-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer whitespace-nowrap flex-shrink-0"
                                >
                                    <svg class="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                    <span>Tra Cứu Mã Khác</span>
                                </button>
                            </div>
                        </div>

                        <!-- BẢN ĐỒ THU GỌN ACCORDION (LEAFLET GIS LIVE VIEW) -->
                        <div :class="['map-collapse-wrapper mb-6', isMapExpanded ? 'map-expanded' : 'map-collapsed']">
                            <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                <div class="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                                    <span class="flex items-center space-x-1.5 whitespace-nowrap">
                                        <svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                        <span>Hành lang luân chuyển toàn trình bưu gửi</span>
                                    </span>
                                    <div class="flex items-center space-x-2">
                                        <button 
                                            @click="fitVietnamView()" 
                                            type="button" 
                                            class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                                        >
                                            <span>Toàn Cảnh VN</span>
                                        </button>
                                        <button 
                                            v-if="routeInfo"
                                            @click="fitRouteView()" 
                                            type="button" 
                                            class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                                        >
                                            <span>Tuyến Xe Chạy</span>
                                        </button>
                                    </div>
                                </div>
                                <div class="p-2 bg-slate-100">
                                    <div id="tracking-map" style="height: 380px; width: 100%; border-radius: 1rem;"></div>
                                </div>
                            </div>
                        </div>

                        <!-- LƯỚI 2 CỘT CÂN ĐỐI (CỘT TRÁI 5/12: TIẾN TRÌNH & THÔNG TIN; CỘT PHẢI 7/12: DÒNG THỜI GIAN QUÉT) -->
                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                            
                            <!-- CỘT TRÁI (5 PHẦN) -->
                            <div class="lg:col-span-5 space-y-5">
                                
                                <!-- Thẻ 1: Tiến Trình Giao Nhận (Stepper) -->
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
                                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center justify-between">
                                        <span class="whitespace-nowrap">Tiến Trình Giao Nhận</span>
                                        <span class="text-[11px] text-blue-600 font-bold font-mono whitespace-nowrap">
                                            Chặng {{ currentCheckpointIndex + 1 }} / {{ routeCheckpoints.length }}
                                        </span>
                                    </h3>

                                    <div class="space-y-4 pt-1">
                                        <div 
                                            v-for="(cp, idx) in routeCheckpoints" 
                                            :key="cp.key" 
                                            class="flex items-start space-x-3.5 relative"
                                        >
                                            <!-- Đường kẻ dọc kết nối các trạm -->
                                            <div 
                                                v-if="idx < routeCheckpoints.length - 1" 
                                                class="absolute left-4 top-8 -bottom-4 w-0.5"
                                                :class="idx < currentCheckpointIndex ? 'bg-blue-600' : 'bg-slate-200'"
                                            ></div>

                                            <!-- Điểm tròn trạng thái -->
                                            <div 
                                                :class="[
                                                    'w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 z-10 transition-all duration-200',
                                                    idx === currentCheckpointIndex 
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-4 ring-blue-100 radar-pulse-effect' 
                                                        : (idx < currentCheckpointIndex ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400')
                                                ]"
                                            >
                                                <svg v-if="idx < currentCheckpointIndex" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                                <span v-else>{{ idx + 1 }}</span>
                                            </div>

                                            <div class="flex-1 min-w-0 pt-0.5">
                                                <div class="flex items-center justify-between gap-1">
                                                    <div :class="['text-xs font-bold whitespace-nowrap', idx === currentCheckpointIndex ? 'text-blue-700' : (idx < currentCheckpointIndex ? 'text-slate-800' : 'text-slate-400')]">
                                                        {{ cp.stageName }}
                                                    </div>
                                                    <span v-if="idx === currentCheckpointIndex" class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap flex-shrink-0">
                                                        Hiện Tại
                                                    </span>
                                                </div>
                                                <p class="text-xs mt-0.5 font-medium" :class="idx <= currentCheckpointIndex ? 'text-slate-700' : 'text-slate-400'">
                                                    {{ cp.displayName }}
                                                </p>
                                                <p v-if="cp.address" class="text-[11px] text-slate-400 mt-0.5 truncate">
                                                    {{ cp.address }}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Thẻ 2: Thông Tin Chi Tiết Kiện Hàng -->
                                <div class="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3.5">
                                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 flex items-center justify-between">
                                        <span class="whitespace-nowrap">Thông Tin Bưu Kiện</span>
                                        <span class="text-[11px] text-blue-600 font-bold font-mono whitespace-nowrap">{{ currentShipment.serviceType || 'TIÊU CHUẨN' }}</span>
                                    </h3>

                                    <div class="space-y-2.5 text-xs">
                                        <div class="flex justify-between items-start">
                                            <span class="text-slate-400 whitespace-nowrap">Người gửi:</span>
                                            <span class="font-bold text-slate-800 text-right">{{ currentShipment.senderName || 'Bưu cục VNPT' }}</span>
                                        </div>
                                        <div class="flex justify-between items-start">
                                            <span class="text-slate-400 whitespace-nowrap">Người nhận:</span>
                                            <span class="font-bold text-slate-800 text-right">{{ currentShipment.receiverName || 'Khách hàng' }}</span>
                                        </div>
                                        <div class="flex justify-between items-start">
                                            <span class="text-slate-400 whitespace-nowrap">Địa chỉ nhận:</span>
                                            <span class="font-medium text-slate-700 text-right max-w-[220px]">{{ recipientFullAddress }}</span>
                                        </div>
                                        <div class="flex justify-between items-center pt-2 border-t border-slate-100">
                                            <span class="text-slate-400 whitespace-nowrap">Trọng lượng:</span>
                                            <span class="font-mono font-bold text-slate-800 whitespace-nowrap">{{ currentShipment.weight ? currentShipment.weight + ' gram' : '500 gram' }}</span>
                                        </div>
                                        <div class="flex justify-between items-center">
                                            <span class="text-slate-400 whitespace-nowrap">Thu hộ COD:</span>
                                            <span class="font-mono font-bold text-emerald-600 whitespace-nowrap">{{ currentShipment.codAmount ? Number(currentShipment.codAmount).toLocaleString('vi-VN') + ' đ' : '0 đ' }}</span>
                                        </div>
                                    </div>

                                    <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                        <span class="text-[11px] text-slate-400 whitespace-nowrap">Cần trợ giúp đơn hàng?</span>
                                        <button 
                                            type="button" 
                                            @click="navigateToSupport" 
                                            class="text-xs font-bold text-blue-600 hover:text-blue-800 transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                                        >
                                            <span>Gửi khiếu nại CSKH</span>
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- CỘT PHẢI (7 PHẦN): LỊCH SỬ HÀNH TRÌNH QUÉT MÃ TỨC THÌ -->
                            <div class="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm">
                                <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                                    <div>
                                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                                            Lịch Sử Hành Trình Quét Mã
                                        </h3>
                                        <p class="text-[11px] text-slate-400 mt-0.5">Dữ liệu được cập nhật tức thì qua hệ thống trạm vi dịch vụ</p>
                                    </div>
                                    <span class="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 whitespace-nowrap flex-shrink-0">
                                        {{ trackingHistory.length }} Mốc Quét
                                    </span>
                                </div>

                                <div class="space-y-3.5">
                                    <div 
                                        v-for="(item, idx) in sortedHistory" 
                                        :key="item.id || idx"
                                        :class="[
                                            'flex items-start space-x-3.5 p-3.5 rounded-2xl transition-all duration-200',
                                            idx === 0 
                                                ? 'bg-blue-50/50 border border-blue-100/90 shadow-2xs' 
                                                : 'hover:bg-slate-50 border border-transparent hover:border-slate-100'
                                        ]"
                                    >
                                        <div 
                                            :class="[
                                                'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5',
                                                idx === 0 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                            ]"
                                        >
                                            <svg v-if="idx === 0" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                        </div>
                                        <div class="flex-1 min-w-0">
                                            <div class="flex items-center justify-between gap-2">
                                                <div :class="['text-xs font-bold whitespace-nowrap truncate', idx === 0 ? 'text-blue-900' : 'text-slate-800']">
                                                    {{ Utils.formatStatusText(item.status || item.operationType) }}
                                                </div>
                                                <span class="font-mono text-[11px] font-semibold whitespace-nowrap" :class="idx === 0 ? 'text-blue-700 font-bold' : 'text-slate-400'">
                                                    {{ Utils.formatDateTime(item.timestamp) || 'Mới cập nhật' }}
                                                </span>
                                            </div>
                                            <p class="text-[11.5px] mt-0.5 leading-snug" :class="idx === 0 ? 'text-slate-700 font-medium' : 'text-slate-500'">
                                                {{ safeFormatHistoryNote(item.note) || item.node || 'Đang luân chuyển bưu gửi' }}
                                            </p>
                                            <div v-if="item.node" class="text-[10.5px] text-slate-400 mt-1 flex items-center space-x-1 whitespace-nowrap">
                                                <svg class="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
                                                <span>{{ item.node }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ========================================================================= -->
                <!-- 2. GIAO DIỆN NỘI BỘ DÀNH CHO NHÂN VIÊN (currentUser != null) GIỮ NGUYÊN   -->
                <!-- ========================================================================= -->
                <div v-else class="space-y-4 pb-10 text-slate-800">
                    <!-- THANH ĐIỀU HƯỚNG QUAY LẠI TRANG TÁC NGHIỆP TRƯỚC (KHO BÃI / BƯU TÁ / ĐƠN HÀNG) -->
                <div v-if="previousTab" class="bg-blue-50/90 border border-blue-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm animate-fade-in">
                    <div class="flex items-center space-x-2 text-slate-700 min-w-0">
                        <span class="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse flex-shrink-0"></span>
                        <span class="truncate">
                            Đang xem chi tiết hành trình bưu gửi: 
                            <strong class="font-mono text-blue-700 font-extrabold text-sm ml-1">{{ currentShipment?.trackingCode || searchCode }}</strong>
                        </span>
                    </div>
                    <button 
                        type="button"
                        @click="$emit('back-previous')"
                        class="px-3 py-1.5 rounded-lg bg-white border border-blue-300 text-blue-700 font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition flex items-center space-x-1.5 shadow-sm flex-shrink-0"
                    >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        <span>Quay lại {{ previousTab.name }}</span>
                    </button>
                </div>

                <!-- 1. HERO BANNER TOÀN MÀN NGANG (KHI CHƯA TRA CỨU ĐƠN) -->
                <div v-if="!currentShipment" class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    Tracking &amp; Tracing
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Định Vị &amp; Theo Dõi Hành Trình Bưu Gửi Toàn Trình
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Giám sát chuyển phát thời gian thực, trực quan hóa tuyến luân chuyển bưu cục và dòng thời gian xử lý minh bạch.
                            </p>
                        </div>

                        <!-- Thống kê nhanh KPI -->
                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[80px]">
                                <div class="text-xs sm:text-sm font-bold leading-tight truncate max-w-[120px]" :title="currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu'">
                                    {{ currentShipment ? Utils.formatStatusText(currentShipment.status) : 'Chờ Tra Cứu' }}
                                </div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Trạng Thái</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight">{{ trackingHistory.length }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Mốc Quét</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 1.B BANNER TINH GỌN KHI ĐÃ CÓ KẾT QUẢ TRA CỨU ĐƠN -->
                <div v-if="currentShipment" class="vnpt-gradient rounded-xl text-white px-4 py-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div class="flex items-center space-x-2.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span class="text-xs font-bold text-white uppercase tracking-wider">Hành Trình Bưu Gửi:</span>
                        <span class="font-mono text-xs font-extrabold bg-white/20 px-2 py-0.5 rounded border border-white/25">{{ currentShipment.trackingCode }}</span>
                        <span class="hidden sm:inline text-xs text-blue-100 font-medium">• {{ currentShipment.serviceType || 'EXPRESS' }}</span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs">
                        <span class="text-blue-100 text-[11px]">Trạng thái:</span>
                        <span :class="['px-2.5 py-0.5 rounded-full font-bold text-[11px] border', Utils.getStatusBadgeClass(currentShipment.status)]">
                            {{ Utils.formatStatusText(currentShipment.status) }}
                        </span>
                    </div>
                </div>

                <!-- 2. TOOLBAR TRA CỨU BƯU GỬI B2B TOÀN MÀN NGANG (KHI CHƯA TRA CỨU ĐƠN) -->
                <div v-if="!currentShipment" class="b2b-card bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div class="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg">
                            <div class="relative w-full">
                                <input 
                                    id="tracking-search-input"
                                    v-model="searchCode" 
                                    @keyup.enter="fetchTrackingData()"
                                    @input="validationError = ''"
                                    type="text" 
                                    placeholder="Nhập mã số bưu gửi (VD: WB...)" 
                                    class="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                />
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <button 
                                    v-if="searchCode" 
                                    @click="searchCode = ''; validationError = ''; currentShipment = null; isNotFound = false; animateNumbers()" 
                                    class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                    aria-label="Xóa"
                                >
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>

                            <button 
                                @click="fetchTrackingData()"
                                :disabled="isLoading"
                                class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold whitespace-nowrap shadow-sm shadow-blue-500/20 transition disabled:opacity-50 flex items-center space-x-1.5"
                            >
                                <span v-if="isLoading" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                <span>{{ isLoading ? 'Đang Tra Cứu...' : 'Tra Cứu' }}</span>
                            </button>
                        </div>

                        <!-- Badge Trạng thái hiện tại -->
                        <div v-if="currentShipment" class="flex items-center space-x-2 text-xs">
                            <span class="text-slate-500 font-medium">Trạng thái bưu gửi:</span>
                            <span :class="['px-3 py-1 rounded-full font-bold border text-xs inline-flex items-center space-x-1.5', Utils.getStatusBadgeClass(currentShipment.status)]">
                                <span class="w-2 h-2 rounded-full bg-current"></span>
                                <span>{{ Utils.formatStatusText(currentShipment.status) }}</span>
                            </span>
                        </div>
                    </div>

                    <!-- Lỗi Validation Inline -->
                    <div v-if="validationError" class="text-rose-600 text-[11.5px] font-semibold flex items-center space-x-1.5 pt-1 animate-pulse">
                        <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                        </svg>
                        <span>{{ validationError }}</span>
                    </div>

                    <!-- Quy chuẩn định dạng mã hợp lệ -->
                    <div class="flex items-center space-x-1.5 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Quy chuẩn mã bưu gửi VNPT: Bắt đầu bằng <strong>WB</strong>, theo sau là chuỗi số và chữ hoa không dấu (Ví dụ: <strong>WB1788...</strong>).</span>
                    </div>
                </div>

                <!-- 2.1 KHỐI GIAO DIỆN BÁO LỖI: KHÔNG TÌM THẤY BƯU GỬI -->
                <div v-if="isNotFound" class="b2b-card bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm text-center max-w-3xl mx-auto my-2">
                    <div class="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700 mb-2">
                        <span>Mã đã tra cứu:</span>
                        <span class="text-rose-600 font-extrabold">{{ notFoundCode }}</span>
                    </div>
                    <h2 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight mt-1">
                        Không Tìm Thấy Thông Tin Bưu Gửi
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-500 mt-2 max-w-lg mx-auto leading-relaxed">
                        Hệ thống không tìm thấy hành trình của mã bưu gửi này trong cơ sở dữ liệu phân tán. Vui lòng kiểm tra lại tính chính xác của mã vận đơn.
                    </p>
                    <div class="mt-5">
                        <button 
                            @click="focusSearchInput()" 
                            class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                            Nhập Lại Mã Vận Đơn Khác
                        </button>
                    </div>
                </div>

                <!-- 2.5 KHỐI KHÁM PHÁ & NĂNG LỰC MẠNG LƯỚI (KHI CHƯA TRA CỨU ĐƠN) -->
                <div v-if="!isNotFound && !currentShipment" class="space-y-6">
                    <!-- 1. BỐN TRỤ CỘT NĂNG LỰC MẠNG LƯỚI BƯU CHÍNH (SỐ NHẢY ĐỘNG) -->
                    <div>
                        <div class="flex items-center justify-between mb-3 px-1">
                            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                Chỉ Số Năng Lực Vận Hành Toàn Mạng
                            </span>
                            <span class="text-[11px] text-slate-400 font-medium">Thống kê thời gian thực</span>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in delay-200">
                            <!-- Cột 1: 03 -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition smooth-transition">
                                <div class="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Hạ Tầng Khai Thác</div>
                                <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterHubs }}</div>
                                <div class="text-xs font-bold text-slate-800">Siêu Hub Trọng Điểm</div>
                                <div class="text-[11px] font-semibold text-slate-500">Hà Nội • Đà Nẵng • TP.HCM</div>
                                <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                    Diện tích &gt; 90.000m², trang bị dây chuyền chia chọn tự động Cross-Belt Matrix.
                                </p>
                            </div>

                            <!-- Cột 2: 500K+ -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition smooth-transition">
                                <div class="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Công Suất Xử Lý</div>
                                <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterVolume }}</div>
                                <div class="text-xs font-bold text-slate-800">Kiện Hàng / Ngày</div>
                                <div class="text-[11px] font-semibold text-slate-500">Tốc Độ Xử Lý 24/7</div>
                                <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                    Quét mã tự động và đối soát trọng lượng chính xác đến từng gram.
                                </p>
                            </div>

                            <!-- Cột 3: 63 -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition smooth-transition">
                                <div class="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Độ Phủ Mạng Lưới</div>
                                <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterProvinces }}</div>
                                <div class="text-xs font-bold text-slate-800">Tỉnh &amp; Thành Phố</div>
                                <div class="text-[11px] font-semibold text-slate-500">10.000+ Điểm Phục Vụ</div>
                                <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                    Mạng lưới bưu tá chuyên trách giao nhận bưu gửi tận nơi toàn quốc.
                                </p>
                            </div>

                            <!-- Cột 4: 100% -->
                            <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-1.5 hover:border-blue-300 transition smooth-transition">
                                <div class="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Chính Sách An Toàn</div>
                                <div class="text-3xl font-black text-slate-900 tracking-tight font-mono">{{ counterInsurance }}</div>
                                <div class="text-xs font-bold text-slate-800">Bảo Hiểm Bưu Gửi</div>
                                <div class="text-[11px] font-semibold text-slate-500">Bảo Toàn Giá Trị Hàng Hóa</div>
                                <p class="text-[11.5px] text-slate-400 leading-relaxed pt-1 border-t border-slate-100">
                                    Cam kết bồi thường minh bạch theo quy chuẩn Bưu chính Quốc gia.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 2. SƠ ĐỒ HÀNH LANG KẾT NỐI BẮC - NAM (TRỤC XƯƠNG SỐNG) -->
                    <div id="network-corridor-section" class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm animate-fade-in delay-300">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                            <div class="border-l-4 border-blue-600 pl-3">
                                <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs block">
                                    Hành Lang Vận Tải Trục Xương Sống Bắc - Nam
                                </span>
                                <span class="text-[11px] text-slate-400">Liên kết 3 cụm khai thác trọng điểm qua mạng lưới cao tốc và đường bay</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                            <!-- Trạm 1 -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="font-mono text-xs font-extrabold text-blue-700">HUB-HN-01</span>
                                    <span class="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">MIỀN BẮC</span>
                                </div>
                                <div class="text-sm font-bold text-slate-800">Trung Tâm Khai Thác Hà Nội</div>
                                <p class="text-slate-500 text-[11px] leading-relaxed">
                                    Tiếp nhận và điều phối bưu phẩm khu vực Đồng bằng Sông Hồng và các tỉnh miền núi phía Bắc.
                                </p>
                            </div>

                            <!-- Trạm 2 -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="font-mono text-xs font-extrabold text-indigo-700">HUB-DN-01</span>
                                    <span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">MIỀN TRUNG</span>
                                </div>
                                <div class="text-sm font-bold text-slate-800">Trung Tâm Khai Thác Đà Nẵng</div>
                                <p class="text-slate-500 text-[11px] leading-relaxed">
                                    Trạm trung chuyển chiến lược kết nối Duyên hải Miền Trung và trục cao nguyên Tây Nguyên.
                                </p>
                            </div>

                            <!-- Trạm 3 -->
                            <div class="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                                <div class="flex items-center justify-between">
                                    <span class="font-mono text-xs font-extrabold text-emerald-700">HUB-HCM-01</span>
                                    <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">MIỀN NAM</span>
                                </div>
                                <div class="text-sm font-bold text-slate-800">Trung Tâm Khai Thác TP.HCM</div>
                                <p class="text-slate-500 text-[11px] leading-relaxed">
                                    Cửa ngõ luân chuyển hàng hóa trọng điểm Đông Nam Bộ và 13 tỉnh Đồng bằng Sông Cửu Long.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- 3. CẨM NANG HƯỚNG DẪN & QUY ĐỊNH GỬI HÀNG -->
                    <div id="guide-section" class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs animate-fade-in delay-400">
                        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                            <div class="text-blue-700 font-bold text-xs uppercase tracking-wider">
                                01. Vị Trí Mã Vận Đơn
                            </div>
                            <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                Mã gồm chuỗi ký tự in dưới mã vạch trên phiếu gửi giấy (Bill gửi), hoặc trong tin nhắn SMS / Email thông báo xác nhận gửi hàng thành công từ hệ thống.
                            </p>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                            <div class="text-indigo-700 font-bold text-xs uppercase tracking-wider">
                                02. Cam Kết Toàn Trình
                            </div>
                            <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                Tuyến Express hỏa tốc: <strong>12h - 24h</strong> liên tỉnh. Tuyến tiêu chuẩn đường bộ QL1A: <strong>36h - 48h</strong>. Bưu phẩm nội tỉnh phát trong ngày.
                            </p>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                            <div class="text-rose-700 font-bold text-xs uppercase tracking-wider">
                                03. Quy Cách Đóng Gói
                            </div>
                            <p class="text-slate-600 text-[11.5px] leading-relaxed">
                                Không nhận vận chuyển chất cháy nổ, tiền mặt, kim khí quý. Hàng dễ vỡ hoặc chất lỏng cần được bọc mút xốp bong bóng và đóng hộp carton nhiều lớp chắc chắn.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- 3. KHU VỰC SƠ ĐỒ, BẢN ĐỒ & THÔNG TIN BƯU GỬI (KHI CÓ DỮ LIỆU) -->
                <div v-show="!isNotFound && currentShipment" class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    
                    <!-- CỘT TRÁI (~65% / 8 of 12 cols trên Desktop, order-2 trên Mobile): Sơ Đồ Tuyến Luân Chuyển (Stepper + Bản Đồ) -->
                    <div class="order-2 lg:order-1 lg:col-span-8 b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between space-y-3">
                        <!-- Map Card Header Tối Giản -->
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <div class="flex items-center space-x-2">
                                <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">
                                    Sơ Đồ Tuyến Luân Chuyển Bưu Cục
                                </span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                    {{ isInterProvincial ? 'Tuyến Liên Tỉnh (6 Chặng)' : 'Tuyến Nội Tỉnh (4 Chặng)' }}
                                </span>
                            
                            </div>
                            <div class="flex items-center space-x-2">
                                <button 
                                    @click="fitVietnamView()" 
                                    type="button" 
                                    title="Xem toàn cảnh bản đồ Việt Nam (Hoàng Sa &amp; Trường Sa)"
                                    class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                                >
                                    <span>Toàn Cảnh VN</span>
                                </button>
                                <button 
                                    v-if="routeInfo"
                                    @click="fitRouteView()" 
                                    type="button" 
                                    title="Xem ôm sát tuyến xe luân chuyển bưu kiện"
                                    class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                                >
                                    <span>Tuyến Xe Chạy</span>
                                </button>
                            </div>
                        </div>

                        <!-- THANH TIẾN TRÌNH LUÂN CHUYỂN BƯU GỬI (B2B MINIMALIST STEPPER - DHL / FEDEX STYLE) -->
                        <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-3 sm:p-3.5">
                            <!-- Tiêu đề & Thông tin vị trí bưu gửi -->
                            <div class="flex flex-wrap items-center justify-between gap-2 mb-2.5 border-b border-slate-200/60 pb-1.5">
                                <div class="flex items-center space-x-2">
                                    <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                    <span class="text-xs font-bold text-slate-800 tracking-tight uppercase">Vị trí bưu gửi:</span>
                                    <strong class="text-blue-700 text-xs">
                                        {{ routeCheckpoints[currentCheckpointIndex]?.displayName }}
                                    </strong>
                                    <span class="text-slate-400 text-[10px]">({{ routeCheckpoints[currentCheckpointIndex]?.roleLabel }})</span>
                                </div>
                                <div class="font-mono text-[10.5px] font-bold text-blue-700">
                                    Chặng {{ currentCheckpointIndex + 1 }} / {{ routeCheckpoints.length }}
                                </div>
                            </div>

                            <!-- Khung Stepper Tối Giản B2B (Đồng nhất, không badge màu mè) -->
                            <div class="flex items-start justify-between relative pt-0.5 pb-0.5">
                                <!-- Từng Cụm Mốc Hành Trình (Flex-1) -->
                                <div 
                                    v-for="(cp, idx) in routeCheckpoints" 
                                    :key="cp.key" 
                                    class="flex-1 flex flex-col items-center text-center relative px-0.5"
                                >
                                    <!-- Rãnh kết nối giữa 2 mốc liên tiếp (Toán học căn chuẩn tâm 100%) -->
                                    <div 
                                        v-if="idx < routeCheckpoints.length - 1" 
                                        class="absolute top-[36px] -translate-y-1/2 left-1/2 w-full h-[2.5px] z-0 transition-colors duration-300"
                                        :class="idx < currentCheckpointIndex ? 'bg-blue-600' : 'bg-slate-200'"
                                    ></div>

                                    <!-- 1. Hàng trên: Tên giai đoạn tác nghiệp -->
                                    <div class="mb-1 h-4 flex items-center justify-center relative z-10">
                                        <span 
                                            :class="[
                                                'text-[10.5px] leading-none transition-colors',
                                                idx === currentCheckpointIndex ? (currentShipment?.status === 'DELIVERED' ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold') : (idx < currentCheckpointIndex ? 'text-slate-700 font-semibold' : 'text-slate-400 font-medium')
                                            ]"
                                        >
                                            {{ cp.stageName }}
                                        </span>
                                    </div>

                                    <!-- 2. Điểm Mốc Tròn / Biểu Tượng Trạng Thái -->
                                    <div class="relative my-0.5 flex items-center justify-center h-7 z-10">
                                        <!-- Mốc Hiện Tại (Active): Nổi bật với Ring màu trạng thái & Icon phương tiện -->
                                        <div 
                                            v-if="idx === currentCheckpointIndex"
                                            :class="[
                                                'w-7 h-7 rounded-full text-white flex items-center justify-center transition-transform hover:scale-105 cursor-pointer shadow-sm',
                                                currentShipment?.status === 'DELIVERED' ? 'bg-emerald-600 ring-4 ring-emerald-100 shadow-emerald-500/20' : 'bg-blue-600 ring-4 ring-blue-100 pulse-active shadow-blue-500/20'
                                            ]"
                                            :title="'Đang xử lý tại: ' + cp.displayName + (cp.address ? ' | ' + cp.address : '')"
                                        >
                                            <!-- Icon Bưu tá xe máy khi OUT_FOR_DELIVERY -->
                                            <svg v-if="activePinType === 'shipper'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                                <circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M12 18V8l3 3h4"/><circle cx="12" cy="5" r="1"/>
                                            </svg>
                                            <!-- Icon Tích xanh thành công khi DELIVERED -->
                                            <svg v-else-if="activePinType === 'success'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                            </svg>
                                            <!-- Icon Xe tải bưu chính mặc định -->
                                            <svg v-else class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M18 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM6 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                                                <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 17c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11-7h2.5l2 2.67V15H17v-5zm1 7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                                            </svg>
                                        </div>

                                        <!-- Mốc Đã Qua (Completed): Nền xanh dương đậm, tích kiểm trắng gọn gàng -->
                                        <div 
                                            v-else-if="idx < currentCheckpointIndex"
                                            class="w-6 h-6 rounded-full bg-blue-600 text-white shadow-2xs flex items-center justify-center cursor-pointer hover:bg-blue-700 transition"
                                            :title="'Đã hoàn thành qua: ' + cp.displayName"
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                                            </svg>
                                        </div>

                                        <!-- Mốc Chưa Đến (Upcoming): Vòng tròn xám trung tính, số thứ tự mốc -->
                                        <div 
                                            v-else
                                            class="w-6 h-6 rounded-full bg-white border-2 border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-bold font-mono shadow-2xs"
                                            :title="'Chờ xử lý: ' + cp.displayName"
                                        >
                                            {{ idx + 1 }}
                                        </div>
                                    </div>

                                    <!-- 3. Hàng dưới: Thông tin bưu cục tinh gọn chuẩn B2B -->
                                    <div class="mt-1.5 w-full max-w-[115px] flex flex-col items-center">
                                        <!-- Tên bưu cục / trạm địa danh chính -->
                                        <div 
                                            :class="[
                                                'text-[11px] font-semibold leading-tight text-center max-w-full truncate px-0.5 transition-colors',
                                                idx === currentCheckpointIndex ? (currentShipment?.status === 'DELIVERED' ? 'text-emerald-700 font-bold' : 'text-blue-700 font-bold') : (idx < currentCheckpointIndex ? 'text-slate-700' : 'text-slate-400 font-normal')
                                            ]"
                                            :title="cp.displayName + (cp.code ? ' (' + cp.code + ')' : '') + (cp.roleLabel ? ' • ' + cp.roleLabel : '') + (cp.address ? ' | ' + cp.address : '')"
                                        >
                                            {{ cp.displayName }}
                                        </div>

                                        <!-- Mã định danh trạm (Tinh gọn, chỉ hiển thị nếu khác tên trạm và không phải người nhận) -->
                                        <div 
                                            v-if="cp.code && cp.code !== cp.displayName && cp.code !== 'NGƯỜI NHẬN'"
                                            :class="[
                                                'text-[9.5px] font-mono mt-0.5 tracking-tight px-1 rounded transition-colors',
                                                idx === currentCheckpointIndex ? (currentShipment?.status === 'DELIVERED' ? 'text-emerald-600 font-medium' : 'text-blue-600 font-medium') : (idx < currentCheckpointIndex ? 'text-slate-500' : 'text-slate-400')
                                            ]"
                                        >
                                            {{ cp.code }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Khung Bản Đồ Leaflet -->
                        <div class="flex-1 min-h-[460px] relative rounded-lg overflow-hidden border border-slate-200">
                            <div id="tracking-map" style="height: 460px; width: 100%;"></div>
                        </div>
                    </div>

                    <!-- CỘT PHẢI (~35% / 4 of 12 cols trên Desktop, order-1 trên Mobile): Khối Tra Cứu & Khối Thông Tin Bưu Gửi Chi Tiết -->
                    <div class="order-1 lg:order-2 lg:col-span-4 space-y-4">
                        <!-- 1. Thẻ Tra Cứu Vận Đơn (Cho phép tra tiếp mã khác hoặc làm mới) -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <div class="flex items-center space-x-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                    <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">Tra Cứu Bưu Gửi</span>
                                </div>
                                <span class="text-[10px] text-slate-400 font-mono">Hỗ trợ mã WB...</span>
                            </div>

                            <div class="space-y-2.5">
                                <div class="relative">
                                    <input 
                                        id="tracking-search-input"
                                        v-model="searchCode" 
                                        @keyup.enter="fetchTrackingData()"
                                        @input="validationError = ''"
                                        type="text" 
                                        placeholder="Nhập mã số bưu gửi (VD: WB...)" 
                                        class="w-full pl-8 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                                    />
                                    <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <button 
                                        v-if="searchCode" 
                                        @click="searchCode = ''; validationError = ''; currentShipment = null; isNotFound = false; animateNumbers()" 
                                        class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                                        title="Xóa mã &amp; về trang chủ"
                                        aria-label="Xóa"
                                    >
                                        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                    </button>
                                </div>

                                <div class="flex items-center space-x-2">
                                    <button 
                                        @click="fetchTrackingData()"
                                        :disabled="isLoading"
                                        class="flex-1 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm shadow-blue-500/20 transition disabled:opacity-50 flex items-center justify-center space-x-1.5 cursor-pointer"
                                    >
                                        <span v-if="isLoading" class="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></span>
                                        <span>{{ isLoading ? 'Đang Tra Cứu...' : 'Tra Cứu Tiếp' }}</span>
                                    </button>
                                    <button 
                                        type="button"
                                        @click="searchCode = ''; validationError = ''; currentShipment = null; isNotFound = false; animateNumbers()" 
                                        class="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                                        title="Làm mới quay lại ban đầu"
                                    >
                                        Làm Mới
                                    </button>
                                </div>

                                <!-- Lỗi Validation Inline -->
                                <div v-if="validationError" class="text-rose-600 text-[11px] font-semibold flex items-center space-x-1.5 pt-1 animate-pulse">
                                    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    <span>{{ validationError }}</span>
                                </div>

                                <!-- Gợi ý nhanh mã -->
                                <div class="pt-2 border-t border-slate-100 flex items-center flex-wrap gap-1.5">
                                    <span class="text-[10px] text-slate-400 font-medium">Gợi ý:</span>
                                    <button 
                                        v-for="code in ['WB-HN-SG-001', 'WB-HN-HP-002', 'WB-DN-HCM-003']" 
                                        :key="code"
                                        @click="searchCode = code; fetchTrackingData(code)"
                                        type="button"
                                        class="px-2 py-0.5 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-mono text-[10.5px] cursor-pointer transition"
                                    >
                                        {{ code }}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 2. Thẻ Thông Tin Bưu Gửi Chi Tiết -->
                        <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm space-y-3 text-xs">
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                <span class="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                                    <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Thông Tin Bưu Gửi</span>
                                </span>
                                <span v-if="currentShipment" class="font-mono text-[11px] text-slate-400">#{{ currentShipment.id }}</span>
                            </div>

                            <div v-if="currentShipment" class="space-y-2.5">
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Mã bưu gửi:</span>
                                    <span class="font-mono font-extrabold text-blue-700 text-sm">{{ currentShipment.trackingCode }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Trạng thái:</span>
                                    <span :class="['px-2.5 py-0.5 rounded-full font-bold text-[11px] border', Utils.getStatusBadgeClass(currentShipment.status)]">
                                        {{ Utils.formatStatusText(currentShipment.status) }}
                                    </span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Dịch vụ:</span>
                                    <span class="font-bold text-slate-700">{{ currentShipment.serviceType || 'EXPRESS' }}</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Khối lượng tính cước:</span>
                                    <span class="font-mono font-bold text-slate-800">{{ currentShipment.weight || 0 }} kg</span>
                                </div>
                                <div class="flex justify-between py-1 border-b border-slate-50">
                                    <span class="text-slate-500 font-medium">Tiền thu hộ COD:</span>
                                    <span class="font-mono font-bold text-emerald-700 text-sm">{{ Utils.formatCurrency(currentShipment.codAmount) }}</span>
                                </div>
                                <div class="py-1 border-b border-slate-50">
                                    <span class="text-slate-500 block mb-0.5 font-medium">Người gửi:</span>
                                    <div class="text-slate-800 font-semibold flex items-center justify-between">
                                        <span>{{ currentShipment.senderName || 'N/A' }}</span>
                                        <span class="font-mono text-slate-500 font-medium text-[11px]" :title="currentShipment.senderPhone">{{ maskPhone(currentShipment.senderPhone) }}</span>
                                    </div>
                                    <span class="text-slate-600 text-[11px] block mt-0.5 leading-relaxed">{{ currentShipment.senderAddress || 'N/A' }}</span>
                                </div>
                                <div class="py-1">
                                    <span class="text-slate-500 block mb-0.5 font-medium">Người nhận:</span>
                                    <div class="text-slate-800 font-semibold flex items-center justify-between">
                                        <span>{{ currentShipment.receiverName || 'N/A' }}</span>
                                        <span class="font-mono text-slate-500 font-medium text-[11px]" :title="currentShipment.receiverPhone">{{ maskPhone(currentShipment.receiverPhone) }}</span>
                                    </div>
                                    <span class="text-slate-600 text-[11px] block mt-0.5 leading-relaxed">{{ currentShipment.receiverAddress || 'N/A' }}</span>
                                </div>

                                <!-- Nút đánh giá bưu gửi & Shipper khi đã DELIVERED -->
                                <div v-if="currentShipment.status === 'DELIVERED'" class="pt-3 mt-1 border-t border-slate-100">
                                    <button 
                                        v-if="!ratingState.alreadyRated"
                                        type="button" 
                                        @click="openRatingModal()" 
                                        class="w-full py-2.5 px-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-amber-500/25 hover:shadow-amber-500/40 flex items-center justify-center space-x-1.5 cursor-pointer group"
                                        title="Đánh giá chất lượng phục vụ và bưu tá giao hàng"
                                    >
                                        <svg class="w-4 h-4 text-white group-hover:rotate-12 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                        </svg>
                                        <span>Đánh Giá Bưu Gửi &amp; Shipper</span>
                                        <svg class="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                                    </button>

                                    <div v-else class="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/70 flex items-center justify-between text-xs">
                                        <div class="flex items-center space-x-1.5">
                                            <div class="flex text-amber-500">
                                                <svg v-for="s in (ratingState.serviceRating || 5)" :key="s" class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                                </svg>
                                            </div>
                                            <span class="font-bold text-amber-800 text-[11px]">Đã đánh giá {{ ratingState.serviceRating }}/5 sao</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            @click="openRatingModal()" 
                                            class="text-[10px] text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                                        >
                                            Chi tiết
                                        </button>
                                    </div>
                                </div>

                                <!-- Nút chuyển tiếp Hỗ Trợ & Khiếu Nại Bưu Gửi -->
                                <div class="pt-3 mt-1 border-t border-slate-100">
                                    <button 
                                        type="button" 
                                        @click="navigateToSupport()" 
                                        class="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 border border-blue-200/80 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                                        title="Gửi yêu cầu hỗ trợ hoặc phản ánh sự cố cho bưu gửi này"
                                    >
                                        <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        <span>Khiếu Nại / Hỗ Trợ Bưu Gửi Này</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. LỊCH SỬ LUÂN CHUYỂN BƯU CỤC (SMART ICON VERTICAL TIMELINE) -->
                <div v-show="!isNotFound && currentShipment" class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 text-xs">
                    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-4">
                        <div class="flex items-center space-x-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">
                                Lịch Sử Luân Chuyển Bưu Cục
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ sortedHistory.length }} Mốc Quét
                            </span>
                            <span v-if="mergedMilestoneCount > 0" class="text-[10px] font-medium text-slate-400">
                                đã gộp {{ mergedMilestoneCount }} mốc trùng
                            </span>
                        </div>
                        
                    </div>

                    <!-- VERTICAL TIMELINE WITH SMART ICONS -->
                    <div v-if="sortedHistory.length > 0" class="relative pl-7 sm:pl-10 space-y-3 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-200">
                        <div v-for="(h, idx) in sortedHistory" :key="h.eventId || h.operationId || idx" class="relative flex items-start group">
                            <!-- Icon Thông Minh Tròn Theo Trạng Thái -->
                            <div :class="[
                                'absolute -left-[35px] sm:-left-[43px] mt-1 w-9 h-9 rounded-full text-white border-4 border-white shadow-md flex items-center justify-center z-10',
                                getStatusIconConfig(h.status).bg,
                                idx === 0 ? 'pulse-active ring-2 ring-blue-500/30' : 'shadow-sm'
                            ]">
                                <!-- 1. Truck / Luân Chuyển -->
                                <svg v-if="getStatusIconConfig(h.status).icon === 'truck'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                                <!-- 2. Package / Đã Tiếp Nhận -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'package'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                <!-- 3. Route / Phân Tuyến -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'route'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <!-- 4. Courier / Bưu Tá Phát -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'courier'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <!-- 5. Warehouse / Đến Kho Đích -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'warehouse'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <!-- 6. Check / Giao Thành Công -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'check'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <!-- 7. Alert / Thất Bại -->
                                <svg v-else-if="getStatusIconConfig(h.status).icon === 'alert'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <!-- 8. Document / Khởi Tạo Mặc Định -->
                                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>

                            <!-- Khung nội dung 3 tầng -->
                            <div :class="[
                                'flex-1 rounded-2xl p-3 transition smooth-transition',
                                idx === 0 
                                    ? 'bg-blue-50/40 border border-blue-200/80 shadow-sm hover:border-blue-300' 
                                    : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                            ]">
                                <!-- Tầng 1: Thời gian -->
                                <div class="flex items-center justify-between mb-1.5">
                                    <span :class="['font-mono text-xs font-bold', idx === 0 ? 'text-blue-700' : 'text-slate-500']">
                                        {{ Utils.formatTime(h.timestamp || h.occurredAt) }}
                                    </span>
                                    <span v-if="idx === 0 && formatRelativeTime(h.timestamp || h.occurredAt)" class="text-[11px] font-mono text-blue-600 font-semibold">
                                        {{ formatRelativeTime(h.timestamp || h.occurredAt) }}
                                    </span>
                                </div>

                                <!-- Tầng 2: Trạng thái & Địa điểm bưu cục -->
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span :class="['px-2.5 py-0.5 rounded-lg text-xs font-bold border', Utils.getStatusBadgeClass(h.status)]">
                                        {{ Utils.formatStatusText(h.status, h.location || h.locationCode) }}
                                    </span>
                                    <span class="text-xs font-bold text-slate-800">
                                        {{ getPostOfficeDisplayName(h.location || h.locationCode) || h.location || h.locationCode || 'Bưu Cục Trung Tâm' }}
                                    </span>
                                    <span v-if="(h.location || h.locationCode) && getPostOfficeDisplayName(h.location || h.locationCode) !== (h.location || h.locationCode)" class="text-[10px] text-slate-400 font-mono">
                                        ({{ h.location || h.locationCode }})
                                    </span>
                                </div>

                                <!-- Metadata tác nghiệp (chuẩn hoá nhãn, bỏ actor uuid gây nhiễu) -->
                                <div v-if="h.operationType || h.transportLeg || h.tripCode || (h.mergedCount || 0) > 1" class="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px] font-mono text-slate-500">
                                    <span v-if="(h.mergedCount || 0) > 1" class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">Đã gộp {{ h.mergedCount }} mốc</span>
                                    <span v-if="h.operationType" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Loại: {{ Utils.formatOperationType(h.operationType) }}</span>
                                    <span v-if="h.transportLeg" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Chặng: {{ Utils.formatTransportLeg(h.transportLeg) }}</span>
                                    <span v-if="h.tripCode" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Chuyến: {{ h.tripCode }}</span>
                                </div>

                                <!-- Các bước trong cụm tác nghiệp 1-Click (nhận → lưu kho → bàn giao) -->
                                <div v-if="h.subSteps && h.subSteps.length" class="flex flex-wrap items-center gap-1 mb-1.5">
                                    <template v-for="(step, sIdx) in h.subSteps" :key="step">
                                        <span class="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold">{{ step }}</span>
                                        <span v-if="sIdx < h.subSteps.length - 1" class="text-slate-300 text-[10px]">→</span>
                                    </template>
                                </div>

                                <!-- Tầng 3: Ghi chú chi tiết hành trình (clamp 2 dòng, mở rộng toàn danh sách) -->
                                <p :class="['text-xs leading-relaxed', historyExpanded ? '' : 'line-clamp-2', idx === 0 ? 'text-slate-700' : 'text-slate-500']" :title="safeFormatHistoryNote(h)">
                                    {{ safeFormatHistoryNote(h) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-10 text-xs text-slate-400">
                        Chưa có lịch sử luân chuyển nào cho mã bưu gửi này.
                    </div>
                <!-- 5. MODAL ĐÁNH GIÁ BƯU GỬI & SHIPPER (VNPT LIGHT THEME) -->
                <div v-if="isRatingModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs modal-backdrop-enter">
                    <div class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden modal-box-enter text-slate-800">
                        <!-- Modal Header -->
                        <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div class="flex items-center space-x-2.5">
                                <div class="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-500 flex items-center justify-center">
                                    <svg class="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                    </svg>
                                </div>
                                <div>
                                    <h3 class="text-slate-900 font-bold text-sm sm:text-base leading-tight">Đánh giá bưu gửi &amp; Shipper</h3>
                                    <p class="text-slate-500 text-xs">Vận đơn: <span class="font-mono font-semibold text-[#0055bb]">{{ currentShipment?.trackingCode }}</span></p>
                                </div>
                            </div>
                            <button @click="closeRatingModal" type="button" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>

                        <!-- Form View -->
                        <div v-if="!ratingResultView" class="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                            <!-- Shipper Info Card -->
                            <div class="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between">
                                <div class="flex items-center space-x-3">
                                    <div class="w-10 h-10 rounded-full bg-[#0055bb] text-white font-bold flex items-center justify-center text-xs shadow-xs">
                                        NV
                                    </div>
                                    <div>
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-xs sm:text-sm font-bold text-slate-900">{{ currentShipment?.courierName || currentShipment?.shipperName || 'Bưu tá VNPT Post' }}</span>
                                            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-[#004488]">Tài xế giao hàng</span>
                                        </div>
                                        <p class="text-[11px] text-slate-500">Mã bưu tá: <span class="font-mono font-semibold text-slate-700">{{ currentShipment?.courierCode || currentShipment?.shipperCode || 'VNPT-POST' }}</span></p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="flex items-center text-amber-500 text-xs font-bold justify-end gap-0.5">
                                        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                                        <span>4.9</span>
                                    </div>
                                    <span class="text-[10px] text-slate-400">Đơn đã giao</span>
                                </div>
                            </div>

                            <!-- Phone Verification (4 digits) -->
                            <div class="space-y-1">
                                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Xác thực người nhận <span class="text-rose-500">*</span>
                                </label>
                                <div class="relative">
                                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                                    </div>
                                    <input 
                                        type="text" 
                                        maxlength="4"
                                        v-model="ratingPhone"
                                        placeholder="Nhập 4 số cuối SĐT người nhận (vd: 7890)"
                                        class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055bb] focus:bg-white text-slate-900 transition font-mono font-semibold"
                                    />
                                </div>
                                <p class="text-[11px] text-slate-500">Nhập 4 số cuối số điện thoại nhận hàng của đơn này để bảo mật thông tin.</p>
                            </div>

                            <!-- Star Rating Section -->
                            <div class="text-center py-2 space-y-2.5 bg-slate-50/60 rounded-xl border border-slate-100 p-3.5">
                                <p class="text-xs sm:text-sm font-bold text-slate-800">Mức độ hài lòng của bạn</p>
                                
                                <div class="flex items-center justify-center space-x-2">
                                    <button 
                                        v-for="star in 5" 
                                        :key="star"
                                        type="button" 
                                        @mouseenter="hoveredServiceScore = star"
                                        @mouseleave="hoveredServiceScore = 0"
                                        @click="setServiceScore(star)"
                                        :class="[
                                            'p-1 rounded-lg focus:outline-none transition-transform hover:scale-125 active:scale-95 cursor-pointer',
                                            lastBouncedStar === star ? 'animate-star-bounce' : ''
                                        ]"
                                    >
                                        <svg 
                                            :class="[
                                                'w-8 h-8 sm:w-9 sm:h-9 transition-all duration-200',
                                                (hoveredServiceScore || serviceScore) >= star 
                                                    ? 'text-amber-400 star-glow fill-amber-400' 
                                                    : 'text-slate-300 fill-transparent stroke-slate-300 hover:text-amber-300'
                                            ]" 
                                            viewBox="0 0 24 24" 
                                            stroke="currentColor" 
                                            stroke-width="1.5"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.175 0l-3.976 2.888c-.783.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                                        </svg>
                                    </button>
                                </div>

                                <div class="h-7 flex items-center justify-center">
                                    <span :class="['px-3.5 py-0.5 rounded-full text-xs font-bold border transition-all duration-200', ratingMeta[hoveredServiceScore || serviceScore]?.badgeClass]">
                                        {{ (hoveredServiceScore || serviceScore) }} Sao: {{ ratingMeta[hoveredServiceScore || serviceScore]?.label }}
                                    </span>
                                </div>
                            </div>

                            <!-- Adaptive Quick Tags -->
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-bold text-slate-700">Cảm nhận nhanh của bạn:</label>
                                    <span class="text-[11px] text-slate-400">Chọn 1 hoặc nhiều tiêu chí</span>
                                </div>
                                <div class="flex flex-wrap gap-1.5">
                                    <button 
                                        v-for="tag in (ratingMeta[serviceScore]?.tags || [])" 
                                        :key="tag"
                                        type="button" 
                                        @click="toggleRatingTag(tag)"
                                        :class="[
                                            'px-3 py-1 text-xs rounded-xl border transition-all duration-200 select-none cursor-pointer',
                                            selectedRatingTags.includes(tag) 
                                                ? 'bg-[#0055bb] text-white border-[#0055bb] shadow-2xs font-semibold scale-[1.02]' 
                                                : 'border-slate-200 text-slate-600 hover:border-blue-400 hover:text-slate-900 bg-white'
                                        ]"
                                    >
                                        {{ tag }}
                                    </button>
                                </div>
                            </div>

                            <!-- Comment Box with Counter -->
                            <div class="space-y-1">
                                <div class="flex items-center justify-between">
                                    <label class="text-xs font-bold text-slate-700">Nhận xét chi tiết (Tùy chọn)</label>
                                    <span class="text-[11px] text-slate-400 font-mono">{{ ratingComment.length }} / 500</span>
                                </div>
                                <textarea 
                                    v-model="ratingComment"
                                    rows="3" 
                                    maxlength="500"
                                    :placeholder="ratingMeta[serviceScore]?.placeholder"
                                    class="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0055bb] focus:bg-white text-slate-900 resize-none transition placeholder:text-slate-400"
                                ></textarea>
                            </div>

                            <!-- Action Buttons -->
                            <div class="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                                <button 
                                    type="button" 
                                    @click="closeRatingModal" 
                                    class="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                                >
                                    Hủy bỏ
                                </button>
                                <button 
                                    type="button"
                                    @click="submitRating" 
                                    :disabled="isSubmittingRating"
                                    class="px-5 py-2 text-xs font-bold rounded-xl vnpt-gradient text-white hover:opacity-95 shadow-md shadow-blue-600/20 active:scale-95 transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    <span v-if="isSubmittingRating" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>{{ isSubmittingRating ? 'Đang gửi...' : 'Xác nhận gửi đánh giá' }}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Result View (Branching) -->
                        <div v-else class="p-6 text-center space-y-4">
                            <div :class="[
                                'w-14 h-14 mx-auto rounded-full flex items-center justify-center shadow-md animate-check-pop',
                                ratingResultView === 'positive' ? 'bg-emerald-100 text-emerald-600 border border-emerald-300' : 'bg-rose-100 text-rose-600 border border-rose-300'
                            ]">
                                <svg v-if="ratingResultView === 'positive'" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                                </svg>
                                <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>

                            <div class="space-y-1">
                                <h4 class="text-base font-extrabold text-slate-900">
                                    {{ ratingResultView === 'positive' ? 'Cảm ơn bạn đã đánh giá dịch vụ!' : 'VNPT Post xin lỗi vì trải nghiệm chưa tốt!' }}
                                </h4>
                                <p class="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                                    {{ ratingResultView === 'positive' 
                                        ? 'Đánh giá tích cực của bạn đã được ghi nhận và cộng trực tiếp vào chỉ số KPI thưởng dịch vụ của bưu tá.' 
                                        : 'Hệ thống đã tự động ghi nhận góp ý phản ánh. Đội ngũ CSKH và trưởng bưu cục sẽ kiểm tra và hỗ trợ bạn kịp thời.' }}
                                </p>
                            </div>

                            <div class="p-3.5 rounded-xl border border-slate-200 text-left text-xs space-y-2 bg-slate-50 max-w-sm mx-auto">
                                <div class="flex items-center justify-between text-xs text-slate-600">
                                    <span>Mức đánh giá:</span>
                                    <span class="font-bold text-amber-500">{{ serviceScore }} ⭐ ({{ ratingMeta[serviceScore]?.label }})</span>
                                </div>
                                <div v-if="ratingResultView === 'positive'" class="flex items-center justify-between text-xs text-slate-600">
                                    <span>Điểm thưởng KPI Shipper:</span>
                                    <span class="font-bold text-emerald-600">+5 Điểm thưởng dịch vụ</span>
                                </div>
                                <div v-if="ratingResultView === 'negative'" class="flex items-center justify-between text-xs text-slate-600">
                                    <span>Hỗ trợ khẩn cấp CSKH:</span>
                                    <span class="font-bold text-[#0055bb]">1800 1060 (Miễn phí)</span>
                                </div>
                                <div class="flex items-center justify-between text-xs text-slate-600">
                                    <span>Đồng bộ trạng thái:</span>
                                    <span class="font-mono font-semibold text-[#0055bb]">Kafka: shipment-feedbacks</span>
                                </div>
                            </div>

                            <div class="pt-2 flex items-center justify-center gap-2">
                                <button 
                                    v-if="ratingResultView === 'negative'"
                                    type="button" 
                                    @click="closeRatingModal(); navigateToSupport();" 
                                    class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                                    <span>Mở phiếu khiếu nại CSKH</span>
                                </button>
                                <button 
                                    type="button" 
                                    @click="closeRatingModal" 
                                    class="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>
        `
    };

    window.TrackingView = TrackingView;
})();
