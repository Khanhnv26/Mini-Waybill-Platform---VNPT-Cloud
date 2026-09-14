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
    const token = JSON.parse(authRes.data).accessToken;
    const allShipments = JSON.parse((await get('http://localhost:8080/api/shipments', token)).data);

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

    // PROPOSED FILTER LOGIC
    function filterShipments(list, selectedPo, subtab, statusFilter, query) {
        let result = list;

        // 1. Lọc theo bưu cục
        const po = normalizeCode(selectedPo).toUpperCase();
        if (po && po !== 'ALL') {
            result = result.filter(s => {
                const originPo = normalizeCode(getOriginPostOfficeInfo(s).code).toUpperCase();
                const destPo = normalizeCode(getDestPostOfficeInfo(s).code).toUpperCase();
                const loc = normalizeCode(s.locationCode).toUpperCase();
                return loc === po || originPo === po || destPo === po;
            });
        }

        const isOutboundShipment = (item) => {
            if (!item) return false;
            const originCode = normalizeCode(getOriginPostOfficeInfo(item).code).toUpperCase();
            if (po && po !== 'ALL') {
                return originCode === po;
            }
            const status = normalizeCode(item.currentStatus || item.status).toUpperCase();
            return ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'].includes(status);
        };

        const isInboundShipment = (item) => {
            if (!item) return false;
            const destCode = normalizeCode(getDestPostOfficeInfo(item).code).toUpperCase();
            if (po && po !== 'ALL') {
                return destCode === po;
            }
            const status = normalizeCode(item.currentStatus || item.status).toUpperCase();
            return ['ARRIVED_DEST_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNING', 'RETURNED'].includes(status);
        };

        // 2. Lọc theo luồng subtab
        if (subtab === 'outbound') {
            result = result.filter(s => isOutboundShipment(s));
        } else if (subtab === 'inbound') {
            result = result.filter(s => isInboundShipment(s));
        }

        // 3. Lọc theo trạng thái chi tiết (hỗ trợ cả mã chuẩn và alias pill)
        const sf = normalizeCode(statusFilter).toUpperCase();
        if (sf && sf !== 'ALL') {
            if (sf === 'WAITING_INTAKE') {
                result = result.filter(s => ['CREATED', 'PENDING_ROUTING', 'ROUTE_ASSIGNED'].includes(normalizeCode(s.currentStatus || s.status).toUpperCase()));
            } else if (sf === 'STORED_OFFICE') {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === 'PICKED_UP');
            } else if (sf === 'WAITING_HANDOFF') {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === 'ARRIVED_DEST_HUB');
            } else if (sf === 'OUT_FOR_DELIVERY') {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === 'OUT_FOR_DELIVERY');
            } else if (sf === 'DELIVERED') {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === 'DELIVERED');
            } else if (sf === 'IN_TRANSIT') {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === 'IN_TRANSIT');
            } else if (sf === 'FAILED') {
                result = result.filter(s => ['DELIVERY_FAILED', 'RETURNING', 'RETURNED', 'FAILED', 'CANCELLED'].includes(normalizeCode(s.currentStatus || s.status).toUpperCase()));
            } else {
                result = result.filter(s => normalizeCode(s.currentStatus || s.status).toUpperCase() === sf);
            }
        }

        // 4. Tìm kiếm từ khóa
        if (query && query.trim()) {
            const q = query.trim().toLowerCase();
            result = result.filter(s => 
                (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
                (s.senderName && s.senderName.toLowerCase().includes(q)) ||
                (s.receiverName && s.receiverName.toLowerCase().includes(q)) ||
                (s.senderAddress && s.senderAddress.toLowerCase().includes(q)) ||
                (s.receiverAddress && s.receiverAddress.toLowerCase().includes(q))
            );
        }

        return result;
    }

    console.log('=== KIỂM THỬ THUẬT TOÁN LỌC MỚI VỚI DỮ LIỆU THẬT ===');
    console.log('Tổng số bưu phẩm trong DB:', allShipments.length);

    console.log('\n--- 1. Khi chọn ALL (Toàn bộ mạng lưới) ---');
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const res = filterShipments(allShipments, 'ALL', subtab, 'ALL', '');
        console.log(`Subtab [${subtab}]: ${res.length} bưu phẩm`);
    });

    console.log('\n--- 2. Khi chọn POST-HN-CG (Bưu cục Cầu Giấy) ---');
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const res = filterShipments(allShipments, 'POST-HN-CG', subtab, 'ALL', '');
        console.log(`Subtab [${subtab}]: ${res.length} bưu phẩm`);
    });

    console.log('\n--- 3. Khi chọn POST-HCM-Q1 (Bưu cục Quận 1 - Bưu cục phát chính) ---');
    ['outbound', 'inbound', 'inventory'].forEach(subtab => {
        const res = filterShipments(allShipments, 'POST-HCM-Q1', subtab, 'ALL', '');
        console.log(`Subtab [${subtab}]: ${res.length} bưu phẩm`);
    });

    console.log('\n--- 4. Kiểm tra từng bộ lọc trạng thái (POST-HN-CG) ---');
    ['WAITING_INTAKE', 'STORED_OFFICE', 'IN_TRANSIT', 'DELIVERED'].forEach(st => {
        const res = filterShipments(allShipments, 'POST-HN-CG', 'outbound', st, '');
        console.log(`Outbound status [${st}]: ${res.length} bưu phẩm`);
    });

    console.log('\n--- 5. Kiểm tra từng bộ lọc trạng thái (POST-HCM-Q1) ---');
    ['WAITING_HANDOFF', 'OUT_FOR_DELIVERY', 'DELIVERED'].forEach(st => {
        const res = filterShipments(allShipments, 'POST-HCM-Q1', 'inbound', st, '');
        console.log(`Inbound status [${st}]: ${res.length} bưu phẩm`);
    });
}
run();
