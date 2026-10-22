(function () {
    const { ref, reactive, onMounted, onBeforeUnmount, watch } = Vue;

    const template = `
    <div 
        v-if="show"
        role="dialog"
        aria-modal="true"
        aria-labelledby="desktop-modal-title"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-200"
        @click.self="handleClose"
    >
        <div class="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all duration-200">
            <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500"></div>

            <div class="p-6 pb-4 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
                <div class="flex items-center space-x-3.5">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md p-2.5 flex-shrink-0">
                        <svg class="w-full h-full text-white" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="10" stroke="white" stroke-width="2.2" stroke-dasharray="2 1.5"/>
                            <ellipse cx="16" cy="16" rx="14" ry="5" stroke="white" stroke-width="2" transform="rotate(-30 16 16)"/>
                            <circle cx="16" cy="16" r="3.5" fill="white"/>
                        </svg>
                    </div>
                    <div>
                        <div class="flex items-center space-x-2">
                            <h3 id="desktop-modal-title" class="text-base font-bold text-slate-900 dark:text-white">Waybill Platform Desktop</h3>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                                {{ releaseInfo.version }} Mới nhất
                            </span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ứng dụng máy tính chuyên dụng cho cán bộ điều phối &amp; nhân viên bưu chính</p>
                    </div>
                </div>

                <button 
                    type="button"
                    @click="handleClose" 
                    aria-label="Đóng cửa sổ"
                    class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <div class="p-6 space-y-5">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                        <div class="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                        </div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Hiệu Năng Cao</div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">Động cơ Rust Tauri v2 cực nhẹ, chiếm &lt;40MB RAM.</div>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                        <div class="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                            </svg>
                        </div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-200">SSO Consent 1-Click</div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">Đăng nhập nhanh từ web, bảo mật Token riêng biệt.</div>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-750">
                        <div class="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                            </svg>
                        </div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Khay Hệ Thống</div>
                        <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">Chạy ngầm khay tác vụ, tự động cập nhật bản vá.</div>
                    </div>
                </div>

                <div class="space-y-2.5 pt-1">
                    <div class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Chọn bộ cài đặt phù hợp với thiết bị của bạn:
                    </div>

                    <a 
                        :href="releaseInfo.exeUrl" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="w-full group relative flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transition-all duration-200 cursor-pointer"
                    >
                        <div class="flex items-center space-x-3.5">
                            <div class="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.799"/>
                                </svg>
                            </div>
                            <div class="text-left">
                                <div class="flex items-center space-x-2">
                                    <span class="text-sm font-bold tracking-tight">Tải Bộ Cài Đặt (.exe)</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-900 shadow-xs">
                                        KHUYẾN NGHỊ
                                    </span>
                                </div>
                                <div class="text-xs text-blue-100/80 mt-0.5">Tự động cài đặt &amp; tạo biểu tượng desktop • Dung lượng ~18 MB</div>
                            </div>
                        </div>

                        <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-blue-700 transition-colors flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        </div>
                    </a>

                    <a 
                        :href="releaseInfo.msiUrl" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        class="w-full group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 transition-all duration-200 cursor-pointer"
                    >
                        <div class="flex items-center space-x-3.5">
                            <div class="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 flex items-center justify-center flex-shrink-0 text-slate-600 dark:text-slate-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                </svg>
                            </div>
                            <div class="text-left">
                                <div class="text-sm font-bold text-slate-900 dark:text-white">Gói Cài Đặt Doanh Nghiệp (.msi)</div>
                                <div class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Dành cho Quản trị viên CNTT triển khai hàng loạt qua GPO • ~19 MB</div>
                            </div>
                        </div>

                        <div class="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white text-slate-600 dark:text-slate-300 transition-colors flex-shrink-0">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                        </div>
                    </a>
                </div>

                <div class="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start space-x-2.5 text-[11px] text-blue-900 dark:text-blue-200">
                    <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <div class="leading-relaxed">
                        <span class="font-bold">Điểm mới trên bản {{ releaseInfo.version }}:</span> Hỗ trợ quy trình SSO Consent bàn giao phiên mượt mà, nâng cấp bộ nhận diện Logo Địa cầu 3D, đồng bộ hiệu ứng chuyển động và hỗ trợ giao diện Ngày/Đêm.
                    </div>
                </div>
            </div>

            <div class="p-4 px-6 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
                <div class="flex items-center space-x-2">
                    <svg class="w-3.5 h-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <span>Chữ ký số SHA-256 an toàn • Minisign Verified</span>
                </div>
                <a 
                    :href="releaseInfo.releasesUrl" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="text-blue-600 dark:text-blue-400 hover:underline flex items-center space-x-1 font-medium"
                >
                    <span>Xem tất cả bản phát hành</span>
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                </a>
            </div>
        </div>
    </div>
    `;

    const DesktopDownloadModal = {
        name: 'DesktopDownloadModal',
        template,
        props: {
            show: {
                type: Boolean,
                default: false
            }
        },
        emits: ['close'],
        setup(props, { emit }) {
            const releaseInfo = reactive({
                version: 'v3.2.2',
                releaseDate: '22/10/2026',
                exeUrl: 'https://github.com/Khanhnv26/Mini-Waybill-Platform---VNPT-Cloud/releases/download/v3.2.2/WaybillPlatform_3.2.2_x64-setup.exe',
                msiUrl: 'https://github.com/Khanhnv26/Mini-Waybill-Platform---VNPT-Cloud/releases/download/v3.2.2/WaybillPlatform_3.2.2_x64_en-US.msi',
                releasesUrl: 'https://github.com/Khanhnv26/Mini-Waybill-Platform---VNPT-Cloud/releases'
            });

            const handleClose = () => {
                emit('close');
            };

            const onKeydown = (event) => {
                if (event.key === 'Escape' && props.show) {
                    handleClose();
                }
            };

            const fetchLatestRelease = async () => {
                try {
                    const response = await fetch('https://api.github.com/repos/Khanhnv26/Mini-Waybill-Platform---VNPT-Cloud/releases/latest');
                    if (!response.ok) return;
                    const data = await response.json();
                    if (data && data.tag_name) {
                        releaseInfo.version = data.tag_name;
                        if (data.html_url) releaseInfo.releasesUrl = data.html_url;
                        if (Array.isArray(data.assets)) {
                            const exeAsset = data.assets.find(a => a.name && a.name.endsWith('.exe') && !a.name.endsWith('.sig'));
                            if (exeAsset && exeAsset.browser_download_url) {
                                releaseInfo.exeUrl = exeAsset.browser_download_url;
                            }
                            const msiAsset = data.assets.find(a => a.name && a.name.endsWith('.msi') && !a.name.endsWith('.sig'));
                            if (msiAsset && msiAsset.browser_download_url) {
                                releaseInfo.msiUrl = msiAsset.browser_download_url;
                            }
                        }
                    }
                } catch (e) {}
            };

            onMounted(() => {
                window.addEventListener('keydown', onKeydown);
                fetchLatestRelease();
            });

            onBeforeUnmount(() => {
                window.removeEventListener('keydown', onKeydown);
            });

            watch(() => props.show, (newVal) => {
                if (newVal) {
                    fetchLatestRelease();
                }
            });

            return {
                releaseInfo,
                handleClose
            };
        }
    };

    window.DesktopDownloadModal = DesktopDownloadModal;
})();
