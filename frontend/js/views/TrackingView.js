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
            }
        },
        emits: ['back-previous'],
        setup(props, { emit }) {
            const previousTab = computed(() => props.previousTab);
            const searchCode = ref(props.trackingCode || '');
            const isLoading = ref(false);
            const isLiveTracking = ref(true);

            const validationError = ref('');
            const isNotFound = ref(false);
            const notFoundCode = ref('');

            const currentShipment = ref(null);
            const trackingHistory = ref([]);
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
                    operation.status
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

            const safeFormatHistoryNote = (historyItem) => {
                const fallback = firstValue(historyItem?.note, historyItem?.node, historyItem?.status, '');
                const nodeText = firstValue(historyItem?.node, historyItem?.note);
                // Preserve the existing node formatter for tracking records while showing an explicit operation note verbatim.
                if (hasValue(historyItem?.note) && historyItem.note !== historyItem.node) return historyItem.note;
                const result = callUtils('formatNodeText', nodeText, historyItem?.status);
                return result && typeof result.then !== 'function' && hasValue(result) ? result : fallback;
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
            const routeCheckpoints = computed(() => {
                const inter = isInterProvincial.value;
                if (inter) {
                    return [
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
                    ];
                } else {
                    return [
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
                }
            });

            // Chỉ số mốc đang tác nghiệp (0-indexed)
            const currentCheckpointIndex = computed(() => {
                const s = currentShipment.value?.status;
                const inter = isInterProvincial.value;

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
                return list.sort((a, b) => {
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
            });

            // Đơn đã kết thúc hành trình thì dừng polling. DELIVERY_FAILED vẫn phải được theo dõi
            // để giữ luồng giao lại / chuyển hoàn của nghiệp vụ hiện hữu.
            const isFinalState = computed(() => {
                const status = String(currentShipment.value?.status || '').toUpperCase();
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
                    case 'PICKED_UP':
                        return { bg: 'bg-amber-500', icon: 'package' };
                    case 'ROUTE_ASSIGNED':
                    case 'PENDING_ROUTING':
                        return { bg: 'bg-slate-600', icon: 'route' };
                    case 'FAILED':
                    case 'DELIVERY_FAILED':
                        return { bg: 'bg-rose-500', icon: 'alert' };
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

                if (!code.startsWith('WB')) {
                    validationError.value = 'Mã bưu gửi không đúng định dạng. Mã chuẩn bắt đầu bằng "WB" (Ví dụ: WB1788...).';
                    return;
                }

                if (code.length < 6) {
                    validationError.value = 'Mã bưu gửi quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.';
                    return;
                }

                isLoading.value = true;
                isNotFound.value = false;
                notFoundCode.value = '';

                try {
                    // Nạp trạng thái, chi tiết đơn và lịch sử định tuyến song song để tránh làm chậm
                    // timeline khi routing service chỉ là một wrapper tùy chọn.
                    const routingHistoryPromise = loadRoutingOperationHistory(code);
                    const [data, detail, routingHistory] = await Promise.all([
                        Promise.resolve(TrackingService.getFullTracking(code)),
                        loadShipmentDetail(code),
                        routingHistoryPromise
                    ]);

                    currentShipment.value = {
                        ...(detail || {}),
                        trackingCode: code,
                        status: data.currentStatus,
                        source: data.source
                    };
                    trackingHistory.value = mergeHistory(
                        data.history || data.lifecycleHistory || data.trackingHistory || data.events || [],
                        routingHistory
                    );
                    if (isFinalState.value) {
                        stopLivePolling();
                    } else if (isLiveTracking.value && !livePollTimer) {
                        startLivePolling();
                    }

                    // Vẽ bản đồ lộ trình dựa trên hành trình thật
                    await nextTick();
                    if (window.MapManager) {
                        window.MapManager.init('tracking-map');
                        if (lastRenderedCode.value === code) {
                            const latestMilestone = sortedHistory.value[0];
                            window.MapManager.updateProgress(data.currentStatus, latestMilestone?.node || '', latestMilestone?.locationCode || null);
                        } else {
                            routeInfo.value = await window.MapManager.renderRoute(
                                trackingHistory.value,
                                data.currentStatus,
                                true,
                                currentShipment.value
                            );
                            lastRenderedCode.value = code;
                        }
                    }

                    showToast('Thành Công', `Đã nạp dữ liệu hành trình bưu gửi ${code}`);
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
                    if (!newStatus || newStatus === currentShipment.value.status) return;

                    currentShipment.value = { ...currentShipment.value, status: newStatus, source: st.source };
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
                    const latestMilestone = (trackingHistory.value || [])[trackingHistory.value.length - 1];

                    if (window.MapManager) {
                        window.MapManager.updateProgress(newStatus, latestMilestone?.node || '', latestMilestone?.locationCode || null);
                    }

                    showToast('Cập Nhật Tự Động', `Bưu gửi vừa chuyển sang: ${safeFormatStatusText(newStatus)}`);
                    if (isFinalState.value) {
                        // DELIVERED/CANCELLED/RETURNED are terminal; DELIVERY_FAILED intentionally is not.
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
                Utils: getUtilsApi() || {}
            };
        },
        template: `
            <div class="space-y-4 pb-10 text-slate-800">
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
                        <span>← Quay lại {{ previousTab.name }}</span>
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
                                    class="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                                >
                                    ✕
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
                                        class="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                                        title="Xóa mã &amp; về trang chủ"
                                    >
                                        ✕
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
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. LỊCH SỬ LUÂN CHUYỂN BƯU CỤC (SMART ICON VERTICAL TIMELINE) -->
                <div v-show="!isNotFound && currentShipment" class="b2b-card bg-white border border-slate-200 rounded-xl shadow-sm p-5 sm:p-6 text-xs">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
                        <div class="flex items-center space-x-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                            <span class="font-extrabold text-slate-800 uppercase tracking-wider text-xs">
                                Lịch Sử Luân Chuyển Bưu Cục
                            </span>
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {{ sortedHistory.length }} Mốc Quét
                            </span>
                        </div>
                    </div>

                    <!-- VERTICAL TIMELINE WITH SMART ICONS -->
                    <div v-if="sortedHistory.length > 0" class="relative pl-7 sm:pl-10 space-y-5 before:absolute before:left-[17px] sm:before:left-[21px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-200">
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
                                'flex-1 rounded-2xl p-4 transition smooth-transition',
                                idx === 0 
                                    ? 'bg-blue-50/40 border border-blue-200/80 shadow-sm hover:border-blue-300' 
                                    : 'bg-white border border-slate-200 shadow-sm hover:border-slate-300'
                            ]">
                                <!-- Tầng 1: Thời gian -->
                                <div class="flex items-center justify-between mb-1.5">
                                    <span :class="['font-mono text-xs font-bold', idx === 0 ? 'text-blue-700' : 'text-slate-500']">
                                        {{ Utils.formatTime(h.timestamp || h.occurredAt) }}
                                    </span>
                                    <span v-if="formatRelativeTime(h.timestamp || h.occurredAt)" :class="['text-[11px] font-mono', idx === 0 ? 'text-blue-600 font-semibold' : 'text-slate-400']">
                                        {{ formatRelativeTime(h.timestamp || h.occurredAt) }}
                                    </span>
                                </div>

                                <!-- Tầng 2: Trạng thái & Địa điểm bưu cục -->
                                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                    <span :class="['px-2.5 py-0.5 rounded-lg text-xs font-bold border', Utils.getStatusBadgeClass(h.status)]">
                                        {{ Utils.formatStatusText(h.status) }}
                                    </span>
                                    <span class="text-xs font-bold text-slate-800">
                                        {{ getPostOfficeDisplayName(h.location || h.locationCode) || h.location || h.locationCode || 'Bưu Cục Trung Tâm' }}
                                    </span>
                                    <span v-if="(h.location || h.locationCode) && getPostOfficeDisplayName(h.location || h.locationCode) !== (h.location || h.locationCode)" class="text-[10px] text-slate-400 font-mono">
                                        ({{ h.location || h.locationCode }})
                                    </span>
                                </div>

                                <!-- Metadata tác nghiệp chỉ hiển thị khi backend trả về -->
                                <div v-if="h.operationType || h.transportLeg || h.tripCode || h.actorId" class="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px] font-mono text-slate-500">
                                    <span v-if="h.operationType" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Loại: {{ h.operationType }}</span>
                                    <span v-if="h.transportLeg" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Chặng: {{ h.transportLeg }}</span>
                                    <span v-if="h.tripCode" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Chuyến: {{ h.tripCode }}</span>
                                    <span v-if="h.actorId" class="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">Tác nhân: {{ h.actorId }}</span>
                                </div>

                                <!-- Tầng 3: Ghi chú chi tiết hành trình -->
                                <p :class="['text-xs leading-relaxed', idx === 0 ? 'text-slate-700' : 'text-slate-500']">
                                    {{ safeFormatHistoryNote(h) }}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-10 text-xs text-slate-400">
                        Chưa có lịch sử luân chuyển nào cho mã bưu gửi này.
                    </div>
                </div>
            </div>
        `
    };

    window.TrackingView = TrackingView;
})();
