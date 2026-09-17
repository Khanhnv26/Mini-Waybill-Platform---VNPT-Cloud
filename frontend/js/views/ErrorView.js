/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - VIEW: THÔNG BÁO LỖI HỆ THỐNG (ERROR VIEW)
 * Tích hợp trực tiếp vào Master Layout của ứng dụng Vue SPA (index.html)
 * Hiển thị Card thông báo lỗi nguyên bản: Icon SVG lớn, Badge, Countdown & Hotline
 * ==============================================================================
 */

(function () {
    const { ref, computed, onMounted, onUnmounted } = Vue;

    const errorConfigs = {
        404: {
            badgeText: 'MÃ LỖI 404 • KHÔNG TÌM THẤY',
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            glowClass: 'bg-blue-400',
            iconBoxClass: 'bg-blue-50 border-blue-200 text-blue-600',
            title: 'Không Tìm Thấy Trang Yêu Cầu',
            desc: 'Đường dẫn hoặc tài nguyên bưu gửi bạn đang tìm kiếm không tồn tại trên hệ thống máy chủ, đã bị di dời hoặc liên kết chưa chính xác.',
            iconType: '404',
            actions: [
                { text: 'Về Trang Chủ', action: 'home', primary: true },
                { text: 'Tra Cứu Bưu Gửi', action: 'tracking', primary: false }
            ],
            hasCountdown: false
        },
        403: {
            badgeText: 'MÃ LỖI 403 • TRUY CẬP BỊ TỪ CHỐI',
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
            glowClass: 'bg-rose-400',
            iconBoxClass: 'bg-rose-50 border-rose-200 text-rose-600',
            title: 'Quyền Truy Cập Bị Chặn (RBAC)',
            desc: 'Tài khoản của bạn chưa được cấp thẩm quyền phân quyền (RBAC) để thao tác chức năng này, hoặc phiên đăng nhập của bạn đã hết hạn hiệu lực.',
            iconType: '403',
            actions: [
                { text: 'Đăng Nhập Lại', action: 'login', primary: true },
                { text: 'Về Trang Chủ', action: 'home', primary: false }
            ],
            hasCountdown: false
        },
        503: {
            badgeText: 'MÃ LỖI 503 • DỊCH VỤ TẠM THỜI GIÁN ĐOẠN',
            badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
            glowClass: 'bg-amber-400',
            iconBoxClass: 'bg-amber-50 border-amber-200 text-amber-600',
            title: 'Cụm Dịch Vụ Đang Tạm Ngưng',
            desc: 'Hạ tầng API Gateway hoặc các cụm microservices đang trong quá trình bảo trì định kỳ, khởi động lại hoặc tạm thời quá tải kết nối.',
            iconType: '503',
            actions: [
                { text: 'Thử Lại Kết Nối Ngay', action: 'retry', primary: true },
                { text: 'Về Trang Chủ', action: 'home', primary: false }
            ],
            hasCountdown: true
        },
        502: {
            badgeText: 'MÃ LỖI 502 • BAD GATEWAY',
            badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
            glowClass: 'bg-orange-400',
            iconBoxClass: 'bg-orange-50 border-orange-200 text-orange-600',
            title: 'Mất Kết Nối Cổng Dịch Vụ (Gateway)',
            desc: 'Nginx Load Balancer không nhận được phản hồi từ các cụm API Gateway (Port 8080/8088). Vui lòng kiểm tra tiến trình máy chủ.',
            iconType: '502',
            actions: [
                { text: 'Thử Lại Kết Nối', action: 'retry', primary: true },
                { text: 'Về Trang Chủ', action: 'home', primary: false }
            ],
            hasCountdown: true
        },
        429: {
            badgeText: 'MÃ LỖI 429 • QUÁ NHIỀU YÊU CẦU',
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
            glowClass: 'bg-purple-400',
            iconBoxClass: 'bg-purple-50 border-purple-200 text-purple-600',
            title: 'Thao Tác Quá Nhanh (Rate Limit)',
            desc: 'Hệ thống bảo vệ phân tán (Redis Rate Limiter) đã tạm hoãn các yêu cầu từ địa chỉ IP của bạn nhằm đảm bảo an toàn tải.',
            iconType: '429',
            actions: [
                { text: 'Chờ Hết Giới Hạn', action: 'retry', primary: true },
                { text: 'Về Trang Chủ', action: 'home', primary: false }
            ],
            hasCountdown: true
        }
    };

    const ErrorView = {
        name: 'ErrorView',
        props: {
            errorCode: {
                type: Number,
                default: 404
            },
            customTitle: {
                type: String,
                default: ''
            },
            customMessage: {
                type: String,
                default: ''
            }
        },
        emits: ['back-home', 'switch-tab'],
        setup(props, { emit }) {
            const countdownSeconds = ref(0);
            const initialTotalSeconds = ref(10);
            let countdownTimer = null;
            const isRetrying = ref(false);

            const activeConfig = computed(() => {
                return errorConfigs[props.errorCode] || errorConfigs[404];
            });

            const progressPercentage = computed(() => {
                if (initialTotalSeconds.value <= 0) return 0;
                return Math.max(0, Math.min(100, (countdownSeconds.value / initialTotalSeconds.value) * 100));
            });

            const startCountdown = (seconds = 10) => {
                initialTotalSeconds.value = seconds;
                countdownSeconds.value = seconds;
                clearInterval(countdownTimer);
                countdownTimer = setInterval(() => {
                    countdownSeconds.value--;
                    if (countdownSeconds.value <= 0) {
                        clearInterval(countdownTimer);
                        handleAction('retry');
                    }
                }, 1000);
            };

            const cancelCountdown = () => {
                clearInterval(countdownTimer);
                countdownSeconds.value = 0;
            };

            const handleAction = (actionKey) => {
                if (actionKey === 'home' || actionKey === 'tracking') {
                    cancelCountdown();
                    const path = window.location.pathname.toLowerCase();
                    const isKnownHome = path === '/' || path === '' || path.endsWith('/index.html');
                    if (!isKnownHome) {
                        window.location.href = 'index.html';
                    } else {
                        emit('back-home');
                    }
                } else if (actionKey === 'login') {
                    cancelCountdown();
                    window.location.href = 'login.html';
                } else if (actionKey === 'retry') {
                    isRetrying.value = true;
                    setTimeout(() => {
                        isRetrying.value = false;
                        const from = new URLSearchParams(window.location.search).get('from');
                        if (from) {
                            window.location.href = decodeURIComponent(from);
                        } else {
                            window.location.reload();
                        }
                    }, 800);
                }
            };

            onMounted(() => {
                if (activeConfig.value.hasCountdown) {
                    const urlRetry = parseInt(new URLSearchParams(window.location.search).get('retryAfter'), 10);
                    const waitSecs = !isNaN(urlRetry) && urlRetry > 0 ? urlRetry : 10;
                    startCountdown(waitSecs);
                }
            });

            onUnmounted(() => {
                clearInterval(countdownTimer);
            });

            return {
                activeConfig,
                countdownSeconds,
                initialTotalSeconds,
                progressPercentage,
                cancelCountdown,
                handleAction,
                isRetrying
            };
        },
        template: `
            <div class="min-h-[520px] flex items-center justify-center p-4 sm:p-6">
                <!-- THẺ THÔNG BÁO LỖI NGUYÊN BẢN Ở CHÍNH GIỮA MÀN HÌNH -->
                <div class="max-w-xl w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/60 p-8 sm:p-10 text-center relative overflow-hidden">
                    
                    <!-- Hào quang mờ nền dịu mắt nhấp nháy êm ái -->
                    <div :class="['error-aura-pulse absolute top-1/4 left-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-all duration-500', activeConfig.glowClass]"></div>

                    <!-- Icon Minh Họa SVG Động Nổi Bật -->
                    <div class="relative mb-6 error-icon-float flex justify-center">
                        <div :class="['w-24 h-24 rounded-3xl border-2 flex items-center justify-center relative shadow-inner select-none', activeConfig.iconBoxClass]">
                            
                            <!-- 404 Icon: Kính lúp di chuyển quét & hạt tín hiệu -->
                            <template v-if="activeConfig.iconType === '404'">
                                <svg class="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path class="text-blue-200/70" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4 7l8-4 8 4v10l-8 4-8-4V7z"></path>
                                    <g class="anim-404-glass">
                                        <circle cx="11" cy="11" r="5.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></circle>
                                        <line x1="15" y1="15" x2="20" y2="20" stroke-width="2.2" stroke-linecap="round"></line>
                                        <circle cx="11" cy="11" r="1.5" class="anim-404-dot fill-blue-600 stroke-none"></circle>
                                    </g>
                                </svg>
                                <div class="absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md shadow-blue-500/20">404</div>
                            </template>

                            <!-- 403 Icon: Ổ khóa rung cảnh báo an ninh -->
                            <template v-else-if="activeConfig.iconType === '403'">
                                <div class="anim-403-lock flex items-center justify-center">
                                    <svg class="w-12 h-12 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0v4"></path>
                                        <rect x="5" y="11" width="14" height="10" rx="3" stroke-width="2"></rect>
                                        <circle cx="12" cy="15.5" r="1.2" class="fill-rose-600"></circle>
                                        <path stroke-linecap="round" stroke-width="1.8" d="M12 16.7v2.3"></path>
                                    </svg>
                                </div>
                                <div class="absolute -top-2 -right-2 bg-rose-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md shadow-rose-500/20 anim-403-badge">KHÓA</div>
                            </template>

                            <!-- 503 Icon: Cụm bánh răng kép xoay nhịp nhàng -->
                            <template v-else-if="activeConfig.iconType === '503'">
                                <div class="relative w-12 h-12 flex items-center justify-center">
                                    <svg class="w-10 h-10 text-amber-600 anim-503-gear-main" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                                    </svg>
                                    <svg class="w-5 h-5 text-amber-500 absolute -top-1 -right-1 anim-503-gear-sub" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                                    </svg>
                                </div>
                                <div class="absolute -top-2 -right-2 bg-amber-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md shadow-amber-500/20">BẢO TRÌ</div>
                            </template>

                            <!-- 502 Icon: Tia sét phát xung điện -->
                            <template v-else-if="activeConfig.iconType === '502'">
                                <div class="anim-502-zap flex items-center justify-center">
                                    <svg class="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                                    </svg>
                                </div>
                                <div class="absolute -top-2 -right-2 bg-orange-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md shadow-orange-500/20">NGẮT</div>
                            </template>

                            <!-- 429 Icon: Đồng hồ xoay kim phút mượt mà -->
                            <template v-else-if="activeConfig.iconType === '429'">
                                <svg class="w-12 h-12 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="9" stroke-width="1.8"></circle>
                                    <line x1="12" y1="12" x2="12" y2="7" stroke-width="2" stroke-linecap="round"></line>
                                    <line x1="12" y1="12" x2="16.5" y2="12" stroke-width="2" stroke-linecap="round" class="anim-429-hand text-purple-700"></line>
                                    <circle cx="12" cy="12" r="1.5" class="fill-purple-600 stroke-none"></circle>
                                </svg>
                                <div class="absolute -top-2 -right-2 bg-purple-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md shadow-purple-500/20">GIỚI HẠN</div>
                            </template>
                        </div>
                    </div>

                    <!-- Badge Mã Lỗi Chính -->
                    <div :class="['inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase mb-3.5 border shadow-sm', activeConfig.badgeClass]">
                        {{ activeConfig.badgeText }}
                    </div>

                    <!-- Tiêu Đề Lỗi -->
                    <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-3">
                        {{ customTitle || activeConfig.title }}
                    </h1>

                    <!-- Mô Tả Thân Thiện -->
                    <p class="text-sm sm:text-base text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
                        {{ customMessage || activeConfig.desc }}
                    </p>

                    <!-- Hộp đếm ngược tự động thử lại kèm Thanh Tiến Trình Động (503, 502, 429) -->
                    <div v-if="activeConfig.hasCountdown && countdownSeconds > 0" class="mb-6 px-4 py-3 rounded-2xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs font-medium max-w-sm mx-auto shadow-sm">
                        <div class="flex items-center justify-between space-x-2 mb-2">
                            <div class="flex items-center space-x-2">
                                <svg class="w-4 h-4 animate-spin text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                </svg>
                                <span>Tự động kết nối lại sau <strong class="font-bold text-sm text-amber-950 font-mono">{{ countdownSeconds }}</strong>s</span>
                            </div>
                            <button @click="cancelCountdown" class="text-amber-700 hover:text-amber-950 underline font-semibold text-[11px] px-1 transition cursor-pointer">Hủy</button>
                        </div>
                        <!-- Thanh tiến trình đếm ngược động mượt mà -->
                        <div class="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden shadow-inner">
                            <div 
                                class="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-1000 ease-linear shadow-sm"
                                :style="{ width: progressPercentage + '%' }"
                            ></div>
                        </div>
                    </div>

                    <!-- CÁC NÚT THAO TÁC HÀNH ĐỘNG NGUYÊN BẢN -->
                    <div class="flex flex-wrap items-center justify-center gap-3 w-full max-w-md mx-auto">
                        <button 
                            v-for="(act, idx) in activeConfig.actions" 
                            :key="idx"
                            @click="handleAction(act.action)"
                            :class="[
                                'error-btn-interactive px-5 py-2.5 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer select-none',
                                act.primary 
                                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20' 
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                            ]"
                        >
                            <span>{{ act.text }}</span>
                        </button>
                    </div>

                    <!-- THÔNG TIN HỖ TRỢ KỸ THUẬT DOANH NGHIỆP -->
                    <div class="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                        <span class="flex items-center space-x-1.5">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                            </svg>
                            <span>Tổng đài hỗ trợ: <strong class="font-bold text-slate-700">1800 1260</strong></span>
                        </span>
                        <span class="text-slate-300">•</span>
                        <span class="flex items-center space-x-1.5">
                            <svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                            </svg>
                            <span>Email: <strong class="font-bold text-slate-700">hotro@vnpt.vn</strong></span>
                        </span>
                    </div>

                </div>
            </div>
        `
    };

    window.ErrorView = ErrorView;
})();
