package org.app.shipperservice.consumer;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.sharedevents.entity.ShipmentFeedbackEvent;
import org.app.shipperservice.entity.Shipper;
import org.app.shipperservice.repository.ShipperRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ShipmentFeedbackConsumer {

    private final ShipperRepository shipperRepository;

    @KafkaListener(topics = "shipment-feedbacks", groupId = "shipper-service-group")
    @Transactional
    public void handleFeedbackEvent(ShipmentFeedbackEvent event) {
        log.info("Nhận được sự kiện ShipmentFeedbackEvent cho đơn {}: shipperRating={}, courierCode={}", event.getTrackingCode(), event.getShipperRating(), event.getCourierCode());

        if(event.getCourierCode() == null || event.getCourierCode().isBlank() || event.getShipperRating() == null) {
            log.warn("Bỏ qua tính KPI vì thiếu courierCode hoặc shipperRating: trackingCode={}", event.getTrackingCode());
            return;
        }

        Optional<Shipper> optShipper = shipperRepository.findByCourierCode(event.getCourierCode());

        if(optShipper.isEmpty()) {
            log.warn("Không tìm thấy bưu tá có mã {} để cập nhật KPI", event.getCourierCode());
            return;
        }

        Shipper shipper = optShipper.get();
        double currentAvg = shipper.getRatingAvg()!= null ? shipper.getRatingAvg() : 5.0;
        int currentCount = shipper.getRatingCount() != null ? shipper.getRatingCount() : 0;

        int newCount = currentCount + 1;

        double newAvg = ((currentAvg * currentCount) + event.getShipperRating()) / newCount;
        newAvg = BigDecimal.valueOf(newAvg).setScale(2, RoundingMode.HALF_UP).doubleValue();

        shipper.setRatingAvg(newAvg);
        shipper.setRatingCount(newCount);
        shipperRepository.save(shipper);

        log.info("Đã cập nhật KPI cho bưu tá {} ({}): ratingAvg={}, ratingCount={}", shipper.getFullName(), shipper.getCourierCode(), newAvg, newCount);
    }

}
