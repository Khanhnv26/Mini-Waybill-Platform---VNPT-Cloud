(function () {
    const { computed } = Vue;

    const template = `
    <footer class="bg-slate-900 text-slate-300 text-xs border-t border-slate-800 pt-10 pb-8 px-4 sm:px-8 mt-auto flex-shrink-0">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div class="space-y-3.5">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-xl vnpt-blue-gradient text-white flex items-center justify-center p-2 shadow-sm border border-white/20 flex-shrink-0 overflow-hidden">
                        <svg class="w-full h-full text-white" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="10" stroke="white" stroke-width="2.2" stroke-dasharray="2 1.5"/>
                            <ellipse cx="16" cy="16" rx="14" ry="5" stroke="white" stroke-width="2" transform="rotate(-30 16 16)"/>
                            <circle cx="16" cy="16" r="3.5" fill="white"/>
                        </svg>
                    </div>
                    <span class="font-black text-white text-base tracking-tight whitespace-nowrap">Waybill Post</span>
                </div>
                <p class="text-slate-400 text-[11.5px] leading-relaxed">
                    Hệ thống điều phối vận đơn bưu chính số quốc gia, tối ưu luân chuyển toàn trình.
                </p>

                <div v-if="!isDesktopApp" class="pt-0.5">
                    <button 
                        type="button" 
                        @click="handleOpenDownload" 
                        class="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-800/95 to-slate-850/95 hover:from-slate-800 hover:to-slate-750 p-2.5 sm:p-3 border border-slate-700/80 hover:border-blue-500/60 shadow-lg hover:shadow-blue-500/10 transition-all duration-200 text-left cursor-pointer"
                    >
                        <div class="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="relative flex items-center justify-between">
                            <div class="flex items-center space-x-2.5">
                                <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 border border-blue-400/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                    <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.799"/>
                                    </svg>
                                </div>
                                <div>
                                    <div class="flex items-center space-x-1.5">
                                        <span class="text-[9px] uppercase tracking-wider font-bold text-slate-400 group-hover:text-blue-300 transition-colors">ỨNG DỤNG WINDOWS</span>
                                        <span class="inline-flex items-center px-1 py-0.2 rounded text-[8.5px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse"></span>
                                            v3.2.2
                                        </span>
                                    </div>
                                    <div class="text-xs font-bold text-white group-hover:text-blue-200 transition-colors">
                                        Tải Waybill Desktop
                                    </div>
                                </div>
                            </div>
                            <div class="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/5 group-hover:bg-blue-600 border border-white/10 group-hover:border-blue-400 flex items-center justify-center text-slate-300 group-hover:text-white transition-all transform group-hover:translate-y-0.5 flex-shrink-0">
                                <svg class="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                            </div>
                        </div>
                        <div class="mt-1.5 pt-1.5 border-t border-slate-750/80 flex items-center justify-between text-[9.5px] text-slate-400">
                            <span>Hỗ trợ Windows 10, 11 (64-bit)</span>
                            <span class="text-sky-400 font-medium group-hover:underline flex items-center space-x-0.5">
                                <span>Chi tiết</span>
                                <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                                </svg>
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            <div class="space-y-2.5">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Dịch Vụ Nổi Bật</h4>
                <ul class="space-y-2 text-[11.5px] text-slate-400">
                    <li @click="$emit('switch-tab', 'tracking')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Tra cứu bưu gửi toàn trình</li>
                    <li @click="$emit('switch-tab', 'calculator')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Ước tính cước phí toàn quốc</li>
                    <li @click="$emit('switch-tab', 'network')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Mạng lưới bưu cục gửi hàng</li>
                    <li @click="$emit('switch-tab', 'calculator')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Bảng giá cước chuyển phát EMS</li>
                </ul>
            </div>

            <div class="space-y-2.5">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Hỗ Trợ Khách Hàng</h4>
                <ul class="space-y-2 text-[11.5px] text-slate-400">
                    <li @click="$emit('switch-tab', 'guide')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Quy cách đóng gói hàng hóa</li>
                    <li @click="$emit('switch-tab', 'guide')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Danh mục bưu phẩm cấm gửi</li>
                    <li @click="$emit('switch-tab', 'guide')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Chính sách bồi thường thiệt hại</li>
                    <li @click="$emit('switch-tab', 'support')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Gửi phản ánh &amp; CSKH 24/7</li>
                </ul>
            </div>

            <div class="space-y-2.5">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Tổng Đài Bưu Chính</h4>
                <a href="tel:1900545481" class="text-white font-bold text-base text-cyan-300 hover:underline block whitespace-nowrap">1900 54 54 81</a>
                <p class="text-slate-400 text-[11px] whitespace-nowrap">Email: cskh@waybill.vn</p>
                <p class="text-slate-400 text-[11px]">Tòa nhà Waybill, 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội</p>
                <div class="flex items-center space-x-1.5 text-[10.5px] text-emerald-400 font-medium pt-0.5">
                    <svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <span>Bảo mật dữ liệu TLS 256-bit</span>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
            <span>© 2026 WAYBILL PLATFORM - TẤT CẢ QUYỀN ĐƯỢC BẢO LƯU</span>
            <span class="mt-2 sm:mt-0 font-mono">Cổng Dịch Vụ Khách Hàng Công Khai v2.6.0</span>
        </div>
    </footer>
    `;

    const PublicFooter = {
        name: 'PublicFooter',
        template,
        emits: ['switch-tab', 'open-desktop-download'],
        setup(props, { emit }) {
            const isDesktopApp = computed(() => Boolean(window.isTauri || window.__TAURI__));

            const handleOpenDownload = () => {
                emit('open-desktop-download');
                window.dispatchEvent(new CustomEvent('open-desktop-download'));
            };

            return {
                isDesktopApp,
                handleOpenDownload
            };
        }
    };

    window.PublicFooter = PublicFooter;
})();
