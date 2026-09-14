const http = require('http');

function post(url, data) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(url, token) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const req = http.request({
            hostname: u.hostname,
            port: u.port,
            path: u.pathname + (u.search || ''),
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        }, res => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: body }));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    const authRes = await post('http://localhost:8080/api/auth/login', JSON.stringify({
        email: 'admin@waybill.vn',
        password: 'Admin@123456'
    }));
    const parsed = JSON.parse(authRes.data);
    const token = parsed.token || parsed.accessToken;

    const shipRes = await get('http://localhost:8080/api/shipments', token);
    const allShipments = JSON.parse(shipRes.data);

    const inferDefaultPostOfficeFromAddress = (address) => {
        if (!address || typeof address !== 'string') return null;
        const lower = address.toLowerCase();
        if (lower.includes('hà nội') || lower.includes('ha noi') || lower.includes('h\u00e0 n')) {
            return { code: 'POST-HN-CG', name: 'Bưu Cục Cầu Giấy (Hà Nội)' };
        }
        if (lower.includes('hồ chí minh') || lower.includes('ho chi minh') || lower.includes('hcm') || lower.includes('sài gòn') || lower.includes('sai gon') || lower.includes('h\u1ed3 ch')) {
            return { code: 'POST-HCM-Q1', name: 'Bưu Cục Bến Nghé - Quận 1 (TP.HCM)' };
        }
        if (lower.includes('đà nẵng') || lower.includes('da nang') || lower.includes('\u0111\u00e0 n')) {
            return { code: 'POST-DN-HC', name: 'Bưu Cục Hải Châu (Đà Nẵng)' };
        }
        if (lower.includes('hải phòng') || lower.includes('hai phong') || lower.includes('h\u1ea3i ph')) {
            return { code: 'POST-HP-NQ', name: 'Bưu Cục Ngô Quyền (Hải Phòng)' };
        }
        if (lower.includes('cần thơ') || lower.includes('can tho') || lower.includes('c\u1ea7n th')) {
            return { code: 'POST-CT-NK', name: 'Bưu Cục Ninh Kiều (Cần Thơ)' };
        }
        return null;
    };

    const normalizeCode = (val) => typeof val === 'string' ? val.trim() : '';

    const getOriginPostOfficeInfo = (item) => {
        if (!item) return { code: '', name: 'Chưa xác định' };
        const directCode = normalizeCode(item.originPostOffice || item.origin_post_office || item.sourcePostOffice);
        if (directCode) return { code: directCode, name: directCode };
        if (item.senderAddress) {
            const fallback = inferDefaultPostOfficeFromAddress(item.senderAddress);
            if (fallback) return fallback;
        }
        return { code: '', name: 'Chưa xác định' };
    };

    const getDestPostOfficeInfo = (item) => {
        if (!item) return { code: '', name: 'Chưa xác định' };
        const directCode = normalizeCode(item.destPostOffice || item.dest_post_office || item.destinationPostOffice);
        if (directCode) return { code: directCode, name: directCode };
        if (item.receiverAddress) {
            const fallback = inferDefaultPostOfficeFromAddress(item.receiverAddress);
            if (fallback) return fallback;
        }
        return { code: '', name: 'Chưa xác định' };
    };

    console.log('Total shipments in DB:', allShipments.length);

    // Let's test filter with selectedPostOffice = 'ALL'
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const isOutbound = (item) => {
            const status = normalizeCode(item.currentStatus || item.status).toUpperCase();
            return ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP'].includes(status);
        };
        const isInbound = (item) => {
            const status = normalizeCode(item.currentStatus || item.status).toUpperCase();
            return ['ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNING', 'RETURNED'].includes(status);
        };

        let list = allShipments;
        if (subtab === 'outbound') list = list.filter(isOutbound);
        else if (subtab === 'inbound') list = list.filter(isInbound);
        console.log('Subtab ' + subtab + ' with selectedPostOffice=ALL: ' + list.length);
    });

    // With POST-HN-CG
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const poCode = 'POST-HN-CG';
        let list = allShipments.filter(s => {
            if (s.locationCode === poCode) return true;
            if (s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING' || s.currentStatus === 'PICKED_UP' || s.currentStatus === 'CREATED') {
                return getOriginPostOfficeInfo(s).code === poCode;
            }
            if (s.currentStatus === 'ARRIVED_DEST_HUB' || s.currentStatus === 'OUT_FOR_DELIVERY' || s.currentStatus === 'DELIVERED' || s.currentStatus === 'DELIVERY_FAILED') {
                return getDestPostOfficeInfo(s).code === poCode;
            }
            return false;
        });
        const isOutbound = (item) => {
            const originCode = normalizeCode(getOriginPostOfficeInfo(item).code).toUpperCase();
            return originCode === poCode;
        };
        const isInbound = (item) => {
            const destCode = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
            return destCode === poCode;
        };
        if (subtab === 'outbound') list = list.filter(isOutbound);
        else if (subtab === 'inbound') list = list.filter(isInbound);
        console.log('Subtab ' + subtab + ' with selectedPostOffice=POST-HN-CG: ' + list.length);
    });

    // Check what happens if selectedPostOffice is invalid (e.g. user typed 'Cầu Giấy' in the input!)
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const poCode = 'CẦU GIẤY';
        let list = allShipments.filter(s => {
            if (s.locationCode === poCode) return true;
            if (s.currentStatus === 'ROUTE_ASSIGNED' || s.currentStatus === 'PENDING_ROUTING' || s.currentStatus === 'PICKED_UP' || s.currentStatus === 'CREATED') {
                return getOriginPostOfficeInfo(s).code === poCode;
            }
            if (s.currentStatus === 'ARRIVED_DEST_HUB' || s.currentStatus === 'OUT_FOR_DELIVERY' || s.currentStatus === 'DELIVERED' || s.currentStatus === 'DELIVERY_FAILED') {
                return getDestPostOfficeInfo(s).code === poCode;
            }
            return false;
        });
        console.log('If user types "CẦU GIẤY", Subtab ' + subtab + ' count: ' + list.length);
    });
}
run();
