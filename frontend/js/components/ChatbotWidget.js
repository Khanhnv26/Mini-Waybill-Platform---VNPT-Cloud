/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - TRỢ LÝ ẢO CHATBOT CSKH 24/7 (VUE 3 COMPONENT)
 * Logo Vector SVG quả cầu VNPT, Tra cứu đơn hàng thời gian thực,
 * Tối ưu trải nghiệm khách hàng thân thiện, Không dùng thuật ngữ kỹ thuật.
 * ==============================================================================
 */

(function () {
    const ChatbotWidget = {
        name: 'ChatbotWidget',
        template: `
            <div v-if="shouldDisplay" id="vnpt-chatbot-widget" class="fixed bottom-6 right-6 z-[9999] font-sans antialiased">
                
                <!-- 1. NÚT MỞ LAUNCHER VỚI VIỀN SÁNG NHẸ NHÀNG + BỒNG BỀNH -->
                <div 
                    v-show="!isOpen" 
                    class="relative flex items-center justify-center animate-chatbot-float select-none"
                >
                    <!-- Vòng sáng dịu mắt lan tỏa nhẹ xung quanh -->
                    <span class="absolute w-14 h-14 rounded-full bg-blue-400 pointer-events-none animate-chatbot-radar-1"></span>
                    <span class="absolute w-14 h-14 rounded-full bg-blue-500 pointer-events-none animate-chatbot-radar-2"></span>

                    <!-- Nút Bấm Mở Tròn -->
                    <button 
                        @click="openChat"
                        title="Trò chuyện với Trợ lý ảo VNPT Post 24/7"
                        class="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-700 via-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transform hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none border-2 border-white/60"
                    >
                        <!-- Badge thông báo tin mới -->
                        <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 flex h-5 w-5">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-5 w-5 bg-rose-500 text-white font-bold text-[10px] items-center justify-center border-2 border-white shadow-sm">
                                {{ unreadCount }}
                            </span>
                        </span>

                        <!-- LOGO QUẢ CẦU RUY-BĂNG VNPT VECTOR SVG -->
                        <div class="w-8 h-8 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                            <svg viewBox="0 0 100 100" class="w-full h-full drop-shadow-sm">
                                <defs>
                                    <linearGradient id="vnptGlobeGradBtn" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#38bdf8"/>
                                        <stop offset="60%" stop-color="#0284c7"/>
                                        <stop offset="100%" stop-color="#0369a1"/>
                                    </linearGradient>
                                    <linearGradient id="vnptOrbGradBtn" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stop-color="#ffffff"/>
                                        <stop offset="100%" stop-color="#bae6fd"/>
                                    </linearGradient>
                                </defs>
                                <circle cx="50" cy="50" r="33" fill="url(#vnptGlobeGradBtn)"/>
                                <ellipse cx="43" cy="40" rx="18" ry="11" fill="#ffffff" opacity="0.3"/>
                                <path d="M 15 67 C 12 49, 27 27, 55 21 C 79 16, 89 31, 86 44 C 83 57, 65 67, 45 71 C 31 74, 19 72, 15 67 Z" 
                                      fill="none" stroke="url(#vnptOrbGradBtn)" stroke-width="7" stroke-linecap="round"/>
                                <circle cx="37" cy="35" r="4.5" fill="#ffffff" opacity="0.8"/>
                            </svg>
                        </div>
                    </button>
                </div>

                <!-- 2. CỬA SỔ CHATBOT VỚI SPRING BOUNCE TRANSITION -->
                <div 
                    v-show="isOpen"
                    :class="[
                        'w-[380px] sm:w-[420px] h-[600px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden origin-bottom-right chatbot-spring-transition transform',
                        isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-0 opacity-0 translate-y-4 pointer-events-none'
                    ]"
                >
                    <!-- HEADER CỬA SỔ CHAT -->
                    <div class="vnpt-gradient text-white px-4 py-3.5 flex items-center justify-between shadow-sm select-none">
                        <div class="flex items-center space-x-3">
                            <!-- Logo Quả cầu Vector SVG trên Header -->
                            <div class="relative w-9 h-9 rounded-xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center p-1 shadow-inner">
                                <svg viewBox="0 0 100 100" class="w-full h-full">
                                    <circle cx="50" cy="50" r="33" fill="#38bdf8"/>
                                    <ellipse cx="43" cy="40" rx="18" ry="11" fill="#ffffff" opacity="0.4"/>
                                    <path d="M 15 67 C 12 49, 27 27, 55 21 C 79 16, 89 31, 86 44 C 83 57, 65 67, 45 71 C 31 74, 19 72, 15 67 Z" 
                                          fill="none" stroke="#ffffff" stroke-width="7.5" stroke-linecap="round"/>
                                    <circle cx="37" cy="35" r="4.5" fill="#ffffff"/>
                                </svg>
                                <span class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-blue-700 rounded-full animate-pulse"></span>
                            </div>

                            <div>
                                <div class="flex items-center space-x-1.5">
                                    <h3 class="font-bold text-sm tracking-tight leading-none">Trợ lý ảo VNPT Post</h3>
                                    <span class="text-[9px] bg-white/20 text-white font-semibold px-1.5 py-0.5 rounded border border-white/30">CSKH 24/7</span>
                                </div>
                                <p class="text-[11px] text-blue-100 flex items-center space-x-1.5 mt-0.5">
                                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    <span>Trực tuyến 24/7 • Sẵn sàng phản hồi</span>
                                </p>
                            </div>
                        </div>

                        <!-- Các nút thao tác Header -->
                        <div class="flex items-center space-x-1 text-blue-100">
                            <button 
                                @click="resetChat" 
                                title="Làm mới cuộc trò chuyện"
                                class="p-1.5 hover:bg-white/20 active:rotate-180 rounded-lg transition-all duration-300"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                            <button 
                                @click="closeChat" 
                                title="Thu nhỏ khung chat"
                                class="p-1.5 hover:bg-white/20 active:scale-90 rounded-lg transition-all duration-200"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- DANH SÁCH TIN NHẮN (MESSAGE HISTORY) -->
                    <div 
                        ref="messagesContainer" 
                        class="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/80 text-xs"
                    >
                        <div 
                            v-for="(msg, idx) in messages" 
                            :key="msg.id || idx"
                            :class="[
                                'flex items-start space-x-2 animate-chatbot-msg',
                                msg.sender === 'user' ? 'justify-end' : ''
                            ]"
                        >
                            <!-- Avatar Bot -->
                            <div 
                                v-if="msg.sender === 'bot'" 
                                class="w-7 h-7 rounded-lg vnpt-gradient text-white flex-shrink-0 flex items-center justify-center p-1 shadow-sm"
                            >
                                <svg viewBox="0 0 100 100" class="w-full h-full">
                                    <circle cx="50" cy="50" r="33" fill="#38bdf8"/>
                                    <path d="M 15 67 C 12 49, 27 27, 55 21 C 79 16, 89 31, 86 44 C 83 57, 65 67, 45 71 C 31 74, 19 72, 15 67 Z" 
                                          fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
                                    <circle cx="37" cy="35" r="5" fill="#ffffff"/>
                                </svg>
                            </div>

                            <!-- Nội dung tin nhắn -->
                            <div :class="['space-y-1 max-w-[88%]', msg.sender === 'user' ? 'text-right' : '']">
                                
                                <!-- Bong bóng văn bản thuần -->
                                <div 
                                    v-if="msg.type === 'text'"
                                    :class="[
                                        'rounded-2xl p-3.5 leading-relaxed text-left inline-block shadow-sm',
                                        msg.sender === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm shadow-blue-500/15' 
                                            : 'bg-white border border-slate-200/90 text-slate-700 rounded-tl-sm'
                                    ]"
                                    v-html="msg.html || msg.text"
                                ></div>

                                <!-- THẺ RICH CARD: TRA CỨU HÀNH TRÌNH ĐƠN HÀNG -->
                                <div 
                                    v-else-if="msg.type === 'tracking_card'"
                                    class="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm p-3.5 shadow-md space-y-2.5 text-left"
                                >
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div class="flex items-center space-x-1.5">
                                            <span class="text-base">📦</span>
                                            <span class="font-bold text-slate-800 text-[12px]">Mã: <span class="font-mono text-blue-600">{{ msg.data.trackingCode }}</span></span>
                                        </div>
                                        <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1', msg.data.badgeClass]">
                                            <span class="w-1.5 h-1.5 rounded-full" :class="msg.data.dotClass"></span>
                                            <span>{{ msg.data.statusLabel }}</span>
                                        </span>
                                    </div>

                                    <!-- THANH TIẾN ĐỘ VẬN CHUYỂN ANIMATION -->
                                    <div class="bg-slate-50 border border-slate-200/70 rounded-xl p-2.5 space-y-2">
                                        <div class="relative w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div 
                                                class="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full animate-chatbot-progress"
                                                :style="{ '--target-progress': msg.data.progressPercent + '%' }"
                                            ></div>
                                        </div>
                                        <div class="flex justify-between text-[9.5px] text-slate-400 font-medium">
                                            <span :class="{ 'text-blue-700 font-bold': msg.data.step >= 1 }">1. Tiếp nhận</span>
                                            <span :class="{ 'text-blue-700 font-bold': msg.data.step >= 2 }">2. Gom tuyến</span>
                                            <span :class="{ 'text-blue-700 font-bold flex items-center space-x-0.5': msg.data.step >= 3 }">
                                                <span class="animate-chatbot-truck">🚚</span>
                                                <span>3. Đang phát</span>
                                            </span>
                                            <span :class="{ 'text-emerald-700 font-bold': msg.data.step >= 4 }">4. Thành công</span>
                                        </div>
                                    </div>

                                    <!-- THÔNG TIN CHI TIẾT ĐƠN HÀNG -->
                                    <div class="bg-blue-50/60 border border-blue-100/80 rounded-xl p-2.5 space-y-1.5 text-[11px]">
                                        <div v-if="msg.data.receiverName" class="flex justify-between">
                                            <span class="text-slate-500">Người nhận:</span>
                                            <span class="font-semibold text-slate-800">{{ msg.data.receiverName }} ({{ msg.data.receiverPhone || '---' }})</span>
                                        </div>
                                        <div v-if="msg.data.destination" class="flex justify-between">
                                            <span class="text-slate-500">Địa chỉ phát:</span>
                                            <span class="font-medium text-slate-700 max-w-[65%] truncate text-right" :title="msg.data.destination">{{ msg.data.destination }}</span>
                                        </div>
                                        <div class="flex justify-between">
                                            <span class="text-slate-500">Tiền thu hộ COD:</span>
                                            <span class="font-extrabold text-rose-600 text-xs">{{ msg.data.codFormatted }}</span>
                                        </div>
                                        <div class="flex justify-between items-center pt-1 border-t border-blue-100/60">
                                            <span class="text-slate-500">Bưu tá giao hàng:</span>
                                            <span class="font-bold text-slate-800">
                                                {{ msg.data.courierName }} 
                                                <a v-if="msg.data.courierPhone" :href="'tel:' + msg.data.courierPhone" class="text-blue-600 underline font-normal ml-1">({{ msg.data.courierPhone }})</a>
                                            </span>
                                        </div>
                                        <div v-if="msg.data.lastMilestone" class="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                                            <span>Mốc bưu cục gần nhất:</span>
                                            <span class="text-slate-700 font-medium">{{ msg.data.lastMilestone }}</span>
                                        </div>
                                    </div>

                                    <!-- Nút xem chi tiết trên Bản Đồ -->
                                    <div class="flex space-x-2 pt-1">
                                        <button 
                                            @click="viewOnTrackingTab(msg.data.trackingCode)"
                                            class="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-bold text-[11px] text-center shadow-xs transition"
                                        >
                                            🗺️ Xem bản đồ chi tiết
                                        </button>
                                        <button 
                                            @click="initClaimFor(msg.data.trackingCode)"
                                            class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-medium text-[11px] transition"
                                            title="Gửi khiếu nại đơn này"
                                        >
                                            ⚠️ Khiếu nại
                                        </button>
                                    </div>
                                </div>

                                <span class="text-[10px] text-slate-400 block px-1">{{ msg.time || 'Vừa xong' }}</span>
                            </div>

                            <!-- Avatar Người Dùng -->
                            <div 
                                v-if="msg.sender === 'user'" 
                                class="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 font-bold text-[10px] flex-shrink-0 flex items-center justify-center shadow-2xs border border-slate-300"
                            >
                                Tôi
                            </div>
                        </div>

                        <!-- TYPING INDICATOR (3 CHẤM ĐANG SUY NGHĨ) -->
                        <div v-if="isTyping" class="flex items-start space-x-2 animate-chatbot-msg">
                            <div class="w-7 h-7 rounded-lg vnpt-gradient text-white flex-shrink-0 flex items-center justify-center p-1 shadow-sm">
                                <svg viewBox="0 0 100 100" class="w-full h-full">
                                    <circle cx="50" cy="50" r="33" fill="#38bdf8"/>
                                    <path d="M 15 67 C 12 49, 27 27, 55 21 C 79 16, 89 31, 86 44 C 83 57, 65 67, 45 71 C 31 74, 19 72, 15 67 Z" 
                                          fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
                                    <circle cx="37" cy="35" r="5" fill="#ffffff"/>
                                </svg>
                            </div>
                            <div class="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-slate-400 shadow-sm flex items-center space-x-1.5 h-9">
                                <span class="w-2 h-2 rounded-full bg-blue-500 animate-chatbot-dot-1"></span>
                                <span class="w-2 h-2 rounded-full bg-blue-500 animate-chatbot-dot-2"></span>
                                <span class="w-2 h-2 rounded-full bg-blue-500 animate-chatbot-dot-3"></span>
                            </div>
                        </div>

                        <!-- QUICK ACTION CHIPS (GỢI Ý THAO TÁC NHANH) -->
                        <div v-if="messages.length <= 2" class="pl-9 space-y-2 pt-1 animate-chatbot-msg">
                            <p class="text-[11px] font-semibold text-slate-500">Gợi ý câu hỏi thường gặp:</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button 
                                    @click="handleQuickAction('track_sample')" 
                                    class="px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-blue-700 rounded-full font-medium transition-all duration-200 shadow-2xs"
                                >
                                    📦 Tra cứu đơn hàng
                                </button>
                                <button 
                                    @click="handleQuickAction('calc')" 
                                    class="px-2.5 py-1 bg-white hover:bg-blue-50 border border-blue-200 hover:border-blue-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-blue-700 rounded-full font-medium transition-all duration-200 shadow-2xs"
                                >
                                    💰 Bảng giá cước chuyển phát
                                </button>
                                <button 
                                    @click="handleQuickAction('claim')" 
                                    class="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-amber-700 rounded-full font-medium transition-all duration-200 shadow-2xs"
                                >
                                    ⚠️ Hỗ trợ khiếu nại bưu phẩm
                                </button>
                                <button 
                                    @click="handleQuickAction('hotline')" 
                                    class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-slate-600 rounded-full font-medium transition-all duration-200 shadow-2xs"
                                >
                                    📞 Gặp tổng đài viên
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- FOOTER NHẬP TIN NHẮN (INPUT AREA) -->
                    <div class="p-3 bg-white border-t border-slate-200 flex flex-col space-y-2 select-none">
                        <form @submit.prevent="submitUserMessage" class="flex items-center space-x-2">
                            <div class="relative flex-1">
                                <input 
                                    ref="inputField"
                                    v-model="inputText" 
                                    type="text" 
                                    placeholder="Nhập mã vận đơn (WB...) hoặc câu hỏi..." 
                                    class="w-full pl-3.5 pr-8 py-2.5 text-xs bg-slate-100/90 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400 transition-all duration-200"
                                    autocomplete="off"
                                />
                                <button 
                                    type="button" 
                                    @click="triggerAttachmentAlert"
                                    title="Đính kèm ảnh sự cố hàng vỡ / biên bản" 
                                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 hover:scale-110 active:scale-95 transition-all duration-150"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>
                            </div>
                            <button 
                                type="submit" 
                                :disabled="!inputText.trim() || isTyping"
                                title="Gửi tin nhắn"
                                class="group w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-90 text-white flex items-center justify-center shadow-md shadow-blue-500/25 transition-all duration-200 flex-shrink-0"
                            >
                                <svg class="w-4 h-4 transform rotate-90 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                                </svg>
                            </button>
                        </form>

                        <div class="flex items-center justify-between px-1 text-[10px] text-slate-400">
                            <span class="flex items-center space-x-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Chuyển phát nhanh VNPT Post</span>
                            </span>
                            <span>Hotline CSKH: <strong class="text-slate-600 hover:text-blue-600 cursor-pointer">1900 54 54 81</strong></span>
                        </div>
                    </div>

                </div>

            </div>
        `,
        props: {
            visible: {
                type: Boolean,
                default: null
            }
        },
        data() {
            return {
                isOpen: false,
                unreadCount: 1,
                inputText: '',
                isTyping: false,
                messages: []
            };
        },
        computed: {
            // Kiểm tra người dùng hiện tại có phải cán bộ / nhân viên nội bộ hay không
            isStaffUser() {
                return typeof Auth !== 'undefined' && Auth.isAuthenticated() && Auth.isInternalStaff();
            },
            // Chỉ hiển thị Trợ lý ảo CSKH đối với Khách hàng (ROLE_CUSTOMER) và Khách vãng lai (Guest chưa đăng nhập)
            shouldDisplay() {
                if (this.visible !== null && this.visible !== undefined) {
                    return !!this.visible;
                }
                return !this.isStaffUser;
            }
        },
        mounted() {
            this.loadSessionMessages();
        },
        methods: {
            openChat() {
                this.isOpen = true;
                this.unreadCount = 0;
                this.$nextTick(() => {
                    if (this.$refs.inputField) {
                        this.$refs.inputField.focus();
                    }
                    this.scrollToBottom();
                });
            },
            closeChat() {
                this.isOpen = false;
            },
            scrollToBottom() {
                this.$nextTick(() => {
                    const c = this.$refs.messagesContainer;
                    if (c) {
                        c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
                    }
                });
            },
            loadSessionMessages() {
                try {
                    const saved = sessionStorage.getItem('vnpt_waybill_chatbot_messages');
                    if (saved) {
                        this.messages = JSON.parse(saved);
                        return;
                    }
                } catch (e) {
                    console.warn('[Chatbot] Không đọc được session:', e);
                }

                // Lời chào mở đầu thân thiện, tự nhiên
                this.messages = [
                    {
                        id: 'init_1',
                        sender: 'bot',
                        type: 'text',
                        html: `Xin chào Anh/Chị! 👋 Em là <strong>Trợ lý ảo VNPT Post 24/7</strong>.<br>
                               Em sẵn sàng hỗ trợ Anh/Chị tra cứu hành trình bưu gửi, biểu phí cước vận chuyển hoặc tiếp nhận khiếu nại sự cố đơn hàng.`,
                        time: this.getCurrentTime()
                    }
                ];
                this.saveSessionMessages();
            },
            saveSessionMessages() {
                try {
                    sessionStorage.setItem('vnpt_waybill_chatbot_messages', JSON.stringify(this.messages));
                } catch (e) {
                    console.warn('[Chatbot] Không lưu được session:', e);
                }
            },
            resetChat() {
                sessionStorage.removeItem('vnpt_waybill_chatbot_messages');
                this.loadSessionMessages();
                this.typeBotResponse('Cuộc trò chuyện đã được làm mới! 👋 Em có thể hỗ trợ gì tiếp theo cho Anh/Chị ạ?');
            },
            getCurrentTime() {
                const now = new Date();
                return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
            },

            // Gửi tin nhắn của người dùng
            submitUserMessage() {
                const text = this.inputText.trim();
                if (!text || this.isTyping) return;
                this.inputText = '';

                this.messages.push({
                    id: 'usr_' + Date.now(),
                    sender: 'user',
                    type: 'text',
                    text: text,
                    time: this.getCurrentTime()
                });
                this.saveSessionMessages();
                this.scrollToBottom();

                // Phân tích ý định và phản hồi
                this.processUserIntent(text);
            },

            // PHẢN HỒI CỦA BOT (MƯỢT MÀ, 100% REACTIVE, KHÔNG VỠ THẺ HTML)
            async typeBotResponse(fullText, extraData = null) {
                this.isTyping = true;
                this.scrollToBottom();

                // Chờ 350ms hiển thị 3 chấm nhấp nháy tạo nhịp điệu tự nhiên
                await new Promise(r => setTimeout(r, 350));
                this.isTyping = false;

                const botMsg = {
                    id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                    sender: 'bot',
                    type: extraData ? extraData.type : 'text',
                    html: fullText,
                    text: fullText,
                    data: extraData ? extraData.data : null,
                    time: this.getCurrentTime()
                };

                this.messages.push(botMsg);
                this.saveSessionMessages();
                this.scrollToBottom();
            },

            // PHÂN TÍCH Ý ĐỊNH BẰNG TỪ KHÓA & MÃ VẬN ĐƠN
            async processUserIntent(rawText) {
                const text = rawText.trim();
                const lower = text.toLowerCase();

                // 1. Kiểm tra nếu có mã vận đơn trong câu (WB...)
                const trackingMatch = text.match(/(WB[-_A-Za-z0-9]+)/i);
                if (trackingMatch) {
                    const trackingCode = trackingMatch[1].toUpperCase();
                    await this.fetchAndDisplayShipment(trackingCode);
                    return;
                }

                // 2. Tra cứu cước phí
                if (lower.includes('cước') || lower.includes('giá') || lower.includes('tiền ship') || lower.includes('bao nhiêu')) {
                    await this.typeBotResponse(`
                        <strong>💰 Bảng Giá Cước Chuyển Phát VNPT Tiêu Chuẩn:</strong><br>
                        • <strong>Nội Tỉnh (&lt; 2kg):</strong> 16.500 đ (Giao trong ngày)<br>
                        • <strong>Liên Tỉnh Thường:</strong> 28.000 đ (2 - 3 ngày làm việc)<br>
                        • <strong>Hỏa Tốc Express 24h:</strong> 45.000 đ (Đường bay ưu tiên)<br><br>
                        <em>Mẹo: Anh/Chị có thể chọn chức năng <strong>"Ước Tính Cước Phí"</strong> trên menu để xem giá chính xác theo trọng lượng và kích thước kiện hàng nhé!</em>
                    `);
                    return;
                }

                // 3. Khiếu nại bưu gửi / Hàng vỡ / Chậm phát
                if (lower.includes('vỡ') || lower.includes('hỏng') || lower.includes('chậm') || lower.includes('khiếu nại') || lower.includes('mất hàng') || lower.includes('đền')) {
                    await this.typeBotResponse(`
                        <strong>⚠️ Chính Sách Bảo Hiểm & Khiếu Nại Bưu Phẩm:</strong><br>
                        VNPT Post cam kết bồi thường <strong>100% giá trị khai giá</strong> đối với sự cố tổn thất trong quá trình vận chuyển.<br><br>
                        <strong>Các bước xử lý nhanh:</strong><br>
                        1. Nhập mã bưu phẩm cần tra soát vào ô chat này (ví dụ: <code>WB...</code>).<br>
                        2. Bấm nút <strong>"⚠️ Khiếu nại"</strong> trên thẻ đơn hàng để lập phiếu tiếp nhận.<br>
                        3. Nhân viên chăm sóc khách hàng bưu cục sẽ liên hệ hỗ trợ trong vòng <strong>2 giờ làm việc</strong>.
                    `);
                    return;
                }

                // 4. Hotline / Tổng đài viên
                if (lower.includes('hotline') || lower.includes('tổng đài') || lower.includes('gặp') || lower.includes('nhân viên') || lower.includes('sđt') || lower.includes('liên hệ')) {
                    await this.typeBotResponse(`
                        <strong>📞 Kênh Hỗ Trợ Trực Tiếp Từ Tổng Đài Viên:</strong><br>
                        • <strong>Tổng đài Toàn Quốc:</strong> <a href="tel:1900545481" class="text-blue-600 font-bold underline">1900 54 54 81</a> (Nhánh 1)<br>
                        • <strong>Đường dây nóng miễn cước:</strong> <a href="tel:18001260" class="text-emerald-600 font-bold underline">1800 1260</a> (24/7)<br>
                        • <strong>Email CSKH:</strong> cskh@vnptpost.vn<br><br>
                        Anh/Chị có thể bấm trực tiếp vào số điện thoại trên để kết nối cuộc gọi ngay ạ!
                    `);
                    return;
                }

                // 5. Câu hỏi mặc định / Không nhận diện được
                await this.typeBotResponse(`
                    Dạ, em đã tiếp nhận câu hỏi của Anh/Chị: <em>"${text}"</em>.<br>
                    Để em hỗ trợ chính xác nhất, Anh/Chị có thể <strong>gõ mã bưu phẩm (WB...)</strong> cần kiểm tra, hoặc bấm vào các nút gợi ý thao tác nhanh bên dưới ạ!
                `);
            },

            // GỌI API THẬT TỪ HỆ THỐNG ĐƠN HÀNG
            async fetchAndDisplayShipment(trackingCode) {
                this.isTyping = true;
                this.scrollToBottom();

                try {
                    let trackingData = null;
                    let shipmentData = null;

                    // 1. Gọi song song Tracking và Shipment API
                    if (window.TrackingService && typeof window.TrackingService.getFullTracking === 'function') {
                        try {
                            trackingData = await window.TrackingService.getFullTracking(trackingCode);
                        } catch (e) {
                            console.warn('[Chatbot] Tra cứu Tracking:', e);
                        }
                    }

                    if (window.ShipmentService && typeof window.ShipmentService.getByCode === 'function') {
                        try {
                            shipmentData = await window.ShipmentService.getByCode(trackingCode);
                        } catch (e) {
                            console.warn('[Chatbot] Tra cứu Shipment:', e);
                        }
                    }

                    // Nếu cả hai đều không tìm thấy đơn hàng
                    if (!trackingData && !shipmentData) {
                        await this.typeBotResponse(`
                            Rất tiếc, em không tìm thấy bưu phẩm mã: <strong class="text-rose-600">${trackingCode}</strong> trên hệ thống bưu cục.<br>
                            Anh/Chị vui lòng kiểm tra lại chính xác các ký tự trên phiếu gửi (Ví dụ: <code>WB...</code>) hoặc liên hệ tổng đài <strong>1900 54 54 81</strong> để được hỗ trợ tra soát thủ công ạ!
                        `);
                        return;
                    }

                    // 2. Chuẩn hóa dữ liệu hiển thị thẻ Rich Card
                    const status = (trackingData?.currentStatus || shipmentData?.status || 'RECEIVED').toUpperCase();
                    const statusConfig = this.mapStatusDetails(status);

                    const cardData = {
                        trackingCode: trackingCode,
                        status: status,
                        statusLabel: statusConfig.label,
                        badgeClass: statusConfig.badgeClass,
                        dotClass: statusConfig.dotClass,
                        step: statusConfig.step,
                        progressPercent: statusConfig.percent,
                        receiverName: shipmentData?.receiverName || null,
                        receiverPhone: shipmentData?.receiverPhone || null,
                        destination: shipmentData?.receiverAddress || null,
                        codFormatted: shipmentData?.codAmount ? Number(shipmentData.codAmount).toLocaleString('vi-VN') + ' đ' : '0 đ',
                        courierName: shipmentData?.courierName || 'Đang phân công bưu tá',
                        courierPhone: shipmentData?.courierPhone || null,
                        lastMilestone: (trackingData?.history && trackingData.history.length > 0) 
                            ? (trackingData.history[trackingData.history.length - 1].locationCode || trackingData.history[trackingData.history.length - 1].note || 'Bưu cục tiếp nhận')
                            : 'Đang cập nhật trạm bưu cục'
                    };

                    await this.typeBotResponse('', {
                        type: 'tracking_card',
                        data: cardData
                    });

                } catch (err) {
                    console.error('[Chatbot] Lỗi kết nối tra cứu:', err);
                    await this.typeBotResponse(`Hệ thống tra cứu đang bận hoặc tạm thời gián đoạn. Anh/Chị vui lòng thử lại sau ít phút hoặc gọi hotline <strong>1900 54 54 81</strong> để được hỗ trợ ngay ạ.`);
                }
            },

            // Map trạng thái đơn hàng sang nhãn tiếng Việt & tỷ lệ phần trăm tiến trình
            mapStatusDetails(status) {
                switch (status) {
                    case 'RECEIVED':
                    case 'CREATED':
                        return {
                            label: 'ĐÃ TIẾP NHẬN',
                            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                            dotClass: 'bg-blue-600',
                            step: 1,
                            percent: 25
                        };
                    case 'WAITING_FOR_ROUTING':
                    case 'ROUTED':
                    case 'CONSOLIDATED':
                        return {
                            label: 'ĐÃ GOM TUYẾN',
                            badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            dotClass: 'bg-indigo-600',
                            step: 2,
                            percent: 50
                        };
                    case 'IN_TRANSIT':
                    case 'DELIVERING':
                        return {
                            label: 'ĐANG PHÁT HÀNG',
                            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                            dotClass: 'bg-amber-600 animate-ping',
                            step: 3,
                            percent: 75
                        };
                    case 'DELIVERED':
                        return {
                            label: 'GIAO THÀNH CÔNG',
                            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            dotClass: 'bg-emerald-600',
                            step: 4,
                            percent: 100
                        };
                    case 'CANCELLED':
                    case 'RETURNED':
                        return {
                            label: 'ĐÃ HOÀN TRẢ / HỦY',
                            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                            dotClass: 'bg-rose-600',
                            step: 1,
                            percent: 20
                        };
                    default:
                        return {
                            label: status,
                            badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
                            dotClass: 'bg-slate-600',
                            step: 2,
                            percent: 50
                        };
                }
            },

            // Xử lý khi bấm nút Gợi ý nhanh
            async handleQuickAction(action) {
                if (action === 'track_sample') {
                    // Thử tìm mã đơn thật từ ShipmentService
                    let targetCode = null;
                    try {
                        if (window.ShipmentService && typeof window.ShipmentService.getAll === 'function') {
                            const list = await window.ShipmentService.getAll({ silent: true });
                            if (Array.isArray(list) && list.length > 0) {
                                targetCode = list[0].trackingCode;
                            }
                        }
                    } catch (e) {}

                    if (targetCode) {
                        this.messages.push({
                            id: 'usr_' + Date.now(),
                            sender: 'user',
                            type: 'text',
                            text: `Kiểm tra đơn hàng ${targetCode}`,
                            time: this.getCurrentTime()
                        });
                        this.saveSessionMessages();
                        this.scrollToBottom();
                        await this.fetchAndDisplayShipment(targetCode);
                    } else {
                        // Nếu chưa có đơn nào trong DB, hướng dẫn người dùng nhập mã
                        this.messages.push({
                            id: 'usr_' + Date.now(),
                            sender: 'user',
                            type: 'text',
                            text: 'Tôi muốn tra cứu hành trình đơn hàng',
                            time: this.getCurrentTime()
                        });
                        this.saveSessionMessages();
                        this.scrollToBottom();
                        await this.typeBotResponse(`
                            Anh/Chị vui lòng <strong>nhập mã bưu phẩm</strong> (in trên phiếu gửi hàng, ví dụ: <code>WB2026...</code>) vào ô chat bên dưới để em tra cứu hành trình chi tiết ngay nhé!
                        `);
                    }

                } else if (action === 'calc') {
                    this.messages.push({
                        id: 'usr_' + Date.now(),
                        sender: 'user',
                        type: 'text',
                        text: 'Xem biểu cước vận chuyển tiêu chuẩn',
                        time: this.getCurrentTime()
                    });
                    this.saveSessionMessages();
                    this.scrollToBottom();
                    await this.processUserIntent('cước phí');

                } else if (action === 'claim') {
                    this.messages.push({
                        id: 'usr_' + Date.now(),
                        sender: 'user',
                        type: 'text',
                        text: 'Hướng dẫn khiếu nại bưu gửi',
                        time: this.getCurrentTime()
                    });
                    this.saveSessionMessages();
                    this.scrollToBottom();
                    await this.processUserIntent('khiếu nại');

                } else if (action === 'hotline') {
                    this.messages.push({
                        id: 'usr_' + Date.now(),
                        sender: 'user',
                        type: 'text',
                        text: 'Liên hệ tổng đài viên CSKH',
                        time: this.getCurrentTime()
                    });
                    this.saveSessionMessages();
                    this.scrollToBottom();
                    await this.processUserIntent('hotline');
                }
            },

            // Xem chi tiết trên tab Tra cứu
            viewOnTrackingTab(trackingCode) {
                this.closeChat();
                if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
                    window.location.hash = 'tracking';
                    const event = new CustomEvent('navigate-to-tracking', { detail: { trackingCode } });
                    window.dispatchEvent(event);
                } else {
                    window.location.href = 'index.html#tracking';
                }
            },

            // Khởi tạo khiếu nại
            initClaimFor(trackingCode) {
                if (window.Utils && typeof window.Utils.showToast === 'function') {
                    window.Utils.showToast('Ghi Nhận Khiếu Nại', `Đã mở hồ sơ khiếu nại cho bưu phẩm ${trackingCode}. Nhân viên CSKH sẽ liên hệ trong 2h!`, 'warning');
                } else {
                    alert(`Đã ghi nhận yêu cầu khiếu nại cho bưu phẩm ${trackingCode}!`);
                }
            },

            triggerAttachmentAlert() {
                if (window.Utils && typeof window.Utils.showToast === 'function') {
                    window.Utils.showToast('Đính Kèm Biên Bản', 'Hệ thống đã sẵn sàng tiếp nhận ảnh chụp hàng vỡ hoặc biên bản giao nhận bưu tá.', 'info');
                } else {
                    alert('Đã sẵn sàng tải lên ảnh chụp sự cố bưu phẩm.');
                }
            }
        }
    };

    // Đưa vào biến toàn cục để Vue App chính có thể nạp
    window.ChatbotWidget = ChatbotWidget;
})();
