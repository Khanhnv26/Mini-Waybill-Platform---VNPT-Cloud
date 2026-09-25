(function () {
    const AuditService = {
        async getByTrackingCode(trackingCode) {
            if (!trackingCode) return [];
            try {
                const response = await Api.get(`/api/audits/${trackingCode}`);
                if (!response.ok) return [];
                return await response.json();
            } catch {
                return [];
            }
        }
    };

    window.AuditService = AuditService;
})();
