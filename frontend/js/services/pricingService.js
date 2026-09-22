(function () {
    const PricingService = {
        async calculateTariff(payload) {
            try {
                const response = await Api.post('/api/pricing/calculate', payload);
                if (response && response.ok) {
                    return await response.json();
                }
            } catch (ignored) {}

            return this.calculateFallback(payload);
        },

        calculateFallback(payload) {
            const actualGram = Number(payload.weightGram) || 500;
            let volumetricGram = 0;
            if (payload.lengthCm && payload.widthCm && payload.heightCm) {
                volumetricGram = ((Number(payload.lengthCm) * Number(payload.widthCm) * Number(payload.heightCm)) / 5000) * 1000;
            }

            const chargeableGram = Math.max(actualGram, volumetricGram);
            const chargeableKg = chargeableGram / 1000;

            const isIntraProvince = String(payload.senderProvince || '').trim().toLowerCase() === String(payload.receiverProvince || '').trim().toLowerCase();
            const zoneType = isIntraProvince ? 'INTRA_PROVINCE' : 'INTER_REGION';

            const senderLabel = payload.senderDistrict ? `${payload.senderDistrict} (${payload.senderProvince})` : (payload.senderProvince || 'Hà Nội');
            const receiverLabel = payload.receiverDistrict ? `${payload.receiverDistrict} (${payload.receiverProvince})` : (payload.receiverProvince || 'Hồ Chí Minh');
            const routeDescription = `${senderLabel} → ${receiverLabel} • ${isIntraProvince ? 'Nội Tỉnh' : 'Liên Miền'}`;

            const codAmount = Number(payload.codAmount) || 0;
            const codFee = codAmount > 0 ? Math.max(10000, Math.round(codAmount * 0.01)) : 0;

            const extraKg = Math.max(0, chargeableKg - 0.5);

            const ecoBase = Math.round(isIntraProvince ? (15000 + extraKg * 5000) : (25000 + extraKg * 9000));
            const ecoFuel = Math.round(ecoBase * 0.06);
            const ecoTotal = ecoBase + ecoFuel + codFee;

            const stdBase = Math.round(isIntraProvince ? (20000 + extraKg * 7000) : (30000 + extraKg * 13000));
            const stdFuel = Math.round(stdBase * 0.06);
            const stdTotal = stdBase + stdFuel + codFee;

            const expBase = Math.round(isIntraProvince ? (35000 + extraKg * 12000) : (55000 + extraKg * 22000));
            const expFuel = Math.round(expBase * 0.06);
            const expTotal = expBase + expFuel + codFee;

            return {
                senderProvince: payload.senderProvince,
                senderDistrict: payload.senderDistrict,
                receiverProvince: payload.receiverProvince,
                receiverDistrict: payload.receiverDistrict,
                routeDescription: routeDescription,
                zoneType: zoneType,
                actualWeightGram: Math.round(actualGram * 10) / 10,
                volumetricWeightGram: Math.round(volumetricGram * 10) / 10,
                chargeableWeightKg: Math.round(chargeableKg * 100) / 100,
                codAmount: codAmount,
                plans: [
                    {
                        serviceCode: 'ECO',
                        serviceName: 'VNPT Tiết Kiệm',
                        estimatedDelivery: isIntraProvince ? '1-2 ngày' : '3-4 ngày',
                        baseFee: ecoBase,
                        fuelSurcharge: ecoFuel,
                        codFee: codFee,
                        insuranceFee: 0,
                        totalFee: ecoTotal
                    },
                    {
                        serviceCode: 'STANDARD',
                        serviceName: 'VNPT Tiêu Chuẩn',
                        estimatedDelivery: isIntraProvince ? 'Trong 24 giờ' : '1-2 ngày',
                        baseFee: stdBase,
                        fuelSurcharge: stdFuel,
                        codFee: codFee,
                        insuranceFee: 0,
                        totalFee: stdTotal
                    },
                    {
                        serviceCode: 'EXPRESS',
                        serviceName: 'VNPT Hỏa Tốc',
                        estimatedDelivery: isIntraProvince ? '4-6 giờ' : '12-24 giờ',
                        baseFee: expBase,
                        fuelSurcharge: expFuel,
                        codFee: codFee,
                        insuranceFee: 0,
                        totalFee: expTotal
                    }
                ]
            };
        }
    };

    window.PricingService = PricingService;
})();
