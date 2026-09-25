package org.app.ratingservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.ratingservice.client.ShipmentClient;
import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.dto.response.RatingResponse;
import org.app.ratingservice.dto.response.RatingStatusResponse;
import org.app.ratingservice.entity.ShipmentRating;
import org.app.ratingservice.repository.ShipmentRatingRepository;
import org.app.ratingservice.service.RatingService;
import org.app.sharedevents.entity.ShipmentFeedbackEvent;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    public static final String TOPIC_FEEDBACK = "shipment-feedbacks";
    private final ShipmentRatingRepository shipmentRatingRepository;
    private final ShipmentClient shipmentClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Override
    public RatingStatusResponse checkRatingStatus(String trackingCode) {
        if (trackingCode == null || trackingCode.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mã vận đơn không được để trống");
        }

        String code = trackingCode.trim().toUpperCase();
        Optional<ShipmentRating> rating = shipmentRatingRepository.findByTrackingCode(code);
        if (rating.isPresent()) {
            ShipmentRating r = rating.get();
            return RatingStatusResponse.builder()
                    .trackingCode(code)
                    .isDelivered(true)
                    .hasRated(true)
                    .serviceRating(r.getServiceRating())
                    .shipperRating(r.getShipperRating())
                    .build();
        }

        boolean isDelivered = false;
        try {
            ShipmentClient.ShipmentDetailDto shipment = shipmentClient.getShipmentByCode(code);
            isDelivered = shipment != null && "DELIVERED".equalsIgnoreCase(shipment.getCurrentStatus());
        } catch (Exception e) {
            log.warn("Không thể tra cứu trạng thái giao hàng từ shipment-service cho mã {}: {}", code, e.getMessage());
        }
        return RatingStatusResponse.builder()
                .trackingCode(code)
                .isDelivered(isDelivered)
                .hasRated(false)
                .build();
    }

    @Override
    @Transactional
    public RatingResponse submitRating(CreateRatingRequest request) {
        String trackingCode = request.getTrackingCode().trim().toUpperCase();
        if (shipmentRatingRepository.existsByTrackingCode(trackingCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bưu gửi này đã được đánh giá trước đó.");

        }

        ShipmentClient.ShipmentDetailDto shipment;
        try {
            shipment = shipmentClient.getShipmentByCode(trackingCode);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin bưu gửi " + trackingCode);
        }

        if (shipment == null || !"DELIVERED".equalsIgnoreCase(shipment.getCurrentStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bưu gửi chưa được giao thành công, không thể đánh giá.");
        }

        if (request.getVerifiedPhone() != null && !request.getVerifiedPhone().isBlank()) {
            String rawPhone = shipment.getReceiverPhone();
            if (rawPhone == null || rawPhone.length() < 4) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại người nhận trên đơn hàng không hợp lệ.");
            }

            String cleanDigits = rawPhone.replaceAll("\\D+", "");
            String expectedLast4Digits = cleanDigits.substring(Math.max(0, cleanDigits.length() - 4));
            String inputLast4Digits = request.getVerifiedPhone().trim();
            if (!expectedLast4Digits.equals(inputLast4Digits)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại xác thực không khớp.");
            }
        }

        String tagsStr = (request.getTags() != null && !request.getTags().isEmpty()) ? String.join(",", request.getTags()) : null;
        String attachStr = (request.getAttachmentUrls() != null && !request.getAttachmentUrls().isEmpty()) ? String.join(",", request.getAttachmentUrls()) : null;
        ShipmentRating rating = ShipmentRating.builder()
                .trackingCode(trackingCode)
                .courierCode(shipment.getTrackingCode())
                .serviceRating(request.getServiceRating())
                .shipperRating(request.getShipperRating())
                .tags(tagsStr)
                .comment(request.getComment())
                .attachmentUrls(attachStr)
                .verifiedPhone(request.getVerifiedPhone())
                .createdAt(LocalDateTime.now())
                .build();

        ShipmentRating savedRating = shipmentRatingRepository.save(rating);
        ShipmentFeedbackEvent event = ShipmentFeedbackEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .trackingCode(savedRating.getTrackingCode())
                .courierCode(savedRating.getCourierCode())
                .serviceRating(savedRating.getServiceRating())
                .shipperRating(savedRating.getShipperRating())
                .tags(request.getTags())
                .comment(savedRating.getComment())
                .createdAt(savedRating.getCreatedAt())
                .build();

        try {
            kafkaTemplate.send(TOPIC_FEEDBACK, savedRating.getTrackingCode(), event);
            log.info("Đã phát sự kiện ShipmentFeedbackEvent lên Kafka cho đơn {}", savedRating.getTrackingCode());
        } catch (Exception e) {
            log.error("Lỗi khi phát sự kiện ShipmentFeedbackEvent lên Kafka cho đơn {}", savedRating.getTrackingCode(), e);
        }

        boolean suggestTicket = (savedRating.getServiceRating() < 3 || savedRating.getShipperRating() < 3);
        return RatingResponse.builder()
                .id(savedRating.getId())
                .trackingCode(savedRating.getTrackingCode())
                .serviceRating(savedRating.getServiceRating())
                .shipperRating(savedRating.getShipperRating())
                .messages("Cảm ơn bạn đã gửi đánh giá. Chúng tôi sẽ xem xét phản hồi của bạn.")
                .suggestTicket(suggestTicket)
                .createdAt(savedRating.getCreatedAt())
                .build();
    }
}


