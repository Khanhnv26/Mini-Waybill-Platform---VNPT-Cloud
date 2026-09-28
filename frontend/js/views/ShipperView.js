
(function () {
    const { ref, computed, watch, onMounted } = Vue;

    const ShipperView = {
        name: 'ShipperView',
        emits: ['view-tracking'],
        setup(props, { emit }) {
            const currentSubtab = ref('active');
            const isLoading = ref(false);
            const isActionRunning = ref(false);

            const shipmentsList = ref([]);
            const searchQuery = ref('');
            const selectedStatusFilter = ref('ALL');

            const currentPage = ref(1);
            const pageSize = ref(10);


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
                    case 'OUT_FOR_RETURN': return 'Đang phát hoàn về người gửi';
                    case 'RETURNED': return 'Đã hoàn về người gửi';
                    case 'DELIVERY_FAILED': return 'Phát không thành công';
                    default: return Utils.formatStatusText(status);
                }
            };

            const getShipmentStatusBadgeClass = (status) => {
                switch (String(status || '').toUpperCase()) {
                    case 'RETURNING': return 'bg-orange-50 text-orange-700 border-orange-200';
                    case 'OUT_FOR_RETURN': return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
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

            const deliveryShipments = computed(() => {
                const finalMileStatuses = new Set([
                    'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERY_FAILED',
                    'DELIVERED', 'RETURNING', 'OUT_FOR_RETURN', 'RETURNED'
                ]);
                return shipmentsList.value.filter(item => finalMileStatuses.has(getShipmentStatus(item)));
            });

            // 3. Lọc theo trạng thái + tìm kiếm. "Chờ nhận đi phát" chỉ gồm kiện đã
            // thực sự về bưu cục phát, khớp đúng KPI kpiAwaitingDispatch.
            const filteredShipments = computed(() => {
                let list = deliveryShipments.value;

                const statusFilter = String(selectedStatusFilter.value || 'ALL').toUpperCase();
                if (statusFilter !== 'ALL') {
                    if (statusFilter === 'ARRIVED_DEST_HUB') {
                        list = list.filter(s => getShipmentStatus(s) === 'ARRIVED_DEST_HUB'
                            && isAtDestinationPostOffice(s));
                    } else {
                        list = list.filter(s => getShipmentStatus(s) === statusFilter);
                    }
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

            const kpiAwaitingDispatch = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'ARRIVED_DEST_HUB' && isAtDestinationPostOffice(s)).length;
            });

            const kpiOutForDelivery = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'OUT_FOR_DELIVERY').length;
            });

            const kpiDeliveredCount = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'DELIVERED').length;
            });

            const kpiTotalDeliveredCod = computed(() => {
                return shipmentsList.value
                    .filter(s => getShipmentStatus(s) === 'DELIVERED')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            const kpiPendingCod = computed(() => {
                return shipmentsList.value
                    .filter(s => getShipmentStatus(s) === 'OUT_FOR_DELIVERY')
                    .reduce((acc, cur) => acc + (cur.codAmount || 0), 0);
            });

            const kpiReturningCount = computed(() => {
                return shipmentsList.value.filter(s => getShipmentStatus(s) === 'RETURNING' || getShipmentStatus(s) === 'OUT_FOR_RETURN').length;
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

            const showDeliveryActionModal = ref(false);
            const deliveryTargetShipment = ref(null);
            const deliveryActiveTab = ref('SUCCESS');
            const deliveryPaymentMethod = ref('CASH');
            const deliverySuccessNote = ref('');
            const failedReason = ref('KHONG_NGHE_MAY');
            const failedNote = ref('');

            const qrTargetShipment = ref(null);
            const qrPaymentData = ref(null);
            const isQrLoading = ref(false);
            const qrCountdown = ref(600);
            const isMockPaying = ref(false);
            const isQrPaidSuccess = ref(false);
            let qrInterval = null;
            let qrPollInterval = null;

            const showReturnActionModal = ref(false);
            const returnTargetShipment = ref(null);
            const returnPaymentMethod = ref('CASH');
            const returnSuccessNote = ref('');
            const returnQrPaymentData = ref(null);
            const isReturnQrLoading = ref(false);
            const returnQrCountdown = ref(600);
            const isReturnMockPaying = ref(false);
            const isReturnQrPaidSuccess = ref(false);
            let returnQrInterval = null;
            let returnQrPollInterval = null;

            const formatCountdown = (seconds) => {
                const m = Math.floor(seconds / 60);
                const s = seconds % 60;
                return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            };

            const closeDeliveryActionModal = () => {
                if (qrInterval) clearInterval(qrInterval);
                if (qrPollInterval) clearInterval(qrPollInterval);
                showDeliveryActionModal.value = false;
                deliveryTargetShipment.value = null;
                qrTargetShipment.value = null;
                qrPaymentData.value = null;
                isQrLoading.value = false;
                isMockPaying.value = false;
                isQrPaidSuccess.value = false;
            };

            const handlePaymentSuccessRealtime = async (payment) => {
                if (qrInterval) clearInterval(qrInterval);
                if (qrPollInterval) clearInterval(qrPollInterval);
                isQrPaidSuccess.value = true;
                const targetCode = (payment && payment.trackingCode) || (deliveryTargetShipment.value && deliveryTargetShipment.value.trackingCode);
                if (payment) {
                    window.dispatchEvent(new CustomEvent('system-notification-created', {
                        detail: {
                            title: 'Thanh toán COD thành công',
                            message: `Vận đơn ${targetCode || ''} đã thanh toán tiền COD thành công qua VietQR với số tiền ${Utils.formatCurrency(payment.amount || 0)}. Mã GD: ${payment.paymentCode || ''}`,
                            trackingCode: targetCode || null
                        }
                    }));
                }
                Utils.showToast('Thanh Toán Thành Công', `Đã nhận ${Utils.formatCurrency(payment.amount)} qua VietQR!`, 'success');
                if (deliveryTargetShipment.value) {
                    await refreshServerProjections(deliveryTargetShipment.value.trackingCode);
                }
                await loadShipmentsData();
                setTimeout(() => {
                    closeDeliveryActionModal();
                }, 1800);
            };

            const generateDeliveryQr = async (shipment) => {
                if (!shipment) return;
                qrPaymentData.value = null;
                isQrLoading.value = true;
                isQrPaidSuccess.value = false;
                qrCountdown.value = 600;

                try {
                    const res = await PaymentService.createQrPayment({
                        trackingCode: shipment.trackingCode,
                        amount: shipment.codAmount || 0,
                        paymentType: 'COD',
                        note: `Thu COD don ${shipment.trackingCode}`
                    });
                    qrPaymentData.value = res;
                    isQrLoading.value = false;

                    if (qrInterval) clearInterval(qrInterval);
                    qrInterval = setInterval(() => {
                        if (qrCountdown.value > 0) {
                            qrCountdown.value--;
                        } else {
                            clearInterval(qrInterval);
                        }
                    }, 1000);

                    if (qrPollInterval) clearInterval(qrPollInterval);
                    qrPollInterval = setInterval(async () => {
                        try {
                            const check = await PaymentService.getPaymentByTracking(shipment.trackingCode);
                            if (check && check.status === 'SUCCESS') {
                                handlePaymentSuccessRealtime(check);
                            }
                        } catch (e) {}
                    }, 3000);
                } catch (err) {
                    isQrLoading.value = false;
                    Utils.showToast('Lỗi Tạo QR', err.message || 'Không thể tạo mã VietQR', 'error');
                }
            };

            const switchDeliveryPaymentMethod = async (method) => {
                deliveryPaymentMethod.value = method;
                if (method === 'QR' && !qrPaymentData.value && deliveryTargetShipment.value) {
                    await generateDeliveryQr(deliveryTargetShipment.value);
                }
            };

            const openDeliveryActionModal = (shipment) => {
                if (!canShowDeliveryActions(shipment)) {
                    Utils.showToast('Chưa Thể Phát', 'Bưu gửi chưa có xác nhận đang ở bưu cục phát hoặc trạng thái đã thay đổi. Vui lòng làm mới dữ liệu.', 'warning');
                    loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }
                deliveryTargetShipment.value = shipment;
                qrTargetShipment.value = shipment;
                deliveryActiveTab.value = 'SUCCESS';
                deliveryPaymentMethod.value = 'CASH';
                deliverySuccessNote.value = '';
                failedReason.value = 'KHONG_NGHE_MAY';
                failedNote.value = '';
                qrPaymentData.value = null;
                isQrLoading.value = false;
                isQrPaidSuccess.value = false;
                qrCountdown.value = 600;
                if (qrInterval) clearInterval(qrInterval);
                if (qrPollInterval) clearInterval(qrPollInterval);
                showDeliveryActionModal.value = true;
            };

            const submitDeliverySuccess = async (isCash = true) => {
                if (!deliveryTargetShipment.value) return;
                const shipment = deliveryTargetShipment.value;
                if (!canShowDeliveryActions(shipment)) {
                    closeDeliveryActionModal();
                    Utils.showToast('Chưa Thể Phát', 'Bưu gửi chưa có xác nhận đang ở bưu cục phát hoặc trạng thái đã thay đổi. Vui lòng làm mới dữ liệu.', 'warning');
                    await loadRoutingProjection(shipment, true).catch(() => null);
                    return;
                }

                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const defaultNote = shipment.codAmount && shipment.codAmount > 0 && isCash
                        ? `Bưu tá phát thành công tận nơi cho ${shipment.receiverName || 'người nhận'} (đã thu tiền mặt COD ${Utils.formatCurrency(shipment.codAmount)})`
                        : `Bưu tá phát thành công tận nơi cho ${shipment.receiverName || 'người nhận'}`;
                    const noteText = deliverySuccessNote.value && deliverySuccessNote.value.trim()
                        ? `${defaultNote} - Ghi chú: ${deliverySuccessNote.value.trim()}`
                        : defaultNote;

                    const result = await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'DELIVERED',
                        locationCode,
                        noteText
                    );
                    const savedStatus = getActionStatus(result, 'DELIVERED');
                    updateOptimisticShipment(shipment.trackingCode, savedStatus, locationCode);
                    recordLocalOperation(
                        shipment.trackingCode,
                        savedStatus === 'DELIVERED' ? 'DELIVERED' : savedStatus,
                        locationCode,
                        noteText
                    );

                    Utils.showToast(
                        savedStatus === 'DELIVERED' ? 'Thành Công' : 'Đã Cập Nhật',
                        savedStatus === 'DELIVERED'
                            ? `Đã ghi nhận phát thành công cho bưu gửi ${shipment.trackingCode}`
                            : `Bưu gửi ${shipment.trackingCode}: ${formatShipmentStatus(savedStatus)}`
                    );
                    closeDeliveryActionModal();
                    await refreshServerProjections(shipment.trackingCode);
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo phát:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleMockQrPay = async () => {
                if (!deliveryTargetShipment.value || isMockPaying.value) return;
                isMockPaying.value = true;
                try {
                    const res = await PaymentService.mockPay(deliveryTargetShipment.value.trackingCode);
                    await handlePaymentSuccessRealtime(res.data || { amount: deliveryTargetShipment.value.codAmount });
                } catch (err) {
                    Utils.showToast('Lỗi Giả Lập', err.message || 'Không thể giả lập thanh toán', 'error');
                } finally {
                    isMockPaying.value = false;
                }
            };

            const handleDeliverFailed = async () => {
                if (!deliveryTargetShipment.value) return;

                const shipment = shipmentsList.value.find(
                    item => item.trackingCode === deliveryTargetShipment.value.trackingCode
                ) || deliveryTargetShipment.value;
                if (!canShowDeliveryActions(shipment)) {
                    closeDeliveryActionModal();
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
                    closeDeliveryActionModal();
                    await refreshServerProjections(code);
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi báo phát thất bại:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể cập nhật trạng thái phát thất bại', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            const getReturnFee = (shipment) => {
                if (!shipment) return 17500;
                const baseFee = Number(shipment.shippingFee || shipment.totalFee || 35000);
                return Math.round(baseFee * 0.5);
            };

            const closeReturnActionModal = () => {
                if (returnQrInterval) clearInterval(returnQrInterval);
                if (returnQrPollInterval) clearInterval(returnQrPollInterval);
                showReturnActionModal.value = false;
                returnTargetShipment.value = null;
                returnQrPaymentData.value = null;
                isReturnQrLoading.value = false;
                isReturnMockPaying.value = false;
                isReturnQrPaidSuccess.value = false;
            };

            const openReturnActionModal = (shipment) => {
                returnTargetShipment.value = shipment;
                returnPaymentMethod.value = 'CASH';
                returnSuccessNote.value = '';
                returnQrPaymentData.value = null;
                isReturnQrLoading.value = false;
                isReturnQrPaidSuccess.value = false;
                returnQrCountdown.value = 600;
                if (returnQrInterval) clearInterval(returnQrInterval);
                if (returnQrPollInterval) clearInterval(returnQrPollInterval);
                showReturnActionModal.value = true;
            };

            const handleAcceptReturnDelivery = async (shipment) => {
                if (!shipment) return;
                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const note = `Bưu tá tiếp nhận bưu phẩm hoàn, xuất phát phát hoàn về địa chỉ người gửi (${shipment.senderName || 'Người gửi'})`;
                    const result = await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'OUT_FOR_RETURN',
                        locationCode,
                        note
                    );
                    const savedStatus = getActionStatus(result, 'OUT_FOR_RETURN');
                    updateOptimisticShipment(shipment.trackingCode, savedStatus, locationCode);
                    recordLocalOperation(shipment.trackingCode, savedStatus, locationCode, note);
                    Utils.showToast('Đã Nhận Phát Hoàn', `Bưu gửi ${shipment.trackingCode} đang trên đường phát hoàn về người gửi.`);
                    await refreshServerProjections(shipment.trackingCode);
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi nhận phát hoàn:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể tiếp nhận phát hoàn', 'error');
                } finally {
                    isActionRunning.value = false;
                }
            };

            const handleReturnPaymentSuccessRealtime = async (payment) => {
                if (returnQrInterval) clearInterval(returnQrInterval);
                if (returnQrPollInterval) clearInterval(returnQrPollInterval);
                isReturnQrPaidSuccess.value = true;
                const targetCode = (payment && payment.trackingCode) || (returnTargetShipment.value && returnTargetShipment.value.trackingCode);
                if (payment) {
                    window.dispatchEvent(new CustomEvent('system-notification-created', {
                        detail: {
                            title: 'Thanh toán cước hoàn thành công',
                            message: `Vận đơn ${targetCode || ''} đã thanh toán cước hoàn qua VietQR với số tiền ${Utils.formatCurrency(payment.amount || 0)}. Mã GD: ${payment.paymentCode || ''}`,
                            trackingCode: targetCode || null
                        }
                    }));
                }
                Utils.showToast('Thanh Toán Thành Công', `Đã nhận cước hoàn ${Utils.formatCurrency(payment.amount)} qua VietQR!`, 'success');
                await submitReturnSuccess(false);
            };

            const generateReturnQr = async (shipment) => {
                if (!shipment) return;
                returnQrPaymentData.value = null;
                isReturnQrLoading.value = true;
                isReturnQrPaidSuccess.value = false;
                returnQrCountdown.value = 600;
                const returnFee = getReturnFee(shipment);

                try {
                    const res = await PaymentService.createQrPayment({
                        trackingCode: shipment.trackingCode,
                        amount: returnFee,
                        paymentType: 'SHIPPING_FEE',
                        note: `Cuoc hoan don ${shipment.trackingCode}`
                    });
                    returnQrPaymentData.value = res;
                    isReturnQrLoading.value = false;

                    if (returnQrInterval) clearInterval(returnQrInterval);
                    returnQrInterval = setInterval(() => {
                        if (returnQrCountdown.value > 0) {
                            returnQrCountdown.value--;
                        } else {
                            clearInterval(returnQrInterval);
                        }
                    }, 1000);

                    if (returnQrPollInterval) clearInterval(returnQrPollInterval);
                    returnQrPollInterval = setInterval(async () => {
                        try {
                            const check = await PaymentService.getPaymentByTracking(shipment.trackingCode);
                            if (check && check.status === 'SUCCESS') {
                                handleReturnPaymentSuccessRealtime(check);
                            }
                        } catch (e) {}
                    }, 3000);
                } catch (err) {
                    isReturnQrLoading.value = false;
                    Utils.showToast('Lỗi Tạo QR', err.message || 'Không thể tạo mã VietQR thu cước hoàn', 'error');
                }
            };

            const switchReturnPaymentMethod = async (method) => {
                returnPaymentMethod.value = method;
                if (method === 'QR' && !returnQrPaymentData.value && returnTargetShipment.value) {
                    await generateReturnQr(returnTargetShipment.value);
                }
            };

            const handleMockReturnQrPay = async () => {
                if (!returnTargetShipment.value || isReturnMockPaying.value) return;
                isReturnMockPaying.value = true;
                try {
                    const res = await PaymentService.mockPay(returnTargetShipment.value.trackingCode);
                    await handleReturnPaymentSuccessRealtime(res.data || { amount: getReturnFee(returnTargetShipment.value) });
                } catch (err) {
                    Utils.showToast('Lỗi Giả Lập', err.message || 'Không thể giả lập thanh toán cước hoàn', 'error');
                } finally {
                    isReturnMockPaying.value = false;
                }
            };

            const submitReturnSuccess = async (isCash = true) => {
                if (!returnTargetShipment.value) return;
                const shipment = returnTargetShipment.value;
                const returnFee = getReturnFee(shipment);
                isActionRunning.value = true;
                try {
                    const locationCode = getLastMileLocation(shipment) || 'DELIVERY_OFFICE';
                    const feeNote = isCash
                        ? `đã thu tiền mặt cước hoàn ${Utils.formatCurrency(returnFee)} (50%)`
                        : `đã thu cước hoàn ${Utils.formatCurrency(returnFee)} (50%) qua VietQR`;
                    const defaultNote = `Bưu tá đã phát hoàn thành công về tay người gửi (${shipment.senderName || 'Người gửi'}) tại ${shipment.senderAddress || ''} - ${feeNote}`;
                    const noteText = returnSuccessNote.value && returnSuccessNote.value.trim()
                        ? `${defaultNote} - Ghi chú: ${returnSuccessNote.value.trim()}`
                        : defaultNote;

                    const result = await TrackingService.updateStatus(
                        shipment.trackingCode,
                        'RETURNED',
                        locationCode,
                        noteText
                    );
                    const savedStatus = getActionStatus(result, 'RETURNED');
                    updateOptimisticShipment(shipment.trackingCode, savedStatus, locationCode);
                    recordLocalOperation(shipment.trackingCode, savedStatus, locationCode, noteText);

                    Utils.showToast('Hoàn Thành Phát Hoàn', `Đã hoàn trả bưu gửi ${shipment.trackingCode} về cho người gửi.`);
                    closeReturnActionModal();
                    await refreshServerProjections(shipment.trackingCode);
                    await loadShipmentsData();
                } catch (err) {
                    console.error('[ShipperView] Lỗi hoàn trả bưu gửi:', err);
                    Utils.showToast('Lỗi Tác Nghiệp', err.message || 'Không thể xác nhận hoàn hàng', 'error');
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

            const viewTrackingDetail = (code) => {
                if (code && code.trim()) {
                    emit('view-tracking', code.trim(), 'shipper');
                }
            };

            const selectedCodCodes = ref([]);
            const isSubmittingSettlement = ref(false);
            const showSettlementModal = ref(false);

            const deliveredCodShipments = computed(() => {
                return shipmentsList.value.filter(s => {
                    const status = getShipmentStatus(s);
                    const cod = Number(s.codAmount) || 0;
                    return status === 'DELIVERED' && cod > 0;
                });
            });

            const unsettledCodShipments = computed(() => {
                return deliveredCodShipments.value.filter(s => {
                    const st = s.codSettlementStatus || 'UNSETTLED';
                    return st === 'UNSETTLED';
                });
            });

            const pendingCodShipments = computed(() => {
                return deliveredCodShipments.value.filter(s => s.codSettlementStatus === 'PENDING_SETTLEMENT');
            });

            const settledCodShipments = computed(() => {
                return deliveredCodShipments.value.filter(s => s.codSettlementStatus === 'SETTLED');
            });

            const kpiSettledCodAmount = computed(() => {
                return settledCodShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const kpiPendingSettlementCodAmount = computed(() => {
                return pendingCodShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const kpiUnsettledCodAmount = computed(() => {
                return unsettledCodShipments.value.reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const isAllCodSelected = computed(() => {
                const available = unsettledCodShipments.value;
                if (available.length === 0) return false;
                return available.every(s => selectedCodCodes.value.includes(s.trackingCode));
            });

            const toggleSelectAllCod = () => {
                if (isAllCodSelected.value) {
                    selectedCodCodes.value = [];
                } else {
                    selectedCodCodes.value = unsettledCodShipments.value.map(s => s.trackingCode);
                }
            };

            const toggleSelectCod = (code) => {
                const idx = selectedCodCodes.value.indexOf(code);
                if (idx > -1) {
                    selectedCodCodes.value.splice(idx, 1);
                } else {
                    selectedCodCodes.value.push(code);
                }
            };

            const selectedCodTotalAmount = computed(() => {
                return shipmentsList.value
                    .filter(s => selectedCodCodes.value.includes(s.trackingCode))
                    .reduce((sum, s) => sum + (Number(s.codAmount) || 0), 0);
            });

            const openSettlementConfirmModal = () => {
                if (selectedCodCodes.value.length === 0) {
                    Utils.showToast('Chưa Chọn Đơn', 'Vui lòng tích chọn ít nhất 1 vận đơn để nộp quỹ', 'warning');
                    return;
                }
                showSettlementModal.value = true;
            };

            const handleSelectAllAndOpenModal = () => {
                const available = unsettledCodShipments.value;
                if (available.length === 0) {
                    Utils.showToast('Không Có Đơn', 'Tất cả các đơn COD trong ca đã được nộp hoặc không có đơn phát thành công', 'info');
                    return;
                }
                selectedCodCodes.value = available.map(s => s.trackingCode);
                showSettlementModal.value = true;
            };

            const executeCodSettlement = async () => {
                if (selectedCodCodes.value.length === 0) return;
                isSubmittingSettlement.value = true;
                try {
                    const user = typeof Auth !== 'undefined' && Auth.getUser ? Auth.getUser() : null;
                    const courierId = user ? (user.email || user.fullName || String(user.userId || '')) : 'Bưu tá';
                    await ShipmentService.submitCodSettlement(selectedCodCodes.value, courierId);

                    selectedCodCodes.value.forEach(code => {
                        const target = shipmentsList.value.find(s => s.trackingCode === code);
                        if (target) {
                            target.codSettlementStatus = 'PENDING_SETTLEMENT';
                        }
                    });

                    Utils.showToast(
                        'Nộp Quỹ Thành Công',
                        `Đã gửi yêu cầu nộp quỹ cho ${selectedCodCodes.value.length} đơn (${Utils.formatCurrency(selectedCodTotalAmount.value)}). Vui lòng bàn giao tiền mặt cho thủ quỹ!`,
                        'success'
                    );

                    window.dispatchEvent(new CustomEvent('system-notification-created', {
                        detail: {
                            title: 'Bàn giao nộp quỹ COD',
                            message: `Bưu tá đã gửi yêu cầu nộp ${selectedCodCodes.value.length} đơn COD (${Utils.formatCurrency(selectedCodTotalAmount.value)}) vào quỹ bưu cục.`
                        }
                    }));

                    selectedCodCodes.value = [];
                    showSettlementModal.value = false;
                    await loadShipmentsData(true);
                } catch (err) {
                    console.error('[ShipperView] Lỗi nộp quỹ COD:', err);
                    Utils.showToast('Lỗi Nộp Quỹ', err.message || 'Không thể gửi yêu cầu nộp quỹ COD', 'error');
                } finally {
                    isSubmittingSettlement.value = false;
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
                filteredShipments,
                paginatedShipments,
                kpiAwaitingDispatch,
                kpiOutForDelivery,
                kpiDeliveredCount,
                kpiTotalDeliveredCod,
                kpiPendingCod,
                kpiSettledCodAmount,
                kpiPendingSettlementCodAmount,
                kpiUnsettledCodAmount,
                deliveredCodShipments,
                unsettledCodShipments,
                pendingCodShipments,
                settledCodShipments,
                selectedCodCodes,
                isSubmittingSettlement,
                showSettlementModal,
                isAllCodSelected,
                toggleSelectAllCod,
                toggleSelectCod,
                selectedCodTotalAmount,
                openSettlementConfirmModal,
                handleSelectAllAndOpenModal,
                executeCodSettlement,
                getCodSettlementVisuals,
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
                showDeliveryActionModal,
                deliveryTargetShipment,
                deliveryActiveTab,
                deliveryPaymentMethod,
                deliverySuccessNote,
                openDeliveryActionModal,
                closeDeliveryActionModal,
                switchDeliveryPaymentMethod,
                submitDeliverySuccess,
                qrPaymentData,
                isQrLoading,
                qrCountdown,
                formatCountdown,
                handleMockQrPay,
                isMockPaying,
                isQrPaidSuccess,
                failedReason,
                failedNote,
                handleDeliverFailed,
                handleReDispatch,
                kpiReturningCount,
                showReturnActionModal,
                returnTargetShipment,
                returnPaymentMethod,
                returnSuccessNote,
                returnQrPaymentData,
                isReturnQrLoading,
                returnQrCountdown,
                isReturnMockPaying,
                isReturnQrPaidSuccess,
                getReturnFee,
                openReturnActionModal,
                closeReturnActionModal,
                handleAcceptReturnDelivery,
                generateReturnQr,
                switchReturnPaymentMethod,
                handleMockReturnQrPay,
                submitReturnSuccess,
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

                    <div class="flex items-center space-x-2 self-start sm:self-auto">
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">{{ kpiAwaitingDispatch }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chờ Bàn Giao Phát</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiOutForDelivery }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Đang Phát Tận Nơi</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight text-orange-300">{{ kpiReturningCount }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Chuyển Hoàn</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[76px]">
                            <div class="text-sm sm:text-base font-bold leading-tight">{{ kpiDeliveredCount }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Phát Thành Công</div>
                        </div>
                        <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[84px]">
                            <div class="text-xs sm:text-sm font-bold leading-tight font-mono text-emerald-300">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</div>
                            <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">COD Đã Thu</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between border-b border-slate-200">
                <div class="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar pb-px">
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

            <transition name="subtab" mode="out-in">
                <div v-if="currentSubtab === 'active'" key="active" class="space-y-3">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5 shadow-sm text-xs">
                    <div class="flex flex-wrap items-center gap-2 flex-1">
                        <div class="relative w-56 sm:w-64">
                            <input 
                                v-model="searchQuery"
                                type="text" 
                                maxlength="100"
                                placeholder="Tìm mã vận đơn, người nhận, SĐT, địa chỉ..."
                                class="w-full pl-3 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition"
                            />
                        </div>

                        <select 
                            v-model="selectedStatusFilter"
                            class="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium focus:bg-white focus:border-blue-600 outline-none transition"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="ARRIVED_DEST_HUB">Chờ Bàn Giao Phát</option>
                            <option value="OUT_FOR_DELIVERY">Đang Phát Tận Nơi</option>
                            <option value="DELIVERED">Phát Thành Công</option>
                            <option value="DELIVERY_FAILED">Phát Không Thành Công</option>
                            <option value="RETURNING">Đang Chuyển Hoàn</option>
                            <option value="OUT_FOR_RETURN">Đang Đi Phát Hoàn</option>
                            <option value="RETURNED">Đã Hoàn Về Người Gửi</option>
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
                        Tổng số: <strong class="text-slate-800">{{ filteredShipments.length }}</strong> bưu gửi
                    </div>
                </div>

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
                                    <th class="py-2.5 px-3 whitespace-nowrap w-28">Trạng Thái</th>
                                    <th class="py-2.5 px-3 text-right w-32 whitespace-nowrap">Tác Nghiệp</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="item in paginatedShipments" :key="item.id" class="hover:bg-blue-50/30 transition">
                                    <td class="py-2.5 px-3">
                                        <button 
                                            type="button"
                                            @click="viewTrackingDetail(item.trackingCode)"
                                            class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors whitespace-nowrap"
                                            title="Click để xem chi tiết hành trình & bản đồ"
                                        >
                                            <span>{{ item.trackingCode }}</span>
                                        </button>
                                    </td>
                                    <td class="py-2.5 px-3">
                                        <template v-if="['RETURNING', 'OUT_FOR_RETURN', 'RETURNED'].includes(getShipmentStatus(item))">
                                            <div class="flex items-center gap-1">
                                                <span class="text-[9px] px-1 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">Người gửi</span>
                                                <div class="font-bold text-slate-800 truncate max-w-[130px]" :title="item.senderName">{{ item.senderName || 'Chưa cập nhật' }}</div>
                                            </div>
                                            <div class="text-[10.5px] font-mono text-slate-500">{{ item.senderPhone || 'Chưa có SĐT' }}</div>
                                        </template>
                                        <template v-else>
                                            <div class="font-bold text-slate-800 truncate max-w-[160px]" :title="item.receiverName">{{ item.receiverName || 'Chưa cập nhật' }}</div>
                                            <div class="text-[10.5px] font-mono text-slate-500">{{ item.receiverPhone || 'Chưa có SĐT' }}</div>
                                        </template>
                                    </td>
                                    <td class="py-2.5 px-3 text-slate-700 max-w-xs truncate" :title="(['RETURNING', 'OUT_FOR_RETURN', 'RETURNED'].includes(getShipmentStatus(item)) ? item.senderAddress : item.receiverAddress) || ''">
                                        {{ (['RETURNING', 'OUT_FOR_RETURN', 'RETURNED'].includes(getShipmentStatus(item)) ? item.senderAddress : item.receiverAddress) || 'Chưa có địa chỉ' }}
                                    </td>
                                    <td class="py-2.5 px-3 whitespace-nowrap">
                                        <template v-if="['RETURNING', 'OUT_FOR_RETURN', 'RETURNED'].includes(getShipmentStatus(item))">
                                            <div class="font-mono font-bold text-orange-700">
                                                {{ Utils.formatCurrency(getReturnFee(item)) }}
                                            </div>
                                            <span class="text-[9.5px] text-orange-600 font-medium">Cước hoàn (50%)</span>
                                        </template>
                                        <template v-else>
                                            <div class="font-mono font-bold text-emerald-700">
                                                {{ Utils.formatCurrency(item.codAmount) }}
                                            </div>
                                        </template>
                                    </td>
                                    <td class="py-2.5 px-3 whitespace-nowrap">
                                        <span :class="['px-2 py-0.5 rounded-md text-[10.5px] font-bold border inline-flex items-center whitespace-nowrap', getShipmentStatusBadgeClass(getShipmentStatus(item))]">
                                            {{ formatShipmentStatus(getShipmentStatus(item)) }}
                                        </span>
                                    </td>
                                    <td class="py-2.5 px-3 text-right whitespace-nowrap">
                                        <template v-if="getShipmentStatus(item) === 'OUT_FOR_DELIVERY' && canShowDeliveryActions(item)">
                                            <button
                                                @click="openDeliveryActionModal(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                                title="Bấm để xử lý giao hàng hoặc báo phát thất bại"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                <span>Xử lý giao</span>
                                                <span v-if="item.codAmount && item.codAmount > 0" class="text-[9.5px] bg-blue-800/80 px-1 py-0.2 rounded font-mono">COD</span>
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'OUT_FOR_DELIVERY'">
                                            <span class="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Chưa Xác Nhận Ở Bưu Cục Phát
                                            </span>
                                        </template>

                                        <template v-else-if="getShipmentStatus(item) === 'ARRIVED_DEST_HUB' && isReadyForCourierHandoff(item)">
                                            <button
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold transition shadow-sm"
                                                :title="'Đã xác nhận tại ' + getDestinationPostOfficeInfo(item).name + '. Bàn giao tồn kho cho bưu tá để xuất phát giao tận tay khách.'"
                                            >
                                                Tiếp Nhận Đi Phát
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

                                        <template v-else-if="getShipmentStatus(item) === 'DELIVERY_FAILED' && canRetryDelivery(item)">
                                            <button
                                                @click="handleReDispatch(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-md font-bold transition"
                                            >
                                                Tiếp Nhận Tái Phát
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'DELIVERY_FAILED'">
                                            <span class="text-rose-700 text-[11px] font-bold">
                                                Phát Thất Bại - Chưa Xác Nhận Ở Bưu Cục Phát
                                            </span>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'RETURNING'">
                                            <button
                                                @click="handleAcceptReturnDelivery(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                                title="Tiếp nhận bưu phẩm hoàn tại bưu cục gốc để đi phát hoàn cho người gửi"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
                                                <span>Nhận Phát Hoàn</span>
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'OUT_FOR_RETURN'">
                                            <button
                                                @click="openReturnActionModal(item)"
                                                :disabled="isActionRunning"
                                                class="px-2.5 py-1 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-lg font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                                                title="Bấm để xử lý phát hoàn về tay người gửi và thu cước hoàn trả"
                                            >
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"></path></svg>
                                                <span>Xử Lý Hoàn</span>
                                                <span class="text-[9.5px] bg-orange-800/80 px-1 py-0.2 rounded font-mono">50%</span>
                                            </button>
                                        </template>
                                        <template v-else-if="getShipmentStatus(item) === 'RETURNED'">
                                            <span class="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                <svg class="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                                Đã Hoàn Về Người Gửi
                                            </span>
                                        </template>

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

            <div v-else-if="currentSubtab === 'cod'" key="cod" class="space-y-3.5">
                <div class="b2b-card bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div>
                        <h2 class="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Quyết Toán Tiền Mặt Thu Hộ (COD)</h2>
                        <p class="text-slate-500 text-[11px] mt-0.5">Bảng kê chi tiết các khoản tiền mặt đã thu từ người nhận cần nộp lại quỹ bưu cục</p>
                    </div>

                    <div class="flex items-center space-x-3 bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                        <span class="text-blue-900 font-bold">Tổng COD đã thu trong ca:</span>
                        <span class="font-mono text-base font-extrabold text-blue-700">{{ Utils.formatCurrency(kpiTotalDeliveredCod) }}</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Chưa Nộp Quỹ (Đang Giữ)</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {{ unsettledCodShipments.length }} đơn
                            </span>
                        </div>
                        <div class="font-mono text-lg font-bold text-amber-600 mt-1.5">
                            {{ Utils.formatCurrency(kpiUnsettledCodAmount) }}
                        </div>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Chờ Bưu Cục Xác Nhận</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center">
                                <span class="live-pulse-dot mr-1 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                                {{ pendingCodShipments.length }} đơn
                            </span>
                        </div>
                        <div class="font-mono text-lg font-bold text-blue-600 mt-1.5">
                            {{ Utils.formatCurrency(kpiPendingSettlementCodAmount) }}
                        </div>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                        <div class="flex items-center justify-between">
                            <span class="text-slate-500 font-medium">Đã Thu Quỹ Bưu Cục</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {{ settledCodShipments.length }} đơn
                            </span>
                        </div>
                        <div class="font-mono text-lg font-bold text-emerald-600 mt-1.5">
                            {{ Utils.formatCurrency(kpiSettledCodAmount) }}
                        </div>
                    </div>
                </div>

                <div class="operation-action-bar p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                    <div class="flex items-center space-x-2 text-xs">
                        <input 
                            type="checkbox" 
                            id="shipper-select-all-cod"
                            :checked="isAllCodSelected" 
                            @change="toggleSelectAllCod"
                            :disabled="unsettledCodShipments.length === 0"
                            class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40 w-4 h-4"
                        />
                        <label for="shipper-select-all-cod" class="font-semibold text-slate-700 cursor-pointer select-none">
                            Chọn tất cả chưa nộp ({{ unsettledCodShipments.length }})
                        </label>
                        <span v-if="selectedCodCodes.length > 0" class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium text-[11px]">
                            Đã chọn: <strong class="font-mono font-bold">{{ selectedCodCodes.length }}</strong> đơn — <strong class="font-mono font-bold text-emerald-700">{{ Utils.formatCurrency(selectedCodTotalAmount) }}</strong>
                        </span>
                    </div>

                    <div class="flex items-center space-x-2 w-full sm:w-auto">
                        <button 
                            @click="openSettlementConfirmModal" 
                            :disabled="selectedCodCodes.length === 0 || isSubmittingSettlement"
                            class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                            <span>Nộp Quỹ Đơn Đã Chọn ({{ selectedCodCodes.length }})</span>
                        </button>
                        <button 
                            @click="handleSelectAllAndOpenModal" 
                            :disabled="unsettledCodShipments.length === 0 || isSubmittingSettlement"
                            class="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center space-x-1.5"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            <span>Nộp Toàn Bộ Ca ({{ unsettledCodShipments.length }})</span>
                        </button>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden text-xs">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/70 text-slate-600 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                                <th class="py-2.5 px-3 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        :checked="isAllCodSelected" 
                                        @change="toggleSelectAllCod"
                                        :disabled="unsettledCodShipments.length === 0"
                                        class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-40"
                                    />
                                </th>
                                <th class="py-2.5 px-3">Mã Vận Đơn</th>
                                <th class="py-2.5 px-3">Người Nhận Trả Tiền</th>
                                <th class="py-2.5 px-3">Địa Chỉ Giao</th>
                                <th class="py-2.5 px-3">Tiền COD Phải Nộp</th>
                                <th class="py-2.5 px-3 text-center">Tình Trạng Quyết Toán</th>
                                <th class="py-2.5 px-3 text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-medium">
                            <tr v-for="item in deliveredCodShipments" :key="item.id" class="hover:bg-blue-50/30 transition-colors">
                                <td class="py-2.5 px-3 text-center">
                                    <input 
                                        v-if="!item.codSettlementStatus || item.codSettlementStatus === 'UNSETTLED'"
                                        type="checkbox" 
                                        :checked="selectedCodCodes.includes(item.trackingCode)"
                                        @change="toggleSelectCod(item.trackingCode)"
                                        class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                    <span v-else class="text-slate-300 text-xs">—</span>
                                </td>
                                <td class="py-2.5 px-3">
                                    <button 
                                        type="button"
                                        @click="viewTrackingDetail(item.trackingCode)"
                                        class="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline inline-flex items-center space-x-1 cursor-pointer group text-left transition-colors whitespace-nowrap"
                                        title="Click để xem chi tiết hành trình & bản đồ"
                                    >
                                        <span>{{ item.trackingCode }}</span>
                                    </button>
                                </td>
                                <td class="py-2.5 px-3 font-bold text-slate-800">{{ item.receiverName }}</td>
                                <td class="py-2.5 px-3 text-slate-600 max-w-xs truncate">{{ item.receiverAddress }}</td>
                                <td class="py-2.5 px-3 font-mono font-bold text-emerald-700 text-sm">
                                    {{ Utils.formatCurrency(item.codAmount) }}
                                </td>
                                <td class="py-2.5 px-3 text-center">
                                    <span :class="['px-2.5 py-1 rounded-md text-[10.5px] font-bold border inline-flex items-center', getCodSettlementVisuals(item.codSettlementStatus).badgeClass]">
                                        <span v-if="getCodSettlementVisuals(item.codSettlementStatus).isPulse" class="live-pulse-dot mr-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                        {{ getCodSettlementVisuals(item.codSettlementStatus).label }}
                                    </span>
                                </td>
                                <td class="py-2.5 px-3 text-right">
                                    <button 
                                        v-if="!item.codSettlementStatus || item.codSettlementStatus === 'UNSETTLED'"
                                        @click="selectedCodCodes = [item.trackingCode]; openSettlementConfirmModal();"
                                        class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 transition text-[11px]"
                                    >
                                        Nộp Ngay
                                    </button>
                                    <span v-else-if="item.codSettlementStatus === 'PENDING_SETTLEMENT'" class="text-blue-600 text-[11px] font-semibold">
                                        Chờ thủ quỹ nhận
                                    </span>
                                    <span v-else-if="item.codSettlementStatus === 'SETTLED'" class="text-emerald-600 text-[11px] font-semibold inline-flex items-center">
                                        <svg class="w-3.5 h-3.5 mr-1 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                        Đã hoàn tất
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="deliveredCodShipments.length === 0">
                                <td colspan="7" class="py-10 text-center text-slate-400">
                                    Chưa có đơn hàng nào phát thành công có tiền COD trong ca để quyết toán.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            </transition>



            <teleport to="body">
            <Transition name="modal">
            <div v-if="showSettlementModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-5 space-y-4 text-xs">
                    <div class="border-b border-slate-100 pb-3 flex justify-between items-center">
                        <div class="flex items-center space-x-2">
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <div>
                                <h3 class="font-bold text-slate-900 text-sm">Xác Nhận Nộp Quỹ Tiền Mặt COD</h3>
                                <p class="text-slate-500 text-[11px]">Bàn giao tiền thu hộ về cho thủ quỹ bưu cục</p>
                            </div>
                        </div>
                        <button @click="showSettlementModal = false" class="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition" aria-label="Đóng">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div class="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                        <div class="flex justify-between items-center">
                            <span class="text-slate-600">Số lượng vận đơn nộp quỹ:</span>
                            <span class="font-mono font-bold text-slate-800 text-sm">{{ selectedCodCodes.length }} kiện</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-600">Tổng tiền mặt bàn giao:</span>
                            <span class="font-mono font-extrabold text-emerald-700 text-base">{{ Utils.formatCurrency(selectedCodTotalAmount) }}</span>
                        </div>
                        <div class="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2 leading-relaxed">
                            ⚠️ <strong>Lưu ý:</strong> Sau khi gửi yêu cầu, trạng thái các đơn sẽ chuyển thành <span class="text-blue-700 font-bold">"Chờ Bưu Cục Xác Nhận"</span>. Vui lòng bàn giao tiền mặt thực tế cho Thủ quỹ / Giao dịch viên bưu cục để được xác nhận vào quỹ.
                        </div>
                    </div>

                    <div class="border-t border-slate-100 pt-3 flex justify-end space-x-2">
                        <button @click="showSettlementModal = false" :disabled="isSubmittingSettlement" class="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold transition">
                            Hủy Bỏ
                        </button>
                        <button @click="executeCodSettlement()" :disabled="isSubmittingSettlement" class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition disabled:opacity-50 inline-flex items-center justify-center min-w-[150px]">
                            <span>{{ isSubmittingSettlement ? 'Đang Xử Lý...' : 'Xác Nhận Nộp Quỹ' }}</span>
                        </button>
                    </div>
                </div>
            </div>
            </Transition>
            </teleport>

            <teleport to="body">
            <Transition name="modal">
            <div v-if="showDeliveryActionModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs animate-in fade-in zoom-in duration-150">
                    <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-extrabold text-slate-900 text-sm">Tác Nghiệp Phát Bưu Gửi</h3>
                                <p class="text-slate-500 font-mono text-[11px]">Mã đơn: <span class="text-blue-700 font-bold">{{ deliveryTargetShipment?.trackingCode }}</span></p>
                            </div>
                        </div>
                        <button @click="closeDeliveryActionModal" class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition" aria-label="Đóng">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="p-5 space-y-4">
                        <div class="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500">Người nhận:</span>
                                <span class="font-bold text-slate-800">{{ deliveryTargetShipment?.receiverName || 'Chưa cập nhật' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500">Số điện thoại:</span>
                                <span class="font-mono font-bold text-slate-800">{{ deliveryTargetShipment?.receiverPhone || 'Chưa có SĐT' }}</span>
                            </div>
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-slate-500 shrink-0">Địa chỉ:</span>
                                <span class="text-slate-700 text-right">{{ deliveryTargetShipment?.receiverAddress || 'Chưa có địa chỉ' }}</span>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                @click="deliveryActiveTab = 'SUCCESS'"
                                :class="['py-2 rounded-lg transition flex items-center justify-center gap-1.5', deliveryActiveTab === 'SUCCESS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span>Phát Thành Công</span>
                            </button>
                            <button
                                type="button"
                                @click="deliveryActiveTab = 'FAILED'"
                                :class="['py-2 rounded-lg transition flex items-center justify-center gap-1.5', deliveryActiveTab === 'FAILED' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-700']"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                                <span>Báo Thất Bại</span>
                            </button>
                        </div>

                        <div v-if="deliveryActiveTab === 'SUCCESS'" class="space-y-3.5">
                            <template v-if="deliveryTargetShipment?.codAmount && deliveryTargetShipment.codAmount > 0">
                                <div class="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
                                    <div>
                                        <span class="text-[11px] font-bold uppercase tracking-wider text-amber-800">Tiền thu hộ COD:</span>
                                        <p class="text-[10px] text-amber-600">Thu đủ trước khi giao kiện</p>
                                    </div>
                                    <div class="font-mono font-extrabold text-lg text-amber-700">
                                        {{ Utils.formatCurrency(deliveryTargetShipment.codAmount) }}
                                    </div>
                                </div>

                                <div>
                                    <label class="block text-xs font-bold text-slate-700 mb-2">Chọn phương thức thu tiền:</label>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            @click="switchDeliveryPaymentMethod('CASH')"
                                            :class="['p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2', deliveryPaymentMethod === 'CASH' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold']"
                                        >
                                            <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <div class="text-xs">Tiền Mặt</div>
                                                <div class="text-[10px] text-slate-500 font-normal">Cầm tiền mặt</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            @click="switchDeliveryPaymentMethod('QR')"
                                            :class="['p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2', deliveryPaymentMethod === 'QR' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold']"
                                        >
                                            <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                                                </svg>
                                            </div>
                                            <div>
                                                <div class="text-xs">Quét VietQR</div>
                                                <div class="text-[10px] text-slate-500 font-normal">Chuyển khoản</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                <div v-if="deliveryPaymentMethod === 'CASH'" class="space-y-3 pt-1">
                                    <div class="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                                        <svg class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                        </svg>
                                        <span>Kiểm đếm đủ tiền mặt từ khách. Khoản tiền sẽ nộp quỹ cuối ca.</span>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-medium text-slate-600 mb-1">Ghi chú phát (tùy chọn):</label>
                                        <input v-model="deliverySuccessNote" type="text" placeholder="Người nhận trực tiếp / gửi người thân..." class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    </div>
                                    <button
                                        type="button"
                                        @click="submitDeliverySuccess(true)"
                                        :disabled="isActionRunning"
                                        class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                        <span>Xác Nhận Đã Thu Tiền & Giao Hàng</span>
                                    </button>
                                </div>

                                <div v-else-if="deliveryPaymentMethod === 'QR'" class="space-y-3 pt-1">
                                    <div v-if="isQrPaidSuccess" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                                        <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                        </div>
                                        <h4 class="font-extrabold text-emerald-900 text-xs">Thanh Toán VietQR Thành Công!</h4>
                                        <p class="text-[11px] text-emerald-700">Đã tự động quyết toán COD và hoàn tất phát hàng.</p>
                                    </div>

                                    <div v-else class="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-xl relative">
                                        <div class="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                            <span>{{ formatCountdown(qrCountdown) }}</span>
                                        </div>
                                        <div class="bg-white p-2 rounded-lg shadow-sm border border-slate-200 mb-2 min-h-[150px] flex items-center justify-center">
                                            <div v-if="isQrLoading" class="flex flex-col items-center space-y-2 text-slate-400 py-6">
                                                <svg class="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                <span>Đang tạo VietQR...</span>
                                            </div>
                                            <img v-else-if="qrPaymentData?.qrUrl" :src="qrPaymentData.qrUrl" alt="VietQR COD" class="w-36 h-36 object-contain" />
                                        </div>
                                        <div class="text-center text-[11px] space-y-0.5">
                                            <p class="font-extrabold text-blue-900">{{ qrPaymentData?.bankCode || 'MB Bank' }} • {{ qrPaymentData?.accountNo || '0987654321' }}</p>
                                            <p class="font-bold text-slate-700">{{ qrPaymentData?.accountName || 'VNPT POST LOGISTICS' }}</p>
                                            <div class="text-[10px] bg-blue-50 text-blue-800 py-0.5 px-2 rounded font-mono font-bold border border-blue-200 inline-block mt-0.5">
                                                Nội dung: COD {{ deliveryTargetShipment?.trackingCode }}
                                            </div>
                                        </div>
                                        <div class="mt-2 text-[10.5px] text-blue-700 flex items-center gap-1.5">
                                            <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                            <span>Đang chờ khách quét mã thanh toán...</span>
                                        </div>
                                    </div>

                                    <div v-if="!isQrPaidSuccess" class="pt-1">
                                        <button
                                            type="button"
                                            @click="handleMockQrPay"
                                            :disabled="isMockPaying || isQrLoading"
                                            class="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                        >
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                            <span>{{ isMockPaying ? 'Đang giả lập...' : 'Giả lập khách chuyển khoản thành công (Mock)' }}</span>
                                        </button>
                                    </div>
                                </div>
                            </template>

                            <template v-else>
                                <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                                    <svg class="w-4 h-4 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span>Bưu gửi không có tiền COD. Bưu tá bàn giao bưu phẩm cho người nhận và bấm xác nhận.</span>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-medium text-slate-600 mb-1">Ghi chú phát (tùy chọn):</label>
                                    <input v-model="deliverySuccessNote" type="text" placeholder="Người nhận trực tiếp / gửi người thân..." class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                </div>
                                <button
                                    type="button"
                                    @click="submitDeliverySuccess(false)"
                                    :disabled="isActionRunning"
                                    class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                    </svg>
                                    <span>Xác Nhận Đã Giao Hàng Cho Người Nhận</span>
                                </button>
                            </template>
                        </div>

                        <div v-else-if="deliveryActiveTab === 'FAILED'" class="space-y-3 pt-1">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Lý do phát không thành công:</label>
                                <select v-model="failedReason" class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium">
                                    <option value="KHONG_NGHE_MAY">Khách không nghe máy / Thuê bao</option>
                                    <option value="SAI_DIA_CHI">Sai địa chỉ / Không tìm thấy nhà</option>
                                    <option value="HEN_LAI_NGAY">Người nhận hẹn phát lại ngày sau</option>
                                    <option value="TU_CHOI_NHAN">Người nhận từ chối nhận hàng (Hoàn đơn)</option>
                                </select>
                            </div>
                            <div>
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-[11px] font-medium text-slate-600">Ghi chú bổ sung (nếu có):</label>
                                    <span class="text-[10px] text-slate-400 font-mono">{{ (failedNote || '').length }}/255</span>
                                </div>
                                <textarea v-model="failedNote" rows="2" maxlength="255" placeholder="Nhập ghi chú chi tiết từ cuộc gọi hoặc địa chỉ..." class="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:bg-white focus:border-rose-500 resize-none"></textarea>
                            </div>
                            <button
                                type="button"
                                @click="handleDeliverFailed"
                                :disabled="isActionRunning"
                                class="w-full py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-xs transition shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                                </svg>
                                <span>Xác Nhận Báo Phát Thất Bại</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </Transition>
            </teleport>

            <teleport to="body">
            <Transition name="modal">
            <div v-if="showReturnActionModal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-xs animate-in fade-in zoom-in duration-150">
                    <div class="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-amber-50">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z"></path>
                                </svg>
                            </div>
                            <div>
                                <h3 class="font-extrabold text-slate-900 text-sm">Tác Nghiệp Phát Hoàn Bưu Gửi</h3>
                                <p class="text-slate-500 font-mono text-[11px]">Mã đơn: <span class="text-orange-700 font-bold">{{ returnTargetShipment?.trackingCode }}</span></p>
                            </div>
                        </div>
                        <button @click="closeReturnActionModal" class="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition" aria-label="Đóng">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="p-5 space-y-4">
                        <div class="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs space-y-1">
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500">Người gửi nhận lại:</span>
                                <span class="font-bold text-slate-800">{{ returnTargetShipment?.senderName || 'Chưa cập nhật' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span class="text-slate-500">Số điện thoại:</span>
                                <span class="font-mono font-bold text-slate-800">{{ returnTargetShipment?.senderPhone || 'Chưa có SĐT' }}</span>
                            </div>
                            <div class="flex items-start justify-between gap-2">
                                <span class="text-slate-500 shrink-0">Địa chỉ phát hoàn:</span>
                                <span class="text-slate-700 text-right">{{ returnTargetShipment?.senderAddress || 'Chưa có địa chỉ' }}</span>
                            </div>
                        </div>

                        <div class="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
                            <div>
                                <span class="text-[11px] font-bold uppercase tracking-wider text-orange-900">Cước hoàn trả (50%):</span>
                                <p class="text-[10px] text-orange-700">Cước gốc: {{ Utils.formatCurrency(returnTargetShipment?.shippingFee || returnTargetShipment?.totalFee || 35000) }}</p>
                            </div>
                            <div class="font-mono font-extrabold text-lg text-orange-700">
                                {{ Utils.formatCurrency(getReturnFee(returnTargetShipment)) }}
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-slate-700 mb-2">Phương thức thu cước hoàn:</label>
                            <div class="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    @click="switchReturnPaymentMethod('CASH')"
                                    :class="['p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2', returnPaymentMethod === 'CASH' ? 'border-orange-600 bg-orange-50/50 text-orange-900 font-bold' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold']"
                                >
                                    <div class="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <div class="text-xs">Tiền Mặt</div>
                                        <div class="text-[10px] text-slate-500 font-normal">Thu trực tiếp</div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    @click="switchReturnPaymentMethod('QR')"
                                    :class="['p-2.5 rounded-xl border-2 text-left transition flex items-center gap-2', returnPaymentMethod === 'QR' ? 'border-orange-600 bg-orange-50/50 text-orange-900 font-bold' : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 font-bold']"
                                >
                                    <div class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
                                        </svg>
                                    </div>
                                    <div>
                                        <div class="text-xs">Quét VietQR</div>
                                        <div class="text-[10px] text-slate-500 font-normal">Chuyển khoản</div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <div v-if="returnPaymentMethod === 'CASH'" class="space-y-3 pt-1">
                            <div class="p-2.5 bg-orange-50/70 border border-orange-200 rounded-xl text-[11px] text-orange-800 flex items-start gap-2">
                                <svg class="w-4 h-4 text-orange-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Thu tiền mặt cước hoàn {{ Utils.formatCurrency(getReturnFee(returnTargetShipment)) }} từ người gửi khi trả hàng.</span>
                            </div>
                            <div>
                                <label class="block text-[11px] font-medium text-slate-600 mb-1">Ghi chú phát hoàn (tùy chọn):</label>
                                <input v-model="returnSuccessNote" type="text" placeholder="Người gửi nhận lại / người nhà nhận thay..." class="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                            </div>
                            <button
                                type="button"
                                @click="submitReturnSuccess(true)"
                                :disabled="isActionRunning"
                                class="w-full py-2.5 bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white rounded-xl font-bold text-xs transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span>Xác Nhận Đã Thu Cước & Hoàn Hàng Cho Người Gửi</span>
                            </button>
                        </div>

                        <div v-else-if="returnPaymentMethod === 'QR'" class="space-y-3 pt-1">
                            <div v-if="isReturnQrPaidSuccess" class="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
                                <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <h4 class="font-extrabold text-emerald-900 text-xs">Thanh Toán Cước Hoàn Thành Công!</h4>
                                <p class="text-[11px] text-emerald-700">Đã ghi nhận thanh toán cước hoàn qua VietQR.</p>
                            </div>

                            <div v-else class="flex flex-col items-center p-3 bg-slate-50 border border-slate-200 rounded-xl relative">
                                <div class="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    <span>{{ formatCountdown(returnQrCountdown) }}</span>
                                </div>
                                <div class="bg-white p-2 rounded-lg shadow-sm border border-slate-200 mb-2 min-h-[150px] flex items-center justify-center">
                                    <div v-if="isReturnQrLoading" class="flex flex-col items-center space-y-2 text-slate-400 py-6">
                                        <svg class="animate-spin h-6 w-6 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        <span>Đang tạo VietQR cước hoàn...</span>
                                    </div>
                                    <img v-else-if="returnQrPaymentData?.qrUrl" :src="returnQrPaymentData.qrUrl" alt="VietQR Cuoc Hoan" class="w-36 h-36 object-contain" />
                                </div>
                                <div class="text-center text-[11px] space-y-0.5">
                                    <p class="font-extrabold text-blue-900">{{ returnQrPaymentData?.bankCode || 'MB Bank' }} • {{ returnQrPaymentData?.accountNo || '0987654321' }}</p>
                                    <p class="font-bold text-slate-700">{{ returnQrPaymentData?.accountName || 'VNPT POST LOGISTICS' }}</p>
                                    <div class="text-[10px] bg-orange-50 text-orange-800 py-0.5 px-2 rounded font-mono font-bold border border-orange-200 inline-block mt-0.5">
                                        Nội dung: CUOC HOAN {{ returnTargetShipment?.trackingCode }}
                                    </div>
                                </div>
                                <div class="mt-2 text-[10.5px] text-orange-700 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
                                    <span>Đang chờ người gửi quét mã thanh toán cước hoàn...</span>
                                </div>
                            </div>

                            <div v-if="!isReturnQrPaidSuccess" class="pt-1">
                                <button
                                    type="button"
                                    @click="handleMockReturnQrPay"
                                    :disabled="isReturnMockPaying || isReturnQrLoading"
                                    class="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    <span>{{ isReturnMockPaying ? 'Đang giả lập...' : 'Giả lập khách chuyển khoản cước hoàn thành công (Mock)' }}</span>
                                </button>
                            </div>
                        </div>
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
