/**
 * VNPT CLOUD - INTERNAL FOOTER COMPONENT
 * Footer bản quyền cho khu vực nội bộ Enterprise.
 * Angular-Ready Standalone Component.
 */
(function () {
    const template = `
    <footer class="bg-white border-t border-slate-200 py-3 px-6 text-center text-xs text-slate-400 flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© 2026 TỔNG CÔNG TY DỊCH VỤ VIỄN THÔNG VNPT - HỆ THỐNG ĐIỀU PHỐI VẬN ĐƠN BƯU CHÍNH</span>
        <span class="font-mono text-[10px] text-slate-400">VERSION 2.6.0-ENTERPRISE-SIDEBAR</span>
    </footer>
    `;

    const InternalFooter = {
        name: 'InternalFooter',
        template
    };

    window.InternalFooter = InternalFooter;
})();
