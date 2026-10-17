(function () {
    const { ref, computed, watch, nextTick, onMounted, onUnmounted } = Vue;

    const template = `
    <Transition name="modal">
        <div 
            v-if="show" 
            class="fixed inset-0 z-[9990] overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 text-slate-800 dark:text-slate-100"
            @click.self="handleBackdropClick"
            @keydown.esc="closeModal"
            tabindex="-1"
            role="dialog"
            aria-modal="true"
        >
            <div 
                class="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-fade-slide transform transition-all"
            >
                <!-- Modal Header -->
                <div class="vnpt-gradient text-white p-4 sm:p-5 flex items-center justify-between relative overflow-hidden flex-shrink-0 shadow-md">
                    <div class="absolute inset-0 opacity-10 pointer-events-none" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 14px 14px;"></div>
                    <div class="relative z-10 flex items-center space-x-3 min-w-0 pr-2">
                        <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center font-black text-sm text-white shadow-inner flex-shrink-0">
                            WB
                        </div>
                        <div class="min-w-0">
                            <div class="flex flex-wrap items-center gap-2">
                                <h3 class="text-sm sm:text-base font-extrabold text-white tracking-tight leading-snug font-mono">
                                    {{ trackingCode || 'CHI TIẾT VẬN ĐƠN' }}
                                </h3>
                                <button 
                                    v-if="trackingCode" 
                                    type="button" 
                                    @click="copyCode" 
                                    :title="copiedTooltip ? 'Đã sao chép!' : 'Sao chép mã vận đơn'"
                                    class="px-2 py-0.5 rounded-md bg-white/20 hover:bg-white/30 text-[11px] font-mono font-bold text-white transition flex items-center space-x-1 cursor-pointer"
                                >
                                    <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                                    <span>{{ copiedTooltip ? 'Đã Chép' : 'Chép Mã' }}</span>
                                </button>
                                <span 
                                    v-if="shipment?.status"
                                    :class="['px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center space-x-1 shadow-2xs whitespace-nowrap', getStatusBadgeClass(shipment.status)]"
                                >
                                    <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    <span>{{ formatStatusText(shipment.status) }}</span>
                                </span>
                            </div>
                            <p class="text-[11px] text-blue-100/90 truncate mt-0.5 font-medium">
                                {{ routeSummaryText }}
                            </p>
                        </div>
                    </div>

                    <!-- Right Header Actions -->
                    <div class="relative z-10 flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                        <button 
                            type="button" 
                            @click="openFullTracking"
                            class="hidden sm:inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer border border-white/20 shadow-xs"
                            title="Mở toàn màn hình trên trang tra cứu"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            <span>Trang Đầy Đủ</span>
                        </button>

                        <button 
                            type="button" 
                            @click="printThermalLabel"
                            class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold transition cursor-pointer border border-white/20 shadow-xs inline-flex items-center space-x-1"
                            title="In phiếu gửi / Tem nhiệt"
                        >
                            <svg class="w-4 h-4 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            <span class="hidden sm:inline">In Tem</span>
                        </button>

                        <button 
                            type="button" 
                            @click="closeModal" 
                            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer border border-white/20 shadow-xs ml-1"
                            title="Đóng (ESC)"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>

                <!-- Modal Body (Scrollable) -->
                <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50 dark:bg-slate-900/60">
                    
                    <!-- Loading Skeleton -->
                    <div v-if="isLoading" class="py-12 text-center space-y-4">
                        <div class="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <div class="text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide">
                            Đang tải chi tiết bưu phẩm &amp; hành trình luân chuyển...
                        </div>
                    </div>

                    <!-- Error / Not Found State -->
                    <div v-else-if="errorMessage" class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center space-y-3">
                        <div class="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 flex items-center justify-center mx-auto">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        </div>
                        <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">Không thể tải thông tin vận đơn</h4>
                        <p class="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">{{ errorMessage }}</p>
                        <div class="pt-2">
                            <button 
                                type="button" 
                                @click="fetchData" 
                                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                            >
                                Thử Lại
                            </button>
                        </div>
                    </div>

                    <!-- Main Shipment Content -->
                    <template v-else-if="shipment">
                        
                        <!-- Checkpoint Progress Stepper -->
                        <div class="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/80 pb-3">
                                <div class="flex items-center space-x-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                                    <h4 class="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                        Tiến Trình Luân Chuyển Bưu Gửi
                                    </h4>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <button 
                                        type="button" 
                                        @click="toggleMap"
                                        class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                                        :class="isMapOpen 
                                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                            : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800'"
                                    >
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                        <span>{{ isMapOpen ? 'Ẩn Bản Đồ' : 'Bản Đồ Tuyến Đường' }}</span>
                                    </button>
                                </div>
                            </div>

                            <!-- Stepper Points (Desktop) -->
                            <div class="hidden sm:grid gap-2 relative text-center pt-2" :style="{ gridTemplateColumns: 'repeat(' + checkpoints.length + ', minmax(0, 1fr))' }">
                                <div class="absolute top-5 h-1 bg-slate-200 dark:bg-slate-700 z-0" :style="{ left: 'calc(' + (100 / (checkpoints.length * 2)) + '%)', right: 'calc(' + (100 / (checkpoints.length * 2)) + '%)' }">
                                    <div class="h-full bg-blue-600 transition-all duration-700" :style="{ width: ((currentCheckpointIndex / Math.max(1, checkpoints.length - 1)) * 100) + '%' }"></div>
                                </div>
                                <div v-for="(cp, idx) in checkpoints" :key="cp.key" class="relative z-10 flex flex-col items-center min-w-0 w-full px-0.5">
                                    <div 
                                        :class="[
                                            'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shadow-sm',
                                            idx < currentCheckpointIndex 
                                                ? 'bg-blue-600 text-white ring-4 ring-white dark:ring-slate-800' 
                                                : (idx === currentCheckpointIndex 
                                                    ? (isDelivered ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950' : 'bg-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/60') 
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-600')
                                        ]"
                                    >
                                        <svg v-if="idx < currentCheckpointIndex || (idx === currentCheckpointIndex && isDelivered)" class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                                        <span v-else>{{ idx + 1 }}</span>
                                    </div>
                                    <div 
                                        :class="[
                                            'text-[11px] font-bold mt-2 truncate max-w-full px-0.5',
                                            idx === currentCheckpointIndex 
                                                ? (isDelivered ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400') 
                                                : (idx < currentCheckpointIndex ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500')
                                        ]"
                                        :title="cp.stageName"
                                    >
                                        {{ cp.stageName }}
                                    </div>
                                    <div class="text-[10px] truncate max-w-full text-slate-400 dark:text-slate-500" :title="cp.displayName">
                                        {{ cp.displayName }}
                                    </div>
                                </div>
                            </div>

                            <!-- Stepper Points (Mobile Card) -->
                            <div class="sm:hidden p-3 rounded-xl border flex items-center justify-between" :class="isDelivered ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900' : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'">
                                <div class="flex items-center space-x-2.5">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white" :class="isDelivered ? 'bg-emerald-600' : 'bg-blue-600'">
                                        {{ currentCheckpointIndex + 1 }}
                                    </div>
                                    <div>
                                        <div class="text-xs font-bold" :class="isDelivered ? 'text-emerald-900 dark:text-emerald-300' : 'text-blue-900 dark:text-blue-300'">
                                            {{ checkpoints[currentCheckpointIndex]?.stageName || 'Đang Luân Chuyển' }}
                                        </div>
                                        <div class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            {{ checkpoints[currentCheckpointIndex]?.displayName }}
                                        </div>
                                    </div>
                                </div>
                                <span class="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {{ currentCheckpointIndex + 1 }}/{{ checkpoints.length }}
                                </span>
                            </div>

                            <!-- Collapsible Mini Map -->
                            <div v-show="isMapOpen" class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/80">
                                <div class="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                                    <div id="shipment-detail-modal-map" class="w-full h-full"></div>
                                </div>
                                <div class="mt-1.5 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 px-1">
                                    <span>Hành lang luân chuyển GIS Leaflet thời gian thực</span>
                                    <button type="button" @click="fitModalMapView" class="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer">
                                        Căn vừa toàn tuyến
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- 2-Column Info Matrix -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <!-- Column 1: Sender & Receiver Details -->
                            <div class="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                                <div class="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                                    <div class="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                                    </div>
                                    <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Thông Tin Gửi &amp; Nhận
                                    </h4>
                                </div>

                                <!-- Sender Block -->
                                <div class="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                                    <div class="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        <span>Người Gửi</span>
                                        <span class="font-mono text-slate-500">{{ shipment.senderProvince || 'Việt Nam' }}</span>
                                    </div>
                                    <div class="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {{ shipment.senderName || 'Người gửi' }}
                                    </div>
                                    <div class="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                                        {{ shipment.senderPhone || 'Không có SĐT' }}
                                    </div>
                                    <div class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                                        {{ shipment.senderAddress || ((shipment.senderDetail ? shipment.senderDetail + ', ' : '') + (shipment.senderProvince || '')) || 'Đang cập nhật địa chỉ gửi' }}
                                    </div>
                                </div>

                                <!-- Receiver Block -->
                                <div class="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-1">
                                    <div class="flex items-center justify-between text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                        <span>Người Nhận</span>
                                        <span class="font-mono text-blue-700 dark:text-blue-300">{{ shipment.receiverProvince || 'Việt Nam' }}</span>
                                    </div>
                                    <div class="text-xs font-black text-slate-900 dark:text-slate-50">
                                        {{ shipment.receiverName || 'Người nhận' }}
                                    </div>
                                    <div class="text-[11px] font-mono font-bold text-blue-700 dark:text-blue-300 flex items-center space-x-2">
                                        <span>{{ shipment.receiverPhone || 'Không có SĐT' }}</span>
                                        <a 
                                            v-if="shipment.receiverPhone" 
                                            :href="'tel:' + shipment.receiverPhone" 
                                            class="p-0.5 text-blue-600 hover:text-blue-800 dark:text-blue-400" 
                                            title="Gọi điện người nhận"
                                        >
                                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                                        </a>
                                    </div>
                                    <div class="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                                        {{ shipment.receiverAddress || ((shipment.receiverDetail ? shipment.receiverDetail + ', ' : '') + (shipment.receiverProvince || '')) || 'Đang cập nhật địa chỉ nhận' }}
                                    </div>
                                </div>

                                <!-- Delivery Note if present -->
                                <div v-if="shipment.deliveryNote || shipment.note" class="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl p-2.5">
                                    <strong class="font-bold">Ghi chú giao hàng:</strong> {{ shipment.deliveryNote || shipment.note }}
                                </div>
                            </div>

                            <!-- Column 2: Package Specs & Financials -->
                            <div class="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                                <div class="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                                    <div class="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Kiện Hàng &amp; Tài Chính
                                    </h4>
                                </div>

                                <!-- Financial Matrix -->
                                <div class="grid grid-cols-2 gap-2.5">
                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tiền Thu Hộ (COD)</div>
                                        <div class="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                                            {{ Number(shipment.codAmount || 0).toLocaleString('vi-VN') }} đ
                                        </div>
                                        <div class="text-[10px] mt-0.5 font-semibold" :class="isPaid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'">
                                            {{ isPaid ? 'Đã thanh toán trên hệ thống' : (Number(shipment.codAmount || 0) > 0 ? 'Bưu tá thu khi giao' : 'Không thu COD') }}
                                        </div>
                                    </div>

                                    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700">
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cước Vận Chuyển</div>
                                        <div class="text-base font-black font-mono text-blue-700 dark:text-blue-400 mt-1">
                                            {{ Number(shipment.shippingFee || shipment.totalFee || 0).toLocaleString('vi-VN') }} đ
                                        </div>
                                        <div class="text-[10px] mt-0.5 font-bold" :class="isPaid ? 'text-emerald-600' : 'text-amber-600'">
                                            {{ isPaid ? 'Đã Thanh Toán' : 'Chưa Thanh Toán' }}
                                        </div>
                                    </div>
                                </div>

                                <!-- Package Specs -->
                                <div class="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-400 text-[11px]">Trọng lượng kiện:</span>
                                        <span class="font-mono font-bold text-slate-800 dark:text-slate-200">{{ formatWeight(shipment.weight) }}</span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-400 text-[11px]">Kích thước bao bì:</span>
                                        <span class="font-mono font-bold text-slate-800 dark:text-slate-200">
                                            {{ (shipment.length || 10) }} x {{ (shipment.width || 10) }} x {{ (shipment.height || 10) }} cm
                                        </span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-400 text-[11px]">Dịch vụ vận chuyển:</span>
                                        <span class="font-bold text-blue-700 dark:text-blue-300">
                                            {{ shipment.serviceType === 'EXPRESS' ? 'Hỏa Tốc Tuyến Trục (Express)' : 'Tiêu Chuẩn Đường Bộ' }}
                                        </span>
                                    </div>
                                    <div class="flex items-center justify-between">
                                        <span class="text-slate-400 text-[11px]">Giao dự kiến (ETA):</span>
                                        <span class="font-bold text-emerald-700 dark:text-emerald-400">
                                            {{ etaFormatted }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Action History Timeline -->
                        <div class="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
                            <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/80 pb-2.5">
                                <div class="flex items-center space-x-2">
                                    <div class="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
                                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                    <h4 class="font-extrabold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Nhật Ký Quét Mã &amp; Sự Kiện Toàn Trình ({{ historyEvents.length }})
                                    </h4>
                                </div>
                                <span class="text-[11px] text-slate-400 font-mono">Dữ liệu thời gian thực</span>
                            </div>

                            <div v-if="historyEvents.length === 0" class="py-6 text-center text-xs text-slate-400 italic">
                                Chưa có sự kiện quét mã bổ sung cho vận đơn này.
                            </div>

                            <div v-else class="space-y-3 relative pl-4 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                                <div 
                                    v-for="(event, idx) in historyEvents" 
                                    :key="idx" 
                                    class="relative pl-4 text-xs space-y-0.5"
                                >
                                    <span 
                                        :class="[
                                            'absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-800',
                                            idx === 0 ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                                        ]"
                                    ></span>
                                    <div class="flex flex-wrap items-center justify-between gap-1">
                                        <span class="font-bold text-slate-800 dark:text-slate-100">
                                            {{ event.title || event.note || event.locationCode || 'Cập nhật trạng thái' }}
                                        </span>
                                        <span class="text-[11px] font-mono text-slate-400">
                                            {{ formatTime(event.timestamp || event.createdAt) }}
                                        </span>
                                    </div>
                                    <p v-if="event.description || event.note" class="text-[11.5px] text-slate-500 dark:text-slate-400">
                                        {{ event.description || event.note }}
                                    </p>
                                    <div v-if="event.locationCode || event.node" class="text-[10px] font-mono text-blue-600 dark:text-blue-400">
                                        Điểm xử lý: {{ event.locationCode || event.node }}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </template>
                </div>

                <!-- Modal Footer -->
                <div class="p-3.5 sm:p-4 px-4 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2.5 flex-shrink-0">
                    <div class="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
                        Waybill Platform • Bấm <kbd class="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 border rounded">ESC</kbd> hoặc click ngoài để đóng
                    </div>

                    <div class="flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button 
                            type="button" 
                            @click="copyCode" 
                            class="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center space-x-1"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                            <span>{{ copiedTooltip ? 'Đã Chép' : 'Sao Chép Mã' }}</span>
                        </button>

                        <button 
                            type="button" 
                            @click="printThermalLabel" 
                            class="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition cursor-pointer flex items-center space-x-1.5"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                            <span>In Phiếu Gửi</span>
                        </button>

                        <button 
                            type="button" 
                            @click="closeModal" 
                            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                        >
                            Đóng
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </Transition>
    `;

    const ShipmentDetailModal = {
        name: 'ShipmentDetailModal',
        template,
        props: {
            show: { type: Boolean, default: false },
            trackingCode: { type: String, default: '' }
        },
        emits: ['close', 'open-full-tracking', 'print-shipment'],
        setup(props, { emit }) {
            const isLoading = ref(false);
            const errorMessage = ref('');
            const shipment = ref(null);
            const trackingHistory = ref([]);
            const copiedTooltip = ref(false);
            const isMapOpen = ref(true);
            const paymentVerified = ref(false);
            let modalMapInstance = null;
            let modalMarkersLayer = null;
            let modalRenderTimer = null;

            // Helper to extract province name from full address string
            const extractProvinceFromAddress = (address, fallback = '') => {
                if (!address || typeof address !== 'string') return fallback;
                const mgr = window.MapManager;
                if (mgr) {
                    const po = typeof mgr.getPostOfficeForAddress === 'function' ? mgr.getPostOfficeForAddress(address) : null;
                    if (po?.province) return po.province;
                    const hub = typeof mgr.getCentralHubForAddress === 'function' ? mgr.getCentralHubForAddress(address) : null;
                    if (hub?.province) return hub.province;
                }
                const parts = address.split(',').map(p => p.trim()).filter(Boolean);
                return parts.length > 0 ? parts[parts.length - 1] : fallback;
            };

            // Compute route string
            const routeSummaryText = computed(() => {
                if (!shipment.value) return 'Đang cập nhật lộ trình...';
                const orig = shipment.value.originPostOfficeName || shipment.value.originPostOffice || shipment.value.senderProvince || 'Bưu cục gửi';
                const hub = shipment.value.destHubName || shipment.value.destinationHub || 'Siêu Hub';
                const dest = shipment.value.destPostOfficeName || shipment.value.destPostOffice || shipment.value.receiverProvince || 'Bưu cục phát';
                return `${orig} → ${hub} → ${dest}`;
            });

            // Delivery check
            const isDelivered = computed(() => {
                return shipment.value?.status === 'DELIVERED';
            });

            // Payment check
            const isPaid = computed(() => {
                return Boolean(
                    paymentVerified.value ||
                    shipment.value?.paymentStatus === 'PAID' ||
                    shipment.value?.isPaid === true ||
                    shipment.value?.codSettlementStatus === 'SETTLED'
                );
            });

            // Checkpoints calculation
            const checkpoints = computed(() => {
                const origName = shipment.value?.originPostOfficeName || shipment.value?.originPostOffice || 'Bưu Cục Gửi';
                const hubName = shipment.value?.destHubName || shipment.value?.destinationHub || 'Siêu Hub Phân Loại';
                const destPoName = shipment.value?.destPostOfficeName || shipment.value?.destPostOffice || 'Bưu Cục Phát';
                const recName = shipment.value?.receiverName ? `Giao: ${shipment.value.receiverName}` : 'Phát Tận Nơi';

                return [
                    { key: 'created', stageName: 'Tạo Vận Đơn', displayName: origName },
                    { key: 'picked_up', stageName: 'Gom Hàng / Xuất Kho', displayName: origName },
                    { key: 'hub', stageName: 'Tại Siêu Hub', displayName: hubName },
                    { key: 'dest_po', stageName: 'Đến Bưu Cục Phát', displayName: destPoName },
                    { key: 'out_for_delivery', stageName: 'Đang Giao Hàng', displayName: 'Bưu Tá Đi Phát' },
                    { key: 'delivered', stageName: 'Giao Thành Công', displayName: recName }
                ];
            });

            const currentCheckpointIndex = computed(() => {
                const st = shipment.value?.status;
                if (!st) return 0;
                switch (st) {
                    case 'CREATED':
                    case 'PENDING_ROUTING':
                        return 0;
                    case 'ROUTE_ASSIGNED':
                    case 'PICKED_UP':
                        return 1;
                    case 'IN_TRANSIT':
                        return 2;
                    case 'ARRIVED_DEST_HUB':
                        return 3;
                    case 'OUT_FOR_DELIVERY':
                        return 4;
                    case 'DELIVERED':
                    case 'RETURNING':
                    case 'OUT_FOR_RETURN':
                    case 'RETURNED':
                        return 5;
                    default:
                        return 1;
                }
            });

            // Tracking history events
            const historyEvents = computed(() => {
                if (trackingHistory.value && trackingHistory.value.length > 0) {
                    return [...trackingHistory.value].reverse();
                }
                if (shipment.value?.history && Array.isArray(shipment.value.history)) {
                    return [...shipment.value.history].reverse();
                }
                return [];
            });

            // Format ETA
            const etaFormatted = computed(() => {
                if (!shipment.value) return '1-2 ngày';
                if (window.Utils && typeof window.Utils.formatEtaDateRange === 'function') {
                    const range = window.Utils.formatEtaDateRange(
                        shipment.value.estimatedDeliveryAt,
                        shipment.value.estimatedDeliveryMax
                    );
                    if (range && range.dateRange) return range.dateRange;
                }
                return '1-2 ngày tới';
            });

            // Helper methods
            const formatWeight = (w) => {
                if (!w) return '500 gram';
                const num = Number(w);
                if (num < 5) return `${Math.round(num * 1000)} gram (${num} kg)`;
                return `${num} kg`;
            };

            const formatTime = (ts) => {
                if (!ts) return '';
                try {
                    const d = new Date(ts);
                    return d.toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                } catch {
                    return String(ts);
                }
            };

            const getStatusBadgeClass = (status) => {
                if (window.Utils && typeof window.Utils.getStatusBadgeClass === 'function') {
                    return window.Utils.getStatusBadgeClass(status);
                }
                if (status === 'DELIVERED') return 'bg-emerald-50 text-emerald-700 border-emerald-300';
                if (status === 'CANCELLED') return 'bg-rose-50 text-rose-700 border-rose-300';
                return 'bg-blue-50 text-blue-700 border-blue-300';
            };

            const formatStatusText = (status) => {
                if (window.Utils && typeof window.Utils.formatStatusText === 'function') {
                    return window.Utils.formatStatusText(status);
                }
                return status || 'Đang luân chuyển';
            };

            // Copy code
            const copyCode = async () => {
                if (!props.trackingCode) return;
                try {
                    if (navigator.clipboard) {
                        await navigator.clipboard.writeText(props.trackingCode);
                    }
                    copiedTooltip.value = true;
                    setTimeout(() => { copiedTooltip.value = false; }, 2000);
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Đã Sao Chép', `Mã bưu gửi ${props.trackingCode} đã được lưu vào bộ nhớ tạm`, 'info');
                    }
                } catch (e) {
                    console.warn('[ShipmentDetailModal] Không thể chép mã:', e);
                }
            };

            // Close modal
            const closeModal = () => {
                destroyMap();
                emit('close');
            };

            const handleBackdropClick = () => {
                closeModal();
            };

            // Open full tracking
            const openFullTracking = () => {
                destroyMap();
                emit('open-full-tracking', props.trackingCode);
            };

            // Print thermal bill
            const printThermalLabel = () => {
                if (!shipment.value) return;
                const sh = shipment.value;
                const printWindow = window.open('', '', 'width=600,height=720');
                if (!printWindow) {
                    if (window.Utils && window.Utils.showToast) {
                        window.Utils.showToast('Thông Báo', 'Trình duyệt đang chặn mở cửa sổ in ấn. Vui lòng bật quyền pop-up!', 'warning');
                    }
                    return;
                }
                const senderAddrText = sh.senderAddress || [sh.senderDetail, sh.senderProvince].filter(Boolean).join(', ') || '';
                const receiverAddrText = sh.receiverAddress || [sh.receiverDetail, sh.receiverProvince].filter(Boolean).join(', ') || '';
                const html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <title>In Phiếu Gửi - ${sh.trackingCode || ''}</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 15px; margin: 0; background: #fff; color: #111; }
                            * { box-sizing: border-box; }
                            .bill-box { border: 2px solid #000; border-radius: 8px; padding: 12px; max-width: 440px; margin: 0 auto; }
                            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; }
                            .logo { font-size: 18px; font-weight: 900; color: #0055bb; }
                            .badge { font-size: 11px; font-weight: 700; border: 1px solid #000; padding: 2px 6px; border-radius: 4px; }
                            .barcode-box { text-align: center; padding: 12px 0; border-bottom: 1px dashed #666; }
                            .barcode-num { font-size: 20px; font-weight: 900; font-family: monospace; letter-spacing: 2px; }
                            .barcode-bars { height: 40px; display: flex; justify-content: center; align-items: center; gap: 2px; margin: 4px 0; }
                            .bar { height: 100%; background: #000; width: 1.5px; }
                            .bar.thick { width: 3px; }
                            .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; border-bottom: 2px solid #000; padding: 10px 0; }
                            .col-title { font-size: 9.5px; font-weight: bold; text-transform: uppercase; color: #555; }
                            .finance { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
                            .finance-card { border: 1.5px solid #000; padding: 8px; border-radius: 6px; text-align: center; }
                            .cod-val { font-size: 15px; font-weight: 900; font-family: monospace; color: #0055bb; }
                            .footer-note { font-size: 9px; text-align: center; font-style: italic; color: #666; margin-top: 8px; }
                        </style>
                    </head>
                    <body>
                        <div class="bill-box">
                            <div class="header">
                                <span class="logo">WAYBILL POST</span>
                                <span class="badge">${sh.serviceType === 'EXPRESS' ? 'HỎA TỐC' : 'TIÊU CHUẨN'}</span>
                                <span style="font-family: monospace; font-size: 12px; font-weight: bold;">${sh.trackingCode || ''}</span>
                            </div>
                            <div class="barcode-box">
                                <div class="barcode-num">${sh.trackingCode || ''}</div>
                                <div class="barcode-bars">
                                    ${Array.from({ length: 36 }).map((_, i) => `<span class="bar ${i % 3 === 0 ? 'thick' : ''}"></span>`).join('')}
                                </div>
                                <div style="font-size: 10px; font-family: monospace;">*${sh.trackingCode || ''}*</div>
                            </div>
                            <div class="grid-info">
                                <div style="border-right: 1px solid #ccc; padding-right: 6px;">
                                    <div class="col-title">NGƯỜI GỬI:</div>
                                    <div style="font-weight: bold;">${sh.senderName || 'Người gửi'}</div>
                                    <div>${sh.senderPhone || ''}</div>
                                    <div style="color: #444;">${senderAddrText}</div>
                                </div>
                                <div>
                                    <div class="col-title" style="color: #0055bb;">NGƯỜI NHẬN:</div>
                                    <div style="font-weight: 900;">${sh.receiverName || 'Người nhận'}</div>
                                    <div style="font-weight: bold;">${sh.receiverPhone || ''}</div>
                                    <div style="color: #222;">${receiverAddrText}</div>
                                </div>
                            </div>
                            <div class="finance">
                                <div class="finance-card">
                                    <div class="col-title">TIỀN THU HỘ COD</div>
                                    <div class="cod-val">${isPaid.value ? '0 đ (ĐÃ THANH TOÁN)' : (Number(sh.codAmount || 0).toLocaleString('vi-VN') + ' đ')}</div>
                                </div>
                                <div class="finance-card">
                                    <div class="col-title">TRỌNG LƯỢNG</div>
                                    <div style="font-size: 14px; font-weight: bold; font-family: monospace;">${sh.weight || 0.5} kg</div>
                                </div>
                            </div>
                            <div class="footer-note">
                                * Quý khách vui lòng đồng kiểm cùng bưu tá khi nhận kiện. Tổng đài hỗ trợ: 1900 54 54 81
                            </div>
                        </div>
                        <script>
                            window.onload = function() { window.print(); window.close(); };
                        <\/script>
                    </body>
                    </html>
                `;
                printWindow.document.write(html);
                printWindow.document.close();
            };

            // Map logic
            const ensureModalMapReady = (attempt = 0) => {
                if (!props.show || !isMapOpen.value || !shipment.value) return;
                nextTick(() => {
                    const container = document.getElementById('shipment-detail-modal-map');
                    if (!container || container.offsetWidth === 0 || container.offsetHeight === 0) {
                        if (attempt < 10) {
                            modalRenderTimer = setTimeout(() => ensureModalMapReady(attempt + 1), 80);
                        }
                        return;
                    }
                    initModalMap();
                });
            };

            const toggleMap = () => {
                isMapOpen.value = !isMapOpen.value;
                if (isMapOpen.value) {
                    ensureModalMapReady(0);
                } else {
                    destroyMap();
                }
            };

            const initModalMap = () => {
                const container = document.getElementById('shipment-detail-modal-map');
                if (!container || typeof window.L === 'undefined') return;

                if (modalMapInstance && !container._leaflet_id) {
                    destroyMap();
                }

                if (!modalMapInstance) {
                    modalMapInstance = window.L.map('shipment-detail-modal-map', {
                        zoomControl: false,
                        attributionControl: false,
                        minZoom: 4,
                        maxZoom: 20
                    }).setView([16.047079, 108.206230], 5);

                    window.L.control.zoom({ position: 'bottomright' }).addTo(modalMapInstance);

                    const isDark = document.documentElement.classList.contains('dark');
                    const BLANK_TILE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

                    window.L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=vi', {
                        subdomains: ['0', '1', '2', '3'],
                        maxZoom: 20,
                        keepBuffer: 4,
                        updateWhenIdle: false,
                        className: isDark ? 'map-tiles-night' : '',
                        errorTileUrl: BLANK_TILE
                    }).addTo(modalMapInstance);

                    modalMarkersLayer = window.L.featureGroup().addTo(modalMapInstance);
                }

                drawModalRoute();
            };

            const drawModalRoute = () => {
                if (!modalMapInstance || !modalMarkersLayer || !window.L || !shipment.value) return;
                modalMarkersLayer.clearLayers();

                const L = window.L;
                const mgr = window.MapManager;
                const sh = shipment.value;
                const status = sh.status || 'CREATED';
                const history = Array.isArray(trackingHistory.value) ? trackingHistory.value : [];

                const sourceHub = sh.sourceHub || 'HUB-HN-01';
                const destHub = sh.destinationHub || 'HUB-HCM-01';
                const originPostOffice = sh.originPostOffice || null;
                const destPostOffice = sh.destPostOffice || null;

                const getCoord = (code) => (mgr && typeof mgr.getHubCoord === 'function' ? mgr.getHubCoord(code) : null);
                const sourceCoord = getCoord(sourceHub) || { name: 'Kho Tổng Hà Nội', lat: 21.028511, lng: 105.782000 };
                const destCoord = getCoord(destHub) || { name: 'Kho Tổng TP. Hồ Chí Minh', lat: 10.823099, lng: 106.629664 };
                const originPostCoord = getCoord(originPostOffice);
                const destPostCoord = getCoord(destPostOffice);

                let recipientCoord = null;
                if (Number.isFinite(Number(sh.receiverLatitude)) && Number.isFinite(Number(sh.receiverLongitude))) {
                    recipientCoord = [Number(sh.receiverLatitude), Number(sh.receiverLongitude)];
                }

                // 1. Origin Post Office Marker & Feeder Line
                if (originPostCoord && (originPostCoord.lat !== sourceCoord.lat || originPostCoord.lng !== sourceCoord.lng)) {
                    const origIcon = L.divIcon({ className: 'hub-pin-postoffice', iconSize: [14, 14], iconAnchor: [7, 7] });
                    L.marker([originPostCoord.lat, originPostCoord.lng], { icon: origIcon })
                        .bindPopup(`
                            <div class="text-xs p-1 min-w-[200px]">
                                <div class="font-bold text-purple-700 text-[11px] uppercase">Bưu Cục Tiếp Nhận (Gửi)</div>
                                <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${originPostCoord.name} <span class="text-purple-600 font-mono text-[10px]">(${originPostOffice})</span></div>
                                <div class="text-slate-600 text-[10.5px] mt-1">${originPostCoord.address || ''}</div>
                            </div>
                        `)
                        .addTo(modalMarkersLayer);

                    const isOriginCompleted = ['PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
                    L.polyline([
                        [originPostCoord.lat, originPostCoord.lng],
                        [sourceCoord.lat, sourceCoord.lng]
                    ], {
                        color: '#7c3aed',
                        weight: isOriginCompleted ? 4 : 3,
                        opacity: isOriginCompleted ? 0.95 : 0.75,
                        dashArray: isOriginCompleted ? null : '4, 4'
                    }).addTo(modalMarkersLayer);
                }

                // 2. Source Hub Marker
                const sourceIcon = L.divIcon({ className: 'hub-pin-source', iconSize: [16, 16], iconAnchor: [8, 8] });
                L.marker([sourceCoord.lat, sourceCoord.lng], { icon: sourceIcon })
                    .bindPopup(`
                        <div class="text-xs p-1 min-w-[200px]">
                            <div class="font-bold text-blue-700 text-[11px] uppercase">Kho Tổng Xuất Phát (Cấp 1)</div>
                            <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${sourceCoord.name} <span class="text-blue-600 font-mono text-[10px]">(${sourceHub})</span></div>
                            <div class="text-slate-600 text-[10.5px] mt-1">${sourceCoord.address || ''}</div>
                        </div>
                    `)
                    .addTo(modalMarkersLayer);

                // 3. Destination Hub Marker
                const destIcon = L.divIcon({ className: 'hub-pin-dest', iconSize: [16, 16], iconAnchor: [8, 8] });
                L.marker([destCoord.lat, destCoord.lng], { icon: destIcon })
                    .bindPopup(`
                        <div class="text-xs p-1 min-w-[200px]">
                            <div class="font-bold text-amber-700 text-[11px] uppercase">Kho Tổng Đích (Cấp 1)</div>
                            <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${destCoord.name} <span class="text-amber-600 font-mono text-[10px]">(${destHub})</span></div>
                            <div class="text-slate-600 text-[10.5px] mt-1">${destCoord.address || ''}</div>
                        </div>
                    `)
                    .addTo(modalMarkersLayer);

                // 4. Transit Hub Marker (e.g. HUB-DN-01 on North-South route or history hubs)
                const renderedHubs = new Set([sourceHub, destHub]);
                const isNorthSouth = (sourceHub === 'HUB-HN-01' && destHub === 'HUB-HCM-01') || (sourceHub === 'HUB-HCM-01' && destHub === 'HUB-HN-01');
                if (isNorthSouth) {
                    const dnCoord = getCoord('HUB-DN-01');
                    if (dnCoord) {
                        renderedHubs.add('HUB-DN-01');
                        const transitIcon = L.divIcon({ className: 'hub-pin-transit', iconSize: [12, 12], iconAnchor: [6, 6] });
                        L.marker([dnCoord.lat, dnCoord.lng], { icon: transitIcon })
                            .bindPopup(`
                                <div class="text-xs p-1 min-w-[200px]">
                                    <div class="font-bold text-slate-800 text-[11px] uppercase">Trạm Trung Chuyển Miền Trung</div>
                                    <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${dnCoord.name} <span class="text-slate-500 font-mono text-[10px]">(HUB-DN-01)</span></div>
                                </div>
                            `)
                            .addTo(modalMarkersLayer);
                    }
                }
                history.forEach(item => {
                    const loc = item && (item.locationCode || item.location);
                    if (loc && loc.startsWith('HUB-') && !renderedHubs.has(loc)) {
                        renderedHubs.add(loc);
                        const transCoord = getCoord(loc);
                        if (transCoord) {
                            const transitIcon = L.divIcon({ className: 'hub-pin-transit', iconSize: [12, 12], iconAnchor: [6, 6] });
                            L.marker([transCoord.lat, transCoord.lng], { icon: transitIcon })
                                .bindPopup(`<div class="text-xs p-1"><b>Trạm Trung Chuyển:</b> ${transCoord.name} (${loc})</div>`)
                                .addTo(modalMarkersLayer);
                        }
                    }
                });

                // 5. Destination Post Office Marker & Feeder Line
                if (destPostCoord && (destPostCoord.lat !== destCoord.lat || destPostCoord.lng !== destCoord.lng)) {
                    const destPostIcon = L.divIcon({ className: 'hub-pin-delivery-post', iconSize: [14, 14], iconAnchor: [7, 7] });
                    L.marker([destPostCoord.lat, destPostCoord.lng], { icon: destPostIcon })
                        .bindPopup(`
                            <div class="text-xs p-1 min-w-[200px]">
                                <div class="font-bold text-emerald-700 text-[11px] uppercase">Bưu Cục Phát Địa Phương</div>
                                <div class="font-semibold text-slate-800 text-[11.5px] mt-0.5">${destPostCoord.name} <span class="text-emerald-600 font-mono text-[10px]">(${destPostOffice})</span></div>
                                <div class="text-slate-600 text-[10.5px] mt-1">${destPostCoord.address || ''}</div>
                            </div>
                        `)
                        .addTo(modalMarkersLayer);

                    const isDestCompleted = ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status);
                    L.polyline([
                        [destCoord.lat, destCoord.lng],
                        [destPostCoord.lat, destPostCoord.lng]
                    ], {
                        color: '#ea580c',
                        weight: isDestCompleted ? 4 : 3,
                        opacity: isDestCompleted ? 0.95 : 0.75,
                        dashArray: isDestCompleted ? null : '4, 4'
                    }).addTo(modalMarkersLayer);
                }

                // 6. Recipient Customer Marker & Last-Mile Line
                if (recipientCoord) {
                    const custIcon = L.divIcon({ className: 'customer-pin', iconSize: [16, 16], iconAnchor: [8, 8] });
                    L.marker(recipientCoord, { icon: custIcon })
                        .bindPopup(`
                            <div class="text-xs p-1 min-w-[200px]">
                                <div class="font-bold text-emerald-700 text-[11px] uppercase">Điểm Giao Tận Tay Khách Hàng</div>
                                <div class="text-slate-800 text-[11px] mt-0.5 font-semibold">${sh.receiverName ? sh.receiverName + ' - ' : ''}${sh.receiverAddress || ''}</div>
                            </div>
                        `)
                        .addTo(modalMarkersLayer);

                    if (destPostCoord) {
                        const delivered = status === 'DELIVERED';
                        const delivering = status === 'OUT_FOR_DELIVERY';
                        L.polyline([
                            [destPostCoord.lat, destPostCoord.lng],
                            recipientCoord
                        ], {
                            color: '#059669',
                            weight: delivered ? 4 : (delivering ? 3.5 : 2.5),
                            opacity: (delivered || delivering) ? 0.95 : 0.5,
                            dashArray: delivered ? null : (delivering ? '4, 4' : '6, 8')
                        }).addTo(modalMarkersLayer);
                    }
                }

                // 7. Build Linehaul Corridor Route Points (from cache or Vietnam corridor waypoints)
                let routePoints = [];
                const cacheKey = `${sourceHub}_${destHub}`;
                const cached = mgr && (mgr.routeCache?.[cacheKey] || (typeof mgr.readPersistedRoute === 'function' ? mgr.readPersistedRoute(cacheKey) : null));
                if (cached && Array.isArray(cached.routePoints) && cached.routePoints.length > 1) {
                    routePoints = cached.routePoints;
                } else if (mgr && typeof mgr.buildVietnamWaypoints === 'function') {
                    const fallbackWps = mgr.buildVietnamWaypoints(sourceCoord, destCoord);
                    for (let w = 0; w < fallbackWps.length - 1; w++) {
                        const p1 = fallbackWps[w];
                        const p2 = fallbackWps[w + 1];
                        for (let i = 0; i <= 10; i++) {
                            const t = i / 10;
                            routePoints.push([
                                p1.lat + (p2.lat - p1.lat) * t,
                                p1.lng + (p2.lng - p1.lng) * t
                            ]);
                        }
                    }
                } else {
                    routePoints = [
                        [sourceCoord.lat, sourceCoord.lng],
                        [destCoord.lat, destCoord.lng]
                    ];
                }

                const statusRatios = mgr?.STATUS_RATIOS || {
                    CREATED: 0, PENDING_ROUTING: 0, ROUTE_ASSIGNED: 0, PICKED_UP: 0,
                    IN_TRANSIT: 0.5, ARRIVED_DEST_HUB: 1, OUT_FOR_DELIVERY: 1, DELIVERED: 1, DELIVERY_FAILED: 1
                };
                let ratio = statusRatios[status] !== undefined ? statusRatios[status] : 0;
                let targetIdx = Math.min(routePoints.length - 1, Math.max(0, Math.round(ratio * (routePoints.length - 1))));

                // Check latest history location if IN_TRANSIT
                let matchedHubCoord = null;
                if (history.length > 0 && mgr?.hubCoordinates) {
                    const latestItem = history[history.length - 1];
                    const locCode = latestItem?.locationCode;
                    const noteText = latestItem?.note || latestItem?.node || '';
                    if (locCode && mgr.hubCoordinates[locCode]) {
                        matchedHubCoord = mgr.hubCoordinates[locCode];
                    } else if (noteText) {
                        const foundCode = Object.keys(mgr.hubCoordinates).find(c => noteText.includes(c));
                        if (foundCode) matchedHubCoord = mgr.hubCoordinates[foundCode];
                    }
                }

                if (status === 'IN_TRANSIT' && matchedHubCoord && routePoints.length > 1) {
                    let bestIdx = 0;
                    let minDist = Infinity;
                    for (let i = 0; i < routePoints.length; i++) {
                        const d = Math.hypot(routePoints[i][0] - matchedHubCoord.lat, routePoints[i][1] - matchedHubCoord.lng);
                        if (d < minDist) {
                            minDist = d;
                            bestIdx = i;
                        }
                    }
                    targetIdx = bestIdx;
                    ratio = bestIdx / (routePoints.length - 1);
                }

                const isPreTransit = ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP'].includes(status) || ratio === 0;
                if (!isPreTransit && routePoints.length > 1) {
                    const completedCoords = routePoints.slice(0, targetIdx + 1);
                    if (completedCoords.length > 1) {
                        L.polyline(completedCoords, {
                            color: '#0066cc',
                            weight: 4.5,
                            opacity: 0.95,
                            lineJoin: 'round',
                            lineCap: 'round'
                        }).addTo(modalMarkersLayer);
                    }
                }

                const remainingCoords = isPreTransit ? routePoints : routePoints.slice(targetIdx);
                if (remainingCoords.length > 1) {
                    L.polyline(remainingCoords, {
                        color: '#6366f1',
                        weight: 4,
                        opacity: 0.85,
                        dashArray: '4, 6',
                        lineJoin: 'round',
                        lineCap: 'round'
                    }).addTo(modalMarkersLayer);
                }

                // 8. Live Current Status Pin (Radar Marker)
                let currentPoint = routePoints[targetIdx] || [sourceCoord.lat, sourceCoord.lng];
                let percent = Math.round(ratio * 100);

                if (['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED'].includes(status)) {
                    currentPoint = originPostCoord ? [originPostCoord.lat, originPostCoord.lng] : [sourceCoord.lat, sourceCoord.lng];
                    percent = 0;
                } else if (status === 'PICKED_UP') {
                    currentPoint = [sourceCoord.lat, sourceCoord.lng];
                    percent = 0;
                } else if (status === 'IN_TRANSIT' && matchedHubCoord) {
                    currentPoint = [matchedHubCoord.lat, matchedHubCoord.lng];
                } else if (status === 'ARRIVED_DEST_HUB') {
                    currentPoint = [destCoord.lat, destCoord.lng];
                    percent = 100;
                } else if (status === 'OUT_FOR_DELIVERY' || status === 'DELIVERY_FAILED') {
                    if (destPostCoord && recipientCoord) {
                        currentPoint = [(destPostCoord.lat + recipientCoord[0]) / 2, (destPostCoord.lng + recipientCoord[1]) / 2];
                    } else if (destPostCoord) {
                        currentPoint = [destPostCoord.lat, destPostCoord.lng];
                    } else {
                        currentPoint = [destCoord.lat, destCoord.lng];
                    }
                    percent = 100;
                } else if (status === 'DELIVERED') {
                    if (recipientCoord) {
                        currentPoint = recipientCoord;
                    } else if (destPostCoord) {
                        currentPoint = [destPostCoord.lat, destPostCoord.lng];
                    } else {
                        currentPoint = [destCoord.lat, destCoord.lng];
                    }
                    percent = 100;
                }

                const statusNames = mgr?.STATUS_NAMES || {};
                const labelText = statusNames[status] || formatStatusText(status);
                const subText = (status === 'IN_TRANSIT' && matchedHubCoord)
                    ? `ĐÃ CẬP BẾN: ${matchedHubCoord.name}`
                    : `TIẾN ĐỘ: ${percent}%`;
                const tooltipHtml = `
                    <div style="font-size: 11px; font-weight: 700; color: #0f172a;">${labelText}</div>
                    <div style="font-size: 10px; color: #0066cc; font-family: monospace; font-weight: 600;">${subText}</div>
                `;
                const radarIcon = L.divIcon({
                    className: 'hub-pin-current',
                    iconSize: [18, 18],
                    iconAnchor: [9, 9]
                });
                L.marker(currentPoint, { icon: radarIcon, zIndexOffset: 1000 })
                    .bindTooltip(tooltipHtml, { permanent: true, direction: 'top', offset: [0, -10], className: 'radar-tooltip' })
                    .addTo(modalMarkersLayer);

                fitModalMapView();
            };

            const fitModalMapView = () => {
                if (modalMapInstance && modalMarkersLayer && modalMarkersLayer.getLayers().length > 0) {
                    try {
                        modalMapInstance.invalidateSize();
                        modalMapInstance.fitBounds(modalMarkersLayer.getBounds(), { padding: [32, 32], maxZoom: 14 });
                        setTimeout(() => {
                            if (modalMapInstance && modalMarkersLayer && modalMarkersLayer.getLayers().length > 0) {
                                modalMapInstance.invalidateSize();
                                modalMapInstance.fitBounds(modalMarkersLayer.getBounds(), { padding: [32, 32], maxZoom: 14 });
                            }
                        }, 180);
                    } catch (e) {
                        console.warn('[ShipmentDetailModal] Căn chỉnh bản đồ:', e);
                    }
                }
            };

            const destroyMap = () => {
                if (modalRenderTimer) {
                    clearTimeout(modalRenderTimer);
                    modalRenderTimer = null;
                }
                if (modalMapInstance) {
                    try {
                        modalMapInstance.remove();
                    } catch (e) {
                        console.warn('[ShipmentDetailModal] Hủy map:', e);
                    }
                    modalMapInstance = null;
                    modalMarkersLayer = null;
                }
            };

            // Resolve hubs, post offices, and provinces from shipment + routing + tracking history
            const enrichShipmentMetadata = (rawShipment, trData, rtData, historyList) => {
                const mgr = window.MapManager;
                const sh = { ...(rawShipment || {}) };

                let sourceHub = rtData?.sourceHub || sh.sourceHub || sh.originHubCode || null;
                let destHub = rtData?.destinationHub || sh.destinationHub || sh.destHubCode || null;
                let originPostOffice = rtData?.originPostOffice || sh.originPostOffice || null;
                let destPostOffice = rtData?.destPostOffice || sh.destPostOffice || null;

                (Array.isArray(historyList) ? historyList : []).forEach(item => {
                    const text = item && (item.node || item.note || '');
                    if (!text) return;
                    if (text.includes('ROUTE-')) {
                        const match = text.match(/ROUTE-([A-Z0-9-]+)-TO-([A-Z0-9-]+)/);
                        if (match) {
                            if (!sourceHub) sourceHub = match[1];
                            if (!destHub) destHub = match[2];
                        }
                    }
                    const postMatches = [...text.matchAll(/POST-[A-Z0-9-]+/g)].map(m => m[0]);
                    if (postMatches.length >= 2) {
                        if (!originPostOffice) originPostOffice = postMatches[0];
                        if (!destPostOffice) destPostOffice = postMatches[1];
                    } else if (postMatches.length === 1 && !originPostOffice) {
                        originPostOffice = postMatches[0];
                    }
                    const hubMatches = [...text.matchAll(/HUB-[A-Z0-9-]+/g)].map(m => m[0]);
                    if (hubMatches.length >= 2) {
                        if (!sourceHub) sourceHub = hubMatches[0];
                        if (!destHub) destHub = hubMatches[1];
                    } else if (hubMatches.length === 1 && !sourceHub) {
                        sourceHub = hubMatches[0];
                    }
                });

                const senderAddr = sh.senderAddress || [sh.senderDetail, sh.senderProvince].filter(Boolean).join(', ') || '';
                const receiverAddr = sh.receiverAddress || [sh.receiverDetail, sh.receiverProvince].filter(Boolean).join(', ') || '';

                if (mgr) {
                    if (!originPostOffice && senderAddr && typeof mgr.getPostOfficeForAddress === 'function') {
                        const found = mgr.getPostOfficeForAddress(senderAddr, sourceHub);
                        if (found) {
                            originPostOffice = found.code;
                            if (!sourceHub && found.parent) sourceHub = found.parent;
                        }
                    }
                    if (!destPostOffice && receiverAddr && typeof mgr.getPostOfficeForAddress === 'function') {
                        const found = mgr.getPostOfficeForAddress(receiverAddr, destHub);
                        if (found) {
                            destPostOffice = found.code;
                            if (!destHub && found.parent) destHub = found.parent;
                        }
                    }
                    if (!sourceHub && originPostOffice && typeof mgr.getHubCoord === 'function') {
                        const poCoord = mgr.getHubCoord(originPostOffice);
                        if (poCoord?.parent) sourceHub = poCoord.parent;
                    }
                    if (!destHub && destPostOffice && typeof mgr.getHubCoord === 'function') {
                        const poCoord = mgr.getHubCoord(destPostOffice);
                        if (poCoord?.parent) destHub = poCoord.parent;
                    }
                    if (!sourceHub && senderAddr && typeof mgr.getCentralHubForAddress === 'function') {
                        const foundHub = mgr.getCentralHubForAddress(senderAddr);
                        if (foundHub) sourceHub = foundHub.code;
                    }
                    if (!destHub && receiverAddr && typeof mgr.getCentralHubForAddress === 'function') {
                        const foundHub = mgr.getCentralHubForAddress(receiverAddr);
                        if (foundHub) destHub = foundHub.code;
                    }
                }

                if (!sourceHub) sourceHub = 'HUB-HN-01';
                if (!destHub) destHub = 'HUB-HCM-01';

                const getCoord = (code) => (mgr && typeof mgr.getHubCoord === 'function' ? mgr.getHubCoord(code) : null);
                const origPoCoord = getCoord(originPostOffice);
                const srcHubCoord = getCoord(sourceHub);
                const dstHubCoord = getCoord(destHub);
                const dstPoCoord = getCoord(destPostOffice);

                sh.sourceHub = sourceHub;
                sh.destinationHub = destHub;
                sh.originPostOffice = originPostOffice || sourceHub;
                sh.destPostOffice = destPostOffice || destHub;
                sh.originPostOfficeName = origPoCoord?.name || srcHubCoord?.name || originPostOffice || 'Bưu Cục Gửi';
                sh.sourceHubName = srcHubCoord?.name || sourceHub;
                sh.destHubName = dstHubCoord?.name || destHub;
                sh.destPostOfficeName = dstPoCoord?.name || dstHubCoord?.name || destPostOffice || 'Bưu Cục Phát';

                sh.senderAddress = senderAddr;
                sh.receiverAddress = receiverAddr;
                sh.senderProvince = sh.senderProvince || origPoCoord?.province || srcHubCoord?.province || extractProvinceFromAddress(senderAddr, 'Hà Nội');
                sh.receiverProvince = sh.receiverProvince || dstPoCoord?.province || dstHubCoord?.province || extractProvinceFromAddress(receiverAddr, 'TP. Hồ Chí Minh');

                return sh;
            };

            // Fetch data
            const fetchData = async () => {
                if (!props.trackingCode) return;
                isLoading.value = true;
                errorMessage.value = '';
                shipment.value = null;
                trackingHistory.value = [];
                paymentVerified.value = false;
                destroyMap();

                try {
                    const code = props.trackingCode.trim();
                    const [shipmentRes, trackingRes, routingRes, paymentRes] = await Promise.allSettled([
                        window.ShipmentService ? window.ShipmentService.getByCode(code) : Promise.resolve(null),
                        window.TrackingService ? window.TrackingService.getFullTracking(code) : Promise.resolve(null),
                        window.RoutingService && typeof window.RoutingService.getRouteByCode === 'function'
                            ? window.RoutingService.getRouteByCode(code)
                            : Promise.resolve(null),
                        window.PaymentService && typeof window.PaymentService.getPaymentByTracking === 'function'
                            ? window.PaymentService.getPaymentByTracking(code)
                            : Promise.resolve(null)
                    ]);

                    const shData = shipmentRes.status === 'fulfilled' ? shipmentRes.value : null;
                    const trData = trackingRes.status === 'fulfilled' ? trackingRes.value : null;
                    const rtData = routingRes.status === 'fulfilled' ? routingRes.value : null;
                    const payData = paymentRes.status === 'fulfilled' ? paymentRes.value : null;

                    if (!shData && !trData) {
                        throw new Error(`Không tìm thấy dữ liệu vận đơn cho mã: ${code}`);
                    }

                    const historyList = trData?.history || shData?.history || [];
                    trackingHistory.value = historyList;

                    if (payData && (payData.status === 'SUCCESS' || payData.paymentStatus === 'SUCCESS')) {
                        paymentVerified.value = true;
                    }

                    const rawMerged = {
                        trackingCode: code,
                        ...(shData || {}),
                        status: trData?.currentStatus || shData?.currentStatus || shData?.status || 'CREATED'
                    };

                    shipment.value = enrichShipmentMetadata(rawMerged, trData, rtData, historyList);
                } catch (err) {
                    console.error('[ShipmentDetailModal] Lỗi tải dữ liệu:', err);
                    errorMessage.value = err.message || 'Lỗi khi kết nối máy chủ dịch vụ vận đơn';
                } finally {
                    isLoading.value = false;
                    if (isMapOpen.value && shipment.value) {
                        ensureModalMapReady(0);
                    }
                }
            };

            // Watchers
            watch(() => props.show, (newVal) => {
                if (newVal && props.trackingCode) {
                    isMapOpen.value = true;
                    fetchData();
                } else {
                    destroyMap();
                    isMapOpen.value = true;
                }
            });

            watch(() => props.trackingCode, (newCode) => {
                if (props.show && newCode) {
                    isMapOpen.value = true;
                    fetchData();
                }
            });

            onUnmounted(() => {
                destroyMap();
            });

            return {
                isLoading,
                errorMessage,
                shipment,
                trackingHistory,
                copiedTooltip,
                isMapOpen,
                routeSummaryText,
                isDelivered,
                isPaid,
                checkpoints,
                currentCheckpointIndex,
                historyEvents,
                etaFormatted,
                formatWeight,
                formatTime,
                getStatusBadgeClass,
                formatStatusText,
                copyCode,
                closeModal,
                handleBackdropClick,
                openFullTracking,
                printThermalLabel,
                toggleMap,
                fitModalMapView,
                fetchData
            };
        }
    };

    window.ShipmentDetailModal = ShipmentDetailModal;
})();
