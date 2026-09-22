(function () {
    const { ref, computed } = Vue;

    const GuideView = {
        name: 'GuideView',
        emits: ['back-home', 'switch-tab'],
        setup(props, { emit }) {
            const currentSubTab = ref('packaging');

            const calcLength = ref(30);
            const calcWidth = ref(20);
            const calcHeight = ref(15);

            const iataGram = computed(() => {
                const l = Number(calcLength.value) || 0;
                const w = Number(calcWidth.value) || 0;
                const h = Number(calcHeight.value) || 0;
                return Math.round(((l * w * h) / 5000) * 1000);
            });

            const iataKg = computed(() => {
                return (iataGram.value / 1000).toFixed(2);
            });

            const goToCalculator = () => {
                if (emit) {
                    emit('switch-tab', 'calculator');
                }
            };

            const goToNetwork = () => {
                if (emit) {
                    emit('switch-tab', 'network');
                }
            };

            const goBack = () => {
                emit('back-home');
            };

            return {
                currentSubTab,
                calcLength,
                calcWidth,
                calcHeight,
                iataGram,
                iataKg,
                goToCalculator,
                goToNetwork,
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
                                    Standards &amp; Policies
                                </span>
                                <span class="text-blue-100 text-xs font-medium flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
                                    Quy Chuẩn Bưu Chính VNPT
                                </span>
                            </div>
                            <h1 class="text-base sm:text-lg font-bold tracking-tight mt-1 text-white">
                                Cẩm Nang Đóng Gói &amp; Quy Định Bưu Chính
                            </h1>
                            <p class="text-xs text-blue-100/90 mt-0.5 leading-normal">
                                Hướng dẫn đóng gói an toàn theo nhóm hàng, danh mục hàng cấm, công thức quy đổi IATA và bảo hiểm bưu gửi.
                            </p>
                        </div>

                        <div class="flex items-center space-x-2 self-start sm:self-auto">
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-white">4 Nhóm</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Mặt Hàng</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-cyan-300 font-mono">Chuẩn IATA</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Thể Tích</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-amber-300 font-mono">100%</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Bảo Hiểm</div>
                            </div>
                            <div class="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-center min-w-[70px]">
                                <div class="text-sm sm:text-base font-bold leading-tight text-emerald-300 font-mono">1900 545481</div>
                                <div class="text-[10px] text-blue-100 font-medium uppercase mt-0.5">Hotline</div>
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

                <div class="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs font-bold">
                    <button 
                        type="button"
                        @click="currentSubTab = 'packaging'"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg transition cursor-pointer font-bold',
                            currentSubTab === 'packaging' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        ]"
                    >
                        Quy Chuẩn Đóng Gói
                    </button>
                    <button 
                        type="button"
                        @click="currentSubTab = 'prohibited'"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg transition cursor-pointer font-bold',
                            currentSubTab === 'prohibited' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        ]"
                    >
                        Hàng Cấm &amp; Điều Kiện
                    </button>
                    <button 
                        type="button"
                        @click="currentSubTab = 'iata'"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg transition cursor-pointer font-bold',
                            currentSubTab === 'iata' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        ]"
                    >
                        Kích Thước &amp; IATA
                    </button>
                    <button 
                        type="button"
                        @click="currentSubTab = 'policy'"
                        :class="[
                            'px-3.5 py-1.5 rounded-lg transition cursor-pointer font-bold',
                            currentSubTab === 'policy' 
                                ? 'bg-blue-600 text-white shadow-sm' 
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        ]"
                    >
                        Bảo Hiểm &amp; Bồi Thường
                    </button>
                </div>

                <div v-if="currentSubTab === 'packaging'" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5 hover:border-blue-300 transition">
                            <div class="flex items-center justify-between">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                                    NHÓM 1: DỄ VỠ
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium">Thủy tinh, sứ, mỹ phẩm</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Quy Cách Đóng Gói Hàng Dễ Vỡ</h3>
                            <ul class="space-y-1.5 text-[11.5px] text-slate-600">
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">1</span>
                                    <span>Bọc xốp bóng khí (Bubble wrap) tối thiểu <strong>3 - 4 lớp</strong> xung quanh sản phẩm.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">2</span>
                                    <span>Chèn kín mút xốp hoặc túi khí vào các khoảng trống trong thùng carton <strong>6 mặt</strong>.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">3</span>
                                    <span>Dán nhãn cảnh báo đỏ <strong>"HÀNG DỄ VỠ - XIN NHẸ TAY"</strong> tại vị trí dễ quan sát.</span>
                                </li>
                            </ul>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5 hover:border-blue-300 transition">
                            <div class="flex items-center justify-between">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                    NHÓM 2: ĐIỆN TỬ
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium">Laptop, điện thoại, máy ảnh</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Quy Cách Đóng Gói Thiết Bị Điện Tử</h3>
                            <ul class="space-y-1.5 text-[11.5px] text-slate-600">
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">1</span>
                                    <span>Tắt nguồn hoàn toàn và sử dụng <strong>túi chống tĩnh điện</strong> bọc thiết bị.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">2</span>
                                    <span>Dùng xốp định hình EPS/PE dày tối thiểu <strong>3cm</strong> bao bọc các góc cạnh.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">3</span>
                                    <span>Dán tem niêm phong an ninh bưu điện chống tráo đổi linh kiện.</span>
                                </li>
                            </ul>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5 hover:border-blue-300 transition">
                            <div class="flex items-center justify-between">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                    NHÓM 3: CHẤT LỎNG
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium">Hóa mỹ phẩm, siro, dung dịch</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Quy Cách Đóng Gói Chất Lỏng</h3>
                            <ul class="space-y-1.5 text-[11.5px] text-slate-600">
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">1</span>
                                    <span>Dán băng dính cố định nắp chai lọ và bọc <strong>túi nilon zip chống rò rỉ</strong>.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">2</span>
                                    <span>Xếp bưu phẩm <strong>theo chiều thẳng đứng</strong>, kèm chất hút ẩm nếu cần.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">3</span>
                                    <span>Dán mũi tên định hướng chiều đứng của kiện hàng.</span>
                                </li>
                            </ul>
                        </div>

                        <div class="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5 hover:border-blue-300 transition">
                            <div class="flex items-center justify-between">
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">
                                    NHÓM 4: QUẦN ÁO &amp; TÀI LIỆU
                                </span>
                                <span class="text-[11px] text-slate-400 font-medium">Hồ sơ, hợp đồng, thời trang</span>
                            </div>
                            <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Quy Cách Đóng Gói Tiêu Chuẩn</h3>
                            <ul class="space-y-1.5 text-[11.5px] text-slate-600">
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">1</span>
                                    <span>Đối với tài liệu: Cho vào phong bì bìa cứng chống gập mép hoặc bọc màng co.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">2</span>
                                    <span>Đối với quần áo: Dùng túi nilon niêm phong chịu lực chống rách, dán băng keo kín mép.</span>
                                </li>
                                <li class="flex items-start space-x-2">
                                    <span class="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0 mt-0.5">3</span>
                                    <span>Dán tem phiếu gửi in rõ mã vạch lên mặt phẳng lớn nhất của kiện.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 space-y-1">
                        <span class="text-[11px] font-bold uppercase tracking-wider text-amber-800">Khuyến Cáo "3 Không" Khi Gửi Bưu Phẩm</span>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-[11px] text-amber-800">
                            <span>• <strong>Không</strong> dùng thùng carton mục nát hoặc biến dạng</span>
                            <span>• <strong>Không</strong> để hàng lắc lư, xộc xệch bên trong hộp</span>
                            <span>• <strong>Không</strong> dán băng keo che khuất mã vạch vận đơn</span>
                        </div>
                    </div>
                </div>

                <div v-if="currentSubTab === 'prohibited'" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="bg-white border border-rose-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                            <div class="flex items-center justify-between pb-1 border-b border-rose-100">
                                <h3 class="font-bold text-rose-900 text-xs sm:text-sm">Danh Mục Cấm Gửi Tuyệt Đối</h3>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800">Cấm 100%</span>
                            </div>
                            <p class="text-[11px] text-slate-500">Hàng hóa vi phạm pháp luật hoặc đe dọa an ninh mạng bưu chính:</p>
                            <div class="space-y-1.5 text-[11.5px] text-slate-700">
                                <div class="p-2 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
                                    <span class="font-semibold">Chất cháy nổ, pháo hoa, xăng dầu, gas</span>
                                    <span class="text-[9.5px] font-bold text-rose-700 uppercase">Cấm 100%</span>
                                </div>
                                <div class="p-2 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
                                    <span class="font-semibold">Vũ khí quân dụng, súng đạn, dao găm, công cụ hỗ trợ</span>
                                    <span class="text-[9.5px] font-bold text-rose-700 uppercase">Cấm 100%</span>
                                </div>
                                <div class="p-2 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
                                    <span class="font-semibold">Ma túy, tiền chất ma túy, thuốc lá điện tử cấm</span>
                                    <span class="text-[9.5px] font-bold text-rose-700 uppercase">Cấm 100%</span>
                                </div>
                                <div class="p-2 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
                                    <span class="font-semibold">Tiền mặt, kim khí quý (vàng thỏi), đá quý trái phép</span>
                                    <span class="text-[9.5px] font-bold text-rose-700 uppercase">Cấm 100%</span>
                                </div>
                                <div class="p-2 bg-rose-50/60 rounded-lg border border-rose-100 flex items-center justify-between">
                                    <span class="font-semibold">Động vật sống, thú cưng, mẫu sinh học lây nhiễm</span>
                                    <span class="text-[9.5px] font-bold text-rose-700 uppercase">Cấm 100%</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white border border-amber-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                            <div class="flex items-center justify-between pb-1 border-b border-amber-100">
                                <h3 class="font-bold text-amber-900 text-xs sm:text-sm">Hàng Gửi Có Điều Kiện</h3>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">Cần Khai Báo</span>
                            </div>
                            <p class="text-[11px] text-slate-500">Chỉ tiếp nhận khi người gửi đáp ứng đầy đủ hồ sơ pháp lý:</p>
                            <div class="space-y-1.5 text-[11.5px] text-slate-700">
                                <div class="p-2 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                                    <span class="font-semibold">Pin sạc dự phòng, thiết bị chứa Pin Lithium</span>
                                    <span class="text-[9.5px] font-bold text-amber-700 uppercase">Đi đường bộ</span>
                                </div>
                                <div class="p-2 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                                    <span class="font-semibold">Thực phẩm khô (khô bò, hải sản, trà, cà phê)</span>
                                    <span class="text-[9.5px] font-bold text-amber-700 uppercase">Hút chân không</span>
                                </div>
                                <div class="p-2 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                                    <span class="font-semibold">Thuốc chữa bệnh, thực phẩm chức năng</span>
                                    <span class="text-[9.5px] font-bold text-amber-700 uppercase">Có đơn thuốc</span>
                                </div>
                                <div class="p-2 bg-amber-50/60 rounded-lg border border-amber-100 flex items-center justify-between">
                                    <span class="font-semibold">Chất bột trắng, hóa chất thử nghiệm</span>
                                    <span class="text-[9.5px] font-bold text-amber-700 uppercase">Kèm phiếu MSDS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentSubTab === 'iata'" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                        <div class="md:col-span-6 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                            <h3 class="font-bold text-slate-800 text-xs sm:text-sm">Quy Định Giới Hạn Kiện Hàng</h3>
                            <div class="space-y-2.5 text-[11.5px] text-slate-600">
                                <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                                    <div class="font-bold text-slate-800 text-xs">Kiện Hàng Bưu Phẩm Chuẩn:</div>
                                    <p class="text-[11px] text-slate-500">• Khối lượng tối đa: <strong>30 kg/kiện</strong></p>
                                    <p class="text-[11px] text-slate-500">• Chiều dài tối đa 1 cạnh: <strong>1.5 mét</strong></p>
                                    <p class="text-[11px] text-slate-500">• Chu vi tổng: Dài + 2(Rộng + Cao) &le; <strong>3.0 mét</strong></p>
                                </div>

                                <div class="p-2.5 bg-blue-50/60 rounded-lg border border-blue-100 space-y-1">
                                    <div class="font-bold text-blue-800 text-xs">Hàng Hóa Cồng Kềnh Ngoại Cỡ:</div>
                                    <p class="text-[11px] text-slate-500">• Kiện hàng vượt quá kích thước chuẩn sẽ áp dụng bảng cước tải trọng riêng hoặc luân chuyển bằng xe tải nguyên chuyến.</p>
                                </div>
                            </div>
                        </div>

                        <div class="md:col-span-6 bg-white border border-blue-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-2.5">
                            <div class="flex items-center justify-between">
                                <h3 class="font-bold text-blue-900 text-xs sm:text-sm">Công Cụ Tính Nhanh Thể Tích IATA</h3>
                                <span class="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold">D×R×C / 5000</span>
                            </div>
                            <p class="text-[11px] text-slate-500">Quy đổi thể tích sang số Kilogram tính cước theo chuẩn hiệp hội hàng không IATA:</p>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[10.5px] font-bold text-slate-600 mb-0.5">Dài (cm)</label>
                                    <input 
                                        v-model.number="calcLength" 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        class="w-full text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-bold text-slate-600 mb-0.5">Rộng (cm)</label>
                                    <input 
                                        v-model.number="calcWidth" 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        class="w-full text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label class="block text-[10.5px] font-bold text-slate-600 mb-0.5">Cao (cm)</label>
                                    <input 
                                        v-model.number="calcHeight" 
                                        type="number" 
                                        min="1" 
                                        max="500"
                                        class="w-full text-center text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 focus:bg-white focus:border-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div class="p-2.5 bg-blue-50 rounded-lg border border-blue-200 flex items-center justify-between text-xs">
                                <div>
                                    <span class="text-slate-500 text-[10.5px]">Trọng lượng thể tích quy đổi:</span>
                                    <div class="font-bold text-blue-700 text-sm mt-0.5 font-mono">{{ iataGram.toLocaleString('vi-VN') }} g ({{ iataKg }} kg)</div>
                                </div>
                                <span class="text-[10px] text-blue-600 font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
                                    Tính theo cước lớn hơn
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="currentSubTab === 'policy'" class="space-y-3.5">
                    <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table class="w-full text-xs text-left">
                            <thead>
                                <tr class="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                                    <th class="py-2.5 px-3.5 sm:px-4 w-1/3">Trường Hợp Bưu Phẩm</th>
                                    <th class="py-2.5 px-3.5 w-1/3 text-emerald-700 font-bold">Có Khai Giá / Mua Bảo Hiểm</th>
                                    <th class="py-2.5 px-3.5 w-1/3 text-slate-600 font-bold">Không Mua Bảo Hiểm</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 text-slate-600 text-[11.5px]">
                                <tr class="hover:bg-slate-50/60">
                                    <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Thất lạc hoặc mất mát toàn phần</td>
                                    <td class="py-2.5 px-3.5 font-bold text-emerald-600">Bồi thường 100% giá trị khai báo</td>
                                    <td class="py-2.5 px-3.5">Tối đa 4 lần cước dịch vụ phát sinh</td>
                                </tr>
                                <tr class="hover:bg-slate-50/60">
                                    <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Hư hỏng / Vỡ một phần</td>
                                    <td class="py-2.5 px-3.5 font-bold text-emerald-600">Bồi thường theo tỷ lệ giám định %</td>
                                    <td class="py-2.5 px-3.5">Tối đa 2 lần cước dịch vụ phát sinh</td>
                                </tr>
                                <tr class="hover:bg-slate-50/60">
                                    <td class="py-2.5 px-3.5 sm:px-4 font-semibold text-slate-800">Giao chậm quá thời gian cam kết</td>
                                    <td class="py-2.5 px-3.5 text-blue-700 font-semibold">Hoàn 100% cước dịch vụ hỏa tốc</td>
                                    <td class="py-2.5 px-3.5">Hoàn cước theo quy định bưu chính</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span class="text-xs font-bold text-blue-700">Bước 1: Giữ Hiện Trạng</span>
                            <p class="text-[11px] text-slate-500">Giữ nguyên bao bì, tem nhãn vận đơn và thùng hàng bị hỏng.</p>
                        </div>
                        <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span class="text-xs font-bold text-blue-700">Bước 2: Chụp Ảnh / Quay Video</span>
                            <p class="text-[11px] text-slate-500">Ghi lại bằng chứng khui kiện có mặt bưu tá giao hàng.</p>
                        </div>
                        <div class="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                            <span class="text-xs font-bold text-blue-700">Bước 3: Gửi Khiếu Nại Trong 24h</span>
                            <p class="text-[11px] text-slate-500">Liên hệ tổng đài 1900 54 54 81 để được hỗ trợ bồi hoàn.</p>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm gap-3">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            VNPT
                        </div>
                        <div>
                            <h4 class="font-bold text-xs text-slate-800">Bạn Cần Dự Toán Cước Phí Hoặc Tìm Bưu Cục?</h4>
                            <p class="text-[11.5px] text-slate-500">Tính giá tự động theo trọng lượng hoặc tra cứu điểm gửi bưu gửi gần bạn nhất.</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button 
                            type="button" 
                            @click="goToCalculator"
                            class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                        >
                            Ước Tính Cước Phí
                        </button>
                        <button 
                            type="button" 
                            @click="goToNetwork"
                            class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer border border-slate-200"
                        >
                            Tra Cứu Mạng Lưới
                        </button>
                    </div>
                </div>
            </div>
        `
    };

    window.GuideView = GuideView;
})();
