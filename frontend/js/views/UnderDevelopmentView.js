/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - VIEW: ĐANG PHÁT TRIỂN (UNDER DEVELOPMENT)
 * Hiệu ứng Vòng Xoay Quỹ Đạo Công Nghệ (Tech Orbit Animation)
 * Áp dụng cho các tính năng đang trong lộ trình tích hợp hệ thống (v2.6.0)
 * ==============================================================================
 */

(function () {
    const { computed } = Vue;

    const FEATURES_DATA = {
        network: {
            title: 'Mạng Lưới Hub & Bưu Cục Toàn Quốc',
            badge: 'GIS & MẠNG LƯỚI BƯU CHÍNH',
            desc: 'Module số hóa bản đồ hạ tầng bưu cục cấp 1, 2, 3 và các trung tâm khai thác trọng điểm Bắc - Trung - Nam đang được đồng bộ dữ liệu tọa độ thực tế.',
            highlights: [
                'Bản đồ vệ tinh tích hợp định vị GPS bưu cục',
                'Tự động gợi ý điểm giao/nhận gần nhất',
                'Giám sát công suất tiếp nhận của từng Hub'
            ]
        },
        calculator: {
            title: 'Hệ Thống Ước Tính Cước Phí Tự Động',
            badge: 'B2B TARIFF ENGINE',
            desc: 'Công cụ tính cước bưu gửi đa phương thức theo khoảng cách thực tế, bậc khối lượng, tỷ lệ COD và biểu giá ưu đãi cho đối tác doanh nghiệp.',
            highlights: [
                'Tính cước động theo tuyến đường luân chuyển',
                'Áp dụng biểu giá phụ phí nhiên liệu & bảo hiểm',
                'Ưu đãi chiết khấu theo sản lượng tháng'
            ]
        },
        guide: {
            title: 'Cẩm Nang & Quy Chuẩn Đóng Gói',
            badge: 'QUY CHUẨN VẬN HÀNH',
            desc: 'Tài liệu tương tác hướng dẫn quy chuẩn đóng gói bưu gửi tiêu chuẩn, danh mục hàng hóa cấm vận chuyển và chính sách bồi thường bưu chính VNPT.',
            highlights: [
                'Hướng dẫn đóng gói bưu phẩm điện tử & dễ vỡ',
                'Quy định trọng lượng và kích thước quá khổ',
                'Quy trình bảo hiểm và bồi thường tổn thất'
            ]
        },
        support: {
            title: 'Cổng Hỗ Trợ & Khiếu Nại Bưu Gửi 24/7',
            badge: 'CSKH & TICKET SYSTEM',
            desc: 'Hệ thống Helpdesk điện tử tiếp nhận yêu cầu bồi thường, tra cứu lịch sử xử lý khiếu nại và kết nối trực tiếp với tổng đài viên VNPT Post.',
            highlights: [
                'Khởi tạo Ticket khiếu nại bưu gửi trong 30 giây',
                'Theo dõi tiến độ giải quyết bồi hoàn trực tuyến',
                'Kết nối đường dây nóng CSKH 1900 54 54 81'
            ]
        }
    };

    const UnderDevelopmentView = {
        name: 'UnderDevelopmentView',
        props: {
            featureId: {
                type: String,
                default: 'network'
            }
        },
        emits: ['back-home'],
        setup(props, { emit }) {
            const currentFeature = computed(() => {
                return FEATURES_DATA[props.featureId] || {
                    title: 'Tính Năng Đang Được Hoàn Thiện',
                    badge: 'HỆ THỐNG ĐANG TÍCH HỢP',
                    desc: 'Chức năng này đang trong quá trình lập trình và tích hợp vào hệ thống Mini Waybill VNPT Cloud.',
                    highlights: [
                        'Thiết kế giao diện chuẩn B2B Design System',
                        'Kết nối API dữ liệu microservice thời gian thực',
                        'Kiểm thử bảo mật và phân quyền truy cập'
                    ]
                };
            });

            const goBack = () => {
                emit('back-home');
            };

            return {
                currentFeature,
                goBack
            };
        },
        template: `
            <div class="space-y-5 pb-12 text-slate-800">
                <!-- HERO BANNER TỐI GIẢN NHẸ NHÀNG -->
                <div class="rounded-xl vnpt-gradient text-white p-4 sm:p-5 shadow-md shadow-blue-900/10 flex items-center justify-between">
                    <div>
                        <div class="flex items-center space-x-2">
                            <span class="px-2 py-0.5 rounded-md bg-white/20 text-white text-[11px] uppercase font-bold tracking-wider border border-white/25">
                                VNPT Post Ecosystem
                            </span>
                            <span class="text-blue-100 text-xs font-medium">Đang Phát Triển</span>
                        </div>
                        <h1 class="text-lg sm:text-xl font-black mt-1 tracking-tight text-white">
                            {{ currentFeature.title }}
                        </h1>
                    </div>
                    <button 
                        type="button" 
                        @click="goBack" 
                        class="px-3.5 py-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                        <span>← Quay Lại Trang Chủ</span>
                    </button>
                </div>

                <!-- THẺ NỘI DUNG TRUNG TÂM VỚI TECH ORBIT ANIMATION -->
                <div class="b2b-card bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto space-y-6">
                    <!-- VÒNG XOAY QUỸ ĐẠO CÔNG NGHỆ (TECH ORBIT SPINNER) -->
                    <div class="relative w-28 h-28 mx-auto flex items-center justify-center">
                        <!-- Vòng quay quỹ đạo ngoài cùng -->
                        <div class="absolute inset-0 rounded-full border-2 border-slate-100"></div>
                        <div class="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-600 border-r-blue-400 animate-spin" style="animation-duration: 1.2s;"></div>
                        
                        <!-- Vòng quay quỹ đạo ngược bên trong -->
                        <div class="absolute inset-3 rounded-full border-2 border-transparent border-b-cyan-500 border-l-cyan-300 animate-spin" style="animation-duration: 2s; animation-direction: reverse;"></div>

                        <!-- Tâm phát sáng với Logo VNPT -->
                        <div class="w-12 h-12 rounded-xl vnpt-gradient text-white font-black text-xs flex items-center justify-center shadow-md shadow-blue-500/25 z-10 select-none">
                            VNPT
                        </div>
                    </div>

                    <!-- THÔNG BÁO TIẾN ĐỘ -->
                    <div class="space-y-2">
                        <h2 class="text-base sm:text-lg font-extrabold text-slate-800">
                            Chức Năng Đang Được Hoàn Thiện
                        </h2>
                        <p class="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                            {{ currentFeature.desc }}
                        </p>
                    </div>

                    <!-- DANH SÁCH TÍNH NĂNG NỔI BẬT ĐANG TRIỂN KHAI -->
                    <div class="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-left max-w-md mx-auto space-y-2.5">
                        <span class="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                            Hạng Mục Đang Xây Dựng:
                        </span>
                        <div v-for="(item, idx) in currentFeature.highlights" :key="idx" class="flex items-center space-x-2 text-xs text-slate-600">
                            <span class="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"></span>
                            <span>{{ item }}</span>
                        </div>
                    </div>

                    <!-- NÚT ĐIỀU HƯỚNG QUAY LẠI -->
                    <div class="pt-2">
                        <button 
                            type="button" 
                            @click="goBack" 
                            class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-600/20 inline-flex items-center space-x-2"
                        >
                            <span>←</span>
                            <span>Quay Lại Tra Cứu Bưu Gửi</span>
                        </button>
                    </div>
                </div>
            </div>
        `
    };

    window.UnderDevelopmentView = UnderDevelopmentView;
})();
