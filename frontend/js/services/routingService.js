/**
 * VNPT CLOUD - ROUTING SERVICE CLIENT
 * Quản lý Hubs và điều phối bưu cục luân chuyển
 */

(function () {
    const RoutingService = {
        async getAllHubs() {
            const response = await Api.get('/api/routing/hubs');
            if (!response.ok) {
                throw new Error('Không thể tải danh bạ Bưu cục / Hubs');
            }
            return response.json();
        }
    };

    window.RoutingService = RoutingService;
})();
