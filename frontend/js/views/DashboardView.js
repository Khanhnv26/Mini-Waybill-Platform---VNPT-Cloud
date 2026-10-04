(function () {
    const { ref, reactive, computed, onMounted, watch } = Vue;

    const STATIONS = [
        { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy (Hà Nội)', hub: 'HUB-HN-01', region: 'NORTH' },
        { code: 'POST-HN-DDA', name: 'Bưu Cục Đống Đa (Hà Nội)', hub: 'HUB-HN-01', region: 'NORTH' },
        { code: 'POST-HN-HBT', name: 'Bưu Cục Hai Bà Trưng (Hà Nội)', hub: 'HUB-HN-01', region: 'NORTH' },
        { code: 'POST-HN-TX', name: 'Bưu Cục Thanh Xuân (Hà Nội)', hub: 'HUB-HN-01', region: 'NORTH' },
        { code: 'POST-HN-HD', name: 'Bưu Cục Hà Đông (Hà Nội)', hub: 'HUB-HN-01', region: 'NORTH' },
        { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu (Đà Nẵng)', hub: 'HUB-DN-01', region: 'CENTRAL' },
        { code: 'POST-DN-TK', name: 'Bưu Cục Thanh Khê (Đà Nẵng)', hub: 'HUB-DN-01', region: 'CENTRAL' },
        { code: 'POST-DN-ST', name: 'Bưu Cục Sơn Trà (Đà Nẵng)', hub: 'HUB-DN-01', region: 'CENTRAL' },
        { code: 'POST-HCM-Q1', name: 'Bưu Cục Quận 1 (TP.HCM)', hub: 'HUB-HCM-01', region: 'SOUTH' },
        { code: 'POST-HCM-TB', name: 'Bưu Cục Tân Bình (TP.HCM)', hub: 'HUB-HCM-01', region: 'SOUTH' },
        { code: 'POST-HCM-BT', name: 'Bưu Cục Bình Thạnh (TP.HCM)', hub: 'HUB-HCM-01', region: 'SOUTH' },
        { code: 'POST-HCM-TD', name: 'Bưu Cục Thủ Đức (TP.HCM)', hub: 'HUB-HCM-01', region: 'SOUTH' },
        { code: 'POST-HCM-Q7', name: 'Bưu Cục Quận 7 (TP.HCM)', hub: 'HUB-HCM-01', region: 'SOUTH' },
        { code: 'POST-HP-NQ', name: 'Bưu Cục Ngô Quyền (Hải Phòng)', hub: 'HUB-HP-01', region: 'NORTH' },
        { code: 'POST-CT-NK', name: 'Bưu Cục Ninh Kiều (Cần Thơ)', hub: 'HUB-CT-01', region: 'SOUTH' }
    ];

    const HUBS = [
        { code: 'HUB-HN-01', name: 'Kho Tổng Hà Nội (Bắc)', region: 'Miền Bắc', regionKey: 'NORTH' },
        { code: 'HUB-DN-01', name: 'Kho Tổng Đà Nẵng (Trung)', region: 'Miền Trung', regionKey: 'CENTRAL' },
        { code: 'HUB-HCM-01', name: 'Kho Tổng TP.HCM (Nam)', region: 'Miền Nam', regionKey: 'SOUTH' },
        { code: 'HUB-HP-01', name: 'Kho Trung Chuyển Hải Phòng', region: 'Miền Bắc', regionKey: 'NORTH' },
        { code: 'HUB-CT-01', name: 'Kho Trung Chuyển Cần Thơ', region: 'Tây Nam Bộ', regionKey: 'SOUTH' }
    ];

    const parseDateLabel = (val) => {
        if (!val) return '';
        if (Array.isArray(val)) {
            const day = String(val[2] || 1).padStart(2, '0');
            const month = String(val[1] || 1).padStart(2, '0');
            return `${day}/${month}`;
        }
        if (typeof val === 'string') {
            const parts = val.split('T')[0].split('-');
            if (parts.length >= 3) {
                return `${parts[2]}/${parts[1]}`;
            }
            return val;
        }
        return String(val);
    };

    const formatDateTime = (val) => {
        if (!val) return '';
        if (Array.isArray(val)) {
            const day = String(val[2] || 1).padStart(2, '0');
            const month = String(val[1] || 1).padStart(2, '0');
            const hour = String(val[3] || 0).padStart(2, '0');
            const min = String(val[4] || 0).padStart(2, '0');
            return `${hour}:${min} • ${day}/${month}`;
        }
        if (typeof val === 'string') {
            const d = new Date(val);
            if (!isNaN(d.getTime())) {
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const hour = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                return `${hour}:${min} • ${day}/${month}`;
            }
            return val.replace('T', ' ').substring(0, 16);
        }
        return '';
    };

    const DashboardView = {
        name: 'DashboardView',
        props: {
            currentUser: {
                type: Object,
                default: () => ({})
            }
        },
        emits: ['switch-tab', 'view-tracking'],
        setup(props, { emit }) {
            const isAdmin = computed(() => {
                if (typeof Auth !== 'undefined' && Auth.hasRole('ADMIN')) return true;
                const roles = props.currentUser?.roles || [];
                return roles.includes('ROLE_ADMIN') || roles.includes('ADMIN');
            });

            const isHubStaff = computed(() => {
                if (typeof Auth !== 'undefined' && Auth.hasRole('HUB_STAFF')) return true;
                const roles = props.currentUser?.roles || [];
                return roles.includes('ROLE_HUB_STAFF');
            });

            const isShipperRole = computed(() => {
                if (typeof Auth !== 'undefined' && Auth.hasRole('SHIPPER')) return true;
                const roles = props.currentUser?.roles || [];
                return roles.includes('ROLE_SHIPPER');
            });

            const isPostStaff = computed(() => {
                if (typeof Auth !== 'undefined' && Auth.hasRole('POST_STAFF')) return true;
                const roles = props.currentUser?.roles || [];
                return roles.includes('ROLE_POST_STAFF');
            });

            const defaultRole = computed(() => {
                if (isAdmin.value) return 'ADMIN';
                if (isHubStaff.value) return 'HUB_STAFF';
                if (isShipperRole.value) return 'SHIPPER';
                return 'POST_STAFF';
            });

            const activeRole = ref(defaultRole.value);
            const isDockCollapsed = ref(false);

            const rolesList = computed(() => {
                const list = [];
                const icons = {
                    ADMIN: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                    POST_STAFF: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                    HUB_STAFF: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
                    SHIPPER: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8h4.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h2a1 1 0 001-1'
                };

                if (isAdmin.value) {
                    list.push({ key: 'ADMIN', label: 'Điều Hành Toàn Mạng', shortLabel: 'Điều Hành', line1: 'Điều Hành', line2: 'Toàn Mạng', desc: 'KPI & Mạng lưới vĩ mô', icon: icons.ADMIN });
                    list.push({ key: 'POST_STAFF', label: 'Bưu Cục & Trạm', shortLabel: 'Bưu Cục', line1: 'Bưu Cục', line2: 'Trạm Phát', desc: 'Dự báo ca trực & Quỹ COD', icon: icons.POST_STAFF });
                    list.push({ key: 'HUB_STAFF', label: 'Kho Tổng Hub', shortLabel: 'Kho Hub', line1: 'Kho Hub', line2: 'Chia Chọn', desc: 'Xe đường trục & Tồn sàn', icon: icons.HUB_STAFF });
                    list.push({ key: 'SHIPPER', label: 'Bưu Tá Tuyến Phát', shortLabel: 'Bưu Tá', line1: 'Bưu Tá', line2: 'Tuyến Phát', desc: 'Tuyến giao & Telegram Bot', icon: icons.SHIPPER });
                } else {
                    if (isPostStaff.value) list.push({ key: 'POST_STAFF', label: 'Bưu Cục & Trạm', shortLabel: 'Bưu Cục', line1: 'Bưu Cục', line2: 'Trạm Phát', desc: 'Dự báo ca trực & Quỹ COD', icon: icons.POST_STAFF });
                    if (isHubStaff.value) list.push({ key: 'HUB_STAFF', label: 'Kho Tổng Hub', shortLabel: 'Kho Hub', line1: 'Kho Hub', line2: 'Chia Chọn', desc: 'Xe đường trục & Tồn sàn', icon: icons.HUB_STAFF });
                    if (isShipperRole.value) list.push({ key: 'SHIPPER', label: 'Bưu Tá Tuyến Phát', shortLabel: 'Bưu Tá', line1: 'Bưu Tá', line2: 'Tuyến Phát', desc: 'Tuyến giao & Telegram Bot', icon: icons.SHIPPER });
                    if (list.length === 0) {
                        list.push({ key: 'POST_STAFF', label: 'Bưu Cục & Trạm', shortLabel: 'Bưu Cục', line1: 'Bưu Cục', line2: 'Trạm Phát', desc: 'Dự báo ca trực & Quỹ COD', icon: icons.POST_STAFF });
                    }
                }
                return list;
            });

            const roleGridClass = computed(() => {
                const len = rolesList.value.length;
                if (len >= 4) return 'grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5';
                if (len === 3) return 'grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5';
                if (len === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 max-w-2xl mx-auto';
                return 'flex items-center gap-2.5';
            });

            const selectedStation = ref(props.currentUser?.locationCode || props.currentUser?.postOfficeCode || 'POST-HN-CG');
            const selectedHub = ref('HUB-HN-01');

            const isRefreshing = ref(false);
            const isBroadcastingTelegram = ref(false);
            const telegramBroadcastMsg = ref(null);
            const stationShipmentSearch = ref('');

            const stationForecast = ref(null);
            const isForecastLoading = ref(false);
            const stationShippers = ref([]);
            const isShippersLoading = ref(false);

            const allShipments = ref([]);
            const isShipmentsLoading = ref(false);

            const allTrips = ref([]);
            const hubVehicles = ref([]);
            const isHubLoading = ref(false);

            const adminSummary = ref(null);
            const isAdminLoading = ref(false);
            const adminDateRange = ref('7days');
            const adminRegionFilter = ref('ALL');
            const adminNetworkTab = ref('hubs');

            const serviceHealth = reactive({
                routing: '200 OK',
                shipment: '200 OK',
                report: '200 OK',
                shipper: '200 OK',
                bot: 'SẴN SÀNG'
            });

            const activeInTransitTripsCount = computed(() => {
                return (allTrips.value || []).filter(t => t && t.status === 'IN_TRANSIT').length;
            });

            const filteredByRegionShipments = computed(() => {
                const list = allShipments.value || [];
                const region = adminRegionFilter.value;
                if (!region || region === 'ALL') return list;

                const stationCodesInRegion = new Set(
                    STATIONS.filter(s => s.region === region).map(s => s.code)
                );
                const hubCodesInRegion = new Set(
                    HUBS.filter(h => h.regionKey === region).map(h => h.code)
                );

                return list.filter(s => {
                    if (!s) return false;
                    const originMatch = stationCodesInRegion.has(s.originPostOffice);
                    const destMatch = stationCodesInRegion.has(s.destinationPostOffice);
                    const locMatch = stationCodesInRegion.has(s.currentLocation) || hubCodesInRegion.has(s.currentLocation);
                    return originMatch || destMatch || locMatch;
                });
            });

            const stationShipments = computed(() => {
                const code = String(selectedStation.value || '').trim().toUpperCase();
                if (!code || code === 'ALL') return allShipments.value || [];
                return (allShipments.value || []).filter(s => {
                    if (!s) return false;
                    const senderMatch = s.senderAddress && typeof s.senderAddress === 'string' && s.senderAddress.toUpperCase().includes(code);
                    const receiverMatch = s.receiverAddress && typeof s.receiverAddress === 'string' && s.receiverAddress.toUpperCase().includes(code);
                    const officeMatch = s.originPostOffice === code || s.destinationPostOffice === code || s.currentLocation === code;
                    return senderMatch || receiverMatch || officeMatch;
                });
            });

            const filteredStationShipments = computed(() => {
                const q = stationShipmentSearch.value.trim().toLowerCase();
                const list = stationShipments.value;
                if (!q) return list;
                return list.filter(s =>
                    (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                    (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                    (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
                );
            });

            const stationCodSummary = computed(() => {
                let pendingAmount = 0;
                let pendingCount = 0;
                let settledAmount = 0;
                let settledCount = 0;

                stationShipments.value.forEach(s => {
                    if (!s) return;
                    const cod = Number(s.codAmount || 0);
                    const isDelivered = s.currentStatus === 'DELIVERED';
                    const settlementStatus = String(s.codSettlementStatus || 'UNSETTLED').toUpperCase();

                    if (isDelivered && (settlementStatus === 'PENDING_SETTLEMENT' || settlementStatus === 'UNSETTLED')) {
                        pendingAmount += cod;
                        pendingCount += 1;
                    } else if (settlementStatus === 'SETTLED') {
                        settledAmount += cod;
                        settledCount += 1;
                    }
                });

                return { pendingAmount, pendingCount, settledAmount, settledCount };
            });

            const forecastSummary = computed(() => {
                if (stationForecast.value && stationForecast.value.summary) {
                    return stationForecast.value.summary;
                }
                const inTransit = stationShipments.value.filter(s => s && s.currentStatus === 'IN_TRANSIT').length;
                const held = stationShipments.value.filter(s => s && (s.currentStatus === 'STORED' || s.currentStatus === 'WAITING_FOR_DELIVERY')).length;
                const sla = stationShipments.value.filter(s => s && (s.deliveryType === 'EXPRESS' || s.deliveryType === 'FAST')).length;
                return {
                    totalForecastOrders: inTransit + held + sla,
                    estimatedWeightKg: Math.round((inTransit + held + sla) * 1.8 * 10) / 10,
                    estimatedCodAmount: stationShipments.value.reduce((sum, s) => sum + Number(s?.codAmount || 0), 0),
                    inTransitCount: inTransit,
                    inventoryHeldCount: held,
                    committedEtaCount: sla
                };
            });

            const forecastCapacity = computed(() => {
                if (stationForecast.value && stationForecast.value.capacity) {
                    return stationForecast.value.capacity;
                }
                const onDuty = stationShippers.value.filter(s => s && s.shiftStatus === 'ON_DUTY').length;
                const total = stationShippers.value.length || 1;
                const cap = Math.max(1, onDuty) * 40;
                const totalOrders = forecastSummary.value.totalForecastOrders || 0;
                const util = Math.min(100, Math.round((totalOrders / cap) * 100));
                return {
                    activeShippersOnDuty: onDuty,
                    totalShippers: total,
                    totalShiftCapacity: cap,
                    utilizationRate: util,
                    capacityStatus: util > 85 ? 'WARNING' : 'OPTIMAL',
                    alertMessage: onDuty > 0 ? `Đội ${onDuty} bưu tá trực ca đáp ứng ${util}% công suất ${totalOrders} đơn.` : 'Chưa có bưu tá nào bật ca trực ON_DUTY.'
                };
            });

            const forecastShippers = computed(() => {
                if (stationForecast.value && Array.isArray(stationForecast.value.shipperAllocations) && stationForecast.value.shipperAllocations.length > 0) {
                    return stationForecast.value.shipperAllocations;
                }
                const total = forecastSummary.value.totalForecastOrders || 0;
                const totalCod = forecastSummary.value.estimatedCodAmount || 0;
                const onDutyList = stationShippers.value.filter(s => s && s.shiftStatus === 'ON_DUTY');
                const count = onDutyList.length || 1;
                const avgOrders = Math.floor(total / count);
                const avgCod = Math.floor(totalCod / count);

                return stationShippers.value.map(s => {
                    const isOnDuty = s && s.shiftStatus === 'ON_DUTY';
                    const orders = isOnDuty ? avgOrders : 0;
                    const maxCap = s?.maxOrdersPerShift || 40;
                    return {
                        courierCode: s?.courierCode || s?.id || 'COURIER',
                        fullName: s?.fullName || 'Bưu tá',
                        phone: s?.phone || '',
                        assignedZone: s?.assignedZone || 'Tuyến Trung Tâm',
                        shiftStatus: s?.shiftStatus || 'OFF_DUTY',
                        estimatedOrdersCount: orders,
                        maxOrdersPerShift: maxCap,
                        utilizationRate: Math.min(100, Math.round((orders / maxCap) * 100)),
                        estimatedCodAmount: isOnDuty ? avgCod : 0,
                        hasLinkedTelegram: Boolean(s?.telegramChatId)
                    };
                });
            });

            const currentStationInfo = computed(() => {
                return STATIONS.find(s => s.code === selectedStation.value) || {
                    code: selectedStation.value,
                    name: selectedStation.value,
                    hub: 'HUB-HN-01'
                };
            });

            const loadStationData = async () => {
                const code = selectedStation.value;
                if (!code || code === 'ALL') return;
                isForecastLoading.value = true;
                telegramBroadcastMsg.value = null;

                try {
                    const promises = [];
                    if (typeof RoutingService !== 'undefined' && RoutingService.getStationForecast) {
                        promises.push(
                            RoutingService.getStationForecast(code)
                                .then(data => { stationForecast.value = data; })
                                .catch(() => { stationForecast.value = null; })
                        );
                    }
                    if (typeof ShipperDirectoryService !== 'undefined' && ShipperDirectoryService.list) {
                        promises.push(
                            ShipperDirectoryService.list({ stationCode: code })
                                .then(list => { stationShippers.value = Array.isArray(list) ? list : []; })
                                .catch(() => { stationShippers.value = []; })
                        );
                    }
                    if (typeof ShipmentService !== 'undefined' && ShipmentService.getAll) {
                        promises.push(
                            ShipmentService.getAll()
                                .then(list => { allShipments.value = Array.isArray(list) ? list : []; })
                                .catch(() => { allShipments.value = []; })
                        );
                    }
                    await Promise.all(promises);
                } finally {
                    isForecastLoading.value = false;
                }
            };

            const dispatchTelegramForecast = async () => {
                const code = selectedStation.value;
                if (!code) return;
                isBroadcastingTelegram.value = true;
                telegramBroadcastMsg.value = null;
                try {
                    if (typeof RoutingService !== 'undefined' && RoutingService.dispatchStationTelegramForecast) {
                        const result = await RoutingService.dispatchStationTelegramForecast(code);
                        telegramBroadcastMsg.value = `Đã gửi ca trực tới ${result.successfullyDispatched || 0}/${result.totalShippersTargeted || 0} bưu tá qua @NovaWay_Bill_Bot`;
                        if (window.Utils) window.Utils.showToast('Telegram Thành Công', telegramBroadcastMsg.value, 'success');
                    }
                } catch (err) {
                    telegramBroadcastMsg.value = `Lỗi gửi Telegram: ${err.message || 'Không thể phát thông báo'}`;
                    if (window.Utils) window.Utils.showToast('Lỗi Telegram', telegramBroadcastMsg.value, 'error');
                } finally {
                    isBroadcastingTelegram.value = false;
                }
            };

            const currentHubInfo = computed(() => {
                return HUBS.find(h => h.code === selectedHub.value) || HUBS[0];
            });

            const filteredHubTrips = computed(() => {
                const hCode = selectedHub.value;
                if (!hCode) return allTrips.value || [];
                return (allTrips.value || []).filter(t => {
                    if (!t) return false;
                    const originMatch = t.originHub === hCode || (t.route && typeof t.route === 'string' && t.route.includes(hCode));
                    const destMatch = t.destinationHub === hCode;
                    return originMatch || destMatch;
                });
            });

            const hubKpi = computed(() => {
                const trips = filteredHubTrips.value;
                const running = trips.filter(t => t && t.status === 'IN_TRANSIT').length;
                const vehicles = hubVehicles.value || [];
                const availableVehicles = vehicles.filter(v => v && v.status === 'AVAILABLE').length;

                return {
                    tripsRunning: running,
                    tripsTotal: trips.length,
                    vehiclesAvailable: availableVehicles,
                    vehiclesTotal: vehicles.length
                };
            });

            const loadHubData = async () => {
                isHubLoading.value = true;
                try {
                    const promises = [];
                    if (typeof RoutingService !== 'undefined' && RoutingService.getAllTrips) {
                        promises.push(
                            RoutingService.getAllTrips()
                                .then(list => { allTrips.value = Array.isArray(list) ? list : []; })
                                .catch(() => { allTrips.value = []; })
                        );
                    }
                    if (typeof RoutingService !== 'undefined' && RoutingService.getVehicles) {
                        promises.push(
                            RoutingService.getVehicles({ hub: selectedHub.value })
                                .then(list => { hubVehicles.value = Array.isArray(list) ? list : []; })
                                .catch(() => { hubVehicles.value = []; })
                        );
                    }
                    await Promise.all(promises);
                } finally {
                    isHubLoading.value = false;
                }
            };

            const currentCourierCode = computed(() => {
                return props.currentUser?.courierCode || props.currentUser?.username || 'NVB-01';
            });

            const shipperForecast = ref(null);
            const shipperShiftStatus = ref('ON_DUTY');
            const isShipperLoading = ref(false);

            const myAssignedShipments = computed(() => {
                const cCode = currentCourierCode.value;
                return (allShipments.value || []).filter(s => {
                    if (!s) return false;
                    const assignedCourier = s.courierCode || s.assignedCourierId || s.courierId;
                    return assignedCourier && String(assignedCourier).toUpperCase() === String(cCode).toUpperCase();
                });
            });

            const shipperStats = computed(() => {
                const list = myAssignedShipments.value;
                const delivered = list.filter(s => s && s.currentStatus === 'DELIVERED').length;
                let pocketCod = 0;
                list.forEach(s => {
                    if (s && s.currentStatus === 'DELIVERED' && s.codSettlementStatus !== 'SETTLED') {
                        pocketCod += Number(s.codAmount || 0);
                    }
                });

                const pct = list.length > 0 ? Math.round((delivered / list.length) * 100) : 0;
                const tomOrders = shipperForecast.value?.estimatedOrdersCount || 0;
                const tomCod = shipperForecast.value?.estimatedCodAmount || 0;

                return {
                    totalAssigned: list.length,
                    deliveredCount: delivered,
                    progressPercent: pct,
                    pocketCod,
                    tomorrowOrders: tomOrders,
                    tomorrowCod: tomCod
                };
            });

            const loadShipperData = async () => {
                const code = currentCourierCode.value;
                if (!code) return;
                isShipperLoading.value = true;
                try {
                    const promises = [];
                    if (typeof RoutingService !== 'undefined' && RoutingService.getShipperForecast) {
                        promises.push(
                            RoutingService.getShipperForecast(code)
                                .then(data => { shipperForecast.value = data; })
                                .catch(() => { shipperForecast.value = null; })
                        );
                    }
                    if (typeof ShipmentService !== 'undefined' && ShipmentService.getAll) {
                        promises.push(
                            ShipmentService.getAll()
                                .then(list => { allShipments.value = Array.isArray(list) ? list : []; })
                                .catch(() => { allShipments.value = []; })
                        );
                    }
                    await Promise.all(promises);
                } finally {
                    isShipperLoading.value = false;
                }
            };

            const toggleShipperShift = () => {
                shipperShiftStatus.value = shipperShiftStatus.value === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
                if (window.Utils) {
                    const msg = shipperShiftStatus.value === 'ON_DUTY' ? 'Đã bật ca trực sẵn sàng phát hàng' : 'Đã chuyển sang trạng thái nghỉ ca';
                    window.Utils.showToast('Cập Nhật Ca Trực', msg, 'success');
                }
            };

            const adminKpi = computed(() => {
                const s = adminSummary.value || {};
                const shipments = filteredByRegionShipments.value;
                const totalOrdersFromShipments = shipments.length;
                const totalOrders = Number(s.totalOrders || totalOrdersFromShipments || 0);
                const delivered = Number(s.deliveredCount || s.deliveredOrders || shipments.filter(x => x && x.currentStatus === 'DELIVERED').length || 0);
                const rate = totalOrders > 0 ? Math.round((delivered / totalOrders) * 1000) / 10 : 0;

                let calcFee = 0;
                let calcCod = 0;
                let calcSettledCod = 0;
                let calcInTransit = 0;
                let calcReturning = 0;

                shipments.forEach(item => {
                    if (!item) return;
                    calcFee += Number(item.shippingFee || item.totalFee || 0);
                    calcCod += Number(item.codAmount || 0);
                    if (item.codSettlementStatus === 'SETTLED') {
                        calcSettledCod += Number(item.codAmount || 0);
                    }
                    if (item.currentStatus === 'IN_TRANSIT') {
                        calcInTransit += 1;
                    }
                    if (item.currentStatus === 'RETURNED' || item.currentStatus === 'FAILED' || item.currentStatus === 'DELIVERY_FAILED') {
                        calcReturning += 1;
                    }
                });

                return {
                    totalShippingFee: Number(s.totalShippingFee || calcFee || 0),
                    totalOrders,
                    deliveredOrders: delivered,
                    totalCod: Number(s.totalCodAmount || s.totalCod || calcCod || 0),
                    settledCod: Number(s.settledCodAmount || s.settledCod || calcSettledCod || 0),
                    inTransitOrders: Number(s.inTransitCount || s.inTransitOrders || calcInTransit || 0),
                    returningOrders: Number(s.returningCount || s.returningOrders || calcReturning || 0),
                    successRate: s.successRate != null ? Number(s.successRate) : rate
                };
            });

            const adminBarChartData = computed(() => {
                if (adminSummary.value && Array.isArray(adminSummary.value.daily) && adminSummary.value.daily.length > 0) {
                    const daysCount = adminDateRange.value === 'today' ? 1 : (adminDateRange.value === '30days' ? 30 : 7);
                    const raw = adminSummary.value.daily.slice(-daysCount);
                    const maxFee = Math.max(...raw.map(d => Number(d.shippingFee || d.totalFee || 0)), 1);
                    const maxCod = Math.max(...raw.map(d => Number(d.codAmount || d.totalCod || 0)), 1);
                    return raw.map(d => {
                        const fee = Number(d.shippingFee || d.totalFee || 0);
                        const cod = Number(d.codAmount || d.totalCod || 0);
                        const label = parseDateLabel(d.date);
                        return {
                            date: typeof d.date === 'string' ? d.date : JSON.stringify(d.date),
                            label,
                            count: Number(d.count || 0),
                            fee,
                            cod,
                            feeHeight: `${Math.max(10, Math.round((fee / maxFee) * 100))}%`,
                            codHeight: `${Math.max(10, Math.round((cod / maxCod) * 100))}%`
                        };
                    });
                }

                const shipments = filteredByRegionShipments.value;
                const daysCount = adminDateRange.value === 'today' ? 1 : (adminDateRange.value === '30days' ? 30 : 7);
                const dailyBuckets = [];
                for (let i = daysCount - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const iso = d.toISOString().split('T')[0];
                    const label = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    dailyBuckets.push({ iso, label, count: 0, fee: 0, cod: 0 });
                }

                shipments.forEach(item => {
                    if (!item) return;
                    let dateStr = '';
                    if (item.createdAt) {
                        if (typeof item.createdAt === 'string') {
                            dateStr = item.createdAt.split('T')[0];
                        } else if (Array.isArray(item.createdAt)) {
                            dateStr = `${item.createdAt[0]}-${String(item.createdAt[1]).padStart(2, '0')}-${String(item.createdAt[2]).padStart(2, '0')}`;
                        }
                    }
                    const match = dailyBuckets.find(x => x.iso === dateStr);
                    if (match) {
                        match.count += 1;
                        match.fee += Number(item.shippingFee || item.totalFee || 0);
                        match.cod += Number(item.codAmount || 0);
                    }
                });

                const maxFee = Math.max(...dailyBuckets.map(d => d.fee), 1);
                const maxCod = Math.max(...dailyBuckets.map(d => d.cod), 1);

                return dailyBuckets.map(d => ({
                    date: d.iso,
                    label: d.label,
                    count: d.count,
                    fee: d.fee,
                    cod: d.cod,
                    feeHeight: `${Math.max(12, Math.round((d.fee / maxFee) * 90))}%`,
                    codHeight: `${Math.max(12, Math.round((d.cod / maxCod) * 90))}%`
                }));
            });

            const adminHubMatrix = computed(() => {
                const trips = allTrips.value || [];
                const vehicles = hubVehicles.value || [];
                const shipments = allShipments.value || [];
                const region = adminRegionFilter.value;

                const targetHubs = (!region || region === 'ALL')
                    ? HUBS
                    : HUBS.filter(h => h.regionKey === region);

                return targetHubs.map(h => {
                    const activeTrips = trips.filter(t => t && (t.originHub === h.code || t.destinationHub === h.code) && t.status === 'IN_TRANSIT').length;
                    const vehiclesCount = vehicles.filter(v => v && v.hub === h.code).length;
                    const stagedCargo = shipments.filter(s => s && s.currentLocation === h.code).length;
                    let loadStatus = 'OPTIMAL';
                    let statusLabel = 'Thông Suốt';
                    if (stagedCargo >= 50 || activeTrips >= 5) {
                        loadStatus = 'HEAVY';
                        statusLabel = 'Cao Điểm';
                    } else if (stagedCargo >= 15 || activeTrips >= 2) {
                        loadStatus = 'BUSY';
                        statusLabel = 'Đang Tải';
                    }
                    return {
                        code: h.code,
                        name: h.name,
                        region: h.region,
                        activeTrips,
                        vehiclesCount,
                        stagedCargo,
                        loadStatus,
                        statusLabel
                    };
                });
            });

            const adminTopStations = computed(() => {
                const shipments = allShipments.value || [];
                const region = adminRegionFilter.value;
                const pool = (!region || region === 'ALL')
                    ? STATIONS
                    : STATIONS.filter(s => s.region === region);

                const matchShipmentToStation = (s, st) => {
                    if (!s || !st) return false;
                    const stCode = String(st.code || '').trim().toUpperCase();
                    if (s.originPostOffice === stCode || s.destinationPostOffice === stCode || s.currentLocation === stCode) return true;

                    const fullText = `${s.senderAddress || ''} ${s.receiverAddress || ''} ${s.senderProvince || ''} ${s.receiverProvince || ''} ${s.senderDistrict || ''} ${s.receiverDistrict || ''}`.toLowerCase();
                    switch (st.code) {
                        case 'POST-CT-NK': return fullText.includes('cần thơ') || fullText.includes('ninh kiều');
                        case 'POST-HP-NQ': return fullText.includes('hải phòng') || fullText.includes('ngô quyền') || fullText.includes('đồ sơn');
                        case 'POST-DN-ST': return fullText.includes('sơn trà') || (fullText.includes('đà nẵng') && !fullText.includes('hải châu') && !fullText.includes('thanh khê'));
                        case 'POST-DN-HC': return fullText.includes('hải châu');
                        case 'POST-DN-TK': return fullText.includes('thanh khê');
                        case 'POST-HCM-Q1': return fullText.includes('quận 1') || fullText.includes('q.1') || fullText.includes('q1');
                        case 'POST-HCM-TB': return fullText.includes('tân bình');
                        case 'POST-HCM-BT': return fullText.includes('bình thạnh');
                        case 'POST-HCM-TD': return fullText.includes('thủ đức');
                        case 'POST-HCM-Q7': return fullText.includes('quận 7') || fullText.includes('q.7') || fullText.includes('q7');
                        case 'POST-HN-CG': return fullText.includes('cầu giấy');
                        case 'POST-HN-DDA': return fullText.includes('đống đa');
                        case 'POST-HN-HBT': return fullText.includes('hai bà trưng');
                        case 'POST-HN-TX': return fullText.includes('thanh xuân');
                        case 'POST-HN-HD': return fullText.includes('hà đông');
                        default: return false;
                    }
                };

                const stats = pool.map(st => {
                    const stShipments = shipments.filter(s => matchShipmentToStation(s, st));
                    const totalCount = stShipments.length;
                    const tomorrowOrders = stShipments.filter(s =>
                        s && (['IN_TRANSIT', 'WAITING_FOR_DELIVERY', 'STORED', 'PICKED_UP', 'DELIVERING'].includes(s.currentStatus))
                    ).length;
                    const pendingCod = stShipments
                        .filter(s => s && (s.currentStatus === 'DELIVERED' || s.currentStatus === 'DELIVERING') && s.codSettlementStatus !== 'SETTLED')
                        .reduce((sum, s) => sum + Number(s.codAmount || 0), 0);
                    const onDutyShippers = Math.max(3, Math.min(8, 3 + Math.ceil(totalCount / 2)));
                    const maxCap = onDutyShippers * 30;
                    const displayOrders = tomorrowOrders > 0 ? tomorrowOrders : totalCount;
                    const util = Math.min(100, Math.round((displayOrders / maxCap) * 100));

                    const cleanName = typeof st.name === 'string' ? st.name.split(' (')[0] : (st.name || st.code);

                    return {
                        code: st.code,
                        name: cleanName,
                        totalCount,
                        tomorrowOrders: displayOrders,
                        onDutyShippers,
                        utilizationRate: util,
                        pendingCod,
                        alertStatus: util > 85 ? 'WARNING' : 'NORMAL'
                    };
                });

                stats.sort((a, b) => {
                    if (b.tomorrowOrders !== a.tomorrowOrders) return b.tomorrowOrders - a.tomorrowOrders;
                    if (b.totalCount !== a.totalCount) return b.totalCount - a.totalCount;
                    if (b.pendingCod !== a.pendingCod) return b.pendingCod - a.pendingCod;
                    return a.code.localeCompare(b.code);
                });

                return stats.slice(0, 5);
            });

            const recentShipments = computed(() => {
                const list = [...filteredByRegionShipments.value];
                list.sort((a, b) => {
                    const parseTime = (item) => {
                        if (!item || !item.createdAt) return 0;
                        if (Array.isArray(item.createdAt)) {
                            return new Date(item.createdAt[0], (item.createdAt[1] || 1) - 1, item.createdAt[2] || 1, item.createdAt[3] || 0, item.createdAt[4] || 0).getTime();
                        }
                        return new Date(item.createdAt).getTime() || 0;
                    };
                    return parseTime(b) - parseTime(a);
                });

                return list.slice(0, 5).map((s, idx) => {
                    return {
                        id: s?.id || idx,
                        trackingCode: s?.trackingCode || `VNPT-${idx}`,
                        receiverName: s?.receiverName || 'Khách nhận',
                        receiverAddress: s?.receiverAddress || 'Chưa có địa chỉ',
                        destination: s?.destinationPostOffice || s?.currentLocation || '',
                        time: formatDateTime(s?.createdAt),
                        fee: Number(s?.shippingFee || s?.totalFee || 0),
                        cod: Number(s?.codAmount || 0),
                        status: s?.currentStatus || 'PENDING'
                    };
                });
            });

            const loadAdminData = async () => {
                isAdminLoading.value = true;
                try {
                    const promises = [];
                    if (typeof ReportService !== 'undefined' && ReportService.getSummary) {
                        promises.push(
                            ReportService.getSummary({ status: 'ALL' })
                                .then(res => {
                                    adminSummary.value = res;
                                    serviceHealth.report = '200 OK';
                                })
                                .catch(() => {
                                    adminSummary.value = null;
                                    serviceHealth.report = 'STANDBY';
                                })
                        );
                    }
                    if (typeof RoutingService !== 'undefined' && RoutingService.getAllTrips) {
                        promises.push(
                            RoutingService.getAllTrips()
                                .then(list => {
                                    allTrips.value = Array.isArray(list) ? list : [];
                                    serviceHealth.routing = '200 OK';
                                })
                                .catch(() => {
                                    allTrips.value = [];
                                    serviceHealth.routing = 'STANDBY';
                                })
                        );
                    }
                    if (typeof RoutingService !== 'undefined' && RoutingService.getVehicles) {
                        promises.push(
                            RoutingService.getVehicles({ hub: selectedHub.value })
                                .then(list => { hubVehicles.value = Array.isArray(list) ? list : []; })
                                .catch(() => { hubVehicles.value = []; })
                        );
                    }
                    if (typeof ShipmentService !== 'undefined' && ShipmentService.getAll) {
                        promises.push(
                            ShipmentService.getAll()
                                .then(list => {
                                    allShipments.value = Array.isArray(list) ? list : [];
                                    serviceHealth.shipment = '200 OK';
                                })
                                .catch(() => {
                                    allShipments.value = [];
                                    serviceHealth.shipment = 'STANDBY';
                                })
                        );
                    }
                    if (typeof ShipperDirectoryService !== 'undefined' && ShipperDirectoryService.list) {
                        promises.push(
                            ShipperDirectoryService.list()
                                .then(() => { serviceHealth.shipper = '200 OK'; })
                                .catch(() => { serviceHealth.shipper = 'STANDBY'; })
                        );
                    }
                    await Promise.all(promises);
                } finally {
                    isAdminLoading.value = false;
                }
            };

            const refreshCurrentDashboard = async () => {
                isRefreshing.value = true;
                try {
                    if (activeRole.value === 'POST_STAFF') {
                        await loadStationData();
                    } else if (activeRole.value === 'HUB_STAFF') {
                        await loadHubData();
                    } else if (activeRole.value === 'SHIPPER') {
                        await loadShipperData();
                    } else if (activeRole.value === 'ADMIN') {
                        await loadAdminData();
                    }
                    if (window.Utils) window.Utils.showToast('Đồng Bộ Hoàn Tất', 'Đã cập nhật số liệu mới nhất.', 'info');
                } finally {
                    isRefreshing.value = false;
                }
            };

            const exportAdminExcel = async () => {
                if (typeof ReportService !== 'undefined' && ReportService.exportExcel) {
                    try {
                        await ReportService.exportExcel({ status: 'ALL' });
                        if (window.Utils) window.Utils.showToast('Xuất File Thành Công', 'Báo cáo doanh thu đã được tải về.', 'success');
                    } catch (e) {
                        if (window.Utils) window.Utils.showToast('Lỗi Xuất File', e.message || 'Không thể xuất file excel', 'error');
                    }
                }
            };

            const formatCurrencyShort = (val) => {
                const num = Number(val || 0);
                if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B₫';
                if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M₫';
                return num.toLocaleString('vi-VN') + '₫';
            };

            const currentRoleHeader = computed(() => {
                if (activeRole.value === 'POST_STAFF') {
                    const st = currentStationInfo.value;
                    return {
                        badge: 'Bưu Cục Giao Dịch',
                        title: st ? st.name : 'Bưu Cục Giao Dịch',
                        subtitle: 'Kế hoạch ca phát, phân bổ tuyến bưu tá và kiểm soát quỹ tiền COD.',
                        contextScope: st ? `Mã: ${st.code} • Hub mẹ: ${st.hub}` : '',
                        kpis: [
                            { label: 'Ca Mai', value: forecastSummary.value.totalForecastOrders, colorClass: 'text-white' },
                            { label: 'Tải Ca', value: `${forecastCapacity.value.utilizationRate}%`, colorClass: 'text-emerald-300' },
                            { label: 'Bưu Tá', value: `${forecastCapacity.value.activeShippersOnDuty}/${forecastCapacity.value.totalShippers}`, colorClass: 'text-sky-200' },
                            { label: 'Nợ COD', value: formatCurrencyShort(stationCodSummary.value.pendingAmount), colorClass: 'text-amber-300' }
                        ]
                    };
                }
                if (activeRole.value === 'HUB_STAFF') {
                    const hb = currentHubInfo.value;
                    return {
                        badge: 'Trung Tâm Chia Chọn',
                        title: hb ? hb.name : 'Kho Hub Trung Chuyển',
                        subtitle: 'Điều phối chuyến xe trục liên tỉnh và giám sát đội xe trung chuyển.',
                        contextScope: hb ? `Mã: ${hb.code} • Khu vực: ${hb.region}` : '',
                        kpis: [
                            { label: 'Xe Đang Chạy', value: hubKpi.value.tripsRunning, colorClass: 'text-white' },
                            { label: 'Xe Sẵn Sàng', value: hubKpi.value.vehiclesAvailable, colorClass: 'text-emerald-300' },
                            { label: 'Tổng Chuyến', value: hubKpi.value.tripsTotal, colorClass: 'text-sky-200' }
                        ]
                    };
                }
                if (activeRole.value === 'SHIPPER') {
                    const code = currentCourierCode.value;
                    return {
                        badge: 'Bưu Tá Giao Hàng',
                        title: code ? `Bưu Tá ${code}` : 'Bưu Tá Phát Hàng',
                        subtitle: 'Theo dõi danh sách bưu gửi được giao, cập nhật tiến độ phát và đối soát tiền thu hộ COD.',
                        contextScope: `Ca trực: ${shipperShiftStatus.value === 'ON_DUTY' ? 'Đang bật ca trực' : 'Nghỉ ca'}`,
                        kpis: [
                            { label: 'Đã Giao', value: `${shipperStats.value.deliveredCount}/${shipperStats.value.totalAssigned}`, colorClass: 'text-white' },
                            { label: 'Tiến Độ', value: `${shipperStats.value.progressPercent}%`, colorClass: 'text-emerald-300' },
                            { label: 'COD Giữ', value: formatCurrencyShort(shipperStats.value.pocketCod), colorClass: 'text-amber-300' }
                        ]
                    };
                }
                return {
                    badge: 'Trung Tâm Điều Hành Quốc Gia',
                    title: 'Giám Sát Toàn Mạng Lưới & Năng Lực Lưu Thoát',
                    subtitle: 'Giám sát lưu thoát bưu gửi, doanh thu cước, quỹ COD và chất lượng SLA toàn trình.',
                    contextScope: 'Phạm vi: Toàn mạng lưới 63 tỉnh thành',
                    kpis: [
                        { label: 'Tổng Đơn', value: adminKpi.value.totalOrders.toLocaleString('vi-VN'), colorClass: 'text-white' },
                        { label: 'SLA Chuẩn', value: `${adminKpi.value.successRate}%`, colorClass: 'text-emerald-300' },
                        { label: 'Cước Phí', value: formatCurrencyShort(adminKpi.value.totalShippingFee), colorClass: 'text-sky-200' },
                        { label: 'Quỹ COD', value: formatCurrencyShort(adminKpi.value.totalCod), colorClass: 'text-amber-300' }
                    ]
                };
            });

            watch(selectedStation, () => {
                if (activeRole.value === 'POST_STAFF') {
                    loadStationData();
                }
            });

            watch(selectedHub, () => {
                if (activeRole.value === 'HUB_STAFF') {
                    loadHubData();
                }
            });

            watch(activeRole, (newRole) => {
                if (newRole === 'POST_STAFF') loadStationData();
                else if (newRole === 'HUB_STAFF') loadHubData();
                else if (newRole === 'SHIPPER') loadShipperData();
                else if (newRole === 'ADMIN') loadAdminData();
            });

            onMounted(() => {
                loadStationData();
                loadHubData();
                loadShipperData();
                loadAdminData();
            });

            return {
                isAdmin,
                isHubStaff,
                isShipperRole,
                isPostStaff,
                activeRole,
                isDockCollapsed,
                rolesList,
                roleGridClass,
                STATIONS,
                HUBS,
                selectedStation,
                selectedHub,
                currentStationInfo,
                currentHubInfo,
                isRefreshing,
                isBroadcastingTelegram,
                telegramBroadcastMsg,
                stationShipmentSearch,
                stationForecast,
                isForecastLoading,
                stationShippers,
                filteredStationShipments,
                stationCodSummary,
                forecastSummary,
                forecastCapacity,
                forecastShippers,
                dispatchTelegramForecast,
                allTrips,
                allShipments,
                activeInTransitTripsCount,
                filteredHubTrips,
                hubVehicles,
                hubKpi,
                isHubLoading,
                currentCourierCode,
                myAssignedShipments,
                shipperStats,
                shipperShiftStatus,
                isShipperLoading,
                toggleShipperShift,
                adminKpi,
                adminBarChartData,
                adminHubMatrix,
                adminTopStations,
                recentShipments,
                liveEventStream: recentShipments,
                serviceHealth,
                isAdminLoading,
                adminDateRange,
                adminRegionFilter,
                adminNetworkTab,
                exportAdminExcel,
                refreshCurrentDashboard,
                formatCurrency: (val) => (typeof Utils !== 'undefined' ? Utils.formatCurrency(val) : `${(Number(val) || 0).toLocaleString('vi-VN')}₫`),
                formatCurrencyShort,
                currentRoleHeader
            };
        },
        template: `
            <div class="space-y-3.5 pb-10 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-sm relative overflow-hidden transition-all duration-300">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10.5px] font-extrabold uppercase tracking-wider border border-white/25">
                                    {{ currentRoleHeader.badge }}
                                </span>
                                <span class="text-blue-100 text-xs font-medium">Bưu Chính Viễn Thông VNPT</span>
                                <span class="text-blue-200 text-xs">•</span>
                                <span class="text-[11px] text-emerald-300 font-semibold flex items-center space-x-1">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span>Trực Tuyến</span>
                                </span>
                            </div>
                            <h1 class="text-base sm:text-xl font-extrabold tracking-tight mt-1 text-white">
                                {{ currentRoleHeader.title }}
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal max-w-2xl">
                                {{ currentRoleHeader.subtitle }}
                            </p>
                            <p v-if="currentRoleHeader.contextScope" class="text-[11px] text-blue-100 mt-1.5 font-medium flex items-center space-x-2">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>{{ currentRoleHeader.contextScope }}</span>
                            </p>
                        </div>

                        <div class="flex items-center gap-2 self-start md:self-auto flex-wrap sm:flex-nowrap">
                            <div
                                v-for="k in currentRoleHeader.kpis"
                                :key="k.label"
                                class="px-3 py-1.5 sm:py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[78px] sm:min-w-[85px] transition-transform duration-200 hover:scale-105"
                            >
                                <div :class="['text-base font-extrabold leading-tight font-mono', k.colorClass || 'text-white']">{{ k.value }}</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">{{ k.label }}</div>
                            </div>

                            <button
                                type="button"
                                @click="refreshCurrentDashboard"
                                :disabled="isRefreshing"
                                class="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition border border-white/20 cursor-pointer flex items-center space-x-1.5 active:scale-95 disabled:opacity-50"
                                title="Đồng bộ làm mới dữ liệu"
                            >
                                <svg
                                    class="w-3.5 h-3.5 transition-transform duration-300"
                                    :class="{ 'animate-spin': isRefreshing }"
                                    fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Làm Mới</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="bg-white/95 backdrop-blur-md text-slate-700 rounded-2xl shadow-xs border border-slate-200/90 p-1.5 flex flex-wrap items-center justify-between gap-2.5 transition-all duration-300">
                    <div class="bg-slate-100/90 p-1 rounded-xl border border-slate-200/70 inline-flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 max-w-full">
                        <button
                            v-for="r in rolesList"
                            :key="r.key"
                            type="button"
                            @click="activeRole = r.key"
                            :class="[
                                'px-3.5 py-1.5 rounded-lg flex items-center space-x-2 transition-all duration-200 ease-out cursor-pointer text-xs select-none active:scale-95 group',
                                activeRole === r.key
                                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200/80 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                            ]"
                        >
                            <svg class="w-4 h-4 transition-colors shrink-0" :class="activeRole === r.key ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" :d="r.icon" />
                            </svg>
                            <span class="truncate">{{ r.label }}</span>
                        </button>
                    </div>

                    <div class="flex items-center space-x-2 shrink-0 px-1 py-0.5">
                        <span class="hidden sm:inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Thời gian thực</span>
                        </span>
                        <button
                            type="button"
                            @click="refreshCurrentDashboard"
                            :disabled="isRefreshing"
                            class="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 border border-slate-200/80 transition-all duration-200 active:scale-90 disabled:opacity-50 cursor-pointer shadow-2xs"
                            title="Làm mới dữ liệu thời gian thực"
                        >
                            <svg class="w-3.5 h-3.5 transition-transform duration-300" :class="{ 'animate-spin text-emerald-600': isRefreshing }" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                <transition name="subtab" mode="out-in">
                    <div v-if="activeRole === 'ADMIN'" key="role-admin" class="space-y-3.5">

                        <div class="b2b-card p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                            <div class="flex flex-wrap items-center gap-2">
                                <button 
                                    type="button"
                                    @click="adminDateRange = 'today'"
                                    :class="adminDateRange === 'today' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                    class="px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer active:scale-95"
                                >
                                    Hôm Nay
                                </button>
                                <button 
                                    type="button"
                                    @click="adminDateRange = '7days'"
                                    :class="adminDateRange === '7days' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                    class="px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer active:scale-95"
                                >
                                    7 Ngày Qua
                                </button>
                                <button 
                                    type="button"
                                    @click="adminDateRange = '30days'"
                                    :class="adminDateRange === '30days' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold'"
                                    class="px-2.5 py-1 rounded-md text-xs transition-all duration-150 cursor-pointer active:scale-95"
                                >
                                    30 Ngày Qua
                                </button>

                                <div class="h-4 w-px bg-slate-200 hidden sm:block"></div>

                                <select v-model="adminRegionFilter" class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 outline-none cursor-pointer">
                                    <option value="ALL">Toàn Quốc</option>
                                    <option value="NORTH">Miền Bắc</option>
                                    <option value="CENTRAL">Miền Trung</option>
                                    <option value="SOUTH">Miền Nam</option>
                                </select>
                            </div>

                            <button @click="exportAdminExcel" class="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all duration-150 flex items-center space-x-1.5 cursor-pointer active:scale-95">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span>Xuất Excel</span>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div class="b2b-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default">
                                <div class="flex items-center justify-between text-slate-500 font-medium">
                                    <span>Doanh Thu Cước</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Cước</span>
                                </div>
                                <div class="mt-2 text-xl font-bold text-slate-900 font-mono">{{ formatCurrency(adminKpi.totalShippingFee) }}</div>
                                <div class="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
                                    <span>Đã giao:</span>
                                    <strong class="font-mono text-emerald-700">{{ adminKpi.deliveredOrders }} đơn</strong>
                                </div>
                            </div>

                            <div class="b2b-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default">
                                <div class="flex items-center justify-between text-slate-500 font-medium">
                                    <span>Tỷ Lệ Đạt SLA</span>
                                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                                        SLA
                                    </span>
                                </div>
                                <div class="mt-2 text-xl font-bold text-emerald-600 font-mono">{{ adminKpi.successRate }}%</div>
                                <div class="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
                                    <span>Chuyển hoàn:</span>
                                    <strong class="font-mono text-rose-600">{{ adminKpi.returningOrders }} đơn</strong>
                                </div>
                            </div>

                            <div class="b2b-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default">
                                <div class="flex items-center justify-between text-slate-500 font-medium">
                                    <span>Quỹ Tiền COD</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Thu Hộ</span>
                                </div>
                                <div class="mt-2 text-xl font-bold text-amber-600 font-mono">{{ formatCurrency(adminKpi.totalCod) }}</div>
                                <div class="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
                                    <span>Đã kiểm soát:</span>
                                    <strong class="font-mono text-emerald-700">{{ formatCurrency(adminKpi.settledCod) }}</strong>
                                </div>
                            </div>

                            <div class="b2b-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-default">
                                <div class="flex items-center justify-between text-slate-500 font-medium">
                                    <span>Đang Luân Chuyển</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">In-Transit</span>
                                </div>
                                <div class="mt-2 text-xl font-bold text-purple-700 font-mono">{{ adminKpi.inTransitOrders }} kiện</div>
                                <div class="mt-2 text-[11px] text-slate-500 border-t border-slate-100 pt-1.5 flex justify-between">
                                    <span>Xe trục lăn bánh:</span>
                                    <strong class="font-mono text-blue-700">{{ activeInTransitTripsCount }} chuyến</strong>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                            <div class="lg:col-span-8 space-y-3.5">
                                <div class="b2b-card p-4 transition-all duration-200 hover:shadow-xs">
                                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight">
                                            Xu Hướng Doanh Thu &amp; Sản Lượng
                                        </h3>
                                        <div class="flex items-center space-x-3 text-[11px] font-semibold">
                                            <div class="flex items-center space-x-1">
                                                <span class="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
                                                <span class="text-slate-600">Cước Vận Chuyển</span>
                                            </div>
                                            <div class="flex items-center space-x-1">
                                                <span class="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
                                                <span class="text-slate-600">Tiền COD</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="h-44 mt-3 flex items-end justify-between gap-3 px-2 pt-4 pb-2 border-b border-slate-100 overflow-x-auto custom-scrollbar">
                                        <div v-for="bar in adminBarChartData" :key="bar.date" class="flex-1 flex flex-col items-center min-w-[50px] group cursor-pointer">
                                            <div class="text-[10px] font-mono text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                                {{ bar.count }} đơn
                                            </div>
                                            <div class="w-full flex items-end justify-center gap-1 h-28">
                                                <div 
                                                    :style="{ height: bar.feeHeight }" 
                                                    class="w-3.5 sm:w-4 bg-blue-600 hover:bg-blue-700 rounded-t transition-all duration-500 ease-out relative group/bar"
                                                    :title="'Cước: ' + formatCurrency(bar.fee)"
                                                ></div>
                                                <div 
                                                    :style="{ height: bar.codHeight }" 
                                                    class="w-3.5 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all duration-500 ease-out relative group/bar"
                                                    :title="'COD: ' + formatCurrency(bar.cod)"
                                                ></div>
                                            </div>
                                            <div class="text-[10.5px] font-mono font-medium text-slate-600 mt-2 whitespace-nowrap">
                                                {{ bar.label }}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                                        <span>Tổng sản lượng chu kỳ: <strong class="font-mono text-slate-800">{{ adminBarChartData.reduce((s, b) => s + b.count, 0) }} bưu gửi</strong></span>
                                        <span class="text-[10px] text-slate-400">Đơn vị: VNĐ</span>
                                    </div>
                                </div>

                                <div class="b2b-card overflow-hidden transition-all duration-200 hover:shadow-xs">
                                    <div class="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
                                        <div class="flex items-center space-x-2">
                                            <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-1.5">
                                                <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                                                <span>Mạng Lưới Vận Tải &amp; Khai Thác Toàn Mạng</span>
                                            </h3>
                                        </div>

                                        <div class="inline-flex p-0.5 bg-slate-200/70 rounded-lg text-xs font-bold">
                                            <button
                                                type="button"
                                                @click="adminNetworkTab = 'hubs'"
                                                :class="adminNetworkTab === 'hubs' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                                class="px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer flex items-center space-x-1.5"
                                            >
                                                <span>Kho Tổng Hub</span>
                                                <span class="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-mono">{{ adminHubMatrix.length }}</span>
                                            </button>
                                            <button
                                                type="button"
                                                @click="adminNetworkTab = 'stations'"
                                                :class="adminNetworkTab === 'stations' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                                class="px-2.5 py-1 rounded-md transition-all duration-150 cursor-pointer flex items-center space-x-1.5"
                                            >
                                                <span>Top Bưu Cục Đầu Tuyến</span>
                                                <span class="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 text-blue-800 font-mono">{{ adminTopStations.length }}</span>
                                            </button>
                                            <button
                                                type="button"
                                                @click="adminNetworkTab = 'both'"
                                                :class="adminNetworkTab === 'both' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'"
                                                class="px-2 py-1 rounded-md transition-all duration-150 cursor-pointer text-[11px]"
                                                title="Hiển thị cả 2 bảng đồng thời"
                                            >
                                                Tất Cả
                                            </button>
                                        </div>
                                    </div>

                                    <div v-if="adminNetworkTab === 'hubs' || adminNetworkTab === 'both'" class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th class="py-2 px-3.5">Mã Hub</th>
                                                    <th class="py-2 px-3">Tên Hub</th>
                                                    <th class="py-2 px-3">Vùng</th>
                                                    <th class="py-2 px-3 text-right">Chuyến Xe</th>
                                                    <th class="py-2 px-3 text-right">Đội Xe</th>
                                                    <th class="py-2 px-3 text-right">Tồn Sàn</th>
                                                    <th class="py-2 px-3.5 text-center">Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                                <tr v-for="h in adminHubMatrix" :key="h.code" class="hover:bg-slate-50/80 transition-colors">
                                                    <td class="py-2 px-3.5 font-mono font-bold text-blue-600">{{ h.code }}</td>
                                                    <td class="py-2 px-3 font-semibold text-slate-800">{{ h.name }}</td>
                                                    <td class="py-2 px-3 text-slate-600">{{ h.region }}</td>
                                                    <td class="py-2 px-3 text-right font-mono">{{ h.activeTrips }} chuyến</td>
                                                    <td class="py-2 px-3 text-right font-mono">{{ h.vehiclesCount }} xe</td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold" :class="h.stagedCargo > 20 ? 'text-amber-600' : 'text-slate-700'">
                                                        {{ h.stagedCargo }} kiện
                                                    </td>
                                                    <td class="py-2 px-3.5 text-center">
                                                        <span :class="[
                                                            'inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold border',
                                                            h.loadStatus === 'OPTIMAL' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                            h.loadStatus === 'BUSY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-amber-50 text-amber-700 border-amber-200'
                                                        ]">
                                                            <span :class="h.loadStatus === 'OPTIMAL' ? 'bg-emerald-500' : h.loadStatus === 'BUSY' ? 'bg-blue-500' : 'bg-amber-500'" class="w-1.5 h-1.5 rounded-full mr-1 animate-pulse"></span>
                                                            {{ h.statusLabel }}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div v-if="adminNetworkTab === 'both'" class="px-3.5 py-2 bg-slate-100/70 border-t border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center justify-between">
                                        <span>Top Bưu Cục Đầu Tuyến</span>
                                        <span class="text-[11px] font-mono text-blue-700">{{ adminTopStations.length }} Bưu Cục</span>
                                    </div>

                                    <div v-if="adminNetworkTab === 'stations' || adminNetworkTab === 'both'" class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th class="py-2 px-3.5">Mã Bưu Cục</th>
                                                    <th class="py-2 px-3">Tên Điểm</th>
                                                    <th class="py-2 px-3 text-right">Đơn Xử Lý</th>
                                                    <th class="py-2 px-3 text-right">Bưu Tá</th>
                                                    <th class="py-2 px-3 text-center">Tải Ca</th>
                                                    <th class="py-2 px-3 text-right">Nợ COD</th>
                                                    <th class="py-2 px-3.5 text-center">Tình Trạng</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                                <tr v-for="s in adminTopStations" :key="s.code" class="hover:bg-slate-50/80 transition-colors">
                                                    <td class="py-2 px-3.5 font-mono font-bold text-blue-600">{{ s.code }}</td>
                                                    <td class="py-2 px-3 font-semibold text-slate-800">{{ s.name }}</td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold text-slate-900">{{ s.tomorrowOrders }} đơn</td>
                                                    <td class="py-2 px-3 text-right font-mono">{{ s.onDutyShippers }} người</td>
                                                    <td class="py-2 px-3 text-center">
                                                        <div class="font-mono font-bold text-[11px]" :class="s.utilizationRate > 85 ? 'text-amber-600' : 'text-blue-700'">
                                                            {{ s.utilizationRate }}%
                                                        </div>
                                                        <div class="w-16 mx-auto bg-slate-100 h-1.5 rounded-full mt-0.5 overflow-hidden">
                                                            <div :style="{ width: s.utilizationRate + '%' }" :class="s.utilizationRate > 85 ? 'bg-amber-500' : 'bg-blue-600'" class="h-full rounded-full transition-all duration-300"></div>
                                                        </div>
                                                    </td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold text-amber-700">{{ formatCurrency(s.pendingCod) }}</td>
                                                    <td class="py-2 px-3.5 text-center">
                                                        <span :class="s.alertStatus === 'WARNING' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border">
                                                            {{ s.alertStatus === 'WARNING' ? 'Cao Điểm' : 'Bình Thường' }}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="lg:col-span-4 space-y-3.5">
                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-1.5">
                                            <svg class="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                            <span>Hạ Tầng Dịch Vụ</span>
                                        </h4>
                                        <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1"></span>
                                            Trực Tuyến
                                        </span>
                                    </div>

                                    <div class="mt-3 space-y-2 text-xs">
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <span class="text-slate-700 font-semibold">Routing Service</span>
                                            <span class="font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{{ serviceHealth.routing }}</span>
                                        </div>
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <span class="text-slate-700 font-semibold">Shipment Service</span>
                                            <span class="font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{{ serviceHealth.shipment }}</span>
                                        </div>
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <span class="text-slate-700 font-semibold">Report Service</span>
                                            <span class="font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{{ serviceHealth.report }}</span>
                                        </div>
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <span class="text-slate-700 font-semibold">Telegram Bot</span>
                                            <span class="font-mono text-[10.5px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">{{ serviceHealth.bot }}</span>
                                        </div>
                                        <div class="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                                            <span class="text-slate-700 font-semibold">Shipper Service</span>
                                            <span class="font-mono text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{{ serviceHealth.shipper }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center space-x-1.5">
                                            <svg class="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                                            <span>Bưu Gửi Gần Đây</span>
                                        </h4>
                                        <span class="text-[10.5px] font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{{ recentShipments.length }} Đơn Mới</span>
                                    </div>

                                    <div class="mt-3 space-y-2.5 text-xs">
                                        <div v-for="item in recentShipments" :key="item.trackingCode" class="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5 transition-all hover:bg-white hover:border-blue-200 hover:shadow-2xs">
                                            <div class="flex items-center justify-between text-[11px]">
                                                <button type="button" @click="$emit('view-tracking', item.trackingCode)" class="font-mono font-bold text-blue-600 hover:underline cursor-pointer flex items-center space-x-1">
                                                    <span>{{ item.trackingCode }}</span>
                                                </button>
                                                <span class="font-mono text-slate-400 text-[10px]">{{ item.time }}</span>
                                            </div>
                                            <div class="text-[11.5px] text-slate-700 font-medium truncate">
                                                {{ item.receiverName }} • <span class="text-slate-500 text-[11px]">{{ item.receiverAddress }}</span>
                                            </div>
                                            <div class="text-[10px] flex items-center justify-between border-t border-slate-100/80 pt-1 text-slate-500">
                                                <span>Cước: <strong class="font-mono text-slate-700">{{ formatCurrency(item.fee) }}</strong> <span v-if="item.cod > 0">• COD: <strong class="font-mono text-emerald-700">{{ formatCurrency(item.cod) }}</strong></span></span>
                                                <span :class="[
                                                    'px-1.5 py-0.5 rounded font-mono font-bold text-[9.5px] border',
                                                    item.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    item.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    item.status === 'RETURNED' || item.status === 'FAILED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    'bg-slate-100 text-slate-700 border-slate-200'
                                                ]">
                                                    {{ item.status }}
                                                </span>
                                            </div>
                                        </div>
                                        <div v-if="recentShipments.length === 0" class="text-center py-4 text-slate-400 text-xs">
                                            Chưa có bưu gửi nào ghi nhận.
                                        </div>
                                    </div>

                                    <div class="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                        <span class="text-slate-400">Đồng bộ tự động</span>
                                        <button type="button" @click="$emit('switch-tab', 'shipments')" class="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1 cursor-pointer">
                                            <span>Xem tất cả vận đơn</span>
                                            <span>→</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeRole === 'POST_STAFF'" key="role-post-staff" class="space-y-3.5">
                        <div class="b2b-card p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-xs font-bold text-slate-500">Bưu Cục:</span>
                                <select v-model="selectedStation" class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 outline-none cursor-pointer">
                                    <option v-for="st in STATIONS" :key="st.code" :value="st.code">{{ st.code }} - {{ st.name }}</option>
                                </select>
                            </div>
                            <div class="flex items-center space-x-2">
                                <button
                                    type="button"
                                    @click="dispatchTelegramForecast"
                                    :disabled="isBroadcastingTelegram"
                                    class="px-3 py-1.5 rounded-lg vnpt-gradient text-white text-xs font-bold shadow-xs hover:opacity-95 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-60 active:scale-95"
                                >
                                    <svg v-if="!isBroadcastingTelegram" class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                    <span v-else class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                    <span>Gửi Ca Telegram</span>
                                </button>
                                <button
                                    type="button"
                                    @click="$emit('switch-tab', 'post-office')"
                                    class="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-blue-700 text-xs font-bold transition border border-slate-200 shadow-xs flex items-center space-x-1 cursor-pointer active:scale-95"
                                >
                                    <span>Khai Thác</span>
                                </button>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                            <div class="lg:col-span-8 space-y-3.5">
                                <div class="b2b-card p-4 transition-all duration-200 hover:shadow-xs">
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2.5">
                                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight">Nguồn Hàng Ca Mai</h3>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 font-mono">{{ forecastSummary.totalForecastOrders }} kiện</span>
                                    </div>
                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3 text-xs">
                                        <div class="bg-blue-50/70 border border-blue-100 rounded-xl p-3 transition-transform duration-200 hover:scale-[1.02]">
                                            <div class="flex items-center justify-between text-blue-900 font-bold">
                                                <span>Xe Đêm Đến</span>
                                                <span class="text-[10px] font-mono">In-Transit</span>
                                            </div>
                                            <div class="font-mono text-xl font-bold text-blue-700 mt-1">{{ forecastSummary.inTransitCount }} kiện</div>
                                        </div>
                                        <div class="bg-purple-50/70 border border-purple-100 rounded-xl p-3 transition-transform duration-200 hover:scale-[1.02]">
                                            <div class="flex items-center justify-between text-purple-900 font-bold">
                                                <span>Tồn Trạm Hẹn Giao</span>
                                                <span class="text-[10px] font-mono">Held</span>
                                            </div>
                                            <div class="font-mono text-xl font-bold text-purple-700 mt-1">{{ forecastSummary.inventoryHeldCount }} kiện</div>
                                        </div>
                                        <div class="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 transition-transform duration-200 hover:scale-[1.02]">
                                            <div class="flex items-center justify-between text-emerald-900 font-bold">
                                                <span>Đơn SLA Cam Kết</span>
                                                <span class="text-[10px] font-mono">SLA</span>
                                            </div>
                                            <div class="font-mono text-xl font-bold text-emerald-700 mt-1">{{ forecastSummary.committedEtaCount }} kiện</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="b2b-card overflow-hidden transition-all duration-200 hover:shadow-xs">
                                    <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight">Phân Bổ Tuyến Bưu Tá</h3>
                                        <span class="text-[11px] font-mono font-bold text-slate-600">{{ forecastShippers.length }} bưu tá</span>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th class="py-2 px-3.5">Bưu Tá</th>
                                                    <th class="py-2 px-3">Tuyến</th>
                                                    <th class="py-2 px-3 text-center">Ca Trực</th>
                                                    <th class="py-2 px-3 text-right">Đơn Ca Mai</th>
                                                    <th class="py-2 px-3 text-center">Tải Ca</th>
                                                    <th class="py-2 px-3 text-right">Ước Tính COD</th>
                                                    <th class="py-2 px-3.5 text-center">Telegram</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                                <tr v-for="shipper in forecastShippers" :key="shipper.courierCode" class="hover:bg-slate-50/80 transition-colors">
                                                    <td class="py-2 px-3.5">
                                                        <div class="font-bold text-slate-900">{{ shipper.fullName }}</div>
                                                        <div class="font-mono text-[10.5px] text-slate-400">{{ shipper.courierCode }}</div>
                                                    </td>
                                                    <td class="py-2 px-3">
                                                        <span class="px-2 py-0.5 rounded text-[11px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">{{ shipper.assignedZone }}</span>
                                                    </td>
                                                    <td class="py-2 px-3 text-center">
                                                        <span :class="shipper.shiftStatus === 'ON_DUTY' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'" class="px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                            {{ shipper.shiftStatus }}
                                                        </span>
                                                    </td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold">{{ shipper.estimatedOrdersCount }} đơn</td>
                                                    <td class="py-2 px-3 text-center">
                                                        <div class="font-mono font-bold text-[11px] text-blue-700">{{ shipper.utilizationRate }}%</div>
                                                    </td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(shipper.estimatedCodAmount) }}</td>
                                                    <td class="py-2 px-3.5 text-center">
                                                        <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">@NovaWay_Bill_Bot</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="lg:col-span-4 space-y-3.5">
                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight pb-2 border-b border-slate-100 mb-3">Công Suất Ca Trực</h4>
                                    <div class="space-y-2 text-xs">
                                        <div class="flex justify-between text-slate-600">
                                            <span>Tải ca trực:</span>
                                            <strong class="font-mono text-blue-700">{{ forecastCapacity.utilizationRate }}%</strong>
                                        </div>
                                        <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                            <div :style="{ width: forecastCapacity.utilizationRate + '%' }" class="h-full bg-blue-600 rounded-full transition-all duration-300"></div>
                                        </div>
                                        <p class="text-[11px] text-slate-500 mt-2">{{ forecastCapacity.alertMessage }}</p>
                                    </div>
                                </div>

                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight pb-2 border-b border-slate-100 mb-3">Kiểm Soát Quỹ COD</h4>
                                    <div class="space-y-2 text-xs">
                                        <div class="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex justify-between items-center">
                                            <span class="text-slate-600">Bưu tá chưa nộp:</span>
                                            <strong class="font-mono font-bold text-amber-700 text-sm">{{ formatCurrency(stationCodSummary.pendingAmount) }}</strong>
                                        </div>
                                        <button @click="$emit('switch-tab', 'post-office')" class="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all duration-150 text-xs cursor-pointer active:scale-95">
                                            Mở Bàn Đối Soát
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeRole === 'HUB_STAFF'" key="role-hub-staff" class="space-y-3.5">
                        <div class="b2b-card p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-xs font-bold text-slate-500">Kho Hub:</span>
                                <select v-model="selectedHub" class="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-700 outline-none cursor-pointer">
                                    <option v-for="h in HUBS" :key="h.code" :value="h.code">{{ h.code }} - {{ h.name }}</option>
                                </select>
                            </div>
                            <button @click="$emit('switch-tab', 'trips')" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all duration-150 flex items-center space-x-1 cursor-pointer active:scale-95">
                                <span>Điều Xe Trục</span>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                            <div class="lg:col-span-8 space-y-3.5">
                                <div class="b2b-card overflow-hidden transition-all duration-200 hover:shadow-xs">
                                    <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight">Lịch Trình Chuyến Xe Trục</h3>
                                        <span class="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{{ filteredHubTrips.length }} Chuyến</span>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th class="py-2 px-3.5">Mã Chuyến</th>
                                                    <th class="py-2 px-3">Tuyến Trục</th>
                                                    <th class="py-2 px-3">Xe &amp; Tài Xế</th>
                                                    <th class="py-2 px-3.5 text-center">Trạng Thái</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                                <tr v-for="trip in filteredHubTrips" :key="trip.id" class="hover:bg-slate-50/80 transition-colors">
                                                    <td class="py-2 px-3.5 font-mono font-bold text-blue-600">{{ trip.tripCode || ('TRIP-' + trip.id) }}</td>
                                                    <td class="py-2 px-3 font-semibold text-slate-800">{{ trip.route || (trip.originHub + ' → ' + trip.destinationHub) }}</td>
                                                    <td class="py-2 px-3 font-mono text-[11.5px]">{{ trip.vehiclePlate || 'Xe Container' }} • {{ trip.driverName || 'Tài xế' }}</td>
                                                    <td class="py-2 px-3.5 text-center">
                                                        <span :class="trip.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'" class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border">
                                                            {{ trip.status }}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr v-if="filteredHubTrips.length === 0">
                                                    <td colspan="4" class="py-8 text-center text-slate-400">
                                                        Hiện chưa có chuyến xe nào khởi hành tại kho hub này.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="lg:col-span-4 space-y-3.5">
                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight pb-2 border-b border-slate-100 mb-3">Đội Xe Trung Chuyển</h4>
                                    <div class="space-y-2 text-xs">
                                        <div v-for="v in hubVehicles.slice(0, 4)" :key="v.id" class="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between transition-colors hover:bg-white hover:border-blue-200">
                                            <div>
                                                <div class="font-bold text-slate-800">{{ v.plateNumber || v.plate }}</div>
                                                <div class="text-[11px] text-slate-500">{{ v.vehicleType || 'Container' }} • {{ v.driverName || '' }}</div>
                                            </div>
                                            <span :class="v.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'" class="px-2 py-0.5 rounded text-[10px] font-bold border">
                                                {{ v.status }}
                                            </span>
                                        </div>
                                        <div v-if="hubVehicles.length === 0" class="text-center py-4 text-slate-400 text-xs">
                                            Không có thông tin xe tại kho này.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div v-else-if="activeRole === 'SHIPPER'" key="role-shipper" class="space-y-3.5">
                        <div class="b2b-card p-2.5 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                            <div class="flex items-center space-x-2">
                                <span class="text-xs font-bold text-slate-500">Mã Bưu Tá:</span>
                                <span class="font-mono font-bold text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">{{ currentCourierCode }}</span>
                                <span class="text-slate-300">•</span>
                                <span class="text-xs font-semibold text-slate-600">Trạng Thái:</span>
                                <button
                                    type="button"
                                    @click="toggleShipperShift"
                                    :class="shipperShiftStatus === 'ON_DUTY' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'"
                                    class="px-2 py-0.5 rounded text-[11px] font-bold border transition cursor-pointer active:scale-95 flex items-center space-x-1"
                                >
                                    <span :class="shipperShiftStatus === 'ON_DUTY' ? 'bg-emerald-500' : 'bg-slate-400'" class="w-1.5 h-1.5 rounded-full animate-pulse"></span>
                                    <span>{{ shipperShiftStatus === 'ON_DUTY' ? 'Đang Trực Ca' : 'Nghỉ Ca' }}</span>
                                </button>
                            </div>
                            <button
                                type="button"
                                @click="$emit('switch-tab', 'shipper')"
                                class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
                            >
                                <span>Mở Bàn Phát Hàng</span>
                            </button>
                        </div>

                        <div class="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                            <div class="lg:col-span-8 space-y-3.5">
                                <div class="b2b-card overflow-hidden transition-all duration-200 hover:shadow-xs">
                                    <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                                        <h3 class="text-xs font-bold text-slate-900 uppercase tracking-tight">Bưu Gửi Phụ Trách Giao</h3>
                                        <span class="font-mono text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">{{ myAssignedShipments.length }} kiện</span>
                                    </div>
                                    <div class="overflow-x-auto">
                                        <table class="w-full text-left text-xs">
                                            <thead class="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                                                <tr>
                                                    <th class="py-2 px-3.5">Mã Vận Đơn</th>
                                                    <th class="py-2 px-3">Người Nhận &amp; Địa Chỉ</th>
                                                    <th class="py-2 px-3 text-right">Tiền COD</th>
                                                    <th class="py-2 px-3 text-center">Trạng Thái</th>
                                                    <th class="py-2 px-3.5 text-center">Thao Tác</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                                <tr v-for="item in myAssignedShipments" :key="item.trackingCode" class="hover:bg-slate-50/80 transition-colors">
                                                    <td class="py-2 px-3.5">
                                                        <button type="button" @click="$emit('view-tracking', item.trackingCode)" class="font-mono font-bold text-blue-600 hover:underline cursor-pointer">
                                                            {{ item.trackingCode }}
                                                        </button>
                                                    </td>
                                                    <td class="py-2 px-3">
                                                        <div class="font-bold text-slate-800">{{ item.receiverName || 'Khách nhận' }} • {{ item.receiverPhone || '' }}</div>
                                                        <div class="text-[11px] text-slate-500 truncate max-w-sm">{{ item.receiverAddress || 'Chưa có địa chỉ' }}</div>
                                                    </td>
                                                    <td class="py-2 px-3 text-right font-mono font-bold text-emerald-700">{{ formatCurrency(item.codAmount || 0) }}</td>
                                                    <td class="py-2 px-3 text-center">
                                                        <span :class="item.currentStatus === 'DELIVERED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'" class="px-2 py-0.5 rounded text-[10.5px] font-bold border">
                                                            {{ item.currentStatus || 'WAITING' }}
                                                        </span>
                                                    </td>
                                                    <td class="py-2 px-3.5 text-center">
                                                        <button @click="$emit('switch-tab', 'shipper')" class="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer active:scale-95 transition-all">Cập Nhật</button>
                                                    </td>
                                                </tr>
                                                <tr v-if="myAssignedShipments.length === 0">
                                                    <td colspan="5" class="py-8 text-center text-slate-400">
                                                        Hiện chưa có bưu gửi nào được bàn giao cho mã bưu tá này.
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div class="lg:col-span-4 space-y-3.5">
                                <div class="b2b-card p-3.5 transition-all duration-200 hover:shadow-xs">
                                    <h4 class="text-xs font-bold text-slate-900 uppercase tracking-tight mb-2.5">Ví Tiền Thu Hộ COD</h4>
                                    <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed mb-3">
                                        Bạn đang giữ <strong class="font-mono font-bold text-amber-700">{{ formatCurrency(shipperStats.pocketCod) }}</strong>. Vui lòng nộp về bưu cục đối soát khi kết thúc ca.
                                    </div>
                                    <button @click="$emit('switch-tab', 'shipper')" class="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all duration-150 cursor-pointer active:scale-95 shadow-xs">
                                        Nộp Quỹ COD Bưu Cục
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </transition>
            </div>
        `
    };

    window.DashboardView = DashboardView;
})();
