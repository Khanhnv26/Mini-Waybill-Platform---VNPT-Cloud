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
                            <!-- Nút Bật/Tắt âm thanh chuông -->
                            <button 
                                @click="toggleMute" 
                                :title="isMuted ? 'Bật âm thanh thông báo' : 'Tắt âm thanh thông báo'"
                                class="p-1.5 hover:bg-white/20 active:scale-90 rounded-lg transition-all duration-200"
                            >
                                <svg v-if="!isMuted" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <svg v-else class="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                                </svg>
                            </button>
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
                                
                                <!-- Tin khách render chữ thường. Chỉ tin bot dùng HTML đã escape. -->
                                <div
                                    v-if="msg.type === 'text' && msg.sender === 'user'"
                                    class="rounded-2xl p-3.5 leading-relaxed text-left inline-block shadow-sm whitespace-pre-wrap break-words bg-blue-600 text-white rounded-tr-sm shadow-blue-500/15"
                                >{{ msg.text }}</div>
                                <div
                                    v-else-if="msg.type === 'text'"
                                    class="rounded-2xl p-3.5 leading-relaxed text-left inline-block shadow-sm bg-white border border-slate-200/90 text-slate-700 rounded-tl-sm"
                                    v-html="msg.html"
                                ></div>

                                <!-- THẺ RICH CARD: TRA CỨU HÀNH TRÌNH ĐƠN HÀNG -->
                                <div 
                                    v-else-if="msg.type === 'tracking_card'"
                                    class="bg-white border border-slate-200/90 rounded-2xl rounded-tl-sm p-3.5 shadow-md space-y-2.5 text-left"
                                >
                                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                        <div class="flex items-center space-x-1.5">
                                            <svg class="w-4 h-4 text-blue-600 inline-block flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
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
                                            <span :class="[
                                                msg.data.step >= 3 ? 'text-blue-700 font-bold' : '',
                                                'inline-flex items-center space-x-0.5'
                                            ]">
                                                <svg v-if="msg.data.step === 3" class="w-3 h-3 text-blue-600 inline-block animate-chatbot-truck mr-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1" />
                                                </svg>
                                                <span>3. Đang phát</span>
                                            </span>
                                            <span :class="[
                                                msg.data.step >= 4 ? 'text-emerald-700 font-bold' : '',
                                                'inline-flex items-center space-x-0.5'
                                            ]">
                                                <svg v-if="msg.data.step >= 4" class="w-3 h-3 text-emerald-600 inline-block mr-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                                                </svg>
                                                <span>4. Thành công</span>
                                            </span>
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
                                        <div v-if="msg.data.courierName" class="flex justify-between items-center pt-1 border-t border-blue-100/60">
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
                                            class="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg font-medium text-[11px] text-center shadow-xs transition"
                                        >
                                            Xem bản đồ chi tiết
                                        </button>
                                        <button 
                                            @click="initClaimFor(msg.data.trackingCode)"
                                            class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-medium text-[11px] transition"
                                            title="Gửi khiếu nại đơn này"
                                        >
                                            Khiếu nại
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

                        <!-- TYPING INDICATOR (HIỆU ỨNG AI ĐANG NGHĨ: SPARKLES + SHIMMER TEXT + MINI WAVE DOTS) -->
                        <div v-if="isTyping" class="flex items-start space-x-2 animate-chatbot-thinking-in">
                            <div class="w-7 h-7 rounded-lg vnpt-gradient text-white flex-shrink-0 flex items-center justify-center p-1 shadow-sm chatbot-avatar-glow">
                                <svg viewBox="0 0 100 100" class="w-full h-full">
                                    <circle cx="50" cy="50" r="33" fill="#38bdf8"/>
                                    <path d="M 15 67 C 12 49, 27 27, 55 21 C 79 16, 89 31, 86 44 C 83 57, 65 67, 45 71 C 31 74, 19 72, 15 67 Z" 
                                          fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/>
                                    <circle cx="37" cy="35" r="5" fill="#ffffff"/>
                                </svg>
                            </div>
                            <div class="chatbot-thinking-bubble rounded-2xl rounded-tl-sm px-3.5 py-2 flex items-center space-x-2">
                                <!-- Sparkles AI Icon SVG -->
                                <div class="w-3.5 h-3.5 flex-shrink-0 text-sky-500 animate-chatbot-sparkle">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 2L14.2 8.8L21 11L14.2 13.2L12 20L9.8 13.2L3 11L9.8 8.8L12 2Z"/>
                                        <path d="M19 16L19.8 18.2L22 19L19.8 19.8L19 22L18.2 19.8L16 19L18.2 18.2L19 16Z" opacity="0.8"/>
                                    </svg>
                                </div>
                                <!-- Text Shimmer Wave + 3 Mini Dots -->
                                <div class="flex items-center space-x-1">
                                    <span class="chatbot-thinking-text font-semibold text-[11px] tracking-tight">
                                        {{ typingMessage }}
                                    </span>
                                    <span class="inline-flex items-center space-x-0.5 pl-0.5">
                                        <span class="w-1 h-1 rounded-full bg-sky-500 animate-chatbot-dot-1"></span>
                                        <span class="w-1 h-1 rounded-full bg-blue-500 animate-chatbot-dot-2"></span>
                                        <span class="w-1 h-1 rounded-full bg-sky-600 animate-chatbot-dot-3"></span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- QUICK ACTION CHIPS (GỢI Ý THAO TÁC NHANH) -->
                        <div v-if="messages.length <= 2" class="pl-9 space-y-1.5 pt-1 animate-chatbot-msg">
                            <p class="text-[11px] font-medium text-slate-500">Gợi ý câu hỏi:</p>
                            <div class="flex flex-wrap gap-1.5">
                                <button 
                                    @click="handleQuickAction('track_sample')" 
                                    class="chatbot-chip px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 active:scale-95 text-slate-700 hover:text-blue-700 rounded-lg font-medium text-[11px] transition-all duration-200 shadow-2xs"
                                >
                                    Tra cứu đơn hàng
                                </button>
                                <button 
                                    @click="handleQuickAction('calc')" 
                                    class="chatbot-chip px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 active:scale-95 text-slate-700 hover:text-blue-700 rounded-lg font-medium text-[11px] transition-all duration-200 shadow-2xs"
                                >
                                    Bảng giá cước
                                </button>
                                <button 
                                    @click="handleQuickAction('claim')" 
                                    class="chatbot-chip px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-400 active:scale-95 text-slate-700 hover:text-amber-700 rounded-lg font-medium text-[11px] transition-all duration-200 shadow-2xs"
                                >
                                    Hướng dẫn khiếu nại
                                </button>
                                <button 
                                    @click="handleQuickAction('hotline')" 
                                    class="chatbot-chip px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-400 active:scale-95 text-slate-700 rounded-lg font-medium text-[11px] transition-all duration-200 shadow-2xs"
                                >
                                    Hotline CSKH
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
                unreadCount: 0,
                isMuted: localStorage.getItem('vnpt_chatbot_muted') === 'true',
                audioCtx: null,
                inputText: '',
                isTyping: false,
                typingMessage: 'Trợ lý AI đang suy nghĩ...',
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

                // Lời chào mở đầu thân thiện, ngắn gọn, chuyên nghiệp
                this.messages = [
                    {
                        id: 'init_1',
                        sender: 'bot',
                        type: 'text',
                        html: `Xin chào Quý khách! Em là <strong>Trợ lý ảo VNPT Post</strong>.<br>
                               Em có thể hỗ trợ tra cứu bưu gửi, biểu phí cước hoặc tiếp nhận phản ánh sự cố đơn hàng.`,
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
                this.typeBotResponse('Cuộc trò chuyện đã được làm mới. Em có thể hỗ trợ gì tiếp theo cho Quý khách ạ?');
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
                if (!this.isTyping) {
                    this.typingMessage = 'Trợ lý AI đang suy nghĩ...';
                    this.isTyping = true;
                    this.scrollToBottom();
                    await new Promise(r => setTimeout(r, 250));
                }
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

                // Chỉ tăng số đếm tin chưa đọc nếu cửa sổ chat đang đóng/thu nhỏ
                if (!this.isOpen) {
                    this.unreadCount++;
                }

                // Phát âm thanh thông báo chuông 2 nốt êm dịu
                this.playNotificationSound();
            },

            // TỰ ĐỘNG XÁC ĐỊNH THÔNG ĐIỆP SUY NGHĨ THEO NGỮ CẢNH
            determineThinkingMessage(query) {
                if (!query) return 'Trợ lý AI đang suy nghĩ...';
                const text = String(query).trim();
                const lower = text.toLowerCase();
                const trackingMatch = text.match(/\b(WB[-_A-Za-z0-9]+)\b/i);
                if (trackingMatch) {
                    return `Đang tra cứu hành trình ${trackingMatch[1].toUpperCase()}...`;
                }
                if (lower.startsWith('tra cứu') || lower.includes('đơn hàng') || lower.includes('bưu phẩm') || lower.includes('hành trình')) {
                    return 'Đang tra cứu hành trình bưu phẩm...';
                }
                if (lower.includes('cước') || lower.includes('giá') || lower.includes('bao nhiêu') || lower.includes('chi phí') || lower.includes('bảng giá') || lower.includes('tính phí')) {
                    return 'Đang tính toán bảng giá cước dịch vụ...';
                }
                if (lower.includes('khiếu nại') || lower.includes('vỡ') || lower.includes('hỏng') || lower.includes('chậm') || lower.includes('mất') || lower.includes('đền bù') || lower.includes('sự cố')) {
                    return 'Đang kiểm tra quy trình hỗ trợ bưu gửi...';
                }
                if (lower.includes('bưu cục') || lower.includes('chi nhánh') || lower.includes('địa chỉ') || lower.includes('điểm gửi') || lower.includes('gần nhất') || lower.includes('mở cửa') || lower.includes('làm việc')) {
                    return 'Đang tìm kiếm bưu cục VNPT gần nhất...';
                }
                return 'Trợ lý AI đang suy nghĩ...';
            },

            // PHÂN TÍCH Ý ĐỊNH VÀ KẾT NỐI TRỢ LÝ AI (SPRING AI BACKEND)
            async processUserIntent(rawText) {
                const text = rawText.trim();

                // Tự động phân tích ngữ cảnh để hiển thị thông điệp suy nghĩ tương ứng
                this.typingMessage = this.determineThinkingMessage(text);

                // 1. Nếu khách nhập thẳng mã vận đơn WB... thì ưu tiên hiển thị Thẻ hành trình trực quan
                const trackingMatch = text.match(/\b(WB[-_A-Za-z0-9]+)\b/i);
                const isShortQuery = text.length <= 25 || text.toLowerCase().startsWith('tra cứu') || text.toLowerCase().startsWith('kiểm tra');
                if (trackingMatch && isShortQuery) {
                    const trackingCode = trackingMatch[1].toUpperCase();
                    await this.fetchAndDisplayShipment(trackingCode);
                    return;
                }

                // 2. Gửi câu hỏi đến Trợ lý AI Backend (support-service: POST /api/support/ai/chat)
                this.isTyping = true;
                this.scrollToBottom();

                try {
                    const payload = JSON.stringify({ message: text });
                    let response = null;
                    try {
                        if (typeof Api !== 'undefined' && typeof Api.request === 'function') {
                            response = await Api.request('/api/support/ai/chat', {
                                method: 'POST',
                                body: payload,
                                silent: true,
                                skip403Toast: true,
                                signal: AbortSignal.timeout(25000)
                            });
                        } else {
                            const baseUrl = (['3000', '80', ''].includes(window.location.port) && window.location.protocol.startsWith('http')) ? '' : 'http://localhost:8080';
                            response = await fetch(`${baseUrl}/api/support/ai/chat`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: payload,
                                signal: AbortSignal.timeout(25000)
                            });
                        }
                    } catch (e1) {
                        console.warn('[Chatbot] Gateway không phản hồi:', e1);
                    }

                    if (response && response.ok) {
                        const data = await response.json();
                        this.isTyping = false;
                        if (data && data.reply) {
                            const formatted = this.formatMarkdown(data.reply);
                            await this.typeBotResponse(formatted);

                            // Nếu có kèm mã vận đơn thì mở thêm thẻ tra cứu cho khách
                            if (trackingMatch) {
                                await this.fetchAndDisplayShipment(trackingMatch[1].toUpperCase());
                            }
                            return;
                        }
                    }
                    this.isTyping = false;
                    await this.typeBotResponse(await this.readGatewayMessage(response));
                } catch (err) {
                    console.warn('[Chatbot] Gateway không phản hồi:', err);
                    this.isTyping = false;
                    await this.typeBotResponse('Không kết nối được gateway. Quý khách thử lại sau.');
                }
            },

            async readGatewayMessage(response) {
                try {
                    const data = response ? await response.json() : null;
                    if (data && data.message) {
                        return this.formatMarkdown(String(data.message));
                    }
                } catch (e) {}
                return 'Gateway chưa trả lời được. Quý khách thử lại sau.';
            },

            // ĐỊNH DẠNG MARKDOWN TỪ TRỢ LÝ AI SANG HTML GỌN GÀNG
            escapeHtml(value) {
                return String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;');
            },

            formatMarkdown(text) {
                if (!text) return '';
                let safe = text
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                safe = safe.replace(/\*(.*?)\*/g, '<em>$1</em>');
                safe = safe.replace(/`([^`]+)`/g, '<code class="bg-blue-50 text-blue-700 px-1 py-0.5 rounded text-[11px] font-mono border border-blue-100">$1</code>');
                safe = safe.replace(/^[\*\-]\s+(.*)$/gm, '• $1');
                safe = safe.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');

                return safe;
            },

            // GỌI API THẬT TỪ HỆ THỐNG ĐƠN HÀNG
            async fetchAndDisplayShipment(trackingCode) {
                this.typingMessage = 'Đang tra cứu hành trình ' + trackingCode + '...';
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
                            Rất tiếc, em không tìm thấy bưu phẩm mã: <strong class="text-rose-600">${this.escapeHtml(trackingCode)}</strong> trên hệ thống bưu cục.<br>
                            Anh/Chị vui lòng kiểm tra lại chính xác các ký tự trên phiếu gửi (Ví dụ: <code>WB...</code>) hoặc liên hệ tổng đài <strong>1900 54 54 81</strong> để được hỗ trợ tra soát thủ công ạ!
                        `);
                        return;
                    }

                    // 2. Chuẩn hóa dữ liệu hiển thị thẻ Rich Card
                    const status = (
                        trackingData?.currentStatus
                        || shipmentData?.currentStatus
                        || shipmentData?.status
                        || 'RECEIVED'
                    ).toUpperCase();
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
                        courierName: shipmentData?.courierName || null,
                        courierPhone: shipmentData?.courierPhone || null,
                        lastMilestone: (trackingData?.history && trackingData.history.length > 0)
                            ? (trackingData.history[trackingData.history.length - 1].locationCode
                                || trackingData.history[trackingData.history.length - 1].node
                                || trackingData.history[trackingData.history.length - 1].note
                                || null)
                            : null
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
                    case 'PENDING_ROUTING':
                        return {
                            label: 'CHỜ XẾP TUYẾN',
                            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
                            dotClass: 'bg-blue-600',
                            step: 1,
                            percent: 30
                        };
                    case 'ROUTE_ASSIGNED':
                    case 'PICKED_UP':
                    case 'ARRIVED_DEST_HUB':
                        return {
                            label: status === 'PICKED_UP' ? 'ĐÃ LẤY HÀNG' : (status === 'ARRIVED_DEST_HUB' ? 'ĐÃ ĐẾN KHO ĐÍCH' : 'ĐÃ XẾP TUYẾN'),
                            badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                            dotClass: 'bg-indigo-600',
                            step: 2,
                            percent: status === 'ARRIVED_DEST_HUB' ? 65 : (status === 'PICKED_UP' ? 55 : 45)
                        };
                    case 'IN_TRANSIT':
                    case 'DELIVERING':
                    case 'OUT_FOR_DELIVERY':
                        return {
                            label: 'ĐANG PHÁT HÀNG',
                            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
                            dotClass: 'bg-amber-600 animate-ping',
                            step: 3,
                            percent: 75
                        };
                    case 'DELIVERY_FAILED':
                        return {
                            label: 'PHÁT KHÔNG THÀNH',
                            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                            dotClass: 'bg-rose-600',
                            step: 3,
                            percent: 70
                        };
                    case 'DELIVERED':
                        return {
                            label: 'GIAO THÀNH CÔNG',
                            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            dotClass: 'bg-emerald-600',
                            step: 4,
                            percent: 100
                        };
                    case 'RETURNING':
                        return {
                            label: 'ĐANG HOÀN',
                            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                            dotClass: 'bg-rose-600 animate-ping',
                            step: 2,
                            percent: 40
                        };
                    case 'RETURNED':
                        return {
                            label: 'ĐÃ HOÀN',
                            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
                            dotClass: 'bg-rose-600',
                            step: 2,
                            percent: 100
                        };
                    case 'CANCELLED':
                        return {
                            label: 'ĐÃ HỦY',
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
                            Quý khách vui lòng nhập mã bưu gửi (ví dụ: <code>WB2026...</code>) vào ô chat bên dưới để em tra cứu chi tiết nhé.
                        `);
                    }

                } else if (action === 'calc') {
                    this.messages.push({
                        id: 'usr_' + Date.now(),
                        sender: 'user',
                        type: 'text',
                        text: 'Biểu cước vận chuyển',
                        time: this.getCurrentTime()
                    });
                    this.saveSessionMessages();
                    this.scrollToBottom();
                    await this.processUserIntent('Tính cước phí vận chuyển');

                } else if (action === 'claim') {
                    this.messages.push({
                        id: 'usr_' + Date.now(),
                        sender: 'user',
                        type: 'text',
                        text: 'Hướng dẫn khiếu nại bưu phẩm',
                        time: this.getCurrentTime()
                    });
                    this.saveSessionMessages();
                    this.scrollToBottom();
                    await this.processUserIntent('Hướng dẫn khiếu nại bưu phẩm');

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

            // Mở form khiếu nại thật, chưa tạo phiếu cho đến khi khách gửi
            initClaimFor(trackingCode) {
                const code = (trackingCode || '').trim();
                this.closeChat();
                const path = window.location.pathname || '';
                const onApp = path.includes('index.html') || path === '/' || path.endsWith('/');
                if (onApp) {
                    window.location.hash = 'support';
                    window.dispatchEvent(new CustomEvent('navigate-to-support', { detail: { trackingCode: code } }));
                    return;
                }
                try {
                    if (code) sessionStorage.setItem('supportTrackingCode', code);
                } catch (e) {}
                window.location.href = 'index.html#support';
            },

            triggerAttachmentAlert() {
                if (window.Utils && typeof window.Utils.showToast === 'function') {
                    window.Utils.showToast('Đính Kèm Biên Bản', 'Hệ thống đã sẵn sàng tiếp nhận ảnh chụp hàng vỡ hoặc biên bản giao nhận bưu tá.', 'info');
                } else {
                    alert('Đã sẵn sàng tải lên ảnh chụp sự cố bưu phẩm.');
                }
            },

            // BẬT / TẮT ÂM THANH THÔNG BÁO
            toggleMute() {
                this.isMuted = !this.isMuted;
                try {
                    localStorage.setItem('vnpt_chatbot_muted', this.isMuted ? 'true' : 'false');
                } catch (e) {}
                if (!this.isMuted) {
                    this.playNotificationSound();
                }
            },

            // PHÁT ÂM THANH CHUÔNG 2 NỐT BẰNG WEB AUDIO API (DỊU NHẸ, KHÔNG DÙNG FILE NGOÀI)
            playNotificationSound() {
                if (this.isMuted) return;
                try {
                    const AudioContext = window.AudioContext || window.webkitAudioContext;
                    if (!AudioContext) return;
                    if (!this.audioCtx) {
                        this.audioCtx = new AudioContext();
                    }
                    if (this.audioCtx.state === 'suspended') {
                        this.audioCtx.resume();
                    }
                    const ctx = this.audioCtx;
                    const now = ctx.currentTime;

                    // Nốt 1 (D5 ~ 587.33 Hz)
                    const osc1 = ctx.createOscillator();
                    const gain1 = ctx.createGain();
                    osc1.type = 'sine';
                    osc1.frequency.setValueAtTime(587.33, now);
                    gain1.gain.setValueAtTime(0, now);
                    gain1.gain.linearRampToValueAtTime(0.14, now + 0.02);
                    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
                    osc1.connect(gain1);
                    gain1.connect(ctx.destination);
                    osc1.start(now);
                    osc1.stop(now + 0.24);

                    // Nốt 2 (A5 ~ 880 Hz): nảy thanh thoát
                    const osc2 = ctx.createOscillator();
                    const gain2 = ctx.createGain();
                    osc2.type = 'sine';
                    osc2.frequency.setValueAtTime(880.00, now + 0.08);
                    gain2.gain.setValueAtTime(0, now + 0.08);
                    gain2.gain.linearRampToValueAtTime(0.18, now + 0.10);
                    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
                    osc2.connect(gain2);
                    gain2.connect(ctx.destination);
                    osc2.start(now + 0.08);
                    osc2.stop(now + 0.40);
                } catch (e) {
                    console.debug('[Chatbot Audio]:', e);
                }
            }
        }
    };

    // Đưa vào biến toàn cục để Vue App chính có thể nạp
    window.ChatbotWidget = ChatbotWidget;
})();
