(function () {
    const { ref } = Vue;

    const template = `
    <div v-if="show" class="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-fade-slide">
            <div class="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        TRIP
                    </div>
                    <div>
                        <h3 class="text-xs sm:text-sm font-bold text-slate-900">Bảng Kê Chuyến Xe Vận Chuyển</h3>
                        <p class="text-[10.5px] text-slate-400 font-mono">{{ trip?.tripCode || 'Chuyến xe trung chuyển' }}</p>
                    </div>
                </div>
                <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>

            <div class="p-5 overflow-y-auto max-h-[70vh] space-y-4 text-xs">
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                        <span class="text-[10px] text-slate-400 font-semibold block">Tài Xế</span>
                        <span class="font-bold text-slate-800">{{ trip?.driverName || 'Chưa gán' }}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 font-semibold block">Biển Số</span>
                        <span class="font-mono font-bold text-blue-600">{{ trip?.licensePlate || trip?.vehiclePlate || 'N/A' }}</span>
                    </div>
                    <div>
                        <span class="text-[10px] text-slate-400 font-semibold block">Tổng Kiện</span>
                        <span class="font-bold text-slate-800">{{ trip?.shipments?.length || trip?.totalPackages || 0 }} kiện</span>
                    </div>
                    <div>
                        <span class="text-xs text-slate-400 font-normal block mb-0.5">Trạng Thái</span>
                        <span class="status-indicator">
                            <span class="status-dot bg-blue-500"></span>
                            <span class="font-medium text-xs text-slate-700 dark:text-slate-300">{{ trip?.status || 'Sẵn sàng' }}</span>
                        </span>
                    </div>
                </div>

                <div>
                    <h4 class="text-xs font-bold text-slate-800 mb-2">Danh Sách Bưu Gửi Trên Chuyến:</h4>
                    <div class="max-h-56 overflow-y-auto border border-slate-200 rounded-xl">
                        <table class="w-full text-left border-collapse text-[11px]">
                            <thead class="bg-slate-100/80 text-slate-600 font-bold">
                                <tr>
                                    <th class="p-2 px-3">#</th>
                                    <th class="p-2 px-3">Mã Vận Đơn</th>
                                    <th class="p-2 px-3">Người Nhận</th>
                                    <th class="p-2 px-3">Khối Lượng</th>
                                    <th class="p-2 px-3 text-right">Tiền COD</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-medium">
                                <tr v-for="(s, idx) in (trip?.shipments || [])" :key="s.trackingCode || idx" class="hover:bg-slate-50">
                                    <td class="p-2 px-3 text-slate-400">{{ idx + 1 }}</td>
                                    <td class="p-2 px-3 font-mono font-bold text-blue-600">{{ s.trackingCode }}</td>
                                    <td class="p-2 px-3 text-slate-700">{{ s.receiverName || 'Khách nhận' }}</td>
                                    <td class="p-2 px-3 font-mono">{{ s.weight || 1 }} kg</td>
                                    <td class="p-2 px-3 text-right font-mono font-bold">{{ Number(s.codAmount || 0).toLocaleString('vi-VN') }} đ</td>
                                </tr>
                                <tr v-if="!trip?.shipments || trip.shipments.length === 0">
                                    <td colspan="5" class="p-6 text-center text-slate-400">Chưa có thông tin bưu gửi chi tiết</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="p-4 px-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2">
                <button @click="$emit('close')" type="button" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer">
                    Đóng
                </button>
                <button @click="printManifest" type="button" class="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition flex items-center space-x-1 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <span>In Bảng Kê Chuyến</span>
                </button>
            </div>
        </div>
    </div>
    `;

    const TripManifestModal = {
        name: 'TripManifestModal',
        template,
        props: {
            show: { type: Boolean, default: false },
            trip: { type: Object, default: () => ({}) }
        },
        emits: ['close'],
        setup(props) {
            const printManifest = () => {
                window.print();
            };
            return { printManifest };
        }
    };

    window.TripManifestModal = TripManifestModal;
})();
