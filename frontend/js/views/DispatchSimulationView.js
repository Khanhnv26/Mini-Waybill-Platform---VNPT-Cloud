/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: TRUNG TÂM ĐIỀU PHỐI & MÔ PHỎNG LỘ TRÌNH (CONTROL TOWER)
 * Phong Cách B2B Tối Giản, Dữ Liệu Thật 100% Từ CSDL & Kafka Event Stream
 * Phân quyền: ROLE_ADMIN / Điều Phối Viên Toàn Tuyến
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted, onUnmounted, nextTick } = Vue;

    const DispatchSimulationView = {
        name: 'DispatchSimulationView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const isLoading = ref(false);
            const isRefreshing = ref(false);
            const isDetailLoading = ref(false);
            const isSimulating = ref(false);
            const simSpeedMultiplier = ref(1); // 1x | 2x | 4x
            const errorMessage = ref('');
            const routingErrorMessage = ref('');
            const lastOperationId = ref('');
            let simTimer = null;
            let selectionRequestId = 0;

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const selectedTrackingCode = ref('');
            const currentShipment = ref(null);
            const trackingHistory = ref([]);
            const kafkaAuditList = ref([]);
            const routeInfo = ref(null);
            const routingOperations = ref([]);
            const routingInventory = ref([]);
            const activeRoutingTrip = ref(null);

            // Màn hình này được giữ lại cho vai trò admin legacy; routing operations luôn được ưu tiên.
            const isLegacySimulator = ref(true);

            // Chuỗi trạng thái hợp lệ của shipment. ARRIVED_DEST_HUB là mốc vật lý bắt buộc trước khi bàn giao bưu tá.
            const STATE_FLOW = [
                { status: 'CREATED', loc: 'HUB-HN-01', note: 'Đơn hàng vừa được tạo, chờ khởi tạo hành trình' },
                { status: 'PENDING_ROUTING', loc: 'HUB-HN-01', note: 'Khởi tạo bưu gửi, chờ phân tuyến liên bưu cục' },
                { status: 'ROUTE_ASSIGNED', loc: 'HUB-HN-01', note: 'Hệ thống đã thiết lập tuyến luân chuyển qua các Hub' },
                { status: 'PICKED_UP', loc: 'HUB-HN-01', note: 'Bưu cục tiếp nhận đã hoàn tất gom bưu phẩm về kho chia chọn' },
                { status: 'IN_TRANSIT', loc: 'TRANSIT_CORRIDOR', note: 'Đóng chuyến xe container, lưu thông trên tuyến đường bộ' },
                { status: 'ARRIVED_DEST_HUB', loc: 'HUB-HCM-01', note: 'Chuyến xe đã cập bến đích và dỡ bưu gửi vào kho' },
                { status: 'OUT_FOR_DELIVERY', loc: 'DELIVERY_OFFICE', note: 'Kho Tổng đích đã bàn giao bưu gửi cho Bưu cục phát con, bưu tá đang đi phát' },
                { status: 'DELIVERED', loc: 'CUSTOMER_DEST', note: 'Bưu tá phát tận nơi thành công và thu tiền COD' }
            ];

            const VALID_TRANSITIONS = STATE_FLOW.reduce((result, step, index) => {
                result[step.status] = index < STATE_FLOW.length - 1 ? [STATE_FLOW[index + 1].status] : [];
                return result;
            }, {});

            const getRoutingService = () => {
                return typeof window !== 'undefined' ? window.RoutingService : null;
            };

            const hasRoutingMethod = (methodName) => {
                const service = getRoutingService();
                return Boolean(service && typeof service[methodName] === 'function');
            };

            const routingModeLabel = computed(() => {
                const physicalMethods = [
                    'receiveAtLocation',
                    'storeAtLocation',
                    'handoffToCourier',
                    'departTrip',
                    'arriveAtStop'
                ];
                return physicalMethods.some(hasRoutingMethod)
                    ? 'Routing operations ưu tiên'
                    : 'Legacy tracking fallback';
            });

            const createOperationId = (prefix = 'dispatch') => {
                const service = getRoutingService();
                if (service && typeof service.createOperationId === 'function') {
                    return service.createOperationId(prefix);
                }
                const randomPart = Math.random().toString(36).slice(2, 10);
                return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
            };

            const ensureOperationId = (payload, prefix = 'dispatch') => {
                const service = getRoutingService();
                if (service && typeof service.ensureOperationId === 'function') {
                    return service.ensureOperationId(payload, prefix);
                }
                return {
                    ...(payload || {}),
                    operationId: payload?.operationId || createOperationId(prefix)
                };
            };

            const invokeRoutingWrapper = async (service, methodName, args, operationId) => {
                const method = service && service[methodName];
                if (typeof method !== 'function') {
                    throw new Error(`Routing wrapper ${methodName} không khả dụng`);
                }
                // Chỉ truyền operationId khi wrapper khai báo thêm tham số; wrapper cũ vẫn giữ nguyên chữ ký.
                const invocationArgs = method.length > args.length ? [...args, operationId] : args;
                return method.apply(service, invocationArgs);
            };

            const getShipmentTripId = (shipment) => {
                if (!shipment) return null;
                return shipment.tripId
                    ?? shipment.activeTripId
                    ?? shipment.currentTripId
                    ?? shipment.routingTripId
                    ?? shipment.trip?.id
                    ?? shipment.activeTrip?.id
                    ?? null;
            };

            const getSourceLocation = (shipment) => {
                if (!shipment) return 'HUB-HN-01';
                return shipment.originPostOffice
                    || shipment.sourcePostOffice
                    || shipment.pickupLocationCode
                    || shipment.sourceHub
                    || shipment.originHub
                    || (String(shipment.locationCode || '').startsWith('POST-') ? shipment.locationCode : null)
                    || 'HUB-HN-01';
            };

            const getDestinationHub = (shipment) => {
                if (!shipment) return 'HUB-HCM-01';
                return shipment.destinationHub
                    || shipment.destHub
                    || shipment.destinationHubCode
                    || shipment.destHubCode
                    || 'HUB-HCM-01';
            };

            const getDestinationPostOffice = (shipment) => {
                if (!shipment) return 'DELIVERY_OFFICE';
                return shipment.destPostOffice
                    || shipment.destinationPostOffice
                    || shipment.dropoffLocationCode
                    || shipment.postOfficeCode
                    || shipment.deliveryOffice
                    || (String(shipment.locationCode || '').startsWith('POST-') ? shipment.locationCode : null)
                    || getDestinationHub(shipment);
            };

            const getTripManifestForShipment = (trip, trackingCode) => {
                if (!trip || !Array.isArray(trip.manifests) || !trackingCode) return null;
                return trip.manifests.find(item => (item.trackingCode || item.code) === trackingCode) || null;
            };

            const getTripForShipment = (trips, trackingCode) => {
                if (!Array.isArray(trips) || !trackingCode) return null;
                return trips.find(trip => Boolean(getTripManifestForShipment(trip, trackingCode))) || null;
            };

            // 1. Tải danh sách đơn hàng thật từ database để đưa vào dropdown
            const loadShipments = async (silent = false) => {
                if (!silent) {
                    isLoading.value = true;
                    errorMessage.value = '';
                }
                try {
                    const list = await ShipmentService.getAll();
                    shipmentsList.value = Array.isArray(list) ? list : [];
                    if (shipmentsList.value.length > 0 && !selectedTrackingCode.value) {
                        selectedTrackingCode.value = shipmentsList.value[0].trackingCode;
                        await selectShipment(selectedTrackingCode.value, { silent });
                    }
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi tải đơn hàng:', err);
                    errorMessage.value = err.message || 'Không thể tải danh sách bưu gửi';
                    if (!silent) {
                        Utils.showToast('Lỗi Tải Dữ Liệu', errorMessage.value, 'error');
                    }
                    throw err;
                } finally {
                    if (!silent) isLoading.value = false;
                }
            };

            // 2. Nạp thêm dữ liệu routing nếu service client cung cấp các wrapper mới.
            const refreshRoutingContext = async (code, shipment, silent = false) => {
                const service = getRoutingService();
                if (!service || !code) return;

                const failures = [];
                routingErrorMessage.value = '';
                routingOperations.value = [];
                routingInventory.value = [];
                activeRoutingTrip.value = null;

                if (typeof service.getOperationHistory === 'function') {
                    try {
                        const operations = await service.getOperationHistory(code);
                        routingOperations.value = Array.isArray(operations) ? operations : [];
                    } catch (err) {
                        failures.push('lịch sử tác nghiệp routing');
                        console.error('[DispatchSimulationView] Lỗi tải lịch sử routing:', err);
                    }
                }

                let trips = null;
                if (typeof service.getAllTrips === 'function') {
                    try {
                        trips = await service.getAllTrips();
                        const declaredTrip = shipment?.trip || shipment?.activeTrip;
                        const resolvedTrip = declaredTrip?.id
                            ? declaredTrip
                            : (getShipmentTripId(shipment) ? { id: getShipmentTripId(shipment) } : getTripForShipment(trips, code));
                        activeRoutingTrip.value = resolvedTrip;
                        const manifest = getTripManifestForShipment(resolvedTrip, code);
                        if (shipment && resolvedTrip) {
                            const stops = Array.isArray(resolvedTrip.stops) ? resolvedTrip.stops : [];
                            shipment.sourceHub = shipment.sourceHub || resolvedTrip.originHub || stops[0]?.hubCode;
                            shipment.destinationHub = shipment.destinationHub
                                || resolvedTrip.destinationHub
                                || stops[stops.length - 1]?.hubCode;
                            shipment.tripCode = shipment.tripCode || resolvedTrip.tripCode;
                        }
                        if (manifest && shipment) {
                            shipment.sourceHub = shipment.sourceHub || manifest.originHub || manifest.sourceHub;
                            shipment.destinationHub = shipment.destinationHub || manifest.destinationHub || manifest.destHub;
                            shipment.originPostOffice = shipment.originPostOffice || manifest.pickupLocationCode;
                            shipment.destPostOffice = shipment.destPostOffice || manifest.dropoffLocationCode;
                            shipment.tripCode = shipment.tripCode || resolvedTrip?.tripCode;
                        }
                    } catch (err) {
                        failures.push('danh sách chuyến xe routing');
                        console.error('[DispatchSimulationView] Lỗi tải chuyến routing:', err);
                    }
                }

                if (typeof service.getInventory === 'function') {
                    const location = shipment?.locationCode;
                    if (location && /^(HUB|POST)-/i.test(location)) {
                        try {
                            const inventory = await service.getInventory(location);
                            routingInventory.value = Array.isArray(inventory) ? inventory : [];
                        } catch (err) {
                            failures.push('tồn kho routing');
                            console.error('[DispatchSimulationView] Lỗi tải tồn kho routing:', err);
                        }
                    }
                }

                if (failures.length > 0 && (!silent || isRefreshing.value)) {
                    routingErrorMessage.value = `Không thể làm mới ${failures.join(', ')}.`;
                }
            };

            // 3. Chọn một bưu gửi thật và nạp dữ liệu chi tiết
            const selectShipment = async (code, options = {}) => {
                if (!code) return;
                const requestId = ++selectionRequestId;
                selectedTrackingCode.value = code;
                isDetailLoading.value = true;
                if (!options.silent) {
                    errorMessage.value = '';
                    routingErrorMessage.value = '';
                }

                try {
                    const results = await Promise.allSettled([
                        ShipmentService.getByCode(code),
                        TrackingService.getFullTracking(code),
                        AuditService.getByTrackingCode(code)
                    ]);
                    if (requestId !== selectionRequestId) return;

                    const detailResult = results[0];
                    const trackingResult = results[1];
                    const auditResult = results[2];
                    const detail = detailResult.status === 'fulfilled' ? detailResult.value : null;
                    const trackingData = trackingResult.status === 'fulfilled'
                        ? trackingResult.value
                        : { currentStatus: detail?.currentStatus || 'PENDING_ROUTING', history: [] };
                    const auditData = auditResult.status === 'fulfilled' ? auditResult.value : [];

                    currentShipment.value = {
                        ...(detail || {}),
                        trackingCode: code,
                        status: trackingData.currentStatus || detail?.currentStatus || 'PENDING_ROUTING'
                    };
                    trackingHistory.value = Array.isArray(trackingData.history) ? trackingData.history : [];
                    kafkaAuditList.value = Array.isArray(auditData) ? auditData : [];

                    const failedCoreRequests = results.filter(result => result.status === 'rejected');
                    if (failedCoreRequests.length > 0 && !options.silent) {
                        errorMessage.value = 'Một phần dữ liệu bưu gửi chưa tải được. Vui lòng thử làm mới.';
                    }

                    await refreshRoutingContext(code, currentShipment.value, options.silent);

                    // Vẽ lại bản đồ OSRM
                    await nextTick();
                    if (requestId !== selectionRequestId) return;
                    if (window.MapManager) {
                        window.MapManager.init('dispatch-sim-map');
                        routeInfo.value = await window.MapManager.renderRoute(
                            trackingHistory.value,
                            currentShipment.value.status,
                            true
                        );
                    }
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi nạp chi tiết đơn:', err);
                    errorMessage.value = err.message || 'Không thể nạp chi tiết bưu gửi';
                    if (!options.silent) {
                        Utils.showToast('Lỗi Nạp Dữ Liệu', errorMessage.value, 'error');
                    }
                    throw err;
                } finally {
                    if (requestId === selectionRequestId) isDetailLoading.value = false;
                }
            };

            // 4. Tải lại Kafka audit logs thật từ CSDL
            const refreshKafkaLogs = async (code, silent = false) => {
                if (!code) return;
                try {
                    const logs = await AuditService.getByTrackingCode(code);
                    kafkaAuditList.value = Array.isArray(logs) ? logs : [];
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi tải audit logs:', err);
                    if (!silent) {
                        routingErrorMessage.value = 'Không thể làm mới audit logs.';
                    }
                }
            };

            const refreshCurrentShipment = async () => {
                if (isRefreshing.value) return;
                stopSimulation();
                isRefreshing.value = true;
                errorMessage.value = '';
                routingErrorMessage.value = '';
                try {
                    await loadShipments(true);
                    if (selectedTrackingCode.value) {
                        await selectShipment(selectedTrackingCode.value, { silent: true });
                    }
                    Utils.showToast('Đã Làm Mới', 'Dữ liệu bưu gửi và tác nghiệp routing đã được cập nhật.', 'success');
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi làm mới:', err);
                    errorMessage.value = err.message || 'Không thể làm mới dữ liệu';
                    Utils.showToast('Lỗi Làm Mới', errorMessage.value, 'error');
                } finally {
                    isRefreshing.value = false;
                }
            };

            const getTransitionLocation = (shipment, nextStep) => {
                if (nextStep.status === 'ARRIVED_DEST_HUB') return getDestinationHub(shipment);
                if (nextStep.status === 'OUT_FOR_DELIVERY') return getDestinationPostOffice(shipment);
                return nextStep.loc;
            };

            const executeLegacyStatusTransition = async (shipment, nextStep) => {
                if (typeof TrackingService === 'undefined' || typeof TrackingService.updateStatus !== 'function') {
                    throw new Error('Không có client cập nhật trạng thái legacy');
                }
                const locationCode = getTransitionLocation(shipment, nextStep);
                return TrackingService.updateStatus(
                    shipment.trackingCode,
                    nextStep.status,
                    locationCode,
                    nextStep.note
                );
            };

            const executeRoutingTransition = async (shipment, nextStep) => {
                const service = getRoutingService();
                const code = shipment.trackingCode;
                const trip = activeRoutingTrip.value;
                const tripId = trip?.id ?? getShipmentTripId(shipment);
                const tripCode = trip?.tripCode || shipment.tripCode || shipment.currentTripCode;
                const sourceLocation = getSourceLocation(shipment);
                const destinationHub = getDestinationHub(shipment);
                const destinationPostOffice = getDestinationPostOffice(shipment);
                const operationId = createOperationId(`dispatch-${nextStep.status.toLowerCase()}`);
                const note = `${nextStep.note} (Admin simulator legacy fallback chỉ dùng khi routing wrapper không có sẵn)`;

                if (nextStep.status === 'OUT_FOR_DELIVERY'
                    && (shipment.status || shipment.currentStatus) !== 'ARRIVED_DEST_HUB') {
                    throw new Error('Chỉ được bàn giao bưu tá sau khi bưu gửi đã ARRIVED_DEST_HUB.');
                }

                if (!service) {
                    await executeLegacyStatusTransition(shipment, nextStep);
                    return { mode: 'legacy', operationId: null, locationCode: getTransitionLocation(shipment, nextStep) };
                }

                if (nextStep.status === 'PICKED_UP' && typeof service.receiveAtLocation === 'function') {
                    const payload = ensureOperationId({
                        trackingCodes: [code],
                        shipmentStatus: 'PICKED_UP',
                        tripCode,
                        note
                    }, 'dispatch-receive');
                    await service.receiveAtLocation(sourceLocation, payload);
                    return { mode: 'routing', operationId: payload.operationId, locationCode: sourceLocation };
                }
                if (nextStep.status === 'PICKED_UP' && typeof service.storeAtLocation === 'function') {
                    const payload = ensureOperationId({
                        trackingCodes: [code],
                        shipmentStatus: 'PICKED_UP',
                        tripCode,
                        note
                    }, 'dispatch-store');
                    await service.storeAtLocation(sourceLocation, payload);
                    return { mode: 'routing', operationId: payload.operationId, locationCode: sourceLocation };
                }

                if (nextStep.status === 'IN_TRANSIT') {
                    if (typeof service.departTrip === 'function') {
                        if (tripId === null || tripId === undefined || tripId === '') {
                            throw new Error('Chưa gắn chuyến xe routing; không thể xuất bến từ màn hình mô phỏng.');
                        }
                        // Wrapper cũ chỉ nhận tripId; wrapper mới có thể nhận thêm operationId.
                        await invokeRoutingWrapper(service, 'departTrip', [tripId], operationId);
                        return { mode: 'routing', operationId, locationCode: sourceLocation };
                    }
                    if (typeof service.updateTripProgress === 'function' && tripId !== null && tripId !== undefined) {
                        const payload = ensureOperationId({
                            locationCode: sourceLocation,
                            progressPercent: 0,
                            note
                        }, 'dispatch-trip-progress');
                        await service.updateTripProgress(tripId, payload);
                        return { mode: 'routing', operationId: payload.operationId, locationCode: sourceLocation };
                    }
                    if (typeof service.storeAtLocation === 'function') {
                        const payload = ensureOperationId({
                            trackingCodes: [code],
                            shipmentStatus: 'IN_TRANSIT',
                            tripCode,
                            note
                        }, 'dispatch-store');
                        await service.storeAtLocation(sourceLocation, payload);
                        return { mode: 'routing', operationId: payload.operationId, locationCode: sourceLocation };
                    }
                }

                if (nextStep.status === 'ARRIVED_DEST_HUB') {
                    if (typeof service.arriveAtStop === 'function' && tripId !== null && tripId !== undefined && tripId !== '') {
                        // Wrapper cũ chỉ nhận tripId + hubCode; operationId được truyền cho wrapper mới nếu hỗ trợ.
                        await invokeRoutingWrapper(service, 'arriveAtStop', [tripId, destinationHub], operationId);
                        return { mode: 'routing', operationId, locationCode: destinationHub };
                    }
                    if (typeof service.receiveAtLocation === 'function') {
                        const payload = ensureOperationId({
                            trackingCodes: [code],
                            shipmentStatus: 'ARRIVED_DEST_HUB',
                            tripCode,
                            note
                        }, 'dispatch-arrival');
                        await service.receiveAtLocation(destinationHub, payload);
                        return { mode: 'routing', operationId: payload.operationId, locationCode: destinationHub };
                    }
                    if (typeof service.arriveAtStop === 'function') {
                        throw new Error('Chưa xác định được chuyến xe routing để ghi nhận ARRIVED_DEST_HUB.');
                    }
                }

                if (nextStep.status === 'OUT_FOR_DELIVERY' && typeof service.handoffToCourier === 'function') {
                    const payload = ensureOperationId({
                        trackingCode: code,
                        courierId: shipment.courierId || shipment.courierCode || 'LEGACY-ADMIN-SIMULATOR',
                        note
                    }, 'dispatch-handoff');
                    await service.handoffToCourier(destinationPostOffice, payload);
                    return { mode: 'routing', operationId: payload.operationId, locationCode: destinationPostOffice };
                }

                // Chỉ dùng TrackingService khi không có wrapper vật lý tương ứng.
                await executeLegacyStatusTransition(shipment, nextStep);
                return { mode: 'legacy', operationId: null, locationCode: getTransitionLocation(shipment, nextStep) };
            };

            // 5. Bước chuyển trạng thái đơn (Step-by-step), không cho phép nhảy cóc trạng thái.
            const advanceOneStep = async () => {
                if (!currentShipment.value) return;
                const currentStatus = currentShipment.value.status || currentShipment.value.currentStatus;
                const currentIdx = STATE_FLOW.findIndex(s => s.status === currentStatus);

                if (currentIdx === -1) {
                    Utils.showToast('Không Thể Tiếp Tục', `Trạng thái ${currentStatus || 'không xác định'} không thuộc state machine của màn hình này.`, 'warning');
                    return;
                }
                if (currentIdx >= STATE_FLOW.length - 1) {
                    Utils.showToast('Thông Báo', 'Bưu gửi đã ở trạng thái hoàn tất (DELIVERED)', 'warning');
                    return;
                }

                const nextStep = STATE_FLOW[currentIdx + 1];
                const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];
                if (!allowedNextStatuses.includes(nextStep.status)) {
                    throw new Error(`Không cho phép chuyển ${currentStatus} sang ${nextStep.status}`);
                }

                try {
                    const operation = await executeRoutingTransition(currentShipment.value, nextStep);
                    lastOperationId.value = operation.operationId || '';
                    currentShipment.value.status = nextStep.status;
                    currentShipment.value.currentStatus = nextStep.status;
                    currentShipment.value.locationCode = operation.locationCode || currentShipment.value.locationCode;

                    if (window.MapManager) {
                        window.MapManager.updateProgress(nextStep.status, nextStep.note);
                    }

                    Utils.showToast(
                        operation.mode === 'routing' ? 'Đã Ghi Nhận Tác Nghiệp' : 'Chuyển Trạng Thái Legacy',
                        `${currentShipment.value.trackingCode} ➔ ${Utils.formatStatusText(nextStep.status)}`
                    );
                    await refreshKafkaLogs(currentShipment.value.trackingCode, true);
                    await refreshRoutingContext(currentShipment.value.trackingCode, currentShipment.value, true);
                    return operation;
                } catch (err) {
                    console.error('[DispatchSimulationView] Lỗi chuyển bước:', err);
                    errorMessage.value = err.message || 'Không thể chuyển trạng thái';
                    Utils.showToast('Lỗi Tác Nghiệp', errorMessage.value, 'error');
                    throw err;
                }
            };

            // 6. Chạy mô phỏng tự động liên tục (Play / Pause)
            const togglePlaySimulation = () => {
                if (isSimulating.value) {
                    stopSimulation();
                    Utils.showToast('Tạm Dừng', 'Đã tạm dừng mô phỏng tiến trình xe chạy');
                    return;
                }

                if (isRefreshing.value || isDetailLoading.value) {
                    Utils.showToast('Đang Làm Mới', 'Vui lòng chờ dữ liệu bưu gửi tải xong trước khi tác nghiệp.', 'warning');
                    return;
                }
                if (!currentShipment.value) return;
                if (currentShipment.value.status === 'DELIVERED') {
                    Utils.showToast('Thông Báo', 'Bưu gửi đã hoàn thành toàn trình. Vui lòng chọn đơn khác hoặc Reset để chạy lại', 'warning');
                    return;
                }

                isSimulating.value = true;
                Utils.showToast('Bắt Đầu Mô Phỏng', `Đang tự động mô phỏng luân chuyển bưu gửi trên Quốc lộ 1A (Tốc độ: ${simSpeedMultiplier.value}x)...`);

                const baseInterval = 3500;
                const stepDelay = baseInterval / simSpeedMultiplier.value;

                const runNext = async () => {
                    if (!isSimulating.value) return;
                    if (currentShipment.value.status === 'DELIVERED') {
                        stopSimulation();
                        Utils.showToast('Hoàn Tất', 'Bưu gửi đã phát thành công đến người nhận!');
                        return;
                    }

                    try {
                        await advanceOneStep();
                        if (isSimulating.value && currentShipment.value.status !== 'DELIVERED') {
                            simTimer = setTimeout(runNext, stepDelay);
                        } else {
                            stopSimulation();
                        }
                    } catch (e) {
                        stopSimulation();
                    }
                };

                runNext();
            };

            const stopSimulation = () => {
                isSimulating.value = false;
                if (simTimer) {
                    clearTimeout(simTimer);
                    simTimer = null;
                }
            };

            const setSpeed = (spd) => {
                simSpeedMultiplier.value = spd;
            };

            watch(selectedTrackingCode, (newCode) => {
                if (newCode) {
                    stopSimulation();
                    selectShipment(newCode).catch(err => {
                        console.error('[DispatchSimulationView] Lỗi đổi bưu gửi:', err);
                    });
                }
            });

            onMounted(() => {
                loadShipments().catch(() => {});
            });

            onUnmounted(() => {
                stopSimulation();
                selectionRequestId += 1;
            });

            // Mở chi tiết hành trình & bản đồ tại TrackingView
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'dispatch-simulation');
                }
            };

            return {
                isLoading,
                isRefreshing,
                isDetailLoading,
                isSimulating,
                simSpeedMultiplier,
                errorMessage,
                routingErrorMessage,
                lastOperationId,
                isLegacySimulator,
                routingModeLabel,
                shipmentsList,
                selectedTrackingCode,
                currentShipment,
                kafkaAuditList,
                routeInfo,
                routingOperations,
                routingInventory,
                selectShipment,
                refreshCurrentShipment,
                advanceOneStep,
                togglePlaySimulation,
                setSpeed,
                viewTrackingDetail,
                Utils
            };
        },
        template: `
        <div class="space-y-3.5 pb-8 text-slate-800">
            <!-- 1. HERO BANNER: THIẾT KẾ VNPT GRADIENT CHUẨN RBAC VIEW -->
            <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div class="flex items-center flex-wrap gap-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                System Control Tower
                            </span>
                            <span v-if="isLegacySimulator" class="px-2 py-0.5 rounded-md bg-amber-300/20 text-amber-100 text-[10px] uppercase font-bold tracking-wider border border-amber-200/30">
                                Legacy Admin Simulator
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Trung Tâm Giám Sát Điều Phối &amp; Mô Phỏng Lộ Trình
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Giám sát toàn cảnh hành lang giao thông 5 Hubs toàn quốc; ưu tiên tác nghiệp chuyến xe, tồn kho và bàn giao thực tế, chỉ dùng fallback legacy khi wrapper routing không có sẵn.
                        </p>
                    </div>

                    <!-- KPI Thống kê -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">5</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kho Tổng Hub</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ shipmentsList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đơn Trong DB</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[68px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kafkaAuditList.length }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kafka Events</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. THANH CÔNG CỤ ĐIỀU KHIỂN MÔ PHỎNG NÂNG CAO (SIMULATION CONTROL TOOLBAR) -->
            <div class="b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div v-if="errorMessage || routingErrorMessage" class="basis-full flex items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                    <span>{{ errorMessage || routingErrorMessage }}</span>
                    <button
                        type="button"
                        @click="refreshCurrentShipment()"
                        :disabled="isRefreshing"
                        class="shrink-0 rounded-md border border-rose-200 bg-white px-2 py-1 font-bold hover:bg-rose-100 disabled:opacity-50"
                    >
                        {{ isRefreshing ? 'Đang làm mới...' : 'Thử lại' }}
                    </button>
                </div>

                <!-- Chọn mã bưu gửi THẬT từ CSDL -->
                <div class="flex items-center space-x-2">
                    <span class="text-slate-600 font-bold uppercase tracking-wider text-[11px]">Bưu Gửi Khảo Sát:</span>
                    <select 
                        v-model="selectedTrackingCode"
                        class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-blue-700 outline-none focus:bg-white focus:border-blue-600"
                    >
                        <option v-for="s in shipmentsList" :key="s.trackingCode" :value="s.trackingCode">
                            {{ s.trackingCode }} - {{ s.receiverName || 'Khách nhận' }} ({{ Utils.formatStatusText(s.currentStatus) }})
                        </option>
                    </select>
                </div>

                <!-- Cụm nút Play / Pause / Step-by-step -->
                <div class="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        @click="refreshCurrentShipment()"
                        :disabled="isRefreshing || isLoading || isDetailLoading"
                        class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 disabled:opacity-50 transition"
                    >
                        {{ isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu' }}
                    </button>

                    <div class="flex items-center space-x-1.5">
                        <button
                            @click="togglePlaySimulation()"
                            :disabled="isRefreshing || isDetailLoading"
                            :class="[
                                'px-3.5 py-1.5 rounded-lg font-bold text-xs transition shadow-sm flex items-center space-x-1.5',
                                isSimulating 
                                    ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                            ]"
                        >
                            <span>{{ isSimulating ? 'Tạm Dừng Mô Phỏng' : 'Chạy Mô Phỏng' }}</span>
                        </button>

                        <button 
                            @click="advanceOneStep()"
                            :disabled="isSimulating || isRefreshing || isDetailLoading"
                            class="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 disabled:opacity-50 transition"
                        >
                            Bước Kế Tiếp
                        </button>
                    </div>

                    <!-- Bộ nút chọn tốc độ -->
                    <div class="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 font-bold text-[11px]">
                        <span class="text-slate-400 px-1.5">Tốc độ:</span>
                        <button 
                            @click="setSpeed(1)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 1 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            1x
                        </button>
                        <button 
                            @click="setSpeed(2)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 2 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            2x
                        </button>
                        <button 
                            @click="setSpeed(4)" 
                            :class="['px-2 py-0.5 rounded transition', simSpeedMultiplier === 4 ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800']"
                        >
                            4x
                        </button>
                    </div>

                    <!-- Badge trạng thái hiện tại -->
                    <div v-if="currentShipment" class="flex items-center space-x-1.5">
                        <span class="text-slate-400 font-medium">Trạng thái:</span>
                        <span :class="['px-2.5 py-1 rounded-md font-bold text-xs border inline-block', Utils.getStatusBadgeClass(currentShipment.status)]">
                            {{ Utils.formatStatusText(currentShipment.status) }}
                        </span>
                        <span v-if="isDetailLoading" class="text-[10px] text-blue-600 font-semibold">Đang nạp...</span>
                        <span class="text-[10px] text-slate-400 font-medium">{{ routingModeLabel }}</span>
                        <span v-if="lastOperationId" class="text-[10px] text-slate-400 font-mono" :title="lastOperationId">op:{{ lastOperationId.slice(-12) }}</span>
                    </div>
                </div>
            </div>

            <!-- 3. KHU VỰC BẢN ĐỒ TOÀN QUỐC (TRÁI) & KAFKA LIVE EVENT STREAM (PHẢI) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Cột trái (2/3): Bản đồ Leaflet OSRM -->
                <div class="lg:col-span-2 b2b-card bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                        <div class="flex items-center space-x-2">
                            <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                            <span class="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                Tuyến Luân Chuyển Đường Bộ OSRM Toàn Quốc
                            </span>
                        </div>
                        <span v-if="routeInfo" class="text-[11px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {{ routeInfo.sourceHub }} ➔ {{ routeInfo.destHub }} ({{ routeInfo.distanceKm }} km)
                        </span>
                    </div>

                    <div class="flex-1 min-h-[460px] rounded-lg overflow-hidden border border-slate-200">
                        <div id="dispatch-sim-map" style="height: 460px; width: 100%;"></div>
                    </div>
                </div>

                <!-- Cột phải (1/3): Bảng thông số & Live Kafka Event Stream -->
                <div class="space-y-4">
                    <!-- Thẻ thông số bưu gửi thật -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs space-y-2.5">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <span class="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">Chi Tiết Bưu Gửi</span>
                            <button 
                                type="button"
                                v-if="currentShipment?.trackingCode"
                                @click="viewTrackingDetail(currentShipment.trackingCode)"
                                class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group transition-colors"
                                title="Click để xem chi tiết toàn trình & bản đồ tại trang Tra Cứu"
                            >
                                <span>{{ currentShipment.trackingCode }}</span>
                                <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                            </button>
                            <span v-else class="font-mono text-slate-400">--</span>
                        </div>

                        <div class="space-y-2">
                            <div class="flex justify-between"><span class="text-slate-500">Người gửi:</span><span class="font-bold text-slate-800">{{ currentShipment?.senderName || 'N/A' }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Người nhận:</span><span class="font-bold text-slate-800">{{ currentShipment?.receiverName || 'N/A' }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Tiền COD:</span><span class="font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(currentShipment?.codAmount) }}</span></div>
                            <div class="flex justify-between"><span class="text-slate-500">Khối lượng:</span><span class="font-mono text-slate-700">{{ currentShipment?.weight ? currentShipment.weight + ' kg' : '0 kg' }}</span></div>
                            <div>
                                <span class="text-slate-500 block mb-0.5">Địa chỉ giao:</span>
                                <p class="text-slate-800 font-medium text-[11px] leading-snug">{{ currentShipment?.receiverAddress || 'N/A' }}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Bảng Luồng Sự Kiện Kafka THẬT Từ CSDL audit_events -->
                    <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-xs flex flex-col">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                            <div class="flex items-center space-x-2">
                                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span class="font-extrabold text-slate-800 uppercase tracking-wider text-[11px]">
                                    Kafka Event Stream (Audit Logs)
                                </span>
                            </div>
                            <span class="font-mono text-[10px] text-slate-400">audit_db</span>
                        </div>

                        <div class="space-y-2 overflow-y-auto max-h-[280px] font-mono text-[10.5px]">
                            <div v-if="kafkaAuditList.length === 0" class="text-slate-400 text-center py-6">
                                Chưa có sự kiện Kafka nào được ghi nhận cho bưu gửi này.
                            </div>

                            <div 
                                v-for="evt in kafkaAuditList" 
                                :key="evt.id" 
                                class="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 hover:bg-blue-50/20 transition"
                            >
                                <div class="flex justify-between font-bold text-slate-800">
                                    <span class="text-blue-700">topic: {{ evt.eventType || evt.topic || 'tracking-status' }}</span>
                                    <span class="text-slate-400 text-[10px] font-normal">{{ evt.occurredAt ? evt.occurredAt.substring(11, 19) : '' }}</span>
                                </div>
                                <p class="text-slate-600 truncate text-[10px]">{{ evt.payload || evt.eventData || 'Event Data' }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `
    };

    window.DispatchSimulationView = DispatchSimulationView;
})();
