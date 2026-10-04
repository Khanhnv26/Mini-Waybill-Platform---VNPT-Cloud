package org.app.shipmentservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.service.EtaRecalculationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EtaRecalculationScheduler {

    private final EtaRecalculationService etaRecalculationService;

    @Value("${shipment.eta.recalc-batch-size:50}")
    private int batchSize;

    @Scheduled(fixedDelayString = "${shipment.eta.recalc-interval-ms:300000}")
    public void recalculateActiveShipmentsEta() {
        try {
            int updated = etaRecalculationService.recalculateActiveShipments(batchSize);
            if (updated > 0) {
                log.info("[ETA-SCHEDULER] Đã tính lại ETA cho {} vận đơn đang lưu thông.", updated);
            }
        } catch (Exception e) {
            log.error("[ETA-SCHEDULER] Lỗi khi quét tính lại ETA: {}", e.getMessage(), e);
        }
    }
}
