(function () {
    const { ref, computed, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } = Vue;

    const POST_OFFICES_DATA = [
        { code: 'HUB-HN-01', name: 'Kho Tổng Hà Nội (Super Hub)', province: 'Hà Nội', district: 'Bắc Từ Liêm', address: 'Lô 12-A, KCN Minh Khai, P. Minh Khai, Q. Bắc Từ Liêm, Hà Nội', phone: '024 3768 9999', hours: '24/7 (Cả T7 & CN)', type: 'SUPER_HUB', lat: 21.028511, lng: 105.782000 },
        { code: 'HUB-HCM-01', name: 'Kho Tổng TP. Hồ Chí Minh (Super Hub)', province: 'Hồ Chí Minh', district: 'Tân Bình', address: 'Số 270 Lý Thường Kiệt, Phường 6, Q. Tân Bình, TP. Hồ Chí Minh', phone: '028 3865 8888', hours: '24/7 (Cả T7 & CN)', type: 'SUPER_HUB', lat: 10.776889, lng: 106.656000 },
        { code: 'HUB-DN-01', name: 'Kho Tổng Đà Nẵng (Super Hub)', province: 'Đà Nẵng', district: 'Liên Chiểu', address: 'Đường số 3, KCN Hòa Khánh, P. Hòa Khánh Bắc, Q. Liên Chiểu, Đà Nẵng', phone: '0236 3738 888', hours: '24/7 (Cả T7 & CN)', type: 'SUPER_HUB', lat: 16.068000, lng: 108.150000 },
        { code: 'HUB-HP-01', name: 'Kho Trung Chuyển Hải Phòng', province: 'Hải Phòng', district: 'Hải An', address: 'Số 5 Đường Lê Hồng Phong, P. Đằng Lâm, Q. Hải An, Hải Phòng', phone: '0225 3838 999', hours: '06:00 - 22:00', type: 'SUPER_HUB', lat: 20.850000, lng: 106.700000 },
        { code: 'HUB-CT-01', name: 'Kho Trung Chuyển Cần Thơ', province: 'Cần Thơ', district: 'Cái Răng', address: 'KCN Hưng Phú 1, P. Hưng Phú, Q. Cái Răng, Cần Thơ', phone: '0292 3888 777', hours: '06:00 - 22:00', type: 'SUPER_HUB', lat: 10.020000, lng: 105.780000 },

        { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy', province: 'Hà Nội', district: 'Cầu Giấy', address: 'Số 165 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội', phone: '024 3833 5555', hours: '07:30 - 20:30 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 21.036200, lng: 105.790600 },
        { code: 'POST-HN-DDA', name: 'Bưu Cục Đống Đa', province: 'Hà Nội', district: 'Đống Đa', address: 'Số 36 Tây Sơn, P. Quang Trung, Q. Đống Đa, Hà Nội', phone: '024 3851 4444', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 21.018100, lng: 105.829900 },
        { code: 'POST-HN-HBT', name: 'Bưu Cục Hai Bà Trưng', province: 'Hà Nội', district: 'Hai Bà Trưng', address: 'Số 236 Lạc Trung, P. Vĩnh Tuy, Q. Hai Bà Trưng, Hà Nội', phone: '024 3971 3333', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 21.006900, lng: 105.852400 },
        { code: 'POST-HN-TX', name: 'Bưu Cục Thanh Xuân', province: 'Hà Nội', district: 'Thanh Xuân', address: 'Số 18 Nguyễn Trãi, P. Thượng Đình, Q. Thanh Xuân, Hà Nội', phone: '024 3858 2222', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 20.993700, lng: 105.807800 },
        { code: 'POST-HN-HD', name: 'Bưu Cục Hà Đông', province: 'Hà Nội', district: 'Hà Đông', address: 'Số 4 Quang Trung, P. Yết Kiêu, Q. Hà Đông, Hà Nội', phone: '024 3382 1111', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 20.971200, lng: 105.776600 },

        { code: 'POST-HCM-Q1', name: 'Bưu Cục Bến Nghé (Quận 1)', province: 'Hồ Chí Minh', district: 'Quận 1', address: 'Số 2 Công Xã Paris, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh', phone: '028 3822 5555', hours: '07:00 - 21:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 10.776900, lng: 106.700900 },
        { code: 'POST-HCM-TB', name: 'Bưu Cục Tân Bình', province: 'Hồ Chí Minh', district: 'Tân Bình', address: 'Số 288 Hoàng Văn Thụ, P. 4, Q. Tân Bình, TP. Hồ Chí Minh', phone: '028 3844 6666', hours: '07:30 - 20:30 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 10.799200, lng: 106.653400 },
        { code: 'POST-HCM-BT', name: 'Bưu Cục Bình Thạnh', province: 'Hồ Chí Minh', district: 'Bình Thạnh', address: 'Số 364 Bạch Đằng, P. 14, Q. Bình Thạnh, TP. Hồ Chí Minh', phone: '028 3841 7777', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 10.810600, lng: 106.696100 },
        { code: 'POST-HCM-TD', name: 'Bưu Cục TP. Thủ Đức', province: 'Hồ Chí Minh', district: 'Thủ Đức', address: 'Số 128 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP. Hồ Chí Minh', phone: '028 3896 8888', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 10.849400, lng: 106.771700 },
        { code: 'POST-HCM-Q7', name: 'Bưu Cục Tân Phong (Quận 7)', province: 'Hồ Chí Minh', district: 'Quận 7', address: 'Số 1441 Huỳnh Tấn Phát, P. Phú Mỹ, Quận 7, TP. Hồ Chí Minh', phone: '028 3785 9999', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 10.732400, lng: 106.708200 },

        { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu', province: 'Đà Nẵng', district: 'Hải Châu', address: 'Số 4 Lê Duẩn, P. Hải Châu 1, Q. Hải Châu, Đà Nẵng', phone: '0236 3822 333', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 16.071000, lng: 108.221000 },
        { code: 'POST-DN-TK', name: 'Bưu Cục Thanh Khê', province: 'Đà Nẵng', district: 'Thanh Khê', address: 'Số 251 Điện Biên Phủ, P. Chính Gián, Q. Thanh Khê, Đà Nẵng', phone: '0236 3711 444', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 16.062000, lng: 108.196000 },
        { code: 'POST-DN-ST', name: 'Bưu Cục Sơn Trà', province: 'Đà Nẵng', district: 'Sơn Trà', address: 'Số 1 Ngô Quyền, P. Thọ Quang, Q. Sơn Trà, Đà Nẵng', phone: '0236 3844 555', hours: '07:30 - 20:00 (Cả T7 & CN)', type: 'POST_OFFICE', lat: 16.095000, lng: 108.239000 },

        { code: 'POST-HP-NQ', name: 'Bưu Cục Ngô Quyền', province: 'Hải Phòng', district: 'Ngô Quyền', address: 'Số 147 Lương Khánh Thiện, P. Cầu Đất, Q. Ngô Quyền, Hải Phòng', phone: '0225 3855 222', hours: '07:30 - 20:00', type: 'POST_OFFICE', lat: 20.858000, lng: 106.689000 },
        { code: 'POST-HP-HB', name: 'Bưu Cục Hồng Bàng', province: 'Hải Phòng', district: 'Hồng Bàng', address: 'Số 5 Nguyễn Tri Phương, P. Minh Khai, Q. Hồng Bàng, Hải Phòng', phone: '0225 3842 111', hours: '07:30 - 20:00', type: 'POST_OFFICE', lat: 20.865000, lng: 106.678000 },

        { code: 'POST-CT-NK', name: 'Bưu Cục Ninh Kiều', province: 'Cần Thơ', district: 'Ninh Kiều', address: 'Số 2 Hòa Bình, P. Tân An, Q. Ninh Kiều, Cần Thơ', phone: '0292 3820 111', hours: '07:30 - 20:00', type: 'POST_OFFICE', lat: 10.033000, lng: 105.786000 },
        { code: 'POST-CT-CR', name: 'Bưu Cục Cái Răng', province: 'Cần Thơ', district: 'Cái Răng', address: 'Số 321 Quốc Lộ 1A, P. Lê Bình, Q. Cái Răng, Cần Thơ', phone: '0292 3861 222', hours: '07:30 - 20:00', type: 'POST_OFFICE', lat: 10.005000, lng: 105.753000 }
    ];

    const NetworkView = {
        name: 'NetworkView',
        emits: ['back-home', 'select-office'],
        setup(props, { emit }) {
            const postOffices = ref([...POST_OFFICES_DATA]);
            const searchQuery = ref('');
            const selectedProvince = ref('ALL');
            const selectedType = ref('ALL');
            const activeOfficeCode = ref(null);

            const provinces = ['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];

            let mapInstance = null;
            let markersGroup = null;
            let markersMap = new Map();
            let bootTimer = null;

            const filteredOffices = computed(() => {
                const q = searchQuery.value.toLowerCase().trim();
                const p = selectedProvince.value;
                const t = selectedType.value;

                return postOffices.value.filter(item => {
                    const matchQ = !q ||
                        item.name.toLowerCase().includes(q) ||
                        item.address.toLowerCase().includes(q) ||
                        item.code.toLowerCase().includes(q);
                    const matchP = p === 'ALL' || item.province === p;
                    const matchT = t === 'ALL' || item.type === t;
                    return matchQ && matchP && matchT;
                });
            });

            const superHubCount = computed(() => {
                return postOffices.value.filter(item => item.type === 'SUPER_HUB').length;
            });

            const renderMarkers = () => {
                if (!markersGroup || !mapInstance) return;
                markersGroup.clearLayers();
                markersMap.clear();

                filteredOffices.value.forEach(item => {
                    const isHub = item.type === 'SUPER_HUB';
                    const iconHtml = `<div class="${isHub ? 'hub-marker-pin' : 'post-marker-pin'}">${isHub ? 'HUB' : 'BC'}</div>`;
                    const customIcon = L.divIcon({
                        html: iconHtml,
                        className: '',
                        iconSize: isHub ? [32, 32] : [26, 26],
                        iconAnchor: isHub ? [16, 16] : [13, 13]
                    });

                    const m = L.marker([item.lat, item.lng], { icon: customIcon });
                    m.bindPopup(`
                        <div class="p-1 space-y-1.5 text-slate-800 font-sans">
                            <div class="flex items-center space-x-1.5">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isHub ? 'bg-blue-600 text-white' : 'bg-teal-600 text-white'}">${isHub ? 'KHO TỔNG' : 'BƯU CỤC'}</span>
                                <strong class="font-mono text-xs">${item.code}</strong>
                            </div>
                            <h4 class="font-bold text-xs text-blue-900">${item.name}</h4>
                            <p class="text-[11px] text-slate-600 leading-snug">${item.address}</p>
                            <div class="pt-1 text-[10.5px] border-t border-slate-100 flex justify-between font-medium">
                                <span>Hotline: <strong>${item.phone}</strong></span>
                                <span class="text-emerald-600 font-bold">${item.hours}</span>
                            </div>
                        </div>
                    `);
                    m.addTo(markersGroup);
                    markersMap.set(item.code, m);
                });
            };

            const focusOffice = (code) => {
                activeOfficeCode.value = code;
                const item = postOffices.value.find(x => x.code === code);
                if (!item || !mapInstance) return;

                mapInstance.flyTo([item.lat, item.lng], 15, { duration: 1.2 });
                const targetMarker = markersMap.get(code);
                if (targetMarker) {
                    setTimeout(() => {
                        if (targetMarker) targetMarker.openPopup();
                    }, 1200);
                }
            };

            const resetZoom = () => {
                activeOfficeCode.value = null;
                if (!mapInstance) return;
                mapInstance.flyTo([16.047079, 108.206230], 6, { duration: 1.2 });
            };

            const locateUser = () => {
                if (!navigator.geolocation || !mapInstance) {
                    focusOffice('POST-HN-CG');
                    return;
                }
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const lat = pos.coords.latitude;
                        const lng = pos.coords.longitude;
                        mapInstance.flyTo([lat, lng], 13, { duration: 1.2 });
                        L.marker([lat, lng]).addTo(mapInstance).bindPopup('<b>Vị trí của bạn</b>').openPopup();
                    },
                    () => {
                        focusOffice('POST-HN-CG');
                    }
                );
            };

            const loadBackendHubs = async () => {
                if (typeof RoutingService === 'undefined' || typeof RoutingService.getAllHubs !== 'function') return;
                try {
                    const hubs = await RoutingService.getAllHubs();
                    if (Array.isArray(hubs) && hubs.length > 0) {
                        const mergedCodes = new Set(postOffices.value.map(x => x.code));
                        hubs.forEach(hub => {
                            const code = hub.hubCode || hub.code;
                            if (code && !mergedCodes.has(code) && hub.latitude && hub.longitude) {
                                postOffices.value.push({
                                    code: code,
                                    name: hub.hubName || hub.name || code,
                                    province: hub.province || 'Hà Nội',
                                    district: hub.district || '',
                                    address: hub.address || hub.operationalAddress || 'Toàn quốc',
                                    phone: hub.hotline || hub.phone || '1900 545481',
                                    hours: hub.operatingHours || '24/7 (Cả T7 & CN)',
                                    type: hub.hubType === 'SUB_HUB' ? 'POST_OFFICE' : 'SUPER_HUB',
                                    lat: Number(hub.latitude),
                                    lng: Number(hub.longitude)
                                });
                                mergedCodes.add(code);
                            }
                        });
                        renderMarkers();
                    }
                } catch (err) {
                }
            };

            const bootMap = (attempt = 0) => {
                const mapEl = document.getElementById('network-leaflet-map');
                if (!mapEl || typeof L === 'undefined') return;
                if ((mapEl.clientWidth === 0 || mapEl.clientHeight === 0) && attempt < 4) {
                    requestAnimationFrame(() => bootMap(attempt + 1));
                    return;
                }
                if (mapEl.clientWidth === 0 || mapEl.clientHeight === 0) return;

                if (!mapInstance) {
                    mapInstance = L.map(mapEl, {
                        zoomControl: true,
                        attributionControl: false
                    }).setView([16.047079, 108.206230], 6);

                    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
                        subdomains: ['0', '1', '2', '3'],
                        maxZoom: 20
                    }).addTo(mapInstance);

                    markersGroup = L.layerGroup().addTo(mapInstance);
                    renderMarkers();
                }

                mapInstance.invalidateSize();
            };

            const scheduleMapBoot = () => {
                if (bootTimer) clearTimeout(bootTimer);
                bootTimer = setTimeout(() => {
                    bootMap();
                }, 260);
            };

            onMounted(() => {
                loadBackendHubs();
                scheduleMapBoot();
            });

            onActivated(() => {
                scheduleMapBoot();
            });

            onDeactivated(() => {
                if (bootTimer) {
                    clearTimeout(bootTimer);
                    bootTimer = null;
                }
            });

            watch(filteredOffices, () => {
                renderMarkers();
            });

            onBeforeUnmount(() => {
                if (bootTimer) {
                    clearTimeout(bootTimer);
                    bootTimer = null;
                }
                if (mapInstance) {
                    mapInstance.remove();
                    mapInstance = null;
                }
            });

            const goBack = () => {
                emit('back-home');
            };

            return {
                postOffices,
                searchQuery,
                selectedProvince,
                selectedType,
                activeOfficeCode,
                provinces,
                filteredOffices,
                superHubCount,
                focusOffice,
                resetZoom,
                locateUser,
                goBack
            };
        },
        template: `
            <div class="space-y-5 pb-12 text-slate-800">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    GIS Postal Locator
                                </span>
                                <span class="text-blue-100 text-xs font-medium flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                                    Định Vị &amp; Bản Đồ Số Hóa
                                </span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Mạng Lưới Hub &amp; Bưu Cục Toàn Quốc
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Tra cứu điểm gửi hàng, kho trung chuyển, giờ hoạt động và hotline bưu cục VNPT Post.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-white">63 Tỉnh</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Độ Phủ</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-cyan-300 font-mono">{{ superHubCount }} Hubs</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Kho Trục</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300 font-mono">{{ postOffices.length }} Trạm</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Điểm Gửi</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">T7 &amp; CN</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Mở Cửa</div>
                            </div>
                            <button 
                                type="button" 
                                @click="goBack" 
                                class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer ml-1"
                            >
                                <span>← Về Tra Cứu</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                    <div class="lg:col-span-5 space-y-3">
                        <div class="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm space-y-2.5">
                            <div class="relative">
                                <input 
                                    v-model="searchQuery"
                                    type="text" 
                                    placeholder="Tìm tên bưu cục, đường phố, mã trạm..." 
                                    class="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 focus:bg-white focus:border-blue-500 focus:outline-none transition"
                                />
                                <svg class="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>

                            <div class="grid grid-cols-2 gap-2">
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-600 mb-1">Tỉnh / Thành</label>
                                    <select v-model="selectedProvince" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                        <option value="ALL">Tất cả tỉnh thành</option>
                                        <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-600 mb-1">Loại trạm</label>
                                    <select v-model="selectedType" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                        <option value="ALL">Tất cả loại trạm</option>
                                        <option value="SUPER_HUB">Kho Tổng Hub</option>
                                        <option value="POST_OFFICE">Bưu cục giao dịch</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center justify-between px-1">
                            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                                Danh Sách Bưu Cục (<span class="text-blue-600 font-mono">{{ filteredOffices.length }}</span>)
                            </span>
                            <span class="text-[11px] text-slate-400">Click để định vị bản đồ</span>
                        </div>

                        <div class="space-y-2 max-h-[520px] overflow-y-auto pr-1 custom-scrollbar">
                            <div 
                                v-if="filteredOffices.length === 0" 
                                class="p-6 text-center text-xs text-slate-400 bg-white border border-slate-200 rounded-xl"
                            >
                                Không tìm thấy bưu cục nào phù hợp.
                            </div>

                            <div 
                                v-for="item in filteredOffices" 
                                :key="item.code"
                                @click="focusOffice(item.code)"
                                :class="[
                                    'bg-white border p-3 rounded-xl shadow-2xs transition hover:shadow-md cursor-pointer space-y-1.5',
                                    activeOfficeCode === item.code ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200 hover:border-blue-300'
                                ]"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-1.5">
                                        <span 
                                            :class="[
                                                'px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase',
                                                item.type === 'SUPER_HUB' ? 'bg-blue-100 text-blue-800' : 'bg-teal-50 text-teal-700 border border-teal-200/60'
                                            ]"
                                        >
                                            {{ item.type === 'SUPER_HUB' ? 'KHO TỔNG' : 'BƯU CỤC' }}
                                        </span>
                                        <span class="font-mono text-[11px] font-bold text-slate-500">{{ item.code }}</span>
                                    </div>
                                    <span class="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                        {{ item.hours }}
                                    </span>
                                </div>

                                <div>
                                    <h4 class="font-bold text-xs text-slate-900">{{ item.name }}</h4>
                                    <p class="text-[11px] text-slate-500 mt-0.5 leading-snug line-clamp-2">{{ item.address }}</p>
                                </div>

                                <div class="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span class="text-[11px] text-slate-500">
                                        Hotline: <strong class="text-slate-700 font-mono">{{ item.phone }}</strong>
                                    </span>
                                    <button 
                                        type="button"
                                        @click.stop="focusOffice(item.code)"
                                        class="px-2 py-0.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 font-bold rounded-md text-[10.5px] transition cursor-pointer"
                                    >
                                        Định vị
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-2.5 shadow-sm space-y-2">
                        <div class="flex items-center justify-between px-2 pt-1">
                            <div class="flex items-center space-x-2 text-xs font-bold text-slate-800">
                                <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                <span>Bản Đồ Số Hóa Mạng Lưới Điểm Giao Nhận</span>
                            </div>
                            <div class="flex items-center space-x-1 text-xs">
                                <button 
                                    type="button"
                                    @click="resetZoom" 
                                    class="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-semibold text-[11px] transition cursor-pointer border border-slate-200"
                                >
                                    Toàn Cảnh VN
                                </button>
                                <button 
                                    type="button"
                                    @click="locateUser" 
                                    class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px] transition cursor-pointer shadow-sm"
                                >
                                    Gần Tôi
                                </button>
                            </div>
                        </div>

                        <div id="network-leaflet-map" class="w-full h-[560px] rounded-lg overflow-hidden border border-slate-200 z-10"></div>

                        <div class="flex flex-wrap items-center justify-between text-[11px] text-slate-500 px-2 pt-1 border-t border-slate-100 gap-2">
                            <div class="flex items-center space-x-4">
                                <span class="flex items-center space-x-1.5">
                                    <span class="w-2.5 h-2.5 rounded-full bg-[#005baa] inline-block border border-white shadow-xs"></span>
                                    <span>Kho Tổng Hub</span>
                                </span>
                                <span class="flex items-center space-x-1.5">
                                    <span class="w-2.5 h-2.5 rounded-full bg-[#0d9488] inline-block border border-white shadow-xs"></span>
                                    <span>Bưu Cục Giao Dịch</span>
                                </span>
                            </div>
                            <span class="font-mono text-slate-400">Google Maps B2B</span>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div class="bg-white border border-slate-200 border-l-4 border-l-blue-600 rounded-xl p-3.5 shadow-sm space-y-1">
                        <div class="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Hạ Tầng Vận Tải</div>
                        <h4 class="font-bold text-slate-800 text-xs">Trục Bắc - Nam Chuyên Tuyến</h4>
                        <p class="text-[11.5px] text-slate-500 leading-relaxed">Đội xe tải thùng kín chuyên dụng luân chuyển liên tục giữa các Super Hub, bảo đảm tốc độ 12 - 24 giờ.</p>
                    </div>

                    <div class="bg-white border border-slate-200 border-l-4 border-l-emerald-600 rounded-xl p-3.5 shadow-sm space-y-1">
                        <div class="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Công Nghệ Khai Thác</div>
                        <h4 class="font-bold text-slate-800 text-xs">Chia Chọn Tự Động Tốc Độ Cao</h4>
                        <p class="text-[11.5px] text-slate-500 leading-relaxed">Băng tải tự động đọc barcode phân luồng bưu kiện với công suất 50.000 kiện/giờ, hạn chế tối đa thất lạc.</p>
                    </div>

                    <div class="bg-white border border-slate-200 border-l-4 border-l-indigo-600 rounded-xl p-3.5 shadow-sm space-y-1">
                        <div class="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Mạng Lưới Chặng Cuối</div>
                        <h4 class="font-bold text-slate-800 text-xs">Bưu Tá Giao Tận Tay Phủ Kín</h4>
                        <p class="text-[11.5px] text-slate-500 leading-relaxed">Đội ngũ giao nhận gắn bó địa bàn, phát hàng đúng hẹn đến tận số nhà, ngõ ngách trên cả nước.</p>
                    </div>
                </div>
            </div>
        `
    };

    window.NetworkView = NetworkView;
})();
