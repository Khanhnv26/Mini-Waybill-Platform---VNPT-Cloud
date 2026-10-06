package org.app.shipmentservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.entity.ReturnMode;
import org.app.shipmentservice.entity.ReturnRequest;
import org.app.shipmentservice.entity.ReturnRequestStatus;
import org.app.shipmentservice.repository.ReturnRequestRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CounterPickupExpiryScheduler {

    private final ReturnRequestRepository returnRequestRepository;

    @Scheduled(fixedDelay = 300000)
    @Transactional
    public void processExpiredCounterPickups() {
        LocalDateTime now = LocalDateTime.now();
        List<ReturnRequest> expired = returnRequestRepository
                .findByReturnModeAndArrivedOriginAtIsNotNullAndPickupDeadlineBeforeAndStatus(
                        ReturnMode.COUNTER_PICKUP, now, ReturnRequestStatus.APPROVED
                );

        if (expired.isEmpty()) {
            return;
        }

        for (ReturnRequest req : expired) {
            req.setReturnMode(ReturnMode.DOORSTEP);
            String oldNote = req.getReasonNote() != null ? req.getReasonNote() : "";
            req.setReasonNote(oldNote + " [Quá hạn 7 ngày lưu quầy bưu cục, tự động chuyển sang bưu tá phát hoàn tận nơi]");
            returnRequestRepository.save(req);
            log.info("[PICKUP-EXPIRY-JOB] Đơn {} đã quá hạn 7 ngày lưu quầy tại bưu cục gốc, tự động chuyển hình thức nhận sang DOORSTEP",
                    req.getTrackingCode());
        }
    }
}
