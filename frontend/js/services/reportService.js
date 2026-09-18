/**
 * ==============================================================================
 * VNPT WAYBILL PLATFORM - REPORT SERVICE CLIENT
 * Quản lý Gọi API Báo Cáo Thống Kê Sản Lượng & Xuất Báo Cáo Đối Soát Excel
 * ==============================================================================
 */

(function () {
    const ReportService = {
        /**
         * Lấy báo cáo tổng hợp KPI và danh sách chi tiết phân trang
         * @param {Object} params - { fromDate, toDate, customerId, status, page, size }
         * @returns {Promise<Object>}
         */
        async getSummary(params = {}) {
            const query = new URLSearchParams();
            if (params.fromDate) query.append('fromDate', params.fromDate);
            if (params.toDate) query.append('toDate', params.toDate);
            if (params.customerId) query.append('customerId', params.customerId);
            if (params.status && params.status !== 'ALL') query.append('status', params.status);
            query.append('page', params.page || 0);
            query.append('size', params.size || 10);

            const url = `/api/reports/summary?${query.toString()}`;
            const response = await Api.get(url);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || 'Không thể tải báo cáo thống kê');
            }
            return response.json();
        },

        /**
         * Tải file Excel Báo cáo 2 Sheet (Tổng Hợp KPI & Chi Tiết Vận Đơn)
         * @param {Object} params - { fromDate, toDate, customerId, status }
         * @returns {Promise<void>}
         */
        async exportExcel(params = {}) {
            const query = new URLSearchParams();
            if (params.fromDate) query.append('fromDate', params.fromDate);
            if (params.toDate) query.append('toDate', params.toDate);
            if (params.customerId) query.append('customerId', params.customerId);
            if (params.status && params.status !== 'ALL') query.append('status', params.status);

            const base = window.location.port === '3000' ? '' : 'http://localhost:8080';
            const endpoint = `${base}/api/reports/export?${query.toString()}`;

            const headers = {};
            if (typeof Auth !== 'undefined') {
                const token = Auth.getToken();
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || errData.error || `Xuất file thất bại (Mã lỗi ${response.status})`);
            }

            // Lấy tên file từ header Content-Disposition hoặc đặt tên mặc định
            let filename = 'VNPT_BaoCao_VanDon.xlsx';
            const disposition = response.headers.get('content-disposition');
            if (disposition && disposition.includes('filename=')) {
                const parts = disposition.split('filename=');
                if (parts[1]) {
                    filename = parts[1].replace(/["']/g, '').trim();
                }
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        }
    };

    window.ReportService = ReportService;
})();
