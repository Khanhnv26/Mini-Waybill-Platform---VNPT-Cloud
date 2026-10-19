(function () {
    const { ref } = Vue;
    const template = `
    <div v-if="show" class="fixed inset-0 z-[9999] overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fade-slide">
            <div class="p-4 px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div class="flex items-center space-x-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                        WB
                    </div>
                    <div>
                        <h3 class="text-xs sm:text-sm font-bold text-slate-900">Xem Trước Phiếu Gửi & Tem Vận Đơn</h3>
                        <p class="text-[10.5px] text-slate-400">Khổ tem nhiệt tiêu chuẩn A6 (100x150mm)</p>
                    </div>
                </div>
                <button @click="$emit('close')" class="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
            </div>
            <div class="p-5 overflow-y-auto max-h-[70vh]">
                <div id="waybill-thermal-label" class="border-2 border-slate-900 rounded-xl p-4 bg-white text-slate-900 font-sans space-y-3">
                    <div class="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
                        <div class="flex items-center space-x-2">
                            <span class="text-base font-black tracking-tighter text-blue-800">WAYBILL POST</span>
                            <span class="text-[10px] font-bold border border-slate-900 px-1.5 py-0.5 rounded">
                                {{ shipment?.serviceType === 'EXPRESS' ? 'HỎA TỐC' : 'TIÊU CHUẨN' }}
                            </span>
                        </div>
                        <div class="text-right">
                            <span class="font-mono text-xs font-bold block">{{ shipment?.trackingCode }}</span>
                            <span class="text-[9px] text-slate-500">{{ new Date().toLocaleDateString('vi-VN') }}</span>
                        </div>
                    </div>
                    <div class="text-center py-2 border-b border-dashed border-slate-400">
                        <div class="font-mono text-xl font-black tracking-widest">{{ shipment?.trackingCode }}</div>
                        <div class="flex justify-center items-center gap-[2px] h-10 mt-1">
                            <span v-for="i in 36" :key="i" :style="{ width: (i % 3 === 0 ? '3px' : '1.5px') }" class="h-full bg-slate-900 inline-block"></span>
                        </div>
                        <span class="text-[9px] text-slate-500 font-mono mt-0.5 block">*{{ shipment?.trackingCode }}*</span>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-[11px] border-b border-slate-900 pb-2.5">
                        <div class="border-r border-slate-200 pr-2">
                            <span class="font-bold uppercase text-[9.5px] text-slate-500 block">NGƯỜI GỬI:</span>
                            <p class="font-bold text-slate-900">{{ shipment?.senderName }}</p>
                            <p class="text-slate-600 text-[10px]">{{ shipment?.senderPhone }}</p>
                            <p class="text-slate-600 text-[10px] leading-tight mt-0.5">{{ shipment?.senderDetail }}, {{ shipment?.senderProvince }}</p>
                        </div>
                        <div>
                            <span class="font-bold uppercase text-[9.5px] text-blue-700 block">NGƯỜI NHẬN:</span>
                            <p class="font-black text-slate-900 text-xs">{{ shipment?.receiverName }}</p>
                            <p class="font-bold text-slate-900 text-[11px]">{{ shipment?.receiverPhone }}</p>
                            <p class="text-slate-700 text-[10.5px] leading-snug mt-0.5">{{ shipment?.receiverDetail }}, {{ shipment?.receiverProvince }}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2 text-xs">
                        <div class="p-2 border-2 border-slate-900 rounded-lg text-center bg-slate-50">
                            <span class="text-[9.5px] font-bold uppercase text-slate-500 block">TIỀN THU HỘ (COD)</span>
                            <span class="text-base font-black text-slate-900 font-mono">
                                {{ Number(shipment?.codAmount || 0).toLocaleString('vi-VN') }} đ
                            </span>
                        </div>
                        <div class="p-2 border border-slate-300 rounded-lg text-center">
                            <span class="text-[9.5px] font-semibold uppercase text-slate-500 block">TRỌNG LƯỢNG</span>
                            <span class="text-sm font-bold text-slate-800 font-mono">{{ shipment?.weight || 1 }} kg</span>
                        </div>
                    </div>
                    <div class="text-[9.5px] text-slate-500 italic text-center pt-1">
                        * Quý khách vui lòng đồng kiểm cùng bưu tá khi nhận kiện hàng. Hotline: 1900 54 54 81
                    </div>
                </div>
            </div>
            <div class="p-4 px-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end space-x-2.5">
                <button @click="$emit('close')" type="button" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition cursor-pointer">
                    Đóng
                </button>
                <button @click="printLabel" type="button" class="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <span>In Phiếu Ngay</span>
                </button>
            </div>
        </div>
    </div>
    `;
    const ShipmentPrintModal = {
        name: 'ShipmentPrintModal',
        template,
        props: {
            show: { type: Boolean, default: false },
            shipment: { type: Object, default: () => ({}) }
        },
        emits: ['close'],
        setup(props) {
            const printLabel = () => {
                const printContent = document.getElementById('waybill-thermal-label');
                if (!printContent) return;
                const printWindow = window.open('', '', 'width=600,height=700');
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>In Tem Vận Đơn - Waybill Post</title>
                        <style>
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 15px; margin: 0; }
                            * { box-sizing: border-box; }
                        </style>
                    </head>
                    <body>
                        ${printContent.outerHTML}
                        <script>
                            window.onload = function() { window.print(); window.close(); };
                        </script>
                    </body>
                    </html>
                `);
                printWindow.document.close();
            };
            return { printLabel };
        }
    };
    window.ShipmentPrintModal = ShipmentPrintModal;
})();
