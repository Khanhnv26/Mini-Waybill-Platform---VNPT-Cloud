(function () {
    const template = `
    <Transition name="modal">
        <div 
            v-if="show" 
            class="fixed inset-0 bg-slate-900/65 dark:bg-slate-950/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            @click.self="status === 'prompt' ? $emit('close') : null"
        >
            <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-all transform animate-fade-slide">
                
                <!-- Header Banner -->
                <div class="relative vnpt-gradient p-5 text-white overflow-hidden flex-shrink-0">
                    <button 
                        v-if="status === 'prompt' || status === 'error'"
                        type="button"
                        @click="$emit('close')" 
                        title="Để sau" 
                        class="absolute top-4 right-4 text-white/75 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition cursor-pointer"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>

                    <div class="flex items-center space-x-3.5">
                        <div class="w-12 h-12 rounded-xl bg-white/15 dark:bg-white/10 backdrop-blur-md flex items-center justify-center flex-shrink-0 shadow-inner">
                            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </div>
                        <div>
                            <div class="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm mb-1">
                                <svg class="w-3.5 h-3.5 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span>PHIÊN BẢN MỚI</span>
                            </div>
                            <h3 class="text-base font-bold text-white leading-tight">Đã có bản cập nhật v{{ newVersion }}</h3>
                            <p class="text-xs text-blue-100">Waybill Platform Desktop</p>
                        </div>
                    </div>
                </div>

                <!-- STATE: PROMPT (User can review and choose to update) -->
                <div v-if="status === 'prompt'" class="p-5 space-y-4">
                    <!-- Version comparison bar -->
                    <div class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-xs">
                        <div>
                            <span class="text-slate-500 dark:text-slate-400 block font-medium">Bản hiện tại:</span>
                            <span class="font-semibold text-slate-800 dark:text-slate-200">v{{ currentVersion || '1.0.0' }}</span>
                        </div>
                        <div class="flex items-center text-slate-400 dark:text-slate-500">
                            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                            </svg>
                        </div>
                        <div class="text-right">
                            <span class="text-emerald-600 dark:text-emerald-400 font-medium block">Bản mới nhất:</span>
                            <span class="font-bold text-emerald-600 dark:text-emerald-400 text-sm">v{{ newVersion }}</span>
                        </div>
                    </div>

                    <!-- Changelog Section (Dynamic from GitHub release notes) -->
                    <div>
                        <h4 class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                            Điểm mới trong bản này:
                        </h4>
                        <ul class="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto pr-1">
                            <li v-for="(item, idx) in formattedChangelog" :key="idx" class="flex items-start space-x-2.5">
                                <div 
                                    class="w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5"
                                    :class="getIconBadgeClass(item)"
                                >
                                    <!-- Lightning Icon (Speed / Performance) -->
                                    <svg v-if="getIconType(item) === 'bolt'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <!-- Package Icon (Shipment / Operations) -->
                                    <svg v-else-if="getIconType(item) === 'package'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                    <!-- Shield Icon (Security / Fix) -->
                                    <svg v-else-if="getIconType(item) === 'shield'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    <!-- Sparkle / Default Check Icon -->
                                    <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span class="leading-relaxed">{{ item }}</span>
                            </li>
                        </ul>
                    </div>

                    <!-- Action Buttons -->
                    <div class="pt-2 flex items-center justify-end space-x-2.5">
                        <button 
                            type="button" 
                            @click="$emit('close')"
                            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1.5 cursor-pointer"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Nhắc tôi sau</span>
                        </button>
                        
                        <button 
                            type="button" 
                            @click="$emit('start-update')"
                            class="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/20 transition flex items-center space-x-2 cursor-pointer"
                        >
                            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            <span>Cập nhật ngay</span>
                        </button>
                    </div>
                </div>

                <!-- STATE: DOWNLOADING OR INSTALLING -->
                <div v-else-if="status === 'downloading' || status === 'installing'" class="p-6 space-y-4">
                    <div class="text-center space-y-1.5 py-1">
                        <div class="inline-block p-3 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mb-1">
                            <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        </div>
                        <h4 class="text-sm font-bold text-slate-900 dark:text-white">
                            {{ status === 'installing' ? 'Đang cài đặt gói cập nhật...' : 'Đang tải bản cập nhật mới...' }}
                        </h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400">
                            Quá trình diễn ra tự động và an toàn trong giây lát.
                        </p>
                    </div>

                    <!-- Progress Bar -->
                    <div class="space-y-1.5">
                        <div class="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <span>{{ percent > 0 ? percent + '%' : 'Đang kết nối máy chủ...' }}</span>
                            <span v-if="totalMB" class="text-slate-500 dark:text-slate-400 font-normal">
                                {{ downloadedMB || '0' }} MB / {{ totalMB }} MB
                            </span>
                        </div>
                        <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                            <div 
                                class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-150 ease-out" 
                                :style="{ width: (percent || 10) + '%' }"
                            ></div>
                        </div>
                    </div>
                </div>

                <!-- STATE: DONE (Waiting for relaunch) -->
                <div v-else-if="status === 'done'" class="p-6 space-y-4 text-center">
                    <div class="w-12 h-12 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-900 dark:text-white">Cập nhật thành công!</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Ứng dụng sẽ tự động khởi động lại ngay bây giờ...
                        </p>
                    </div>
                </div>

                <!-- STATE: ERROR -->
                <div v-else-if="status === 'error'" class="p-6 space-y-4 text-center">
                    <div class="w-12 h-12 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h4 class="text-sm font-bold text-slate-900 dark:text-white">Không thể tải bản cập nhật</h4>
                        <p class="text-xs text-rose-600 dark:text-rose-400 mt-1 leading-relaxed">
                            {{ errorMessage || 'Đã có lỗi xảy ra trong quá trình tải gói cập nhật. Vui lòng kiểm tra lại kết nối mạng.' }}
                        </p>
                    </div>
                    <div class="flex items-center justify-center space-x-2 pt-2">
                        <button 
                            type="button" 
                            @click="$emit('close')"
                            class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                        <button 
                            type="button" 
                            @click="$emit('start-update')"
                            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition cursor-pointer"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </Transition>
    `;

    const AppUpdateModal = {
        name: 'AppUpdateModal',
        template,
        props: {
            show: {
                type: Boolean,
                default: false
            },
            newVersion: {
                type: String,
                default: ''
            },
            currentVersion: {
                type: String,
                default: ''
            },
            changelog: {
                type: Array,
                default: () => []
            },
            status: {
                type: String,
                default: 'prompt' // 'prompt' | 'downloading' | 'installing' | 'done' | 'error'
            },
            percent: {
                type: Number,
                default: 0
            },
            downloadedMB: {
                type: String,
                default: '0'
            },
            totalMB: {
                type: String,
                default: ''
            },
            errorMessage: {
                type: String,
                default: ''
            }
        },
        emits: ['start-update', 'close'],
        computed: {
            formattedChangelog() {
                if (this.changelog && this.changelog.length > 0) {
                    return this.changelog;
                }
                return [
                    'Tối ưu hóa hiệu năng và tốc độ xử lý trên nền tảng Desktop.',
                    'Tự động đồng bộ và cảnh báo dữ liệu vận hành bưu chính.',
                    'Nâng cao tính ổn định và các bản vá bảo mật hệ thống.'
                ];
            }
        },
        methods: {
            getIconType(text) {
                if (!text || typeof text !== 'string') return 'check';
                const lower = text.toLowerCase();
                if (lower.includes('tốc độ') || lower.includes('hiệu năng') || lower.includes('speed') || lower.includes('nhanh') || lower.includes('tối ưu')) {
                    return 'bolt';
                }
                if (lower.includes('bảo mật') || lower.includes('security') || lower.includes('auth') || lower.includes('fix') || lower.includes('sửa') || lower.includes('vá')) {
                    return 'shield';
                }
                if (lower.includes('đơn') || lower.includes('bưu cục') || lower.includes('giao') || lower.includes('vận chuyển') || lower.includes('hub') || lower.includes('hành trình')) {
                    return 'package';
                }
                return 'sparkle';
            },
            getIconBadgeClass(text) {
                const type = this.getIconType(text);
                if (type === 'bolt') {
                    return 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400';
                }
                if (type === 'shield') {
                    return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400';
                }
                if (type === 'package') {
                    return 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/80 text-blue-600 dark:text-blue-400';
                }
                return 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400';
            }
        }
    };

    window.AppUpdateModal = AppUpdateModal;
})();
