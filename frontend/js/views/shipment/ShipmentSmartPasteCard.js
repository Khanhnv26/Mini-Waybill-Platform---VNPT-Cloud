(function () {
    const { ref } = Vue;

    const template = `
    <div class="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-2xl border border-blue-200/80 p-4 mb-5 shadow-xs">
        <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
                <div class="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-slate-800">Bóc Tách Địa Chỉ Thông Minh (Smart Paste)</h4>
                    <p class="text-[11px] text-slate-500">Dán nhanh tin nhắn khách gửi (Họ tên, SĐT, Địa chỉ) để tự động điền form</p>
                </div>
            </div>
            <span class="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">Tiết kiệm 80% thời gian</span>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 mt-2">
            <input 
                v-model="rawInput" 
                type="text"
                @keyup.enter="handleParse"
                placeholder="VD: Nguyễn Văn An 0987654321 số 45 ngõ 12 Đội Cấn, Ba Đình, Hà Nội"
                class="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder:text-slate-400"
            />
            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button 
                    type="button" 
                    @click="handleParse"
                    :disabled="!rawInput.trim()"
                    class="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition shadow-xs cursor-pointer flex items-center space-x-1"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Phân Tích &amp; Điền</span>
                </button>
                <button 
                    v-if="rawInput" 
                    type="button" 
                    @click="rawInput = ''"
                    class="px-2.5 py-2 text-xs font-semibold rounded-xl text-slate-500 hover:bg-slate-100 transition cursor-pointer"
                >
                    Xóa
                </button>
            </div>
        </div>
    </div>
    `;

    const ShipmentSmartPasteCard = {
        name: 'ShipmentSmartPasteCard',
        template,
        emits: ['parsed'],
        setup(props, { emit }) {
            const rawInput = ref('');

            const VIETNAM_PROVINCES = [
                'Hà Nội', 'Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ',
                'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
                'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
                'Bình Thuận', 'Cà Mau', 'Cao Bằng', 'Đắk Lắk', 'Đắk Nông',
                'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang',
                'Hà Nam', 'Hà Tĩnh', 'Hải Dương', 'Hậu Giang', 'Hòa Bình',
                'Hưng Yên', 'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu',
                'Lâm Đồng', 'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định',
                'Nghệ An', 'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên',
                'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị',
                'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
                'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'Trà Vinh', 'Tuyên Quang',
                'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
            ];

            const handleParse = () => {
                const text = rawInput.value.trim();
                if (!text) return;

                const phoneMatch = text.match(/(?:(?:\+|00)84|0)([35789][0-9]{8})/);
                let phone = '';
                let textWithoutPhone = text;
                if (phoneMatch) {
                    phone = phoneMatch[0].startsWith('+84') 
                        ? '0' + phoneMatch[1] 
                        : phoneMatch[0];
                    textWithoutPhone = text.replace(phoneMatch[0], '').trim();
                }

                let matchedProvince = '';
                for (const p of VIETNAM_PROVINCES) {
                    const regex = new RegExp(`\\b${p.replace(/-/g, '[-–]')}\\b`, 'i');
                    if (regex.test(textWithoutPhone)) {
                        matchedProvince = p;
                        break;
                    }
                }
                if (!matchedProvince) {
                    if (/ha noi|hn/i.test(textWithoutPhone)) matchedProvince = 'Hà Nội';
                    else if (/ho chi minh|tphcm|hcm|sai gon/i.test(textWithoutPhone)) matchedProvince = 'Hồ Chí Minh';
                    else if (/da nang|dn/i.test(textWithoutPhone)) matchedProvince = 'Đà Nẵng';
                    else if (/hai phong|hp/i.test(textWithoutPhone)) matchedProvince = 'Hải Phòng';
                    else if (/can tho/i.test(textWithoutPhone)) matchedProvince = 'Cần Thơ';
                }

                let parts = textWithoutPhone
                    .split(/[,;\n\-]/)
                    .map(s => s.trim())
                    .filter(Boolean);

                let name = '';
                let detail = '';

                if (parts.length > 1) {
                    name = parts[0];
                    detail = parts.slice(1).join(', ');
                } else {
                    const words = textWithoutPhone.split(/\s+/);
                    if (words.length > 3) {
                        name = words.slice(0, 3).join(' ');
                        detail = words.slice(3).join(' ');
                    } else {
                        name = textWithoutPhone;
                    }
                }

                emit('parsed', {
                    name: name.trim(),
                    phone: phone.trim(),
                    province: matchedProvince || 'Hà Nội',
                    detail: detail.trim()
                });

                if (window.Utils && window.Utils.showToast) {
                    window.Utils.showToast('Bóc Tách Thành Công', `Đã nhận diện: ${name} (${phone || 'Chưa có SĐT'})`, 'success');
                }
            };

            return {
                rawInput,
                handleParse
            };
        }
    };

    window.ShipmentSmartPasteCard = ShipmentSmartPasteCard;
})();
