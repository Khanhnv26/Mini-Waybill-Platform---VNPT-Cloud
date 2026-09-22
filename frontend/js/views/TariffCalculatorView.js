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
            <div class="space-y-6 pb-12 text-slate-800 w-full">
                <div class="animate-fade-in rounded-2xl vnpt-gradient text-white p-5 sm:p-6 shadow-lg shadow-blue-900/10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all duration-300 relative overflow-hidden">
                    <div class="relative z-10">
                        <div class="flex items-center space-x-2">
                            <span class="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                B2B TARIFF ENGINE
                            </span>
                            <span class="text-blue-100 text-xs font-medium flex items-center gap-1.5">
                                <span class="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                                Định Tuyến Cấp Quận / Huyện
                            </span>
                        </div>
                        <h1 class="text-xl sm:text-2xl font-black mt-1.5 tracking-tight text-white flex items-center gap-2">
                            Hệ Thống Ước Tính Cước Phí Bưu Phẩm
                        </h1>
                        <p class="text-blue-100/90 text-xs sm:text-sm mt-1">
                            Tra cứu biểu giá cước động theo từng Quận/Huyện, trọng lượng gram và dịch vụ thu hộ COD
                        </p>
                    </div>

                    <div class="relative z-10 flex flex-wrap items-center gap-2 sm:gap-3 self-stretch sm:self-auto justify-between sm:justify-end">
                        <div class="flex items-center space-x-2">
                            <div class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[65px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-white">3 Gói</div>
                                <div class="text-[9.5px] text-blue-100 font-medium uppercase mt-0.5">Dịch Vụ</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[75px]">
                                <div class="text-sm sm:text-base font-bold leading-tight font-mono text-cyan-300">63 Tỉnh</div>
                                <div class="text-[9.5px] text-blue-100 font-medium uppercase mt-0.5">Toàn Quốc</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300">Từ 12h</div>
                                <div class="text-[9.5px] text-blue-100 font-medium uppercase mt-0.5">Hỏa Tốc</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[75px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300">0đ COD</div>
                                <div class="text-[9.5px] text-blue-100 font-medium uppercase mt-0.5">&lt; 1 Triệu</div>
                            </div>
                        </div>

                        <button 
                            type="button" 
                            @click="goBack" 
                            class="px-3.5 py-2 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm cursor-pointer ml-auto sm:ml-0"
                        >
                            <span>← Về Tra Cứu</span>
                        </button>
                    </div>
                </div>

                <div class="animate-fade-in delay-100 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 hover:border-blue-200 transition-colors duration-300">
                    <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                        <h2 class="font-bold text-slate-800 text-base flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">1</span>
                            Thông Tin Tuyến Vận Chuyển & Kiện Hàng
                        </h2>
                        <span class="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200/60">
                            Form Chuẩn Bưu Điện
                        </span>
                    </div>

                    <div class="space-y-4">
                        <div class="flex flex-col md:flex-row items-center gap-3">
                            <div class="flex-1 w-full bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div class="text-[11px] font-black text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-blue-600"></span>
                                    <span>Địa Chỉ Gửi Hàng</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Gửi từ <span class="text-rose-500">*</span></label>
                                        <select v-model="form.senderProvince" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition cursor-pointer">
                                            <option v-for="prov in availableProvinces" :key="prov" :value="prov">{{ prov.startsWith('TP.') ? prov : (['Hà Nội', 'Hồ Chí Minh'].includes(prov) ? 'TP. ' + prov : prov) }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Quận / Huyện <span class="text-rose-500">*</span></label>
                                        <select v-model="form.senderDistrict" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition cursor-pointer">
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
                                    class="w-10 h-10 rounded-full bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-200 hover:border-blue-600 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-90 cursor-pointer group"
                                >
                                    <svg class="w-5 h-5 transition-transform duration-300 group-hover:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </button>
                            </div>

                            <div class="flex-1 w-full bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2">
                                <div class="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                                    <span>Địa Chỉ Nhận Hàng</span>
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Gửi đến <span class="text-rose-500">*</span></label>
                                        <select v-model="form.receiverProvince" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition cursor-pointer">
                                            <option v-for="prov in availableProvinces" :key="prov" :value="prov">{{ prov.startsWith('TP.') ? prov : (['Hà Nội', 'Hồ Chí Minh'].includes(prov) ? 'TP. ' + prov : prov) }}</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-700 mb-1">Quận / Huyện <span class="text-rose-500">*</span></label>
                                        <select v-model="form.receiverDistrict" class="w-full text-xs font-semibold bg-white border border-slate-200 rounded-xl p-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition cursor-pointer">
                                            <option v-for="d in receiverDistrictsList" :key="d" :value="d">{{ d }}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start pt-1">
                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Trọng lượng (Gram) <span class="text-rose-500">*</span></label>
                                <div class="relative">
                                    <input v-model.number="form.weightGram" type="number" step="50" min="50" class="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-8 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition">
                                    <span class="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">g</span>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1">VD: 500g, 1000g, 2500g</p>
                            </div>

                            <div>
                                <label class="block text-xs font-bold text-slate-700 mb-1">Tiền thu hộ COD (VNĐ)</label>
                                <div class="relative">
                                    <input v-model.number="form.codAmount" type="number" step="10000" min="0" class="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-8 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition">
                                    <span class="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400">đ</span>
                                </div>
                                <p class="text-[10px] text-slate-400 mt-1">Nhập 0 nếu không thu COD</p>
                            </div>

                            <div class="relative">
                                <div class="flex items-center justify-between mb-1">
                                    <label class="block text-xs font-bold text-slate-700">Cỡ hộp (D×R×C)</label>
                                    <span class="text-[10px] font-bold text-blue-600 font-mono">{{ volumetricGram }}g quy đổi</span>
                                </div>
                                <div class="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200 h-[42px] items-center">
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('S')"
                                        :class="selectedBoxSize === 'S' ? 'bg-white text-blue-700 font-black shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded-lg text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp S (15x10x10 cm): Mỹ phẩm, phụ kiện, tài liệu (300g)"
                                    >
                                        <span class="text-[11px] font-bold">S</span>
                                        <span class="text-[8.5px] opacity-75">Nhỏ</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('M')"
                                        :class="selectedBoxSize === 'M' ? 'bg-white text-blue-700 font-black shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded-lg text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp M (25x15x10 cm): Quần áo, hộp giày, sách (750g)"
                                    >
                                        <span class="text-[11px] font-bold">M</span>
                                        <span class="text-[8.5px] opacity-75">Vừa</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('L')"
                                        :class="selectedBoxSize === 'L' ? 'bg-white text-blue-700 font-black shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded-lg text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Hộp L (35x25x20 cm): Đồ gia dụng, balo (3.5kg)"
                                    >
                                        <span class="text-[11px] font-bold">L</span>
                                        <span class="text-[8.5px] opacity-75">Lớn</span>
                                    </button>
                                    <button 
                                        type="button" 
                                        @click="selectBoxSize('CUSTOM')"
                                        :class="selectedBoxSize === 'CUSTOM' ? 'bg-white text-blue-700 font-black shadow-xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900 font-semibold'"
                                        class="h-full rounded-lg text-xs transition-all flex flex-col items-center justify-center leading-none cursor-pointer"
                                        title="Tự nhập kích thước cm theo ý muốn"
                                    >
                                        <span class="text-[11px] font-bold">Khác</span>
                                        <span class="text-[8.5px] opacity-75">Tùy ý</span>
                                    </button>
                                </div>
                                <div class="mt-1">
                                    <div v-if="selectedBoxSize === 'CUSTOM'" class="flex items-center space-x-1 animate-fade-in">
                                        <input v-model.number="form.lengthCm" @input="onCustomDimensionChange" type="number" placeholder="D" title="Chiều dài (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1.5 focus:border-blue-500 focus:outline-none">
                                        <span class="text-slate-400 text-xs">×</span>
                                        <input v-model.number="form.widthCm" @input="onCustomDimensionChange" type="number" placeholder="R" title="Chiều rộng (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1.5 focus:border-blue-500 focus:outline-none">
                                        <span class="text-slate-400 text-xs">×</span>
                                        <input v-model.number="form.heightCm" @input="onCustomDimensionChange" type="number" placeholder="C" title="Chiều cao (cm)" class="w-1/3 text-center text-xs font-semibold bg-white border border-slate-200 rounded-lg p-1.5 focus:border-blue-500 focus:outline-none">
                                    </div>
                                    <div v-else class="text-[10px] text-slate-500 flex items-center justify-between px-0.5">
                                        <span>KT: <strong class="text-slate-700 font-mono">{{ form.lengthCm }}×{{ form.widthCm }}×{{ form.heightCm }}cm</strong></span>
                                        <span class="text-slate-400 text-[9.5px]">({{ selectedBoxSize === 'S' ? 'Mỹ phẩm, tài liệu' : selectedBoxSize === 'M' ? 'Quần áo, giày' : 'Gia dụng, đồ lớn' }})</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="hidden lg:block text-xs font-bold text-transparent select-none mb-1">Thao tác</label>
                                <button 
                                    type="button" 
                                    @click="executeCalculation" 
                                    :disabled="isCalculating"
                                    class="w-full h-[42px] bg-blue-600 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-50 text-white rounded-xl text-xs font-black tracking-wide uppercase shadow-md shadow-blue-600/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
                                >
                                    <svg v-if="isCalculating" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    <span>{{ isCalculating ? 'Đang Tính...' : 'Tính Cước Phí' }}</span>
                                </button>
                                <p class="text-[10px] text-slate-400 text-center mt-1">Cập nhật cước tức thì</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="animate-fade-in delay-200 space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                        <h2 class="font-bold text-slate-800 text-base flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">2</span>
                            Bảng So Sánh Các Gói Cước Bưu Phẩm
                        </h2>
                        <span class="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-3 py-1 rounded-lg transition-all duration-300 shadow-2xs self-start sm:self-auto flex items-center gap-1.5">
                            <span class="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                            <span>Tuyến: {{ calculationResult?.routeDescription || (form.senderDistrict + ' → ' + form.receiverDistrict) }}</span>
                        </span>
                    </div>

                    <div 
                        class="grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-300"
                        :class="isCalculating ? 'opacity-50 scale-[0.99]' : ''"
                    >
                        <div 
                            v-for="plan in (calculationResult?.plans || [])" 
                            :key="plan.serviceCode"
                            @click="selectPlan(plan.serviceCode)"
                            class="card-hover-fx bg-white rounded-2xl p-5 shadow-sm transition-all duration-300 flex flex-col justify-between cursor-pointer relative"
                            :class="[
                                selectedPlanCode === plan.serviceCode ? 'ring-4 ring-blue-500/40 border-2 border-blue-600 scale-[1.02] shadow-xl' : 'border border-slate-200 hover:border-blue-400 hover:shadow-lg',
                                plan.serviceCode === 'STANDARD' ? 'border-2 border-blue-500/80 shadow-md shadow-blue-500/10' : ''
                            ]"
                        >
                            <div v-if="plan.serviceCode === 'STANDARD'" class="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-black text-[9px] uppercase tracking-wider shadow-sm pulse-ring-active">
                                PHỔ BIẾN NHẤT
                            </div>

                            <div class="space-y-3.5" :class="plan.serviceCode === 'STANDARD' ? 'pt-1' : ''">
                                <div class="flex items-center justify-between">
                                    <span 
                                        class="px-2.5 py-1 rounded-md font-bold text-[10.5px]"
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
                                    <h3 class="font-black text-slate-800 text-base" :class="plan.serviceCode === 'STANDARD' ? 'text-blue-900' : ''">
                                        {{ plan.serviceName }}
                                    </h3>
                                    <div class="mt-1.5 flex items-baseline gap-1">
                                        <span 
                                            class="text-2xl font-black price-value-transition"
                                            :class="plan.serviceCode === 'EXPRESS' ? 'text-amber-600' : plan.serviceCode === 'STANDARD' ? 'text-blue-600' : 'text-slate-900'"
                                        >
                                            {{ formatMoney(plan.totalFee) }}
                                        </span>
                                        <span class="text-xs font-bold text-slate-500">VNĐ</span>
                                    </div>
                                </div>

                                <div class="space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-500">
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
                                class="mt-5 w-full py-2.5 font-bold rounded-xl text-xs transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
                                :class="plan.serviceCode === 'STANDARD' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700'"
                            >
                                Tạo Đơn Gói Này
                            </button>
                        </div>
                    </div>

                    <div class="animate-fade-in delay-300 bg-blue-50/70 border border-blue-100/90 rounded-xl p-4 text-xs text-blue-900 flex items-start space-x-2.5 transition-all">
                        <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-bounce" style="animation-duration: 2s;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <div>
                            <span class="font-bold">Đồng bộ tự động:</span> Bấm <span class="font-bold text-blue-700">"Tạo Đơn Gói Này"</span> để chuyển trực tiếp thông tin Tỉnh/Quận gửi, Tỉnh/Quận nhận, Cân nặng và COD sang form Tạo Vận Đơn mà không cần nhập lại.
                        </div>
                    </div>
                </div>

                <div class="animate-fade-in delay-300 space-y-4">
                    <div class="flex items-center justify-between pb-1">
                        <h2 class="font-bold text-slate-800 text-base flex items-center gap-2">
                            <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-black">3</span>
                            So Sánh Chi Tiết Quyền Lợi &amp; Đặc Quyền Gói Cước
                        </h2>
                        <span class="text-xs text-slate-400 font-medium hidden sm:inline">Tiêu chuẩn nghiệp vụ VNPT Post 2026</span>
                    </div>

                    <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <div class="overflow-x-auto">
                            <table class="w-full text-xs text-left">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                        <th class="py-3.5 px-4 sm:px-6 w-2/5">Tiêu Chí Nghiệp Vụ</th>
                                        <th class="py-3.5 px-3 text-center w-1/5">
                                            <span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-extrabold text-[11px]">TIẾT KIỆM</span>
                                        </th>
                                        <th class="py-3.5 px-3 text-center w-1/5 bg-blue-50/50 border-x border-blue-100">
                                            <span class="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[11px]">TIÊU CHUẨN</span>
                                        </th>
                                        <th class="py-3.5 px-3 text-center w-1/5">
                                            <span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-extrabold text-[11px]">HỎA TỐC</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-600">
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Thời gian cam kết toàn trình</td>
                                        <td class="py-3 px-3 text-center">3 - 4 ngày</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">1 - 2 ngày</td>
                                        <td class="py-3 px-3 text-center font-bold text-amber-700">12 - 24 giờ</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Số lần phát lại miễn phí tận nơi</td>
                                        <td class="py-3 px-3 text-center">2 lần</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">3 lần</td>
                                        <td class="py-3 px-3 text-center font-bold text-emerald-600">Tối đa 3 lần + Ưu tiên</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Miễn phí thu hộ COD</td>
                                        <td class="py-3 px-3 text-center">&lt; 500.000 đ</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">&lt; 1.000.000 đ</td>
                                        <td class="py-3 px-3 text-center font-bold text-emerald-600">&lt; 3.000.000 đ</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Bảo hiểm trách nhiệm bưu phẩm</td>
                                        <td class="py-3 px-3 text-center">Tối đa 5 triệu</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">Tối đa 20 triệu</td>
                                        <td class="py-3 px-3 text-center font-bold text-emerald-600">Tối đa 50 triệu</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Dịch vụ đồng kiểm khi nhận hàng</td>
                                        <td class="py-3 px-3 text-center text-slate-400">Không hỗ trợ</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">Miễn phí</td>
                                        <td class="py-3 px-3 text-center font-bold text-emerald-600">Miễn phí</td>
                                    </tr>
                                    <tr class="hover:bg-slate-50/60 transition">
                                        <td class="py-3 px-4 sm:px-6 font-semibold text-slate-800">Thời gian lưu kho chờ nhận</td>
                                        <td class="py-3 px-3 text-center">5 ngày</td>
                                        <td class="py-3 px-3 text-center font-bold text-blue-700 bg-blue-50/20 border-x border-blue-100">7 ngày</td>
                                        <td class="py-3 px-3 text-center font-bold text-slate-700">10 ngày</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Vận Chuyển An Toàn 100%</h4>
                                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Mỗi kiện hàng đều được cấp mã vận đơn số hóa và giám sát vị trí liên tục qua từng bưu cục.</p>
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Đối Soát COD Nhanh Gọn</h4>
                                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Thanh toán tiền thu hộ định kỳ tự động qua tài khoản ngân hàng, minh bạch và không phát sinh phí ẩn.</p>
                            </div>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start space-x-3 hover:border-blue-300 transition">
                            <div class="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-800 text-xs">Mạng Lưới Khai Thác 24/7</h4>
                                <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Hệ thống trung tâm chia chọn tự động tại các Super Hub bảo đảm bưu kiện luôn lưu thoát không gián đoạn.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `
    };

    window.TariffCalculatorView = TariffCalculatorView;
})();
