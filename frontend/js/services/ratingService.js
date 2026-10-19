(function () {
    function extractErrorMessage(errData, defaultMsg) {
        if (!errData) return defaultMsg;
        if (typeof errData === 'string') return errData;
        let msg = errData.error || errData.message;
        if (!msg && typeof errData === 'object') {
            const fieldErrors = Object.entries(errData)
                .filter(([k]) => k !== 'errorCode' && k !== 'timestamp' && k !== 'status')
                .map(([k, v]) => `${v}`)
                .join('; ');
            if (fieldErrors) msg = fieldErrors;
        }
        return msg || defaultMsg;
    }
    const RatingService = {
        async getRatingStatus(trackingCode) {
            if (!trackingCode) {
                return { isDelivered: false, hasRated: false };
            }
            const code = encodeURIComponent(trackingCode.trim().toUpperCase());
            const response = await Api.get(`/api/ratings/${code}/status`, {}, { skip403Toast: true, silent: true });
            if (!response.ok) {
                return { isDelivered: false, hasRated: false };
            }
            return response.json();
        },
        async submitRating(payload) {
            const response = await Api.post('/api/ratings', payload, {}, { skip403Toast: true });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể gửi đánh giá đơn hàng'));
            }
            return response.json();
        },
        async getAdminRatings(params = {}) {
            const queryParams = new URLSearchParams();
            if (params.keyword) queryParams.append('keyword', params.keyword.trim());
            if (params.star && params.star !== 'ALL' && params.star !== 'NEGATIVE') queryParams.append('star', params.star);
            if (params.star === 'NEGATIVE' || params.isNegative) queryParams.append('isNegative', 'true');
            if (params.courierCode && params.courierCode !== 'ALL') queryParams.append('courierCode', params.courierCode.trim());
            if (params.status === 'VISIBLE') queryParams.append('isHidden', 'false');
            if (params.status === 'HIDDEN') queryParams.append('isHidden', 'true');
            if (params.fromDate) queryParams.append('fromDate', params.fromDate);
            if (params.toDate) queryParams.append('toDate', params.toDate);
            queryParams.append('page', params.page ?? 0);
            queryParams.append('size', params.size ?? 20);
            if (params.sort) queryParams.append('sort', params.sort);
            const queryString = queryParams.toString();
            const endpoint = `/api/ratings/admin${queryString ? `?${queryString}` : ''}`;
            const response = await Api.get(endpoint);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải danh sách đánh giá'));
            }
            return response.json();
        },
        async getRatingDetail(id) {
            const response = await Api.get(`/api/ratings/admin/${id}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải chi tiết đánh giá'));
            }
            return response.json();
        },
        async updateRatingVisibility(id, isHidden, reason) {
            const payload = { isHidden, reason: reason || null };
            const response = await Api.patch(`/api/ratings/admin/${id}/visibility`, payload);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể cập nhật trạng thái hiển thị đánh giá'));
            }
            return response.json();
        },
        async getRatingStats() {
            const response = await Api.get('/api/ratings/admin/stats');
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(extractErrorMessage(errData, 'Không thể tải thống kê đánh giá'));
            }
            return response.json();
        }
    };
    window.RatingService = RatingService;
})();
