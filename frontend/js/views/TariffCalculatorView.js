(function () {
    const { ref, reactive, computed, watch, onMounted } = Vue;

    const DISTRICTS_MAP = {
        'Hà Nội': ['Q. Hoàn Kiếm', 'Q. Ba Đình', 'Q. Cầu Giấy', 'Q. Đống Đa', 'Q. Hai Bà Trưng', 'Q. Nam Từ Liêm', 'Q. Bắc Từ Liêm', 'Q. Hà Đông', 'Q. Long Biên', 'Q. Thanh Xuân', 'Q. Tây Hồ'],
        'Hồ Chí Minh': ['Q. 1', 'Q. 3', 'Q. 5', 'Q. 6', 'Q. 7', 'Q. 8', 'Q. 10', 'Q. 11', 'Q. 12', 'Q. Bình Thạnh', 'Q. Gò Vấp', 'Q. Tân Bình', 'Q. Tân Phú', 'TP. Thủ Đức'],
        'Đà Nẵng': ['Q. Hải Châu', 'Q. Thanh Khê', 'Q. Sơn Trà', 'Q. Ngũ Hành Sơn', 'Q. Liên Chiểu', 'Q. Cẩm Lệ'],
        'Hải Phòng': ['Q. Hồng Bàng', 'Q. Ngô Quyền', 'Q. Lê Chân', 'Q. Hải An', 'Q. Kiến An', 'Q. Đồ Sơn'],
        'Cần Thơ': ['Q. Ninh Kiều', 'Q. Bình Thủy', 'Q. Cái Răng', 'Q. Ô Môn', 'Q. Thốt Nốt']
    };

    const TariffCalculatorView = {
        name: 'TariffCalculatorView',
        emits: ['back-home', 'create-shipment-from-tariff'],
        setup(props, { emit }) {
            const isCalculating = ref(false);
            const selectedPlanCode = ref('STANDARD');

            const form = reactive({
                senderProvince: 'Hà Nội',
                senderDistrict: 'Q. Hoàn Kiếm',
                receiverProvince: 'Hồ Chí Minh',
                receiverDistrict: 'Q. 6',
                weightGram: 500,
                codAmount: 350000,
                lengthCm: 25,
                widthCm: 15,
                heightCm: 10
            });

            const calculationResult = ref(null);

            const availableProvinces = ref(['Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ']);
            const availableDistrictsMap = ref({ ...DISTRICTS_MAP });

            const loadHubsFromNetwork = async () => {
                if (typeof RoutingService === 'undefined' || typeof RoutingService.getAllHubs !== 'function') return;
                try {
                    const hubs = await RoutingService.getAllHubs();
                    if (Array.isArray(hubs) && hubs.length > 0) {
                        const provSet = new Set();
                        const distMap = {};
                        const hubCodeToProv = {};

                        hubs.forEach(h => {
                            if (h.province && (h.hubLevel === 1 || !h.hubLevel || h.hubType === 'SUPER_HUB' || h.hubType === 'LOCAL_HUB')) {
                                provSet.add(h.province);
                                hubCodeToProv[h.hubCode] = h.province;
                                if (!distMap[h.province]) distMap[h.province] = [];
                            }
                        });

                        hubs.forEach(h => {
                            let prov = h.province;
                            if (h.parentHubCode && hubCodeToProv[h.parentHubCode]) {
                                prov = hubCodeToProv[h.parentHubCode];
                            }
                            if (prov && h.district) {
                                if (!distMap[prov]) distMap[prov] = [];
                                if (!distMap[prov].includes(h.district)) {
                                    distMap[prov].push(h.district);
                                }
                            }
                        });

                        Object.keys(DISTRICTS_MAP).forEach(p => {
                            provSet.add(p);
                            if (!distMap[p] || distMap[p].length === 0) {
                                distMap[p] = [...DISTRICTS_MAP[p]];
                            } else {
                                DISTRICTS_MAP[p].forEach(d => {
                                    if (!distMap[p].includes(d)) {
                                        distMap[p].push(d);
                                    }
                                });
                            }
                        });

                        if (provSet.size > 0) {
                            availableProvinces.value = Array.from(provSet);
                            availableDistrictsMap.value = distMap;
                        }
                    }
                } catch (e) {
                }
            };

            const senderDistrictsList = computed(() => {
                return availableDistrictsMap.value[form.senderProvince] || DISTRICTS_MAP[form.senderProvince] || ['Khu vực trung tâm'];
            });

            const receiverDistrictsList = computed(() => {
                return availableDistrictsMap.value[form.receiverProvince] || DISTRICTS_MAP[form.receiverProvince] || ['Khu vực trung tâm'];
            });

            const volumetricGram = computed(() => {
                const l = Number(form.lengthCm) || 0;
                const w = Number(form.widthCm) || 0;
                const h = Number(form.heightCm) || 0;
                return Math.round(((l * w * h) / 5000) * 1000);
            });

            watch(() => form.senderProvince, (newProv) => {
                const list = availableDistrictsMap.value[newProv] || DISTRICTS_MAP[newProv] || [];
                if (list.length > 0 && !list.includes(form.senderDistrict)) {
                    form.senderDistrict = list[0];
                }
                scheduleCalculation();
            });

            watch(() => form.receiverProvince, (newProv) => {
                const list = availableDistrictsMap.value[newProv] || DISTRICTS_MAP[newProv] || [];
                if (list.length > 0 && !list.includes(form.receiverDistrict)) {
                    form.receiverDistrict = list[0];
                }
                scheduleCalculation();
            });

            watch([() => form.senderDistrict, () => form.receiverDistrict, () => form.weightGram, () => form.codAmount, () => form.lengthCm, () => form.widthCm, () => form.heightCm], () => {
                scheduleCalculation();
            });

            const selectedBoxSize = ref('M');

            const selectBoxSize = (size) => {
                selectedBoxSize.value = size;
                if (size === 'S') {
                    form.lengthCm = 15;
                    form.widthCm = 10;
                    form.heightCm = 10;
                } else if (size === 'M') {
                    form.lengthCm = 25;
                    form.widthCm = 15;
                    form.heightCm = 10;
                } else if (size === 'L') {
                    form.lengthCm = 35;
                    form.widthCm = 25;
                    form.heightCm = 20;
                }
                scheduleCalculation();
            };

            const onCustomDimensionChange = () => {
                selectedBoxSize.value = 'CUSTOM';
                scheduleCalculation();
            };

            const executeCalculation = async () => {
                isCalculating.value = true;
                const payload = {
                    senderProvince: form.senderProvince,
                    senderDistrict: form.senderDistrict,
                    receiverProvince: form.receiverProvince,
                    receiverDistrict: form.receiverDistrict,
                    weightGram: Number(form.weightGram) || 500,
                    codAmount: Number(form.codAmount) || 0,
                    lengthCm: Number(form.lengthCm) || 25,
                    widthCm: Number(form.widthCm) || 15,
                    heightCm: Number(form.heightCm) || 10
                };

                try {
                    if (window.PricingService) {
                        calculationResult.value = await window.PricingService.calculateTariff(payload);
                    }
                } catch (err) {
                    if (window.PricingService) {
                        calculationResult.value = window.PricingService.calculateFallback(payload);
                    }
                } finally {
                    isCalculating.value = false;
                }
            };

            let calculationTimer = null;

            const scheduleCalculation = () => {
                if (calculationTimer) clearTimeout(calculationTimer);
                calculationTimer = setTimeout(executeCalculation, 300);
            };

            const selectPlan = (code) => {
                selectedPlanCode.value = code;
            };

            const handleCreateShipment = (plan) => {
                const data = {
                    senderProvince: form.senderProvince,
                    senderDistrict: form.senderDistrict,
                    receiverProvince: form.receiverProvince,
                    receiverDistrict: form.receiverDistrict,
                    weightKg: Math.max(0.1, Math.round(((Number(form.weightGram) || 500) / 1000) * 10) / 10),
                    codAmount: Number(form.codAmount) || 0,
                    serviceType: plan.serviceCode || 'STANDARD',
                    planName: plan.serviceName,
                    estimatedFee: plan.totalFee
                };

                emit('create-shipment-from-tariff', data);
            };

            const swapLocations = () => {
                const tempProv = form.senderProvince;
                const tempDist = form.senderDistrict;
                form.senderProvince = form.receiverProvince;
                form.senderDistrict = form.receiverDistrict;
                form.receiverProvince = tempProv;
                form.receiverDistrict = tempDist;
                scheduleCalculation();
            };

            const goBack = () => {
                emit('back-home');
            };

            const formatMoney = (val) => {
                return (Number(val) || 0).toLocaleString('vi-VN');
            };

            onMounted(async () => {
                await loadHubsFromNetwork();
                executeCalculation();
            });

            return {
                form,
                isCalculating,
                selectedPlanCode,
                availableProvinces,
                availableDistrictsMap,
                senderDistrictsList,
                receiverDistrictsList,
                volumetricGram,
                calculationResult,
                executeCalculation,
                selectPlan,
                handleCreateShipment,
                selectedBoxSize,
                selectBoxSize,
                onCustomDimensionChange,
                swapLocations,
                goBack,
                formatMoney
            };
        },
        template: `
            <div class="space-y-5 pb-12 text-slate-800 w-full">
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 16px 16px;"></div>

                    <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                    B2B Tariff Engine
                                </span>
                                <span class="text-blue-100 text-xs font-medium flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                                    Định Tuyến Cấp Quận / Huyện
                                </span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Hệ Thống Ước Tính Cước Phí Bưu Phẩm
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Tra cứu biểu giá cước động theo từng Quận/Huyện, trọng lượng gram và dịch vụ thu hộ COD.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-white">3 Gói</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Dịch Vụ</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight font-mono text-cyan-300">63 Tỉnh</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Toàn Quốc</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">Từ 12h</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Hỏa Tốc</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">0đ COD</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">&lt; 1 Triệu</div>
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

                <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-4 hover:border-blue-200 transition-colors duration-300">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            1. Thông Tin Tuyến Vận Chuyển &amp; Kiện Hàng
                        </span>
                        <span class="text-[10px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200/60">
                            Form Chuẩn Bưu Điện
                        </span>
                    </div>

                    <div class="space-y-3">
                        <div class="flex flex-col md:flex-row items-center gap-2.5">
                            <div class="flex-1 w-full bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                                <div class="text-[10.5px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                    <span>Địa Chỉ Gửi Hàng</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Gửi từ <span class="text-rose-500">*</span></label>
                                        <select v-model="form.senderProvince" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                            <option v-for="prov in availableProvinces" :key="prov" :value="prov">{{ prov.startsWith('TP.') ? prov : (['Hà Nội', 'Hồ Chí Minh'].includes(prov) ? 'TP. ' + prov : prov) }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Quận / Huyện <span class="text-rose-500">*</span></label>
                                        <select v-model="form.senderDistrict" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                            <option v-for="d in senderDistrictsList" :key="d" :value="d">{{ d }}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="flex-shrink-0">
                                <button 
                                    type="button" 
                                    @click="swapLocations" 
                                    title="Đổi chiều nơi gửi và nơi nhận" 
                                    class="w-8 h-8 rounded-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 hover:border-blue-600 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer group"
                                >
                                    <svg class="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </button>
                            </div>

                            <div class="flex-1 w-full bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                                <div class="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                    <span>Địa Chỉ Nhận Hàng</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Gửi đến <span class="text-rose-500">*</span></label>
                                        <select v-model="form.receiverProvince" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                            <option v-for="prov in availableProvinces" :key="prov" :value="prov">{{ prov.startsWith('TP.') ? prov : (['Hà Nội', 'Hồ Chí Minh'].includes(prov) ? 'TP. ' + prov : prov) }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-[11px] font-bold text-slate-600 mb-1">Quận / Huyện <span class="text-rose-500">*</span></label>
                                        <select v-model="form.receiverDistrict" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 focus:border-blue-500 focus:outline-none transition cursor-pointer">
                                            <option v-for="d in receiverDistrictsList" :key="d" :value="d">{{ d }}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start pt-1">
                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Trọng lượng (Gram) <span class="text-rose-500">*</span></label>
                                <div class="relative">
                                    <input v-model.number="form.weightGram" type="number" step="50" min="50" class="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-3 pr-7 focus:bg-white focus:border-blue-500 focus:outline-none transition">
                                    <span class="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400">g</span>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-0.5">VD: 500g, 1000g, 2500g</p>
                            </div>

                            <div>
                                <label class="block text-[11px] font-bold text-slate-700 mb-1">Tiền thu hộ COD (VNĐ)</label>
                                <div class="relative">
                                    <input v-model.number="form.codAmount" type="number" step="10000" min="0" class="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-3 pr-7 focus:bg-white focus:border-blue-500 focus:outline-none transition">
                                    <span class="absolute right-2.5 top-1.5 text-[11px] font-bold text-slate-400">đ</span>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-0.5">Nhập 0 nếu không thu COD</p>
                            </div>

                            <div class="relative">
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-[11px] font-bold text-slate-700">Cỡ hộp (D×R×C)</label>
                                    <span class="text-[10px] font-bold text-blue-600 font-mono">{{ volumetricGram }}g quy đổi</span>
                                </div>
                                <div class="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200 h-[34px] items-center">
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('S')"
                                        :class="selectedBoxSize === 'S' ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp S (15x10x10 cm): Mỹ phẩm, phụ kiện, tài liệu (300g)"
                                    >
                                        <span class="text-[10.5px] font-bold">S</span>
                                        <span class="text-[8px] opacity-75">Nhỏ</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('M')"
                                        :class="selectedBoxSize === 'M' ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp M (25x15x10 cm): Quần áo, hộp giày, sách (750g)"
                                    >
                                        <span class="text-[10.5px] font-bold">M</span>
                                        <span class="text-[8px] opacity-75">Vừa</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('L')"
                                        :class="selectedBoxSize === 'L' ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp L (35x25x20 cm): Đồ gia dụng, balo (3.5kg)"
                                    >
                                        <span class="text-[10.5px] font-bold">L</span>
                                        <span class="text-[8px] opacity-75">Lớn</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('CUSTOM')"
                                        :class="selectedBoxSize === 'CUSTOM' ? 'bg-white text-blue-700 font-bold shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Tự nhập kích thước cm theo ý muốn"
                                    >
                                        <span class="text-[10.5px] font-bold">Khác</span>
                                        <span class="text-[8px] opacity-75">Tùy ý</span>
                                    </button>
                                </div>
                                <div class="mt-1">
                                    <div v-if="selectedBoxSize === 'CUSTOM'" class="flex items-center space-x-1 animate-fade-in">
                                        <input v-model.number="form.lengthCm" @input="onCustomDimensionChange" type="number" placeholder="D" title="Chiều dài (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:border-blue-500 focus:outline-none">
                                        <span class="text-slate-400 text-xs">×</span>
                                        <input v-model.number="form.widthCm" @input="onCustomDimensionChange" type="number" placeholder="R" title="Chiều rộng (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:border-blue-500 focus:outline-none">
                                        <span class="text-slate-400 text-xs">×</span>
                                        <input v-model.number="form.heightCm" @input="onCustomDimensionChange" type="number" placeholder="C" title="Chiều cao (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:border-blue-500 focus:outline-none">
                                    </div>
                                    <div v-else class="text-[10px] text-slate-500 flex items-center justify-between px-0.5">
                                        <span>KT: <strong class="text-slate-700 font-mono">{{ form.lengthCm }}×{{ form.widthCm }}×{{ form.heightCm }}cm</strong></span>
                                        <span class="text-slate-400 text-[9.5px]">({{ selectedBoxSize === 'S' ? 'Mỹ phẩm, tài liệu' : selectedBoxSize === 'M' ? 'Quần áo, giày' : 'Gia dụng, đồ lớn' }})</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="hidden lg:block text-[11px] font-bold text-transparent select-none mb-1">Thao tác</label>
                                <button 
                                    type="button" 
                                    @click="executeCalculation" 
                                    :disabled="isCalculating"
                                    class="w-full h-[34px] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-lg text-xs font-bold tracking-wide uppercase shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    <svg v-if="isCalculating" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    <span>{{ isCalculating ? 'Đang Tính...' : 'Tính Cước Phí' }}</span>
                                </button>
                                <p class="text-[10px] text-slate-400 text-center mt-0.5">Cập nhật cước tức thì</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            2. Bảng So Sánh Các Gói Cước Bưu Phẩm
                        </span>
                        <span class="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 rounded-lg shadow-2xs self-start sm:self-auto flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                            <span>Tuyến: {{ calculationResult?.routeDescription || (form.senderDistrict + ' → ' + form.receiverDistrict) }}</span>
                        </span>
                    </div>

                    <div 
                        class="grid grid-cols-1 md:grid-cols-3 gap-3.5 transition-all duration-300"
                        :class="isCalculating ? 'opacity-50 scale-[0.99]' : ''"
                    >
                        <div 
                            v-for="plan in (calculationResult?.plans || [])" 
                            :key="plan.serviceCode"
                            @click="selectPlan(plan.serviceCode)"
                            class="bg-white rounded-xl p-4 shadow-sm transition-all duration-200 flex flex-col justify-between cursor-pointer relative"
                            :class="[
                                selectedPlanCode === plan.serviceCode ? 'ring-2 ring-blue-500 border border-blue-600 shadow-md' : 'border border-slate-200 hover:border-blue-400 hover:shadow',
                                plan.serviceCode === 'STANDARD' && selectedPlanCode !== plan.serviceCode ? 'border-blue-400 shadow-2xs' : ''
                            ]"
                        >
                            <div v-if="plan.serviceCode === 'STANDARD'" class="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm">
                                PHỔ BIẾN NHẤT
                            </div>

                            <div class="space-y-2.5" :class="plan.serviceCode === 'STANDARD' ? 'pt-1' : ''">
                                <div class="flex items-center justify-between">
                                    <span 
                                        class="px-2 py-0.5 rounded font-bold text-[10px]"
                                        :class="plan.serviceCode === 'EXPRESS' ? 'bg-amber-50 text-amber-700' : plan.serviceCode === 'STANDARD' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'"
                                    >
                                        {{ plan.serviceCode === 'EXPRESS' ? 'HỎA TỐC' : plan.serviceCode === 'STANDARD' ? 'TIÊU CHUẨN' : 'TIẾT KIỆM' }}
                                    </span>
                                    <span class="text-xs font-medium flex items-center gap-1" :class="plan.serviceCode === 'EXPRESS' ? 'text-amber-600 font-bold' : plan.serviceCode === 'STANDARD' ? 'text-blue-600 font-bold' : 'text-slate-400'">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        {{ plan.estimatedDelivery }}
                                    </span>
                                </div>
                                <div>
                                    <h3 class="font-bold text-slate-800 text-sm" :class="plan.serviceCode === 'STANDARD' ? 'text-blue-900' : ''">
                                        {{ plan.serviceName }}
                                    </h3>
                                    <div class="mt-1 flex items-baseline gap-1">
                                        <span 
                                            class="text-xl font-bold font-mono"
                                            :class="plan.serviceCode === 'EXPRESS' ? 'text-amber-600' : plan.serviceCode === 'STANDARD' ? 'text-blue-600' : 'text-slate-900'"
                                        >
                                            {{ formatMoney(plan.totalFee) }}
                                        </span>
                                        <span class="text-[11px] font-bold text-slate-500">VNĐ</span>
                                    </div>
                                </div>

                                <div class="space-y-1.5 pt-2.5 border-t border-slate-100 text-[11.5px] text-slate-500">
                                    <div class="flex justify-between">
                                        <span>Cước chính:</span>
                                        <span class="font-semibold text-slate-700">{{ formatMoney(plan.baseFee) }} đ</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Phụ phí xăng dầu (6%):</span>
                                        <span class="font-semibold text-slate-700">{{ formatMoney(plan.fuelSurcharge) }} đ</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Phí thu hộ COD:</span>
                                        <span class="font-semibold text-slate-700">{{ formatMoney(plan.codFee) }} đ</span>
                                    </div>
                                </div>
                            </div>

                            <button 
                                type="button" 
                                @click.stop="handleCreateShipment(plan)"
                                class="mt-4 w-full py-2 font-bold rounded-lg text-xs transition-all duration-200 active:scale-95 shadow-2xs cursor-pointer"
                                :class="plan.serviceCode === 'STANDARD' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'"
                            >
                                Tạo Đơn Gói Này
                            </button>
                        </div>
                    </div>

                    <div class="bg-blue-50/70 border border-blue-100/90 rounded-lg p-3 text-xs text-blue-900 flex items-start space-x-2 transition-all">
                        <svg class="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div class="text-[11.5px]">
                            <span class="font-bold">Đồng bộ tự động:</span> Bấm <span class="font-bold text-blue-700">"Tạo Đơn Gói Này"</span> để chuyển trực tiếp thông tin Tỉnh/Quận gửi, Tỉnh/Quận nhận, Cân nặng và COD sang form Tạo Vận Đơn mà không cần nhập lại.
                        </div>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between px-1">
                        <span class="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            3. Chi Tiết Quyền Lợi &amp; Đặc Quyền Gói Cước
                        </span>
                        <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">Tiêu chuẩn nghiệp vụ VNPT Post 2026</span>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                        <th class="py-2.5 px-3.5 sm:px-4 w-2/5">Tiêu Chí Nghiệp Vụ</th>
                                        <th class="py-2.5 px-3 text-center w-1/5">
                                            <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">TIẾT KIỆM</span>
                                        </th>
                                        <th class="py-2.5 px-3 text-center w-1/5 bg-blue-50/50 border-x border-blue-100">
                                            <span class="px-2 py-0.5 rounded bg-blue-600 text-white font-bold text-[10px]">TIÊU CHUẨN</span>
                                        </th>
                                        <th class="py-2.5 px-3 text-center w-1/5">
                                            <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">HỎA TỐC</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-600 text-[11.5px]">
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Thời gian cam kết toàn trình</td>
                                        <td class="py-2.5 px-3 text-center">3 - 4 ngày</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">1 - 2 ngày</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-amber-700">12 - 24 giờ</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Số lần phát lại miễn phí tận nơi</td>
                                        <td class="py-2.5 px-3 text-center">2 lần</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">3 lần</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-emerald-600">Tối đa 3 lần + Ưu tiên</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Miễn phí thu hộ COD</td>
                                        <td class="py-2.5 px-3 text-center">&lt; 500.000 đ</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">&lt; 1.000.000 đ</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-emerald-600">&lt; 3.000.000 đ</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Bảo hiểm trách nhiệm bưu phẩm</td>
                                        <td class="py-2.5 px-3 text-center">Tối đa 5 triệu</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">Tối đa 20 triệu</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-emerald-600">Tối đa 50 triệu</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Dịch vụ đồng kiểm khi nhận hàng</td>
                                        <td class="py-2.5 px-3 text-center text-slate-400">Không hỗ trợ</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">Miễn phí</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-emerald-600">Miễn phí</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Thời gian lưu kho chờ nhận</td>
                                        <td class="py-2.5 px-3 text-center">5 ngày</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">7 ngày</td>
                                        <td class="py-2.5 px-3 text-center font-bold text-slate-700">10 ngày</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Vận Chuyển An Toàn 100%</h4>
                                <p class="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">Mỗi kiện hàng đều được cấp mã vận đơn số hóa và giám sát vị trí liên tục qua từng bưu cục.</p>
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Đối Soát COD Nhanh Gọn</h4>
                                <p class="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">Thanh toán tiền thu hộ định kỳ tự động qua tài khoản ngân hàng, minh bạch và không phát sinh phí ẩn.</p>
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Mạng Lưới Khai Thác 24/7</h4>
                                <p class="text-[11.5px] text-slate-500 mt-0.5 leading-relaxed">Hệ thống trung tâm chia chọn tự động tại các Super Hub bảo đảm bưu kiện luôn lưu thoát không gián đoạn.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.TariffCalculatorView = TariffCalculatorView;
})();
