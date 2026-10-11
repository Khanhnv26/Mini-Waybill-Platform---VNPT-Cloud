(function () {
    const { ref, reactive, computed, onMounted, onUnmounted, nextTick } = Vue;

    const LoginView = {
        name: 'LoginView',
        props: {
            isDarkMode: {
                type: Boolean,
                default: false
            }
        },
        emits: ['login-success', 'navigate', 'toggle-dark-mode'],
        template: `
            <div class="min-h-screen flex items-center justify-center p-3 sm:p-6 auth-custom-bg text-slate-800 selection:bg-vnpt-500 selection:text-white font-sans relative">
                
                <!-- Floating Theme Toggle Capsule Switch -->
                <div class="fixed top-4 right-4 z-50">
                    <button 
                        type="button"
                        role="switch"
                        :aria-checked="isKnobDark"
                        draggable="false"
                        @dragstart.prevent
                        @pointerdown="onPointerDown"
                        @click="onClick"
                        @keydown="onKeyDown"
                        :title="isDarkMode ? 'Đang bật chế độ Đêm. Bấm hoặc gạt để chuyển sang chế độ Sáng' : 'Đang bật chế độ Sáng. Bấm hoặc gạt để chuyển sang chế độ Đêm'"
                        class="theme-toggle-btn relative inline-flex items-center w-[54px] h-7 rounded-full p-0.5 transition-colors duration-300 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-inner flex-shrink-0 group backdrop-blur-md touch-none"
                        :class="isKnobDark 
                            ? 'bg-slate-900/90 border border-slate-700/80 shadow-slate-950/50' 
                            : 'bg-slate-200/90 hover:bg-slate-300/80 border border-slate-300/80 shadow-blue-900/10'"
                    >
                        <!-- Track Ambient: Day Sky Dots / Night Twinkling Stars -->
                        <span class="absolute inset-0 flex items-center pointer-events-none select-none overflow-hidden rounded-full">
                            <!-- Night Twinkling Stars (Visible when Dark on left side) -->
                            <span 
                                class="absolute left-1.5 top-1.5 flex items-center space-x-1 transition-all duration-300"
                                :class="isKnobDark ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'"
                            >
                                <svg class="w-2 h-2 text-amber-300 animate-twinkle" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                                </svg>
                                <svg class="w-1.5 h-1.5 text-blue-200 animate-twinkle-delayed" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0L14.2 9.8L24 12L14.2 14.2L12 24L9.8 14.2L0 12L9.8 9.8L12 0Z"/>
                                </svg>
                            </span>

                            <!-- Day Warm Sky Dots (Visible when Light on right side) -->
                            <span 
                                class="absolute right-2 top-2 flex items-center space-x-1 transition-all duration-300"
                                :class="!isKnobDark ? 'opacity-80 scale-100' : 'opacity-0 scale-50 pointer-events-none'"
                            >
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-400/50"></span>
                                <span class="w-2 h-2 rounded-full bg-amber-400/80"></span>
                            </span>
                        </span>

                        <!-- Sliding Thumb / Knob with 3D Flip -->
                        <span 
                            class="theme-toggle-knob keep-white relative w-6 h-6 rounded-full flex items-center justify-center shadow-md pointer-events-none [perspective:400px]"
                            :class="[
                                isDragging ? 'is-dragging' : '',
                                isKnobDark 
                                    ? 'is-dark bg-gradient-to-tr from-blue-600 to-indigo-600 text-amber-300 border border-blue-400/40 shadow-blue-900/40' 
                                    : 'bg-white keep-white text-amber-500 border border-amber-100 shadow-amber-500/10'
                            ]"
                            :style="knobStyle"
                        >
                            <!-- 3D Card Flipper Container -->
                            <span 
                                class="theme-knob-flipper relative w-full h-full flex items-center justify-center"
                                :class="{ 'rotate-y-180': isKnobDark }"
                            >
                                <!-- Sun Face (Front) -->
                                <span class="absolute inset-0 flex items-center justify-center [backface-visibility:hidden]">
                                    <svg class="w-3.5 h-3.5 text-amber-500 transition-transform duration-300 group-hover:rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </span>
                                <!-- Moon Face (Back) -->
                                <span class="absolute inset-0 flex items-center justify-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                                    <svg class="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 group-hover:-rotate-12" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                                    </svg>
                                </span>
                            </span>
                        </span>
                    </button>
                </div>

                <!-- Background ambient lights -->
                <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
                    <div class="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600/25 blur-[120px] animate-float-1"></div>
                    <div class="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/20 blur-[120px] animate-float-2"></div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] rounded-full bg-indigo-600/10 blur-[140px]"></div>
                </div>

                <div class="relative z-10 max-w-5xl w-full bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-700/20 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] card-entrance">
                    
                    <!-- Left Column: Branding & Value Proposition -->
                    <div class="lg:col-span-5 vnpt-gradient text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden border-r border-blue-900/30">
                        <div class="absolute inset-0 opacity-10 pointer-events-none grid-pulse" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>
                        <div class="absolute -right-20 -top-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none"></div>

                        <div class="relative z-10 space-y-3 stagger-1">
                            <div class="flex items-center space-x-3">
                                <div class="h-10 px-3.5 rounded-xl bg-white text-vnpt-500 font-black flex items-center justify-center text-xs tracking-wider shadow-md">
                                    VNPT
                                </div>
                                <div>
                                    <div class="flex items-center space-x-1.5">
                                        <span class="font-extrabold text-base tracking-tight text-white">Waybill Platform</span>
                                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30 uppercase animate-pulse">B2B Cloud</span>
                                    </div>
                                    <p class="text-[11px] text-blue-100/80 font-medium">Hệ Thống Vận Hành & Quản Trị Vận Đơn Bưu Chính</p>
                                </div>
                            </div>
                        </div>

                        <div class="relative z-10 my-8 space-y-4 stagger-2">
                            <div>
                                <span class="text-[10px] uppercase tracking-widest font-mono font-semibold text-blue-200">Hệ sinh thái số toàn trình</span>
                                <h2 class="text-xl sm:text-2xl font-bold text-white mt-1 leading-snug">
                                    Mạng lưới vận hành &amp; điều phối vận đơn thông minh
                                </h2>
                                <p class="text-xs text-blue-100/80 mt-2 leading-relaxed">
                                    Kết nối trực thông toàn diện chuỗi cung ứng bưu chính, đảm bảo luân chuyển và kiểm soát chính xác từng bưu gửi.
                                </p>
                            </div>

                            <div class="grid grid-cols-2 gap-3 pt-2">
                                <div class="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 kpi-card-hover cursor-pointer">
                                    <div class="text-lg font-bold font-mono text-white">99.98%</div>
                                    <div class="text-[10px] text-blue-100/80 mt-0.5 font-medium">Chỉ tiêu đúng hạn (SLA)</div>
                                </div>
                                <div class="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 kpi-card-hover cursor-pointer">
                                    <div class="text-lg font-bold font-mono text-white">&lt; 50ms</div>
                                    <div class="text-[10px] text-blue-100/80 mt-0.5 font-medium">Xử lý định tuyến bưu gửi</div>
                                </div>
                            </div>
                        </div>

                        <div class="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-blue-100/70 stagger-3">
                            <span>TẬP ĐOÀN BƯU CHÍNH VIỄN THÔNG VIỆT NAM</span>
                            <span class="font-mono text-[10px]">VNPT 2026</span>
                        </div>
                    </div>

                    <!-- Right Column: Authentication Forms -->
                    <div class="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between bg-white">
                        <div>
                            <!-- Tab Switcher -->
                            <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-6 stagger-1">
                                <div class="flex space-x-6 text-xs font-semibold">
                                    <button 
                                        type="button"
                                        @click="switchMode('login')"
                                        :class="authMode === 'login' ? 'pb-3 -mb-3.5 border-b-2 border-vnpt-500 text-vnpt-500 font-bold' : 'pb-3 -mb-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700'"
                                        class="transition-all cursor-pointer">
                                        ĐĂNG NHẬP
                                    </button>
                                    <button 
                                        type="button"
                                        @click="switchMode('register')"
                                        :class="authMode === 'register' ? 'pb-3 -mb-3.5 border-b-2 border-vnpt-500 text-vnpt-500 font-bold' : 'pb-3 -mb-3.5 border-b-2 border-transparent text-slate-400 hover:text-slate-700'"
                                        class="transition-all cursor-pointer">
                                        ĐĂNG KÝ TÀI KHOẢN
                                    </button>
                                </div>
                            </div>

                            <!-- Alert Messages -->
                            <div v-if="alert.show" 
                                :class="alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'"
                                class="p-3 rounded-xl text-xs font-medium mb-4 flex items-center justify-between border transition-all">
                                <span>{{ alert.message }}</span>
                                <button type="button" @click="alert.show = false" class="text-slate-400 hover:text-slate-600 text-xs font-bold ml-2">ĐÓNG</button>
                            </div>

                            <transition name="form-slide" mode="out-in" @enter="handleFormEnter" @after-enter="handleFormAfterEnter">
                                <!-- Mode: Login -->
                                <div v-if="authMode === 'login'" key="login" class="space-y-4">
                                    <div class="stagger-2">
                                        <h2 class="text-lg font-bold text-slate-900 tracking-tight">Đăng nhập Cổng Dịch Vụ Vận Đơn</h2>
                                        <p class="text-xs text-slate-500 mt-0.5">Cổng truy cập dành cho Khách hàng gửi hàng, Bưu tá, Kho Hub &amp; Quản trị viên</p>
                                    </div>

                                    <form @submit.prevent="handleEmailLogin" class="space-y-3.5 pt-1">
                                        <div class="stagger-3">
                                            <label class="block text-xs font-semibold text-slate-700 mb-1">Email tài khoản</label>
                                            <input 
                                                type="email" 
                                                v-model="loginForm.email" 
                                                required 
                                                placeholder="name@company.com" 
                                                class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                        </div>

                                        <div class="stagger-4">
                                            <div class="flex items-center justify-between mb-1">
                                                <label class="text-xs font-semibold text-slate-700">Mật khẩu</label>
                                                <button type="button" @click="switchMode('forgot_step1')" class="text-xs text-vnpt-500 hover:underline font-semibold transition-colors cursor-pointer">
                                                    Quên mật khẩu?
                                                </button>
                                            </div>
                                            <input 
                                                type="password" 
                                                v-model="loginForm.password" 
                                                required 
                                                placeholder="••••••••" 
                                                class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                        </div>

                                        <div class="stagger-5">
                                            <button 
                                                type="submit" 
                                                :disabled="loading" 
                                                class="w-full py-2.5 px-4 bg-vnpt-500 hover:bg-vnpt-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-vnpt-500/20 btn-hover-lift btn-shimmer transition-all flex items-center justify-center cursor-pointer">
                                                <span v-if="!loading">Đăng Nhập Hệ Thống</span>
                                                <span v-else>Đang xác thực...</span>
                                            </button>
                                        </div>
                                    </form>

                                    <div class="relative flex items-center justify-center my-4 stagger-5">
                                        <div class="absolute inset-0 flex items-center">
                                            <div class="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div class="relative flex justify-center">
                                            <span class="bg-white px-3 text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Hoặc tiếp tục với</span>
                                        </div>
                                    </div>

                                    <div class="flex flex-col items-center justify-center w-full space-y-2 stagger-5">
                                        <div id="spaGoogleBtnLogin" class="flex justify-center w-full min-h-[44px]"></div>
                                        <div v-if="googleLoading" class="text-xs font-semibold text-vnpt-500 animate-pulse">
                                            Đang xác thực tài khoản Google...
                                        </div>
                                    </div>
                                </div>

                                <!-- Mode: Register -->
                                <div v-else-if="authMode === 'register'" key="register" class="space-y-4">
                                    <div>
                                        <h2 class="text-lg font-bold text-slate-900 tracking-tight">Đăng ký Tài khoản Khách hàng gửi hàng</h2>
                                        <p class="text-xs text-slate-500 mt-0.5">Tạo tài khoản để tạo vận đơn hàng loạt, theo dõi lộ trình và đối soát tiền thu hộ COD</p>
                                    </div>

                                    <form @submit.prevent="handleRegister" class="space-y-3 pt-1">
                                        <div>
                                            <label class="block text-xs font-semibold text-slate-700 mb-1">Họ và tên người gửi / Doanh nghiệp</label>
                                            <input 
                                                type="text" 
                                                v-model="registerForm.fullName" 
                                                required 
                                                placeholder="Nguyễn Văn A hoặc Tên doanh nghiệp" 
                                                class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                        </div>
                                        <div>
                                            <label class="block text-xs font-semibold text-slate-700 mb-1">Email liên hệ</label>
                                            <input 
                                                type="email" 
                                                v-model="registerForm.email" 
                                                required 
                                                placeholder="khachhang@company.com" 
                                                class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                        </div>
                                        <div class="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu (≥ 6 ký tự)</label>
                                                <input 
                                                    type="password" 
                                                    v-model="registerForm.password" 
                                                    required 
                                                    minlength="6" 
                                                    placeholder="••••••••" 
                                                    class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                            </div>
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">Xác nhận mật khẩu</label>
                                                <input 
                                                    type="password" 
                                                    v-model="registerForm.confirmPassword" 
                                                    required 
                                                    minlength="6" 
                                                    placeholder="••••••••" 
                                                    class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-vnpt-500 input-glow-focus transition-all" />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            :disabled="loading" 
                                            class="w-full py-2.5 px-4 bg-vnpt-500 hover:bg-vnpt-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-vnpt-500/20 btn-hover-lift btn-shimmer transition-all cursor-pointer">
                                            <span v-if="!loading">Đăng Ký Tài Khoản Khách Hàng</span>
                                            <span v-else>Đang xử lý đăng ký...</span>
                                        </button>
                                    </form>

                                    <div class="relative flex items-center justify-center my-3">
                                        <div class="absolute inset-0 flex items-center">
                                            <div class="w-full border-t border-slate-200"></div>
                                        </div>
                                        <div class="relative flex justify-center">
                                            <span class="bg-white px-3 text-[10px] uppercase tracking-wider text-slate-400 font-mono font-semibold">Hoặc đăng ký nhanh với</span>
                                        </div>
                                    </div>

                                    <div class="flex flex-col items-center justify-center w-full space-y-2">
                                        <div id="spaGoogleBtnRegister" class="flex justify-center w-full min-h-[44px]"></div>
                                        <div v-if="googleLoading" class="text-xs font-semibold text-vnpt-500 animate-pulse">
                                            Đang xử lý tài khoản Google...
                                        </div>
                                    </div>
                                </div>

                                <!-- Mode: Forgot Password Step 1 -->
                                <div v-else-if="authMode === 'forgot_step1'" key="forgot_step1" class="space-y-4">
                                    <div class="flex items-center justify-between text-xs text-slate-500 pb-1">
                                        <button type="button" @click="switchMode('login')" class="text-vnpt-500 hover:underline font-semibold">
                                            Quay lại đăng nhập
                                        </button>
                                        <span class="font-mono text-slate-500 font-bold">BƯỚC 1 / 2</span>
                                    </div>

                                    <div>
                                        <h2 class="text-lg font-bold text-slate-900 tracking-tight">Yêu cầu cấp lại mật khẩu</h2>
                                        <p class="text-xs text-slate-500 mt-0.5">Nhập email tài khoản của bạn để nhận mã OTP xác thực đổi mật khẩu</p>
                                    </div>

                                    <form @submit.prevent="handleSendOtp" class="space-y-4 pt-2">
                                        <div>
                                            <label class="block text-xs font-semibold text-slate-700 mb-1">Email đăng ký tài khoản</label>
                                            <input 
                                                type="email" 
                                                v-model="forgotForm.email" 
                                                required 
                                                placeholder="name@company.com" 
                                                class="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:border-vnpt-500 focus:ring-2 focus:ring-blue-600/20 focus:outline-none input-glow-focus font-medium transition-all" />
                                        </div>

                                        <button 
                                            type="submit" 
                                            :disabled="loading" 
                                            class="w-full py-2.5 px-4 bg-vnpt-500 hover:bg-vnpt-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-vnpt-500/20 btn-hover-lift transition-all flex items-center justify-center cursor-pointer">
                                            <span v-if="!loading">Gửi Mã Xác Thực OTP</span>
                                            <span v-else>Đang gửi mã qua máy chủ...</span>
                                        </button>
                                    </form>
                                </div>

                                <!-- Mode: Forgot Password Step 2 -->
                                <div v-else-if="authMode === 'forgot_step2'" key="forgot_step2" class="space-y-4">
                                    <div class="flex items-center justify-between text-xs text-slate-500 pb-1">
                                        <button type="button" @click="switchMode('forgot_step1')" class="text-vnpt-500 hover:underline font-semibold">
                                            Đổi email khác
                                        </button>
                                        <span class="font-mono text-vnpt-500 font-bold">BƯỚC 2 / 2</span>
                                    </div>

                                    <div>
                                        <h2 class="text-lg font-bold text-slate-900 tracking-tight">Nhập mã OTP và Mật khẩu mới</h2>
                                        <p class="text-xs text-slate-500 mt-0.5">
                                            Mã OTP gồm 6 chữ số đã được gửi tới: <span class="font-mono font-semibold text-slate-800">{{ forgotForm.email }}</span>
                                        </p>
                                    </div>

                                    <form @submit.prevent="handleResetPassword" class="space-y-4 pt-1">
                                        <div>
                                            <div class="flex items-center justify-between mb-2">
                                                <label class="text-xs font-semibold text-slate-700">Mã OTP (6 chữ số)</label>
                                                <span class="text-[11px] font-mono text-slate-400">Hiệu lực trong 15 phút</span>
                                            </div>
                                            
                                            <div class="flex items-center justify-center gap-2 sm:gap-2.5 my-2">
                                                <input 
                                                    v-for="(digit, idx) in otpDigits" 
                                                    :key="idx" 
                                                    :id="'spa-otp-box-' + idx"
                                                    type="text" 
                                                    maxlength="1" 
                                                    v-model="otpDigits[idx]"
                                                    @keyup="handleOtpKeyUp(idx, $event)"
                                                    @paste="handleOtpPaste($event)"
                                                    class="w-10 sm:w-11 h-12 text-center text-lg font-mono font-bold rounded-xl border border-slate-300 focus:border-vnpt-500 focus:ring-2 focus:ring-blue-600/20 focus:outline-none bg-slate-50/50 focus:bg-white input-glow-focus transition-all shadow-sm" />
                                            </div>

                                            <div class="flex items-center justify-center mt-2.5 text-xs">
                                                <button 
                                                    type="button" 
                                                    @click="handleResendOtp" 
                                                    :disabled="cooldownSeconds > 0 || loading"
                                                    class="text-slate-400 hover:text-vnpt-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                                                    <span v-if="cooldownSeconds > 0">Gửi lại mã ({{ cooldownSeconds }}s)</span>
                                                    <span v-else>Gửi lại mã OTP ngay</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div class="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu mới (≥ 6 ký tự)</label>
                                                <input 
                                                    type="password" 
                                                    v-model="resetForm.newPassword" 
                                                    required 
                                                    minlength="6" 
                                                    placeholder="••••••••" 
                                                    class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-vnpt-500 focus:ring-2 focus:ring-blue-600/20 focus:outline-none input-glow-focus transition-all" />
                                            </div>
                                            <div>
                                                <label class="block text-xs font-semibold text-slate-700 mb-1">Xác nhận mật khẩu</label>
                                                <input 
                                                    type="password" 
                                                    v-model="resetForm.confirmPassword" 
                                                    required 
                                                    minlength="6" 
                                                    placeholder="••••••••" 
                                                    class="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:border-vnpt-500 focus:ring-2 focus:ring-blue-600/20 focus:outline-none input-glow-focus transition-all" />
                                            </div>
                                        </div>

                                        <button 
                                            type="submit" 
                                            :disabled="loading" 
                                            class="w-full py-2.5 px-4 bg-vnpt-500 hover:bg-vnpt-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-vnpt-500/20 btn-hover-lift transition-all cursor-pointer">
                                            <span v-if="!loading">Cập Nhật Mật Khẩu</span>
                                            <span v-else>Đang lưu mật khẩu mới...</span>
                                        </button>
                                    </form>
                                </div>
                            </transition>
                        </div>

                        <div class="pt-6 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <button type="button" @click="goToHome" class="text-vnpt-500 hover:underline font-medium">
                                ← Quay lại trang tra cứu vận đơn
                            </button>
                            <span class="font-mono">VNPT Cloud Platform</span>
                        </div>
                    </div>
                </div>
            </div>
        `,
        setup(props, { emit }) {
            const GOOGLE_CLIENT_ID = "530674460360-7q1qf5lchbkj7sp7kslvttf7mqt92klg.apps.googleusercontent.com";

            const authMode = ref('login');
            const loading = ref(false);
            const googleLoading = ref(false);
            const cooldownSeconds = ref(60);
            let timerInterval = null;

            const alert = reactive({
                show: false,
                type: 'error',
                message: ''
            });

            const loginForm = reactive({ email: '', password: '' });
            const registerForm = reactive({ fullName: '', email: '', password: '', confirmPassword: '' });
            const forgotForm = reactive({ email: '' });
            const resetForm = reactive({ newPassword: '', confirmPassword: '' });
            const otpDigits = ref(['', '', '', '', '', '']);

            function showAlert(msg, isSuccess = false) {
                alert.show = true;
                alert.type = isSuccess ? 'success' : 'error';
                alert.message = msg;
            }

            function clearAlert() {
                alert.show = false;
                alert.message = '';
            }

            function switchMode(mode) {
                clearAlert();
                authMode.value = mode;
                if (mode === 'login' || mode === 'register') {
                    setTimeout(() => {
                        renderGoogleButton();
                    }, 250);
                } else if (mode === 'forgot_step2') {
                    setTimeout(() => {
                        const firstBox = document.getElementById('spa-otp-box-0');
                        if (firstBox) firstBox.focus();
                    }, 250);
                }
            }

            function handleFormEnter(el) {
                if (authMode.value === 'login' || authMode.value === 'register') {
                    renderGoogleButton();
                } else if (authMode.value === 'forgot_step2') {
                    const firstBox = el ? el.querySelector('#spa-otp-box-0') : document.getElementById('spa-otp-box-0');
                    if (firstBox) firstBox.focus();
                }
            }

            function handleFormAfterEnter(el) {
                if (authMode.value === 'login' || authMode.value === 'register') {
                    renderGoogleButton();
                } else if (authMode.value === 'forgot_step2') {
                    const firstBox = el ? el.querySelector('#spa-otp-box-0') : document.getElementById('spa-otp-box-0');
                    if (firstBox) firstBox.focus();
                }
            }

            function startCooldown() {
                clearInterval(timerInterval);
                cooldownSeconds.value = 60;
                timerInterval = setInterval(() => {
                    cooldownSeconds.value--;
                    if (cooldownSeconds.value <= 0) {
                        clearInterval(timerInterval);
                    }
                }, 1000);
            }

            function handleOtpKeyUp(idx, event) {
                const key = event.key;
                if (key >= '0' && key <= '9') {
                    if (idx < 5) {
                        const nextBox = document.getElementById('spa-otp-box-' + (idx + 1));
                        if (nextBox) nextBox.focus();
                    }
                } else if (key === 'Backspace') {
                    if (idx > 0 && !otpDigits.value[idx]) {
                        const prevBox = document.getElementById('spa-otp-box-' + (idx - 1));
                        if (prevBox) prevBox.focus();
                    }
                }
            }

            function handleOtpPaste(event) {
                event.preventDefault();
                const pasteData = (event.clipboardData || window.clipboardData).getData('text').trim();
                if (/^\d{6}$/.test(pasteData)) {
                    for (let i = 0; i < 6; i++) {
                        otpDigits.value[i] = pasteData[i];
                    }
                    const lastBox = document.getElementById('spa-otp-box-5');
                    if (lastBox) lastBox.focus();
                }
            }

            function finishLoginSuccess(data) {
                Auth.setSession(data.accessToken, data);
                showAlert('Đăng nhập thành công! Đang chuyển tiếp...', true);
                setTimeout(() => {
                    emit('login-success', data);
                    const target = sessionStorage.getItem('redirectAfterLogin') || '/';
                    sessionStorage.removeItem('redirectAfterLogin');
                    if (window.navigateTo) {
                        window.navigateTo(target);
                    } else {
                        window.location.href = target;
                    }
                }, 800);
            }

            async function handleEmailLogin() {
                clearAlert();
                loading.value = true;
                try {
                    const res = await Api.post('/api/auth/login', {
                        email: loginForm.email.trim(),
                        password: loginForm.password
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || `Đăng nhập không thành công (Mã lỗi ${res.status})!`);
                    }
                    finishLoginSuccess(data);
                } catch (err) {
                    showAlert(err.message || 'Lỗi kết nối máy chủ xác thực.');
                } finally {
                    loading.value = false;
                }
            }

            async function handleRegister() {
                clearAlert();
                if (registerForm.password !== registerForm.confirmPassword) {
                    showAlert('Mật khẩu xác nhận không trùng khớp!');
                    return;
                }
                loading.value = true;
                try {
                    const res = await Api.post('/api/auth/register', {
                        fullName: registerForm.fullName.trim(),
                        email: registerForm.email.trim(),
                        password: registerForm.password
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || `Đăng ký không thành công (Mã lỗi ${res.status})!`);
                    }
                    finishLoginSuccess(data);
                } catch (err) {
                    showAlert(err.message || 'Lỗi kết nối máy chủ xác thực.');
                } finally {
                    loading.value = false;
                }
            }

            async function handleSendOtp() {
                clearAlert();
                loading.value = true;
                try {
                    const res = await Api.post('/api/auth/forgot-password', {
                        email: forgotForm.email.trim()
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || data.error || 'Yêu cầu gửi OTP thất bại!');
                    }
                    startCooldown();
                    showAlert(data.message || 'Mã OTP đã được gửi đến email. Vui lòng kiểm tra hộp thư!', true);
                    switchMode('forgot_step2');
                } catch (err) {
                    showAlert(err.message || 'Không thể gửi mã OTP.');
                } finally {
                    loading.value = false;
                }
            }

            async function handleResendOtp() {
                if (cooldownSeconds.value > 0) return;
                await handleSendOtp();
            }

            async function handleResetPassword() {
                clearAlert();
                const otp = otpDigits.value.join('').trim();
                if (otp.length < 6) {
                    showAlert('Vui lòng nhập đủ 6 chữ số của mã OTP!');
                    return;
                }
                if (resetForm.newPassword !== resetForm.confirmPassword) {
                    showAlert('Mật khẩu mới xác nhận không khớp!');
                    return;
                }

                loading.value = true;
                try {
                    const res = await Api.post('/api/auth/reset-password', {
                        email: forgotForm.email.trim(),
                        otp: otp,
                        newPassword: resetForm.newPassword
                    });
                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.message || data.error || 'Đổi mật khẩu thất bại!');
                    }
                    showAlert(data.message || 'Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.', true);
                    setTimeout(() => {
                        loginForm.email = forgotForm.email;
                        loginForm.password = '';
                        switchMode('login');
                    }, 1500);
                } catch (err) {
                    showAlert(err.message || 'Xác thực OTP thất bại.');
                } finally {
                    loading.value = false;
                }
            }

            async function handleGoogleLoginResponse(googleResponse) {
                clearAlert();
                googleLoading.value = true;
                try {
                    const res = await Api.post('/api/auth/google', {
                        idToken: googleResponse.credential
                    });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) {
                        throw new Error(data.message || data.error || `Xác thực Google thất bại (Mã lỗi ${res.status})!`);
                    }
                    finishLoginSuccess(data);
                } catch (err) {
                    showAlert(err.message || 'Lỗi xác thực Google.');
                } finally {
                    googleLoading.value = false;
                }
            }

            function renderGoogleButton(force = false) {
                if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                    try {
                        google.accounts.id.initialize({
                            client_id: GOOGLE_CLIENT_ID,
                            callback: handleGoogleLoginResponse,
                            auto_select: false
                        });

                        const loginContainer = document.getElementById('spaGoogleBtnLogin');
                        if (loginContainer && (force || !loginContainer.hasChildNodes())) {
                            loginContainer.innerHTML = '';
                            google.accounts.id.renderButton(
                                loginContainer,
                                {
                                    theme: 'outline',
                                    size: 'large',
                                    text: 'signin_with',
                                    shape: 'pill',
                                    width: 320,
                                    logo_alignment: 'left'
                                }
                            );
                        }

                        const registerContainer = document.getElementById('spaGoogleBtnRegister');
                        if (registerContainer && (force || !registerContainer.hasChildNodes())) {
                            registerContainer.innerHTML = '';
                            google.accounts.id.renderButton(
                                registerContainer,
                                {
                                    theme: 'outline',
                                    size: 'large',
                                    text: 'signup_with',
                                    shape: 'pill',
                                    width: 320,
                                    logo_alignment: 'left'
                                }
                            );
                        }
                        return true;
                    } catch (e) {
                        console.debug('[LoginView] Google button error:', e);
                    }
                }
                return false;
            }

            function goToHome() {
                if (window.navigateTo) {
                    window.navigateTo('/tracking');
                } else {
                    window.location.href = '/tracking';
                }
            }

            onMounted(() => {
                if (!renderGoogleButton()) {
                    let attempts = 0;
                    const pollGoogle = setInterval(() => {
                        attempts++;
                        if (renderGoogleButton() || attempts >= 40) {
                            clearInterval(pollGoogle);
                        }
                    }, 150);
                }
            });

            onUnmounted(() => {
                if (timerInterval) clearInterval(timerInterval);
            });

            const isDarkMode = Vue.computed(() => {
                if (window.appStore && typeof window.appStore.isDarkMode === 'boolean') {
                    return window.appStore.isDarkMode;
                }
                return typeof props.isDarkMode === 'boolean'
                    ? props.isDarkMode
                    : (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
            });

            const isDragging = ref(false);
            const dragX = ref(null);
            let dragStartX = 2;
            let dragPointerX = null;
            let justSwiped = false;
            let cleanupDrag = null;

            const isKnobDark = computed(() => {
                if (dragX.value !== null) {
                    return dragX.value > 14;
                }
                return isDarkMode.value;
            });

            const currentKnobX = computed(() => {
                if (dragX.value !== null) {
                    return dragX.value;
                }
                return isDarkMode.value ? 26 : 2;
            });

            const knobStyle = computed(() => ({
                transform: `translateX(${currentKnobX.value}px) !important`,
                transition: isDragging.value ? 'none' : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }));

            const handleToggle = (targetMode, origin) => {
                const currentIsDark = window.appStore?.isDarkMode ?? isDarkMode.value;
                const nextMode = typeof targetMode === 'boolean'
                    ? targetMode
                    : !currentIsDark;
                if (currentIsDark === nextMode) {
                    return;
                }
                if (window.appStore?.setDarkMode) {
                    window.appStore.setDarkMode(nextMode, origin);
                } else if (typeof document !== 'undefined') {
                    if (nextMode) {
                        document.documentElement.classList.add('dark');
                        localStorage.setItem('theme', 'dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                        localStorage.setItem('theme', 'light');
                    }
                }
                emit('toggle-dark-mode', nextMode, origin);
            };

            const onPointerDown = (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (cleanupDrag) {
                    cleanupDrag();
                }

                dragPointerX = e.clientX;
                dragStartX = isDarkMode.value ? 26 : 2;
                isDragging.value = false;
                dragX.value = dragStartX;
                justSwiped = false;

                const pointerId = e.pointerId;
                const targetEl = e.currentTarget;
                try {
                    targetEl.setPointerCapture(pointerId);
                } catch (_) {}

                const onMove = (ev) => {
                    if (dragPointerX === null) return;
                    const dx = ev.clientX - dragPointerX;
                    if (Math.abs(dx) >= 3 || isDragging.value) {
                        isDragging.value = true;
                        const targetX = dragStartX + dx;
                        dragX.value = Math.max(2, Math.min(26, targetX));
                    }
                };

                const commitDrag = (finalClientX, originY) => {
                    if (dragPointerX === null) return;
                    const clientX = typeof finalClientX === 'number' ? finalClientX : dragPointerX;
                    const dx = clientX - dragPointerX;
                    const wasDrag = isDragging.value || Math.abs(dx) >= 4;

                    if (wasDrag) {
                        const finalX = dragX.value ?? (isDarkMode.value ? 26 : 2);
                        let targetMode;
                        if (dx >= 8) {
                            targetMode = true; // Dragged right -> Dark
                        } else if (dx <= -8) {
                            targetMode = false; // Dragged left -> Light
                        } else {
                            targetMode = finalX > 14;
                        }
                        const origin = { 
                            x: clientX, 
                            y: typeof originY === 'number' ? originY : 32 
                        };

                        const targetKnobX = targetMode ? 26 : 2;
                        dragX.value = targetKnobX;
                        isDragging.value = false;
                        justSwiped = true;

                        handleToggle(targetMode, origin);
                        setTimeout(() => {
                            justSwiped = false;
                            dragX.value = null;
                        }, 400);
                    } else {
                        isDragging.value = false;
                        dragX.value = null;
                    }

                    dragPointerX = null;
                };

                const onEnd = (ev) => {
                    const clientX = ev.clientX;
                    const clientY = ev.clientY;
                    const shouldPrevent = ev.cancelable && (isDragging.value || Math.abs((ev.clientX || 0) - (dragPointerX || 0)) >= 4);
                    if (cleanupDrag) {
                        cleanupDrag();
                    }
                    if (shouldPrevent) {
                        try { ev.preventDefault(); } catch (_) {}
                    }
                    commitDrag(clientX, clientY);
                };

                const onCancel = (ev) => {
                    const clientX = ev?.clientX ?? dragPointerX;
                    const clientY = ev?.clientY ?? 32;
                    if (cleanupDrag) {
                        cleanupDrag();
                    }
                    commitDrag(clientX, clientY);
                };

                cleanupDrag = () => {
                    cleanupDrag = null;
                    try {
                        if (targetEl && targetEl.hasPointerCapture && targetEl.hasPointerCapture(pointerId)) {
                            targetEl.releasePointerCapture(pointerId);
                        }
                    } catch (_) {}
                    window.removeEventListener('pointermove', onMove);
                    window.removeEventListener('pointerup', onEnd);
                    window.removeEventListener('pointercancel', onCancel);
                };

                window.addEventListener('pointermove', onMove, { passive: true });
                window.addEventListener('pointerup', onEnd);
                window.addEventListener('pointercancel', onCancel);
            };

            const onClick = (e) => {
                if (justSwiped) {
                    justSwiped = false;
                    return;
                }
                const origin = (e && typeof e.clientX === 'number') 
                    ? { x: e.clientX, y: e.clientY } 
                    : null;
                handleToggle(undefined, origin);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    let origin = null;
                    if (e.currentTarget && typeof e.currentTarget.getBoundingClientRect === 'function') {
                        const rect = e.currentTarget.getBoundingClientRect();
                        origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                    }
                    handleToggle(undefined, origin);
                }
            };

            onUnmounted(() => {
                if (cleanupDrag) {
                    cleanupDrag();
                }
            });

            return {
                isDarkMode,
                isKnobDark,
                isDragging,
                knobStyle,
                onPointerDown,
                onClick,
                onKeyDown,
                handleToggle,
                authMode,
                loading,
                googleLoading,
                cooldownSeconds,
                alert,
                loginForm,
                registerForm,
                forgotForm,
                resetForm,
                otpDigits,
                switchMode,
                handleFormEnter,
                handleFormAfterEnter,
                handleOtpKeyUp,
                handleOtpPaste,
                handleEmailLogin,
                handleRegister,
                handleSendOtp,
                handleResendOtp,
                handleResetPassword,
                goToHome
            };
        }
    };

    window.LoginView = LoginView;
})();
