package org.app.shipmentservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.entity.DeliveryFailureDecision;
import org.app.shipmentservice.entity.FailureDecisionType;
import org.app.shipmentservice.repository.DeliveryFailureDecisionRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class FailureDecisionTimeoutScheduler {

    private final DeliveryFailureDecisionRepository failureDecisionRepository;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void processExpiredDecisions() {
        LocalDateTime now = LocalDateTime.now();
        List<DeliveryFailureDecision> expired = failureDecisionRepository.findByDecisionAndDecisionDeadlineBefore(
                FailureDecisionType.PENDING, now
        );

        if (expired.isEmpty()) {
            return;
        }

        for (DeliveryFailureDecision decision : expired) {
            decision.setDecision(FailureDecisionType.AUTO_REDELIVER);
            decision.setDecidedAt(now);
            decision.setDecisionNote("Hệ thống tự động kích hoạt xếp lịch giao lại do quá hạn 24 giờ người gửi không đưa ra quyết định xử lý.");
            failureDecisionRepository.save(decision);
            log.info("[TIMEOUT-JOB] Đơn {} đã hết hạn 24h chờ xử lý, tự động kích hoạt AUTO_REDELIVER", decision.getTrackingCode());
        }
    }
}
