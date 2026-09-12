/**
 * ==============================================================================
 * VNPT CLOUD - VIEW: BƯU TÁ GIAO VẬN & QUYẾT TOÁN COD (SHIPPER VIEW)
 * Phong Cách B2B Tối Giản, Chuẩn Hóa Thuật Ngữ Bưu Chính & Kết Nối Dữ Liệu Thật
 * Phân quyền: ROLE_SHIPPER / ROLE_ADMIN (Quyền: tracking:update_delivery)
 * ==============================================================================
 */

(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const ShipperView = {
        name: 'ShipperView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const currentSubtab = ref('active'); // 'active' | 'cod'
            const isLoading = ref(false);
            const isActionRunning = ref(false);

            // Dữ liệu bưu gửi thật từ backend
            const shipmentsList = ref([]);
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');

            // Phân trang
            const currentPage = ref(1);
            const pageSize = ref(10);

            // Modal Báo Phát Thất Bại
            const showFailedModal = ref(false);
            const failedTargetShipment = ref(null);
            const failedReason = ref('KHONG_NGHE_MAY');
            const failedNote = ref('');

            // Phép chiếu tồn kho/lịch sử tác nghiệp là dữ liệu phụ trợ. Không để việc
            // nạp phụ trợ làm hỏng danh sách vận đơn legacy nếu endpoint chưa tồn tại.
            const routingProjections = ref({});
            const routingProjectionPromises = new Map();

            const getShipmentStatus = (shipment) => String(
                shipment?.currentStatus || shipment?.status || ''
            ).trim().toUpperCase();

            const firstNonBlank = (...values) => values.find(value =>
                value !== null && value !== undefined && String(value).trim()
            );

            const normalizeLocationCode = (value) => {
                const location = firstNonBlank(value?.code, value);
                return location ? String(location).trim().toUpperCase() : '';
            };

            const isPostOfficeLocation = (locationCode) => {
                const location = normalizeLocationCode(locationCode);
                return location.startsWith('POST-');
            };

            const getNestedRouteMetadata = (shipment) => {
                if (!shipment) return {};
                return shipment.routingAssignment || shipment.routeAssignment || shipment.routing || shipment.route || {};
            };

            const getEmbeddedOperationHistory = (shipment) => {
                if (!shipment) return null;
                const candidates = [
                    shipment.operationHistory,
                    shipment.operations,
                    shipment.handlingEvents,
                    shipment.routingOperations,
                    shipment.routingHistory
                ];
                const embedded = candidates.find(Array.isArray);
                return Array.isArray(embedded) ? embedded : null;
            };

            const extractOperationArray = (payload) => {
                if (Array.isArray(payload)) return payload;
                if (!payload || typeof payload !== 'object') return [];
                return [
                    payload.operations,
                    payload.operationHistory,
                    payload.handlingEvents,
                    payload.items,
                    payload.inventory,
                    payload.data,
                    payload.content
                ].find(Array.isArray) || (payload.trackingCode ? [payload] : []);
            };

            const getOperationTimestamp = (operation) => firstNonBlank(
                operation?.occurredAt,
                operation?.timestamp,
                operation?.createdAt,
                operation?.updatedAt
            );

            const getLatestOperation = (operations) => {
                if (!Array.isArray(operations) || operations.length === 0) return null;
                return operations.reduce((latest, operation, index) => {
                    if (!operation) return latest;
                    if (!latest) return { operation, index };
                    const latestTime = getOperationTimestamp(latest.operation);
                    const currentTime = getOperationTimestamp(operation);
                    if (currentTime && latestTime) {
                        return new Date(currentTime).getTime() >= new Date(latestTime).getTime()
                            ? { operation, index }
                            : latest;
                    }
                    return { operation, index };
                }, null)?.operation || null;
            };

            const getOperationLocation = (operation) => normalizeLocationCode(
                operation?.locationCode || operation?.location || operation?.physicalLocationCode
            );

            const getOperationType = (operation) => String(
                operation?.operationType || operation?.type || operation?.operation || ''
            ).trim().toUpperCase();

            const getDestinationPostOfficeInfo = (shipment, operations = null, allowAddressFallback = true) => {
                const route = getNestedRouteMetadata(shipment);
                const directCode = [
                    shipment?.destPostOffice,
                    shipment?.destinationPostOffice,
                    shipment?.destinationPostOfficeCode,
                    shipment?.deliveryOfficeCode,
                    shipment?.destinationLocationCode,
                    route?.destPostOffice,
                    route?.destinationPostOffice,
                    route?.destinationPostOfficeCode,
                    route?.deliveryOfficeCode,
                    route?.destinationLocationCode
                ].map(normalizeLocationCode).find(isPostOfficeLocation) || '';
                let code = directCode;

                const operationList = Array.isArray(operations)
                    ? operations
                    : getEmbeddedOperationHistory(shipment) || [];
                if (!code) {
                    const postOfficeCodes = operationList
                        .flatMap(operation => {
                            const text = [
                                operation?.node,
                                operation?.note,
                                operation?.routeCode,
                                operation?.description
                            ].filter(Boolean).join(' ');
                            return text.match(/POST-[A-Z0-9-]+/gi) || [];
                        })
                        .map(normalizeLocationCode);
                    if (postOfficeCodes.length > 0) code = postOfficeCodes[postOfficeCodes.length - 1];
                }

                // Chỉ dùng địa chỉ để bổ sung tên/đích hiển thị khi backend chưa phát
                // metadata tuyến. Quyền đủ điều kiện vẫn dựa trên locationCode thật.
                if (!code && allowAddressFallback && shipment?.receiverAddress && window.MapManager?.getPostOfficeForAddress) {
                    const found = window.MapManager.getPostOfficeForAddress(
                        shipment.receiverAddress,
                        firstNonBlank(route?.destinationHub, shipment?.destinationHub)
                    );
                    if (found?.code) code = normalizeLocationCode(found.code);
                }

                const hubInfo = code && window.MapManager?.hubCoordinates?.[code];
                return {
                    code: code || null,
                    name: hubInfo?.name || code || 'Bưu cục phát',
                    source: directCode ? 'routing' : (code ? 'history-or-address' : 'unknown')
                };
            };

            const getProjection = (shipment) => {
                const code = shipment?.trackingCode;
                return code ? routingProjections.value[code] || shipment?._routingProjection || null : null;
            };

            const getEmbeddedInventory = (shipment) => {
                const source = shipment?.inventory || shipment?.routingInventory;
                if (Array.isArray(source)) {
                    return source.find(item => item?.trackingCode === shipment?.trackingCode) || null;
                }
                return source && typeof source === 'object' ? source : null;
            };

            const getPhysicalLocationCode = (shipment, projection = getProjection(shipment)) => {
                const latestOperation = getLatestOperation(projection?.operations || getEmbeddedOperationHistory(shipment) || []);
                const embeddedInventory = getEmbeddedInventory(shipment);
                return normalizeLocationCode(
                    projection?.inventory?.locationCode ||
                    projection?.locationCode ||
                    shipment?.locationCode ||
                    shipment?.physicalLocationCode ||
                    shipment?.currentLocationCode ||
                    shipment?.currentLocation?.code ||
                    shipment?.currentLocation ||
                    shipment?.inventoryLocationCode ||
                    embeddedInventory?.locationCode ||
                    getOperationLocation(latestOperation)
                );
            };

            const hasRoutingProjection = (projection) => Boolean(
                projection?.operationsAvailable || projection?.inventoryAvailable || projection?.trackingHistoryAvailable
            );

            const hasAuthoritativeRoutingProjection = (projection) => Boolean(
                projection?.operationEndpointAvailable ||
                projection?.inventoryEndpointAvailable ||
                (projection?.operationsAvailable && !projection?.trackingHistoryAvailable) ||
                (projection?.inventoryAvailable && projection?.inventory)
            );

            const isAtDestinationPostOffice = (shipment) => {
                const projection = getProjection(shipment);
                const physicalLocation = getPhysicalLocationCode(shipment, projection);
                if (physicalLocation === 'DELIVERY_OFFICE') {
                    return !hasAuthoritativeRoutingProjection(projection); // legacy sentinel only
                }
                if (!isPostOfficeLocation(physicalLocation)) return false;

                const destination = getDestinationPostOfficeInfo(shipment, projection?.operations, false);
                return !destination.code || destination.code === physicalLocation;
            };

            const isLegacyDeliveryProjection = (shipment) => {
                const projection = getProjection(shipment);
                const physicalLocation = getPhysicalLocationCode(shipment, projection);
                // A legacy shipment has no physical-location contract at all. In that
                // case OUT_FOR_DELIVERY remains the compatibility proof of handoff.
                return !physicalLocation && !hasRoutingProjection(projection);
            };

            const canShowDeliveryActions = (shipment) => {
                return getShipmentStatus(shipment) === 'OUT_FOR_DELIVERY' && (
                    isAtDestinationPostOffice(shipment) || isLegacyDeliveryProjection(shipment)
                );
            };

            const isReadyForCourierHandoff = (shipment) => {
                if (getShipmentStatus(shipment) !== 'ARRIVED_DEST_HUB') return false;
                const projection = getProjection(shipment);
                const physicalLocation = getPhysicalLocationCode(shipment, projection);
                if (!isPostOfficeLocation(physicalLocation) || !isAtDestinationPostOffice(shipment)) return false;

                const inventory = projection?.inventory;
                if (projection?.inventoryEndpointAvailable && !inventory) return false;
                if (projection?.inventoryAvailable && inventory) {
                    const inventoryStatus = String(
                        inventory.inventoryStatus || inventory.status || inventory.state || ''
                    ).trim().toUpperCase();
                    if (inventoryStatus && inventoryStatus !== 'STORED') return false;
                }
                const latestOperation = getLatestOperation(projection?.operations || []);
                return getOperationType(latestOperation) !== 'HANDED_TO_COURIER';
            };

            const canRetryDelivery = (shipment) => {
                if (getShipmentStatus(shipment) !== 'DELIVERY_FAILED') return false;
                const projection = getProjection(shipment);
                const physicalLocation = getPhysicalLocationCode(shipment, projection);
                if (physicalLocation && physicalLocation !== 'DELIVERY_OFFICE' && !isAtDestinationPostOffice(shipment)) {
                    return false;
                }
                return isAtDestinationPostOffice(shipment) || isLegacyDeliveryProjection(shipment);
            };

            const getLastMileLocation = (shipment) => {
                const projection = getProjection(shipment);
                const physicalLocation = getPhysicalLocationCode(shipment, projection);
                if (isPostOfficeLocation(physicalLocation)) return physicalLocation;
                const destination = getDestinationPostOfficeInfo(shipment, projection?.operations, false);
                return destination.code || (physicalLocation === 'DELIVERY_OFFICE' ? 'DELIVERY_OFFICE' : null);
            };

            const getCourierIdentifier = () => {
                const user = typeof Auth !== 'undefined' ? Auth.getUser?.() : null;
                const identifier = firstNonBlank(
                    user?.courierId,
                    user?.employeeCode,
                    user?.staffCode,
                    user?.id,
                    user?.userId
                );
                return identifier ? String(identifier).trim() : '';
            };

            const formatShipmentStatus = (status) => {
                switch (String(status || '').toUpperCase()) {
                    case 'RETURNING': return 'Đang chuyển hoàn về người gửi';
                    case 'RETURNED': return 'Đã hoàn về người gửi';
                    case 'DELIVERY_FAILED': return 'Phát không thành công';
                    default: return Utils.formatStatusText(status);
                }
            };

            const getShipmentStatusBadgeClass = (status) => {
                switch (String(status || '').toUpperCase()) {
                    case 'RETURNING': return 'bg-orange-50 text-orange-700 border-orange-200';
                    case 'RETURNED': return 'bg-slate-100 text-slate-700 border-slate-300';
                    default: return Utils.getStatusBadgeClass(status);
                }
            };

            const parseApiError = async (response, fallback) => {
                const payload = await response.json().catch(() => ({}));
                return payload.message || payload.error || fallback;
            };

            const loadRoutingProjection = async (shipment, force = false) => {
                const code = shipment?.trackingCode;
                if (!code) return null;
                if (!force && routingProjections.value[code]) return routingProjections.value[code];
                if (routingProjectionPromises.has(code)) return routingProjectionPromises.get(code);

                const promise = (async () => {
                    const embeddedOperations = getEmbeddedOperationHistory(shipment);
                    let operations = embeddedOperations || [];
                    let operationsAvailable = Array.isArray(embeddedOperations);
                    let operationEndpointAvailable = false;
                    let operationEndpointUnavailable = false;

                    if (!operationsAvailable && typeof Api !== 'undefined' && Api.get) {
                        try {
                            const response = await Api.get(`/api/routing/shipments/${encodeURIComponent(code)}/operations`);
                            if (response.ok) {
                                operations = extractOperationArray(await response.json().catch(() => []));
                                operationsAvailable = true;
                                operationEndpointAvailable = true;
                            } else if (response.status === 404 || response.status === 405) {
                                operationEndpointUnavailable = true;
                            }
                        } catch (error) {
                            console.warn('[ShipperView] Không nạp được lịch sử routing:', error);
                        }
                    }

                    // Tracking history là phương án tương thích khi routing-service cũ
                    // chưa có operation-history endpoint; không coi nó là inventory thật.
                    let trackingHistoryAvailable = false;
                    if (!operationsAvailable) {
                        try {
                            const history = await TrackingService.getHistory(code);
                            if (Array.isArray(history) && history.length > 0) {
                                operations = history;
                                trackingHistoryAvailable = true;
                            }
                        } catch (error) {
                            // Legacy tracking có thể không có lịch sử phụ trợ.
                        }
                    }

                    const latestOperation = getLatestOperation(operations);
                    const directLocation = getPhysicalLocationCode(shipment, {
                        operations: [],
                        inventory: null,
                        locationCode: ''
                    });
                    const destination = getDestinationPostOfficeInfo(shipment, operations, false);
                    const inventoryLocations = [
                        directLocation,
                        getOperationLocation(latestOperation),
                        destination.code
                    ].filter(location => isPostOfficeLocation(location));

                    let inventory = getEmbeddedInventory(shipment);
                    let inventoryAvailable = Boolean(inventory);
                    let inventoryEndpointAvailable = false;
                    const inventoryLocation = inventoryLocations[0];
                    if (!inventory && inventoryLocation && typeof Api !== 'undefined' && Api.get) {
                        try {
                            const response = await Api.get(
                                `/api/routing/locations/${encodeURIComponent(inventoryLocation)}/inventory`
                            );
                            if (response.ok) {
                                const inventoryList = extractOperationArray(await response.json().catch(() => []));
                                inventory = inventoryList.find(item => item?.trackingCode === code) || null;
                                inventoryAvailable = true;
                                inventoryEndpointAvailable = true;
                            }
                        } catch (error) {
                            console.warn('[ShipperView] Không nạp được tồn kho routing:', error);
                        }
                    }

                    const projection = {
                        operations,
                        operationsAvailable,
                        operationEndpointAvailable,
                        operationEndpointUnavailable,
                        trackingHistoryAvailable,
                        inventory,
                        inventoryAvailable,
                        inventoryEndpointAvailable,
                        locationCode: normalizeLocationCode(inventory?.locationCode || getOperationLocation(latestOperation)),
                        destinationPostOffice: destination.code || null,
                        fetchedAt: Date.now()
                    };
                    routingProjections.value = { ...routingProjections.value, [code]: projection };
                    return projection;
                })();

                routingProjectionPromises.set(code, promise);
                try {
                    return await promise;
                } finally {
                    routingProjectionPromises.delete(code);
                }
            };

            const refreshRoutingProjections = async (shipments, force = false) => {
                const candidates = (Array.isArray(shipments) ? shipments : []).filter(shipment =>
                    ['ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED'].includes(getShipmentStatus(shipment))
                );
                await Promise.all(candidates.map(shipment => loadRoutingProjection(shipment, force).catch(() => null)));
            };

            const refreshServerProjections = async (trackingCode) => {
                await loadShipmentsData(true);
                const current = shipmentsList.value.find(item => item.trackingCode === trackingCode);
                if (current) await loadRoutingProjection(current, true).catch(() => null);
                // Shipment projection is Kafka-backed; one delayed read keeps the UI
                // aligned without removing the existing optimistic-response guard.
                setTimeout(() => {
                    loadShipmentsData(true).catch(() => null);
                }, 600);
            };


            // 1. Tải dữ liệu bưu gửi thật từ backend (Hỗ trợ nạp ngầm không nháy màn hình)
            const loadShipmentsData = async (silent = false) => {
                if (!silent) isLoading.value = true;
                try {
                    const data = await ShipmentService.getAll();
                    if (Array.isArray(data)) {
                        // Bảo vệ trạng thái vừa cập nhật lạc quan trong vòng 4s phòng trường hợp Kafka consumer chưa commit kịp
                        shipmentsList.value = data.map(newItem => {
                            const existing = shipmentsList.value.find(s => s.trackingCode === newItem.trackingCode);
                            if (existing && existing._optimisticTimestamp && (Date.now() - existing._optimisticTimestamp < 4000)) {
                                return {
                                    ...newItem,
                                    currentStatus: existing.currentStatus,
                                    status: existing.status,
                                    locationCode: existing.locationCode,
                                    _optimisticTimestamp: existing._optimisticTimestamp
                                };
                            }
                            return {
                                ...newItem,
                                locationCode: existing?.locationCode || newItem.locationCode
                            };
                        });
                        await refreshRoutingProjections(shipmentsList.value);
                    } else {
                        shipmentsList.value = [];
                    }
                } catch (err) {
                    console.error('[ShipperView] Lỗi nạp danh sách:', err);
                    if (!silent) {
                        Utils.showToast('Lỗi Tải Dữ Liệu', err.message || 'Không thể nạp danh sách bưu gửi', 'error');
                    }
                } finally {
                    if (!silent) isLoading.value = false;
                }
            };

            // 2. Lọc danh sách bưu gửi của bưu tá
            const deliveryShipments = computed(() => {
                // A shipper view is final-mile only; do not expose pre-routing and
                // origin/linehaul cargo merely because ShipmentService returns all rows.
                const finalMileStatuses = new Set([
                    'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED',
                    'DELIVERED', 'RETURNING', 'RETURNED'
                ]);
                let list = shipmentsList.value.filter(item => finalMileStatuses.has(getShipmentStatus(item)));

                if (selectedStatusFilter.value !== 'ALL') {
                    list = list.filter(s => getShipmentStatus(s) === selectedStatusFilter.value);
                }

                if (searchQuery.value.trim()) {
                    const q = searchQuery.value.trim().toLowerCase();
                    list = list.filter(s => 
                        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                        (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                        (s.receiverPhone && s.receiverPhone.toLowerCase().includes(q)) ||
                        (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                    );
                }

                return list;
            });

            // 3. Phân trang
            const totalPages = computed(() => {
                if (pageSize.value === -1) return 1;
                return Math.ceil(deliveryShipments.value.length / pageSize.value) || 1;
            });

            const paginatedShipments = computed(() => {
                if (pageSize.value === -1) return deliveryShipments.value;
                const start = (currentPage.value - 1) * pageSize.value;
                return deliveryShipments.value.slice(start, start + pageSize.value);
            });

            watch([selectedStatusFilter, searchQuery, pageSize], () => {
                currentPage.value = 1;
            });

            // 4. Thống kê KPI bưu tá
            const kpiAwaitingDispatch = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'ARRIVED_DEST_HUB' && isAtDestinationPostOffice(s)).length;
            });

            const kpiOutForDelivery = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'OUT_FOR_DELIVERY').length;
            });

            const kpiDeliveredCount = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'DELIVERED').length;
            });

            // Tổng tiền COD đã thu từ các đơn DELIVERED
            const kpiTotalDeliveredCod = computed(() => {
                return shipmentsList.value
                    .filter(s => getShipmentStatus(s) === 'DELIVERED')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            // Tổng tiền COD cần thu từ các đơn OUT_FOR_DELIVERY
            const kpiPendingCod = computed(() => {
                return shipmentsList.value
                    .filter(s => getShipmentStatus(s) === 'OUT_FOR_DELIVERY')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            const updateOptimisticShipment = (trackingCode, status, locationCode = null) => {
                const target = shipmentsList.value.find(s => s.trackingCode === trackingCode);
                if (!target) return;
                target.currentStatus = status;
                target.status = status;
                if (locationCode) target.locationCode = locationCode;
                target._optimisticTimestamp = Date.now();
            };

            const recordLocalOperation = (trackingCode, operationType, locationCode, note) => {
                const current = routingProjections.value[trackingCode] || {};
                const operations = Array.isArray(current.operations) ? current.operations : [];
                routingProjections.value = {
                    ...routingProjections.value,
                    [trackingCode]: {
                        ...current,
                        operations: [...operations, {
                            operationType,
                            locationCode,
                            note,
                            occurredAt: new Date().toISOString()
                        }],
                        operationsAvailable: true,
                        locationCode: locationCode || current.locationCode,
                        fetchedAt: Date.now()
                    }
                };
            };

            const getActionStatus = (response, fallback) => String(
                response?.status || response?.currentStatus || response?.newStatus || fallback
            ).trim().toUpperCase();

            // 5. Thao tác phát thành công (DELIVERED) chỉ sau khi xác nhận đang ở bưu cục phát.
            const handleDeliverSuccess = async (shipment) => {
                if (!canShowDeliveryActions(shipment)) {
                    Utils.showToast('Chưa Thể Phát', 'Bưu gửi chưa có xác nhận đang ở bưu cục phát hoặc trạng thái đã thay đổi. Vui lòng làm mới dữ liệu.', 'warning');
                    await loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }

                const codText = shipment.codAmount && shipment.codAmount > 0
                    ? `kèm xác nhận thu tiền mặt COD: ${Utils.formatCurrency(shipment.codAmount)}`
                    : 'không có tiền COD';

                if (!confirm(`Xác nhận bưu gửi ${shipment.trackingCode} đã phát thành công đến người nhận ${codText}?`)) {
                    return;
                }

                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const result = await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'DELIVERED',
                        locationCode,
                        `Bưu tá phát thành công tận nơi cho ${shipment.receiverName || 'người nhận'}`
                    );
                    const savedStatus = getActionStatus(result, 'DELIVERED');
                    updateOptimisticShipment(shipment.trackingCode, savedStatus, locationCode);
                    recordLocalOperation(
                        shipment.trackingCode,
                        savedStatus === 'DELIVERED' ? 'DELIVERED' : savedStatus,
                        locationCode,
                        `Bưu tá phát thành công tận nơi cho ${shipment.receiverName || 'người nhận'}`
                    );

                    Utils.showToast(
                        savedStatus === 'DELIVERED' ? 'Thành Công' : 'Đã Cập Nhật',
                        savedStatus === 'DELIVERED'
                            ? `Đã ghi nhận phát thành công cho bưu gửi ${shipment.trackingCode}`
                            : `Bưu gửi ${shipment.trackingCode}: ${formatShipmentStatus(savedStatus)}`
                    );
                    await refreshServerProjections(shipment.trackingCode);
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo phát:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Mở modal báo phát không thành công
            const openFailedModal = (shipment) => {
                if (!canShowDeliveryActions(shipment)) {
                    Utils.showToast('Chưa Thể Báo Thất Bại', 'Bưu gửi chưa có xác nhận đang ở bưu cục phát hoặc trạng thái đã thay đổi.', 'warning');
                    loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }
                failedTargetShipment.value = shipment;
                failedReason.value = 'KHONG_NGHE_MAY';
                failedNote.value = '';
                showFailedModal.value = true;
            };

            // Xác nhận báo phát thất bại (DELIVERY_FAILED)
            const handleDeliverFailed = async () => {
                if (!failedTargetShipment.value) return;

                const shipment = shipmentsList.value.find(
                    item => item.trackingCode === failedTargetShipment.value.trackingCode
                ) || failedTargetShipment.value;
                if (!canShowDeliveryActions(shipment)) {
                    showFailedModal.value = false;
                    Utils.showToast('Chưa Thể Báo Thất Bại', 'Bưu gửi không còn ở bưu cục phát hoặc trạng thái đã thay đổi. Vui lòng làm mới dữ liệu.', 'warning');
                    await loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }

                const code = shipment.trackingCode;
                const reasonLabels = {
                    'KHONG_NGHE_MAY': 'Khách không nghe máy / Thuê bao',
                    'SAI_DIA_CHI': 'Sai địa chỉ / Không tìm thấy nhà',
                    'HEN_LAI_NGAY': 'Người nhận hẹn giao lại vào ngày sau',
                    'TU_CHOI_NHAN': 'Người nhận từ chối nhận hàng'
                };

                const reasonText = reasonLabels[failedReason.value] || failedReason.value;
                const note = failedNote.value.trim()
                    ? `Phát không thành công: ${reasonText} (${failedNote.value.trim()})`
                    : `Phát không thành công: ${reasonText}`;

                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const result = await TrackingService.updateStatus(
                        code,
                        'DELIVERY_FAILED',
                        locationCode,
                        note
                    );
                    const savedStatus = getActionStatus(result, 'DELIVERY_FAILED');
                    updateOptimisticShipment(code, savedStatus, locationCode);
                    recordLocalOperation(code, savedStatus, locationCode, note);

                    Utils.showToast(
                        savedStatus === 'RETURNING' ? 'Đã Chuyển Hoàn' : 'Đã Ghi Nhận',
                        savedStatus === 'RETURNING'
                            ? `Bưu gửi ${code} đã phát thất bại đủ số lần và đang chuyển hoàn về người gửi.`
                            : `Bưu gửi ${code} đã chuyển trạng thái ${formatShipmentStatus(savedStatus)}`
                    );
                    showFailedModal.value = false;
                    await refreshServerProjections(code);
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo thất bại:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Bàn giao mới phải đi qua routing inventory. Chỉ retry legacy mới dùng
            // TrackingService.updateStatus để giữ tương thích state machine cũ.
            const handleReDispatch = async (shipment) => {
                const status = getShipmentStatus(shipment);
                if (status !== 'ARRIVED_DEST_HUB' && status !== 'DELIVERY_FAILED') return;

                if (status === 'ARRIVED_DEST_HUB') {
                    if (!isReadyForCourierHandoff(shipment)) {
                        Utils.showToast('Chưa Thể Nhận Đi Phát', 'Bưu gửi chưa được xác nhận nằm tại đúng bưu cục phát hoặc tồn kho chưa sẵn sàng.', 'warning');
                        await loadRoutingProjection(shipment, true).catch(() => null);
                        return;
                    }

                    const locationCode = getPhysicalLocationCode(shipment);
                    if (!isPostOfficeLocation(locationCode)) {
                        Utils.showToast('Thiếu Dữ Liệu Bàn Giao', 'Không xác định được bưu cục phát hoặc dịch vụ tồn kho chưa sẵn sàng. Không thể tự ý bàn giao.', 'error');
                        return;
                    }

                    const destination = getDestinationPostOfficeInfo(
                        shipment,
                        getProjection(shipment)?.operations,
                        false
                    );
                    const courierIdentifier = getCourierIdentifier();
                    if (!courierIdentifier) {
                        Utils.showToast('Thiếu Mã Bưu Tá', 'Tài khoản hiện tại chưa có mã bưu tá/nhân viên hợp lệ để bàn giao.', 'warning');
                        return;
                    }
                    const note = `Bưu cục ${destination.name} (${locationCode}) bàn giao bưu gửi cho bưu tá đi phát chặng cuối`;
                    const operationId = `SHIPPER_HANDOFF:${shipment.trackingCode}:${locationCode}`;
                    const routing = window.RoutingService;
                    if (!routing || typeof routing.handoffToCourier !== 'function') {
                        Utils.showToast('Thiếu Dịch Vụ Định Tuyến', 'Không thể bàn giao khi routing inventory API chưa sẵn sàng.', 'error');
                        return;
                    }
                    isActionRunning.value = true;
                    try {
                        const result = await routing.handoffToCourier(
                            locationCode,
                            {
                                trackingCode: shipment.trackingCode,
                                operationId,
                                note
                            },
                            courierIdentifier
                        );
                        updateOptimisticShipment(shipment.trackingCode, 'OUT_FOR_DELIVERY', locationCode);
                        recordLocalOperation(shipment.trackingCode, 'HANDED_TO_COURIER', locationCode, note);
                        const currentProjection = routingProjections.value[shipment.trackingCode] || {};
                        routingProjections.value = {
                            ...routingProjections.value,
                            [shipment.trackingCode]: {
                                ...currentProjection,
                                inventory: result || currentProjection.inventory,
                                inventoryAvailable: true,
                                operationsAvailable: true,
                                locationCode,
                                fetchedAt: Date.now()
                            }
                        };
                        Utils.showToast('Thành Công', `Đã bàn giao ${shipment.trackingCode} cho bưu tá tại ${destination.name}.`);
                        await refreshServerProjections(shipment.trackingCode);
                    } catch (err) {
                        console.error('[ShipperView] Lỗi bàn giao tồn kho:', err);
                        Utils.showToast('Không Thể Bàn Giao', err.message || 'Không thể cập nhật tồn kho bưu cục phát', 'error');
                    } finally {
                        isActionRunning.value = false;
                    }
                    return;
                }

                // DELIVERY_FAILED -> OUT_FOR_DELIVERY là chuyển retry legacy hợp lệ.
                if (!canRetryDelivery(shipment)) {
                    Utils.showToast('Chưa Thể Phát Lại', 'Bưu gửi chưa có xác nhận đang ở bưu cục phát hoặc trạng thái đã thay đổi.', 'warning');
                    await loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }

                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const result = await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'OUT_FOR_DELIVERY',
                        locationCode,
                        'Bưu tá tiếp nhận lại bưu gửi để phát chặng cuối'
                    );
                    const savedStatus = getActionStatus(result, 'OUT_FOR_DELIVERY');
                    updateOptimisticShipment(shipment.trackingCode, savedStatus, locationCode);
                    recordLocalOperation(
                        shipment.trackingCode,
                        savedStatus,
                        locationCode,
                        'Bưu tá tiếp nhận lại bưu gửi để phát chặng cuối'
                    );
                    Utils.showToast('Thành Công', `Đã tiếp nhận bưu gửi ${shipment.trackingCode} đi phát lại`);
                    await refreshServerProjections(shipment.trackingCode);
                } catch (err) {
                    console.error('[ShipperView] Lỗi phát lại:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái phát lại', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            // Mở chi tiết hành trình & bản đồ tại TrackingView
            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'shipper');
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
                searchQuery,
                selectedStatusFilter,
                currentPage,
                pageSize,
                totalPages,
                deliveryShipments,
                paginatedShipments,
                kpiAwaitingDispatch,
                kpiOutForDelivery,
                kpiDeliveredCount,
                kpiTotalDeliveredCod,
                kpiPendingCod,
                getDestinationPostOfficeInfo,
                isAtDestinationPostOffice,
                canShowDeliveryActions,
                isReadyForCourierHandoff,
                canRetryDelivery,
                getShipmentStatus,
                formatShipmentStatus,
                getShipmentStatusBadgeClass,
                refreshServerProjections,
                loadShipmentsData,
                handleDeliverSuccess,
                openFailedModal,
                showFailedModal,
                failedTargetShipment,
                failedReason,
                failedNote,
                handleDeliverFailed,
                handleReDispatch,
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
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                Bưu Tá Giao Vận
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                        </div>
                        <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                            Bàn Tác Nghiệp Bưu Tá Phát Hàng &amp; Tiền Thu Hộ COD
                        </h1>
                        <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                            Quản lý các bưu gửi chặng cuối, xác nhận phát tận tay người nhận, thu tiền hộ COD và quyết toán nộp quỹ bưu cục.
                        </p>
                    </div>

                    <!-- Thống kê nhanh KPI theo phong cách RBAC -->
                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ kpiAwaitingDispatch }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Đi Phát</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiOutForDelivery }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Đi Phát</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiDeliveredCount }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đã Giao Xong</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[84px]">
                            <div class="text-xs sm:text-sm font-bold leading-tight font-mono text-emerald-300">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">COD Đã Thu</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. SUBTABS ĐIỀU HƯỚNG GẠCH CHÂN CHUẨN RBAC -->
            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto pb-px">
                    <button 
                        @click="currentSubtab = 'active'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'active' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>DANH SÁCH BƯU GỬI PHÁT HÔM NAY</span>
                    </button>

                    <button 
                        @click="currentSubtab = 'cod'"
                        :class="[
                            'pb-2.5 text-xs sm:text-sm font-bold transition-all border-b-2 flex items-center space-x-1.5 whitespace-nowrap',
                            currentSubtab === 'cod' 
                                ? 'border-blue-600 text-blue-700' 
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        ]"
                    >
                        <span>QUYẾT TOÁN TIỀN THU HỘ (COD) CUỐI CA</span>
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
            <!-- TRANSITION CHUYỂN SUBTAB MƯỢT MÀ                             -->
            <!-- =============================================================== -->
            <transition name="subtab" mode="out-in">
                <!-- SUBTAB 1: DANH SÁCH BƯU GỬI PHÁT HÔM NAY -->
                <div v-if="currentSubtab === 'active'" key="active" class="space-y-3">
                <!-- THANH TOOLBAR TÌM KIẾM & LỌC -->
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-56 sm:w-64">
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                placeholder="Tìm người nhận, SĐT, địa chỉ phát..."
                                class="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                        </div>

                        <select 
                            v-model="selectedStatusFilter"
                            class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ARRIVED_DEST_HUB">Chờ Nhận Đi Phát</option>
                            <option value="OUT_FOR_DELIVERY">Đang Đi Phát</option>
                            <option value="DELIVERED">Phát Thành Công</option>
                            <option value="DELIVERY_FAILED">Phát Không Thành Công</option>
                            <option value="RETURNING">Đang Chuyển Hoàn</option>
                            <option value="RETURNED">Đã Hoàn Về Người Gửi</option>
                            <option value="IN_TRANSIT">Đang Trên Xe Luân Chuyển</option>
                        </select>

                        <select 
                            v-model.number="pageSize"
                            class="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white outline-none"
                        >
                            <option :value="10">10 bản ghi / trang</option>
                            <option :value="25">25 bản ghi / trang</option>
                            <option :value="-1">Tất cả bản ghi</option>
                        </select>
                    </div>

                    <div class="text-[11px] text-slate-500 font-medium">
                        Tổng số: <strong class="text-slate-800">{{ deliveryShipments.length }}</strong> bưu gửi
                    </div>
                </div>

                <!-- BẢNG BƯU GỬI PHÁT HÀNG TẬN NƠI -->
                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <div v-if="isLoading" class="p-8 text-center text-slate-400">
                        <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <span>Đang nạp danh sách bưu gửi phát...</span>
                    </div>

                    <div v-else-if="paginatedShipments.length === 0" class="p-8 text-center text-slate-400">
                        <span>Không tìm thấy bưu gửi nào cần xử lý.</span>
                    </div>

                    <div v-else class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                    <th class="py-2.5 px-3">Số Hiệu Bưu Gửi</th>
                                    <th class="py-2.5 px-3">Người Nhận &amp; Điện Thoại</th>
                                    <th class="py-2.5 px-3">Địa Chỉ Phát Tận Nơi</th>
                                    <th class="py-2.5 px-3">Tiền Thu Hộ COD</th>
                                    <th class="py-2.5 px-3">Trạng Thái</th>
                                    <th class="py-2.5 px-3 text-right">Tác Nghiệp Bưu Tá</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-blue-50/30 transition">
                                    <td class="py-2.5 px-3">
                                        <button 
                                            type="button"
                                            @click="viewTrackingDetail(item.trackingCode)"
                                            class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                            title="Click để xem chi tiết hành trình & bản đồ"
                                        >
                                            <span>{{ item.trackingCode }}</span>
                                            <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                                        </button>
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <div class="font-bold text-slate-800">{{ item.receiverName || 'Chưa cập nhật' }}</div>
                                        <div class="text-[10.5px] font-mono text-slate-500">{{ item.receiverPhone || 'Chưa có SĐT' }}</div>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-700 max-w-xs truncate">
                                        {{ item.receiverAddress || 'Chưa có địa chỉ' }}
                                    </td>
                                    <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">
                                        {{ Utils.formatCurrency(item.codAmount) }}
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <span :class="['px-2.5 py-0.5 rounded-md text-[10.5px] font-bold border inline-block', getShipmentStatusBadgeClass(getShipmentStatus(item))]">
                                            {{ formatShipmentStatus(getShipmentStatus(item)) }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                                        <!-- Chỉ cho phép phát khi trạng thái OUT_FOR_DELIVERY và đã xác nhận ở bưu cục phát -->
                                        <template v-if="getShipmentStatus(item) === 'OUT_FOR_DELIVERY' && canShowDeliveryActions(item)">
                                            <button
                                                @click="handleDeliverSuccess(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition shadow-sm"
                                            >
                                                Phát Thành Công
                                            </button>
                                            <button
                                                @click="openFailedModal(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-md font-bold transition"
                                            >
                                                Báo Thất Bại
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'OUT_FOR_DELIVERY'">
                                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Chưa Xác Nhận Ở Bưu Cục Phát
                                            </span>
                                        </template>

                                        <!-- Handoff mới chỉ xuất hiện khi tồn kho xác nhận kiện đã ở đúng bưu cục phát -->
                                        <template v-else-if="getShipmentStatus(item) === 'ARRIVED_DEST_HUB' && isReadyForCourierHandoff(item)">
                                            <button
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition shadow-sm"
                                                :title="'Đã xác nhận tại ' + getDestinationPostOfficeInfo(item).name + '. Bàn giao tồn kho cho bưu tá để xuất phát giao tận tay khách.'"
                                            >
                                                Nhận Hàng Đi Phát
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'ARRIVED_DEST_HUB'">
                                            <span
                                                class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md"
                                                title="Chỉ được bàn giao khi routing inventory hoặc lịch sử tác nghiệp xác nhận kiện đã ở bưu cục phát đích"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Chờ Về Bưu Cục Phát
                                            </span>
                                        </template>

                                        <!-- Retry DELIVERY_FAILED chỉ giữ cho state machine legacy hợp lệ -->
                                        <template v-else-if="getShipmentStatus(item) === 'DELIVERY_FAILED' && canRetryDelivery(item)">
                                            <button
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md font-bold transition"
                                            >
                                                Nhận Đi Phát Lại
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'DELIVERY_FAILED'">
                                            <span class="text-rose-700 text-[11px] font-bold">
                                                Phát Thất Bại - Chưa Xác Nhận Ở Bưu Cục Phát
                                            </span>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'RETURNING'">
                                            <span class="text-orange-700 text-[11px] font-bold">
                                                Đang Chuyển Hoàn Về Người Gửi
                                            </span>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'RETURNED'">
                                            <span class="text-slate-600 text-[11px] font-bold">
                                                Đã Hoàn Về Người Gửi
                                            </span>
                                        </template>

                                        <!-- Đơn IN_TRANSIT: Hàng còn trên xe đường dài, chưa về tới bưu cục phát -->
                                        <template v-else-if="getShipmentStatus(item) === 'IN_TRANSIT'">
                                            <span
                                                class="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-1 rounded-md"
                                                title="Kiện hàng đang trên xe luân chuyển đường dài, chưa về tới bưu cục phát"
                                            >
                                                <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                                Xe Luân Chuyển Đang Tới
                                            </span>
                                        </template>

                                        <span v-else class="text-slate-400 text-xs italic">
                                            Đã hoàn tất
                                        </span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Phân trang bưu tá -->
                    <div class="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div class="text-slate-500">
                            Hiển thị trang {{ currentPage }} / {{ totalPages }} (Tổng số {{ deliveryShipments.length }} kết quả)
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
                                        ? 'bg-blue-600 text-white border border-blue-600 shadow-sm' 
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
            <!-- SUBTAB 2: QUYẾT TOÁN TIỀN THU HỘ COD CUỐI CA -->
            <!-- =============================================================== -->
            <div v-else-if="currentSubtab === 'cod'" key="cod" class="space-y-3">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                        <h2 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Quyết Toán Tiền Mặt Thu Hộ (COD)</h2>
                        <p class="text-slate-500 text-[11px] mt-0.5">Bảng kê chi tiết các khoản tiền mặt đã thu từ người nhận cần nộp lại bưu cục</p>
                    </div>

                    <div class="flex items-center space-x-3 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                        <span class="text-emerald-800 font-bold">Tổng tiền thu hộ COD trong ca:</span>
                        <span class="font-mono text-base font-extrabold text-emerald-700">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</span>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận Trả Tiền</th>
                                <th class="py-2.5 px-3">Địa Chỉ Giao</th>
                                <th class="py-2.5 px-3">Số Tiền Thu Hộ COD Đã Thu</th>
                                <th class="py-2.5 px-3 text-right">Tình Trạng Quyết Toán</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in shipmentsList.filter(s => getShipmentStatus(s) === 'DELIVERED')" :key="item.id" class="hover:bg-blue-50/30">
                                <td class="py-2.5 px-3">
                                    <button 
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors"
                                        title="Click để xem chi tiết hành trình & bản đồ"
                                    >
                                        <span>{{ item.trackingCode }}</span>
                                        <span class="text-[11px] text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">↗</span>
                                    </button>
                                </td>
                                <td class="py-2.5 px-3 font-bold text-slate-800">{{ item.receiverName }}</td>
                                <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate">{{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(item.codAmount) }}</td>
                                <td class="py-2.5 px-3 text-right">
                                    <span class="px-2.5 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        Chưa Nộp Quỹ Bưu Cục
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="shipmentsList.filter(s => getShipmentStatus(s) === 'DELIVERED').length === 0">
                                <td colspan="5" class="py-8 text-center text-slate-400">
                                    Chưa có đơn hàng nào phát thành công trong ca để quyết toán.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            </transition>

            <!-- MODAL BÁO PHÁT THẤT BẠI -->
            <teleport to="body">
            <Transition name="modal">
            <div v-if="showFailedModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
                    <div class="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-slate-900 text-sm">Ghi Nhận Phát Không Thành Công</h3>
                            <p class="text-slate-500 font-mono text-[11px] mt-0.5">Bưu gửi: {{ failedTargetShipment?.trackingCode }}</p>
                        </div>
                        <button @click="showFailedModal = false" class="text-slate-400 hover:text-slate-600 text-lg font-bold">✕</button>
                    </div>

                    <div class="space-y-3">
                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Lý do phát không thành công:</label>
                            <select v-model="failedReason" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none focus:bg-white focus:border-blue-600">
                                <option value="KHONG_NGHE_MAY">Khách không nghe máy / Thuê bao</option>
                                <option value="SAI_DIA_CHI">Sai địa chỉ / Không tìm thấy nhà người nhận</option>
                                <option value="HEN_LAI_NGAY">Người nhận hẹn giao lại vào ngày sau</option>
                                <option value="TU_CHOI_NHAN">Người nhận từ chối nhận hàng (Hoàn đơn)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block font-semibold text-slate-700 mb-1">Ghi chú bổ sung (nếu có):</label>
                            <textarea v-model="failedNote" rows="2" placeholder="Nhập ghi chú chi tiết từ cuộc gọi hoặc địa chỉ..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-blue-600"></textarea>
                        </div>
                    </div>

                    <div class="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                        <button @click="showFailedModal = false" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition">
                            Hủy Bỏ
                        </button>
                        <button @click="handleDeliverFailed()" :disabled="isActionRunning" class="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm transition disabled:opacity-50">
                            Xác Nhận Báo Thất Bại
                        </button>
                    </div>
                </div>
            </div>
            </Transition>
            </teleport>
        </div>
        `
    };

    window.ShipperView = ShipperView;
})();
