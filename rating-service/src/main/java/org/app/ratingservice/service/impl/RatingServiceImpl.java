package org.app.ratingservice.service.impl;

import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.ratingservice.client.ShipmentClient;
import org.app.ratingservice.client.TrackingClient;
import org.app.ratingservice.dto.request.CreateRatingRequest;
import org.app.ratingservice.dto.request.UpdateRatingVisibilityRequest;
import org.app.ratingservice.dto.response.AdminRatingItemResponse;
import org.app.ratingservice.dto.response.RatingPageResponse;
import org.app.ratingservice.dto.response.RatingResponse;
import org.app.ratingservice.dto.response.RatingStatsResponse;
import org.app.ratingservice.dto.response.RatingStatusResponse;
import org.app.ratingservice.entity.ShipmentRating;
import org.app.ratingservice.repository.ShipmentRatingRepository;
import org.app.ratingservice.service.RatingService;
import org.app.sharedevents.entity.ShipmentFeedbackEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    public static final String TOPIC_FEEDBACK = "shipment-feedbacks";
    private final ShipmentRatingRepository shipmentRatingRepository;
    private final ShipmentClient shipmentClient;
    private final TrackingClient trackingClient;
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

        String rawPhone = shipment.getReceiverPhone();
        String cleanDigits = rawPhone != null ? rawPhone.replaceAll("\\D+", "") : "";
        if (cleanDigits.length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại người nhận trên đơn hàng không hợp lệ.");
        }
        String expectedLast4Digits = cleanDigits.substring(cleanDigits.length() - 4);
        if (!expectedLast4Digits.equals(request.getVerifiedPhone().trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Số điện thoại xác thực không khớp.");
        }

        String courierCode = findCourierCode(trackingCode);
        if (courierCode == null) {
            log.warn("Không tìm thấy mã bưu tá bàn giao trong lịch sử tracking cho đơn {}. Đánh giá vẫn được lưu nhưng KPI bưu tá sẽ không được cập nhật.", trackingCode);
        }

        String tagsStr = (request.getTags() != null && !request.getTags().isEmpty()) ? String.join(",", request.getTags()) : null;
        String attachStr = (request.getAttachmentUrls() != null && !request.getAttachmentUrls().isEmpty()) ? String.join(",", request.getAttachmentUrls()) : null;
        ShipmentRating rating = ShipmentRating.builder()
                .trackingCode(trackingCode)
                .courierCode(courierCode)
                .serviceRating(request.getServiceRating())
                .shipperRating(request.getShipperRating())
                .tags(tagsStr)
                .comment(request.getComment())
                .attachmentUrls(attachStr)
                .verifiedPhone(request.getVerifiedPhone())
                .createdAt(LocalDateTime.now())
                .isHidden(false)
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
            kafkaTemplate.send(TOPIC_FEEDBACK, savedRating.getTrackingCode(), event)
                    .whenComplete((result, exception) -> {
                        if (exception != null) {
                            log.error("Lỗi khi phát sự kiện ShipmentFeedbackEvent lên Kafka cho đơn {}", savedRating.getTrackingCode(), exception);
                        } else {
                            log.info("Đã phát sự kiện ShipmentFeedbackEvent lên Kafka cho đơn {}", savedRating.getTrackingCode());
                        }
                    });
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

    @Override
    @Transactional(readOnly = true)
    public RatingPageResponse getAdminRatings(String keyword, Integer star, Boolean isNegative, String courierCode, Boolean isHidden, LocalDateTime fromDate, LocalDateTime toDate, Pageable pageable) {
        Specification<ShipmentRating> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                Predicate trackingMatch = cb.like(cb.lower(root.get("trackingCode")), pattern);
                Predicate commentMatch = cb.like(cb.lower(root.get("comment")), pattern);
                Predicate phoneMatch = cb.like(cb.lower(root.get("verifiedPhone")), pattern);
                Predicate courierMatch = cb.like(cb.lower(root.get("courierCode")), pattern);
                predicates.add(cb.or(trackingMatch, commentMatch, phoneMatch, courierMatch));
            }

            if (star != null && star >= 1 && star <= 5) {
                predicates.add(cb.or(
                        cb.equal(root.get("serviceRating"), star),
                        cb.equal(root.get("shipperRating"), star)
                ));
            }

            if (Boolean.TRUE.equals(isNegative)) {
                predicates.add(cb.or(
                        cb.lessThanOrEqualTo(root.get("serviceRating"), 2),
                        cb.lessThanOrEqualTo(root.get("shipperRating"), 2)
                ));
            }

            if (courierCode != null && !courierCode.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("courierCode")), courierCode.trim().toLowerCase()));
            }

            if (isHidden != null) {
                predicates.add(cb.equal(root.get("isHidden"), isHidden));
            }

            if (fromDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), fromDate));
            }

            if (toDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), toDate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<ShipmentRating> page = shipmentRatingRepository.findAll(spec, pageable);
        List<AdminRatingItemResponse> items = page.getContent().stream()
                .map(this::toAdminRatingItemResponse)
                .toList();

        return RatingPageResponse.builder()
                .content(items)
                .page(page.getNumber())
                .size(page.getSize())
                .totalPages(page.getTotalPages())
                .totalElements(page.getTotalElements())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminRatingItemResponse getRatingDetail(Long id) {
        ShipmentRating rating = shipmentRatingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá ID: " + id));
        return toAdminRatingItemResponse(rating);
    }

    @Override
    @Transactional
    public AdminRatingItemResponse updateRatingVisibility(Long id, UpdateRatingVisibilityRequest request, String actor) {
        ShipmentRating rating = shipmentRatingRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đánh giá ID: " + id));

        boolean targetHidden = Boolean.TRUE.equals(request.getIsHidden());
        rating.setIsHidden(targetHidden);

        if (targetHidden) {
            rating.setHiddenReason(request.getReason() != null ? request.getReason().trim() : null);
            rating.setHiddenBy((actor != null && !actor.isBlank()) ? actor.trim() : "admin");
            rating.setHiddenAt(LocalDateTime.now());
        } else {
            rating.setHiddenReason(null);
            rating.setHiddenBy(null);
            rating.setHiddenAt(null);
        }

        ShipmentRating saved = shipmentRatingRepository.save(rating);
        return toAdminRatingItemResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public RatingStatsResponse getRatingStats() {
        double rawAvgService = shipmentRatingRepository.findAverageServiceRating().orElse(0.0);
        double rawAvgShipper = shipmentRatingRepository.findAverageShipperRating().orElse(0.0);

        double avgService = BigDecimal.valueOf(rawAvgService).setScale(1, RoundingMode.HALF_UP).doubleValue();
        double avgShipper = BigDecimal.valueOf(rawAvgShipper).setScale(1, RoundingMode.HALF_UP).doubleValue();

        long total = shipmentRatingRepository.count();
        long visible = shipmentRatingRepository.countByIsHiddenFalse();
        long hidden = shipmentRatingRepository.countByIsHiddenTrue();
        long negative = shipmentRatingRepository.countNegativeRatings();

        Map<Integer, Long> distribution = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            distribution.put(i, 0L);
        }

        List<Object[]> rawDist = shipmentRatingRepository.findServiceRatingDistribution();
        if (rawDist != null) {
            for (Object[] row : rawDist) {
                if (row.length >= 2 && row[0] instanceof Number score && row[1] instanceof Number count) {
                    distribution.put(score.intValue(), count.longValue());
                }
            }
        }

        return RatingStatsResponse.builder()
                .averageServiceRating(avgService)
                .averageShipperRating(avgShipper)
                .totalRatings(total)
                .visibleRatingsCount(visible)
                .hiddenRatingsCount(hidden)
                .negativeRatingsCount(negative)
                .starDistribution(distribution)
                .build();
    }

    private AdminRatingItemResponse toAdminRatingItemResponse(ShipmentRating rating) {
        List<String> tags = (rating.getTags() != null && !rating.getTags().isBlank())
                ? Arrays.stream(rating.getTags().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of();

        List<String> attachmentUrls = (rating.getAttachmentUrls() != null && !rating.getAttachmentUrls().isBlank())
                ? Arrays.stream(rating.getAttachmentUrls().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of();

        return AdminRatingItemResponse.builder()
                .id(rating.getId())
                .trackingCode(rating.getTrackingCode())
                .courierCode(rating.getCourierCode())
                .serviceRating(rating.getServiceRating())
                .shipperRating(rating.getShipperRating())
                .tags(tags)
                .comment(rating.getComment())
                .attachmentUrls(attachmentUrls)
                .verifiedPhone(rating.getVerifiedPhone())
                .createdAt(rating.getCreatedAt())
                .isHidden(rating.getIsHidden())
                .hiddenReason(rating.getHiddenReason())
                .hiddenBy(rating.getHiddenBy())
                .hiddenAt(rating.getHiddenAt())
                .build();
    }

    private String findCourierCode(String trackingCode) {
        try {
            return trackingClient.getTrackingHistory(trackingCode).stream()
                    .filter(history -> "HANDED_TO_COURIER".equalsIgnoreCase(history.getOperationType()))
                    .map(TrackingClient.TrackingHistoryDto::getActorId)
                    .filter(actorId -> actorId != null && !actorId.isBlank())
                    .map(String::trim)
                    .reduce((earlier, later) -> later)
                    .orElse(null);
        } catch (Exception e) {
            log.warn("Không thể lấy mã bưu tá từ tracking-service cho đơn {}: {}", trackingCode, e.getMessage());
            return null;
        }
    }
}
