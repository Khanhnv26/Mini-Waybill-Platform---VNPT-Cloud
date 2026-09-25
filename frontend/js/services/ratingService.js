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
        }
    };

    window.RatingService = RatingService;
})();
