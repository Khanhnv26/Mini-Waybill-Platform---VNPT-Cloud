/**
 * VNPT CLOUD - PUBLIC FOOTER COMPONENT
 * Footer thông tin dịch vụ, hỗ trợ khách hàng và pháp lý bưu chính quốc gia.
 * Angular-Ready Standalone Component.
 */
(function () {
    const template = `
    <footer class="bg-slate-900 text-slate-300 text-xs border-t border-slate-800 pt-10 pb-8 px-4 sm:px-8 mt-auto flex-shrink-0">
        <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div class="space-y-3">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-xl vnpt-blue-gradient text-white flex items-center justify-center p-2 shadow-sm border border-white/20 flex-shrink-0 overflow-hidden">
                        <svg class="w-full h-full text-white" viewBox="0 0 32 32" fill="none" stroke="currentColor">
                            <circle cx="16" cy="16" r="10" stroke-width="2.2" stroke="white" stroke-dasharray="2 1.5"/>
                            <ellipse cx="16" cy="16" rx="14" ry="5" stroke-width="2" stroke="white" transform="rotate(-30 16 16)"/>
                            <circle cx="16" cy="16" r="3.5" fill="white"/>
                        </svg>
                    </div>
                    <span class="font-black text-white text-base tracking-tight whitespace-nowrap">Waybill Post</span>
                </div>
                <p class="text-slate-400 text-[11.5px] leading-relaxed">
                    Hệ thống quản trị và điều phối vận đơn bưu chính số quốc gia, tối ưu vận chuyển chặng đầu, liên tỉnh và chặng cuối.
                </p>
            </div>

            <div class="space-y-2">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Dịch Vụ Nổi Bật</h4>
                <ul class="space-y-1.5 text-[11.5px] text-slate-400">
                    <li @click="$emit('switch-tab', 'tracking')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Tra cứu bưu gửi toàn trình</li>
                    <li @click="$emit('switch-tab', 'calculator')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Ước tính cước phí toàn quốc</li>
                    <li @click="$emit('switch-tab', 'network')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Mạng lưới bưu cục gửi hàng</li>
                </ul>
            </div>

            <div class="space-y-2">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Hỗ Trợ Khách Hàng</h4>
                <ul class="space-y-1.5 text-[11.5px] text-slate-400">
                    <li @click="$emit('switch-tab', 'guide')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Quy cách đóng gói hàng hóa</li>
                    <li @click="$emit('switch-tab', 'guide')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Danh mục hàng cấm gửi</li>
                    <li @click="$emit('switch-tab', 'support')" class="hover:text-white transition-colors cursor-pointer whitespace-nowrap">Gửi phản ánh &amp; CSKH</li>
                </ul>
            </div>

            <div class="space-y-2">
                <h4 class="text-white font-bold text-xs uppercase tracking-wider whitespace-nowrap">Tổng Đài Bưu Chính</h4>
                <a href="tel:1900545481" class="text-white font-bold text-base text-cyan-300 hover:underline block whitespace-nowrap">1900 54 54 81</a>
                <p class="text-slate-400 text-[11px] whitespace-nowrap">Email: cskh@vnpt-post.vn</p>
                <p class="text-slate-400 text-[11px]">Tòa nhà VNPT, 57 Huỳnh Thúc Kháng, Đống Đa, Hà Nội</p>
            </div>
        </div>
        <div class="max-w-7xl mx-auto pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500">
            <span>© 2026 TỔNG CÔNG TY DỊCH VỤ VIỄN THÔNG VNPT - TẤT CẢ QUYỀN ĐƯỢC BẢO LƯU</span>
            <span class="mt-2 sm:mt-0 font-mono">Cổng Dịch Vụ Khách Hàng Công Khai v2.6.0</span>
        </div>
    </footer>
    `;

    const PublicFooter = {
        name: 'PublicFooter',
        template,
        emits: ['switch-tab']
    };

    window.PublicFooter = PublicFooter;
})();
