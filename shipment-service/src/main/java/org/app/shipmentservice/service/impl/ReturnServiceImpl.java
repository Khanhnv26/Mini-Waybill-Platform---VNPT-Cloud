package org.app.shipmentservice.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.CustomerClient;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.dto.request.CreateReturnRequestDto;
import org.app.shipmentservice.dto.request.FailureDecisionRequestDto;
import org.app.shipmentservice.dto.request.PostalFaultUpdateRequestDto;
import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.app.shipmentservice.dto.response.DeliveryFailureDecisionResponse;
import org.app.shipmentservice.dto.response.ReturnQuoteResponse;
import org.app.shipmentservice.dto.response.ReturnRequestResponse;
import org.app.shipmentservice.entity.*;
import org.app.shipmentservice.exception.ForbiddenException;
import org.app.shipmentservice.exception.UnauthorizedException;
import org.app.shipmentservice.repository.DeliveryFailureDecisionRepository;
import org.app.shipmentservice.repository.OutboxEventRepository;
import org.app.shipmentservice.repository.ReturnRequestRepository;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ReturnFeeCalculator;
import org.app.shipmentservice.service.ReturnService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReturnServiceImpl implements ReturnService {

    private final ShipmentRepository shipmentRepository;
    private final ReturnRequestRepository returnRequestRepository;
    private final DeliveryFailureDecisionRepository failureDecisionRepository;
    private final ReturnFeeCalculator returnFeeCalculator;
    private final OutboxEventRepository outboxEventRepository;
    private final CustomerClient customerClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private Long resolveCustomerId(String currentUserId) {
        if (currentUserId == null || currentUserId.isBlank() || "null".equalsIgnoreCase(currentUserId)) {
            throw new UnauthorizedException("Yêu cầu thông tin đăng nhập hợp lệ!");
        }

        Long userId;
        try {
            userId = Long.parseLong(currentUserId.trim());
        } catch (NumberFormatException e) {
            throw new UnauthorizedException("User ID không hợp lệ: " + currentUserId);
        }

        String cacheKey = "customer:user_id_map:" + userId;
        String cachedCustomerId = redisTemplate.opsForValue().get(cacheKey);
        if (cachedCustomerId != null && !cachedCustomerId.isBlank()) {
            try {
                return Long.parseLong(cachedCustomerId);
            } catch (NumberFormatException ignored) {}
        }

        CustomerValidationResponse validationResponse = customerClient.validateCustomerByUserId(userId);
        if (validationResponse == null || !validationResponse.isValid() || validationResponse.getCustomerId() == null) {
            String reason = validationResponse != null ? validationResponse.getReason() : "CUSTOMER_PROFILE_NOT_FOUND";
            throw new RuntimeException("Không tìm thấy hồ sơ khách hàng hợp lệ! Lý do: " + reason);
        }

        Long customerId = validationResponse.getCustomerId();
        redisTemplate.opsForValue().set(cacheKey, customerId.toString(), Duration.ofMinutes(30));
        return customerId;
    }

    private boolean isStaffOrAdmin(String roles, String permissions) {
        if (roles != null && (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_CS") || roles.contains("ROLE_POST_OFFICE_STAFF") || roles.contains("ROLE_SHIPPER"))) {
            return true;
        }
        return permissions != null && (permissions.contains("shipment:read_all") || permissions.contains("shipment:manage_returns"));
    }

    private Shipment findAndAuthorizeShipment(String trackingCode, String currentUserId, String roles, String permissions) {
        Shipment shipment = shipmentRepository.findShipmentByTrackingCode(trackingCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vận đơn: " + trackingCode));

        if (!isStaffOrAdmin(roles, permissions)) {
            if (currentUserId == null || currentUserId.isBlank()) {
                return shipment;
            }
            Long myCustomerId = resolveCustomerId(currentUserId);
            if (!shipment.getCustomerId().equals(myCustomerId)) {
                throw new ForbiddenException("Bạn không có quyền thao tác trên vận đơn của người khác!");
            }
        }
        return shipment;
    }

    @Override
    public ReturnQuoteResponse getReturnQuote(String trackingCode, String currentUserId, String roles, String permissions) {
        Shipment shipment = findAndAuthorizeShipment(trackingCode, currentUserId, roles, permissions);
        ShipmentStatus status = shipment.getCurrentStatus();

        boolean canReturn = status != null && Set.of(
                ShipmentStatus.PICKED_UP,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.ARRIVED_DEST_HUB,
                ShipmentStatus.OUT_FOR_DELIVERY,
                ShipmentStatus.DELIVERY_FAILED
        ).contains(status);

        String reason = null;
        if (!canReturn) {
            if (status == ShipmentStatus.CREATED || status == ShipmentStatus.PENDING_ROUTING || status == ShipmentStatus.ROUTE_ASSIGNED) {
                reason = "Đơn hàng chưa được bưu tá lấy hàng. Bạn có thể sử dụng tính năng 'Hủy đơn hàng' thay vì yêu cầu hoàn.";
            } else if (status == ShipmentStatus.RETURNING || status == ShipmentStatus.OUT_FOR_RETURN || status == ShipmentStatus.RETURNED) {
                reason = "Đơn hàng đã và đang trong tiến trình chuyển hoàn.";
            } else if (status == ShipmentStatus.DELIVERED) {
                reason = "Đơn hàng đã được phát thành công, không thể yêu cầu hoàn.";
            } else if (status == ShipmentStatus.CANCELLED) {
                reason = "Đơn hàng đã bị hủy trước đó.";
            } else {
                reason = "Trạng thái hiện tại (" + status + ") không hỗ trợ yêu cầu chuyển hoàn.";
            }
        }

        BigDecimal fee = returnFeeCalculator.calculateReturnFee(shipment, false);

        return ReturnQuoteResponse.builder()
                .trackingCode(shipment.getTrackingCode())
                .currentStatus(status)
                .canReturn(canReturn)
                .reason(reason)
                .originalShippingFee(shipment.getShippingFee())
                .estimatedReturnFee(fee)
                .codAmount(shipment.getCodAmount())
                .codWillBeVoided(shipment.getCodAmount() != null && shipment.getCodAmount().compareTo(BigDecimal.ZERO) > 0)
                .defaultReturnMode(ReturnMode.DOORSTEP)
                .senderAddress(shipment.getSenderAddress())
                .senderName(shipment.getSenderName())
                .senderPhone(shipment.getSenderPhone())
                .build();
    }

    @Override
    @Transactional
    public ReturnRequestResponse createReturnRequest(String trackingCode, CreateReturnRequestDto requestDto,
                                                     String currentUserId, String roles, String permissions) {
        Shipment shipment = findAndAuthorizeShipment(trackingCode, currentUserId, roles, permissions);
        ShipmentStatus currentStatus = shipment.getCurrentStatus();

        if (currentStatus == null || !Set.of(
                ShipmentStatus.PICKED_UP,
                ShipmentStatus.IN_TRANSIT,
                ShipmentStatus.ARRIVED_DEST_HUB,
                ShipmentStatus.OUT_FOR_DELIVERY,
                ShipmentStatus.DELIVERY_FAILED
        ).contains(currentStatus)) {
            throw new IllegalStateException("Đơn hàng không ở trạng thái hợp lệ để yêu cầu hoàn: " + currentStatus);
        }

        if (returnRequestRepository.existsByTrackingCodeAndStatusNot(trackingCode, ReturnRequestStatus.REJECTED)) {
            throw new IllegalStateException("Vận đơn " + trackingCode + " đã có yêu cầu hoàn đang được xử lý!");
        }

        boolean staff = isStaffOrAdmin(roles, permissions);
        BigDecimal returnFee = returnFeeCalculator.calculateReturnFee(shipment, false);

        ReturnRequest returnRequest = ReturnRequest.builder()
                .trackingCode(trackingCode)
                .customerId(shipment.getCustomerId())
                .initiator(staff ? ReturnInitiator.STAFF : ReturnInitiator.CUSTOMER)
                .reasonCode(requestDto.getReasonCode())
                .reasonNote(requestDto.getReasonNote())
                .returnMode(requestDto.getReturnMode())
                .status(ReturnRequestStatus.APPROVED) // Tự động duyệt ngay nếu hợp lệ theo thiết kế
                .postalFault(false)
                .returnFee(returnFee)
                .feePaymentStatus(FeePaymentStatus.UNPAID)
                .requestedBy(currentUserId)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        ReturnRequest savedRequest = returnRequestRepository.save(returnRequest);

        // Chuyển trạng thái đơn sang RETURNING
        shipment.setCurrentStatus(ShipmentStatus.RETURNING);
        shipmentRepository.save(shipment);

        // Cập nhật Redis status cache
        try {
            redisTemplate.opsForValue().set("shipment-status:" + trackingCode, ShipmentStatus.RETURNING.name(), Duration.ofDays(7));
        } catch (Exception e) {
            log.warn("[RETURN] Không thể cập nhật Redis cache cho đơn {}: {}", trackingCode, e.getMessage());
        }

        // Tạo Outbox Event đồng bộ Kafka topic tracking-status-events
        String note = String.format("[YÊU CẦU HOÀN:%s] %s%s",
                requestDto.getReturnMode() == ReturnMode.DOORSTEP ? "PHÁT TẬN NƠI" : "TẠI QUẦY",
                requestDto.getReasonCode(),
                requestDto.getReasonNote() != null && !requestDto.getReasonNote().isBlank() ? " - " + requestDto.getReasonNote().trim() : "");

        ShipmentStatusUpdatedEvent statusEvent = ShipmentStatusUpdatedEvent.builder()
                .trackingCode(trackingCode)
                .status(ShipmentStatus.RETURNING.name())
                .note(note)
                .locationCode(shipment.getSenderAddress())
                .updateAt(LocalDateTime.now())
                .build();

        try {
            String payloadJson = objectMapper.writeValueAsString(statusEvent);
            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .aggregateType("SHIPMENT")
                    .aggregateId(trackingCode)
                    .eventType("SHIPMENT_RETURNING")
                    .payload(payloadJson)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .build();
            outboxEventRepository.save(outboxEvent);
            log.info("[RETURN] Đã tạo Outbox Event RETURNING cho đơn {}", trackingCode);
        } catch (Exception e) {
            log.error("[RETURN] Lỗi ghi nhận Outbox Event cho đơn {}: {}", trackingCode, e.getMessage());
        }

        return mapToReturnResponse(savedRequest, shipment);
    }

    @Override
    public ReturnRequestResponse getReturnRequest(String trackingCode, String currentUserId, String roles, String permissions) {
        Shipment shipment = findAndAuthorizeShipment(trackingCode, currentUserId, roles, permissions);

        Optional<ReturnRequest> reqOpt = returnRequestRepository.findByTrackingCode(trackingCode);
        if (reqOpt.isPresent()) {
            return mapToReturnResponse(reqOpt.get(), shipment);
        }

        // Tương thích ngược: Nếu đơn đang RETURNING hoặc RETURNED cũ chưa có ReturnRequest
        if (shipment.getCurrentStatus() == ShipmentStatus.RETURNING
                || shipment.getCurrentStatus() == ShipmentStatus.OUT_FOR_RETURN
                || shipment.getCurrentStatus() == ShipmentStatus.RETURNED) {
            ReturnRequest virtualReq = ReturnRequest.builder()
                    .trackingCode(trackingCode)
                    .customerId(shipment.getCustomerId())
                    .initiator(ReturnInitiator.AUTO_MAX_FAILED)
                    .reasonCode("AUTO_RETURN_LEGACY")
                    .reasonNote("Đơn chuyển hoàn tự động trước phiên bản mới")
                    .returnMode(ReturnMode.DOORSTEP)
                    .status(ReturnRequestStatus.APPROVED)
                    .postalFault(false)
                    .returnFee(returnFeeCalculator.calculateReturnFee(shipment, false))
                    .feePaymentStatus(FeePaymentStatus.UNPAID)
                    .createdAt(shipment.getCreatedAt())
                    .updatedAt(shipment.getCreatedAt())
                    .build();
            return mapToReturnResponse(virtualReq, shipment);
        }

        throw new RuntimeException("Không tìm thấy thông tin yêu cầu hoàn cho đơn: " + trackingCode);
    }

    @Override
    public List<ReturnRequestResponse> listReturnRequests(ReturnRequestStatus status, String currentUserId, String roles, String permissions) {
        boolean staff = isStaffOrAdmin(roles, permissions);

        List<ReturnRequest> requests;
        if (staff) {
            requests = status != null ? returnRequestRepository.findByStatusOrderByCreatedAtDesc(status)
                    : returnRequestRepository.findAllByOrderByCreatedAtDesc();
        } else {
            Long myCustomerId = resolveCustomerId(currentUserId);
            requests = returnRequestRepository.findByCustomerIdOrderByCreatedAtDesc(myCustomerId);
            if (status != null) {
                requests = requests.stream().filter(r -> r.getStatus() == status).collect(Collectors.toList());
            }
        }

        Map<String, Shipment> shipmentMap = shipmentRepository.findAllById(
                requests.stream().map(ReturnRequest::getId).collect(Collectors.toList())
        ).stream().collect(Collectors.toMap(Shipment::getTrackingCode, s -> s, (s1, s2) -> s1));

        return requests.stream().map(r -> {
            Shipment s = shipmentRepository.findShipmentByTrackingCode(r.getTrackingCode()).orElse(null);
            return mapToReturnResponse(r, s);
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ReturnRequestResponse updatePostalFault(String trackingCode, PostalFaultUpdateRequestDto requestDto,
                                                   String currentUserId, String roles, String permissions) {
        if (!isStaffOrAdmin(roles, permissions)) {
            throw new ForbiddenException("Chỉ Quản trị viên hoặc CSKH mới có quyền xác nhận Lỗi bưu chính!");
        }

        Shipment shipment = shipmentRepository.findShipmentByTrackingCode(trackingCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy vận đơn: " + trackingCode));

        ReturnRequest returnRequest = returnRequestRepository.findByTrackingCode(trackingCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy yêu cầu hoàn cho đơn: " + trackingCode));

        returnRequest.setPostalFault(requestDto.isPostalFault());
        if (requestDto.isPostalFault()) {
            returnRequest.setReturnFee(BigDecimal.ZERO);
            returnRequest.setFeePaymentStatus(FeePaymentStatus.WAIVED);
            returnRequest.setReasonCode("POSTAL_FAULT");
            if (requestDto.getNote() != null && !requestDto.getNote().isBlank()) {
                returnRequest.setReasonNote(requestDto.getNote());
            }
        } else {
            returnRequest.setReturnFee(returnFeeCalculator.calculateReturnFee(shipment, false));
            returnRequest.setFeePaymentStatus(FeePaymentStatus.UNPAID);
        }

        ReturnRequest saved = returnRequestRepository.save(returnRequest);
        log.info("[RETURN] Staff {} đã cập nhật postalFault={} cho đơn {}", currentUserId, requestDto.isPostalFault(), trackingCode);
        return mapToReturnResponse(saved, shipment);
    }

    @Override
    public List<DeliveryFailureDecisionResponse> getPendingFailureDecisions(String currentUserId, String roles, String permissions) {
        Long myCustomerId = resolveCustomerId(currentUserId);
        List<DeliveryFailureDecision> decisions = failureDecisionRepository.findByCustomerIdAndDecisionOrderByCreatedAtDesc(
                myCustomerId, FailureDecisionType.PENDING
        );

        LocalDateTime now = LocalDateTime.now();
        return decisions.stream().map(d -> {
            Shipment s = shipmentRepository.findShipmentByTrackingCode(d.getTrackingCode()).orElse(null);
            long remaining = Duration.between(now, d.getDecisionDeadline()).toSeconds();
            return DeliveryFailureDecisionResponse.builder()
                    .id(d.getId())
                    .trackingCode(d.getTrackingCode())
                    .customerId(d.getCustomerId())
                    .attemptNo(d.getAttemptNo())
                    .failedAt(d.getFailedAt())
                    .decisionDeadline(d.getDecisionDeadline())
                    .remainingSeconds(Math.max(0, remaining))
                    .failureReason(d.getFailureReason())
                    .decision(d.getDecision())
                    .preferredDate(d.getPreferredDate())
                    .decisionNote(d.getDecisionNote())
                    .newReceiverPhone(d.getNewReceiverPhone())
                    .newReceiverAddress(d.getNewReceiverAddress())
                    .decidedAt(d.getDecidedAt())
                    .createdAt(d.getCreatedAt())
                    .shipmentStatus(s != null ? s.getCurrentStatus() : null)
                    .receiverName(s != null ? s.getReceiverName() : null)
                    .receiverPhone(s != null ? s.getReceiverPhone() : null)
                    .receiverAddress(s != null ? s.getReceiverAddress() : null)
                    .codAmount(s != null ? s.getCodAmount() : null)
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public DeliveryFailureDecisionResponse submitFailureDecision(String trackingCode, FailureDecisionRequestDto requestDto,
                                                                 String currentUserId, String roles, String permissions) {
        Shipment shipment = findAndAuthorizeShipment(trackingCode, currentUserId, roles, permissions);

        DeliveryFailureDecision decision = failureDecisionRepository.findByTrackingCodeAndDecision(trackingCode, FailureDecisionType.PENDING)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy quyết định xử lý đang chờ cho vận đơn: " + trackingCode));

        LocalDateTime now = LocalDateTime.now();
        if (now.isAfter(decision.getDecisionDeadline())) {
            throw new IllegalStateException("Đã quá thời hạn 24 giờ để đưa ra quyết định xử lý!");
        }

        decision.setDecision(requestDto.getDecision());
        decision.setDecidedAt(now);
        decision.setDecisionNote(requestDto.getDecisionNote());
        decision.setPreferredDate(requestDto.getPreferredDate());

        if (requestDto.getDecision() == FailureDecisionType.RETURN) {
            CreateReturnRequestDto returnDto = CreateReturnRequestDto.builder()
                    .reasonCode("DELIVERY_FAILED_CUSTOMER_CHOSE_RETURN")
                    .reasonNote(requestDto.getDecisionNote() != null ? requestDto.getDecisionNote() : "Khách hàng chọn hoàn đơn sau khi giao không thành công")
                    .returnMode(ReturnMode.DOORSTEP)
                    .build();
            createReturnRequest(trackingCode, returnDto, currentUserId, roles, permissions);
        } else if (requestDto.getDecision() == FailureDecisionType.UPDATE_RECEIVER) {
            if (requestDto.getNewReceiverPhone() != null && !requestDto.getNewReceiverPhone().isBlank()) {
                decision.setNewReceiverPhone(requestDto.getNewReceiverPhone().trim());
                shipment.setReceiverPhone(requestDto.getNewReceiverPhone().trim());
            }
            if (requestDto.getNewReceiverAddress() != null && !requestDto.getNewReceiverAddress().isBlank()) {
                decision.setNewReceiverAddress(requestDto.getNewReceiverAddress().trim());
                shipment.setReceiverAddress(requestDto.getNewReceiverAddress().trim());
            }
            shipmentRepository.save(shipment);
            // Xóa cache chi tiết để bưu tá thấy địa chỉ mới
            try {
                redisTemplate.delete("shipment-detail:" + trackingCode);
            } catch (Exception ignored) {}
        }

        DeliveryFailureDecision saved = failureDecisionRepository.save(decision);
        long remaining = Duration.between(now, saved.getDecisionDeadline()).toSeconds();

        return DeliveryFailureDecisionResponse.builder()
                .id(saved.getId())
                .trackingCode(saved.getTrackingCode())
                .customerId(saved.getCustomerId())
                .attemptNo(saved.getAttemptNo())
                .failedAt(saved.getFailedAt())
                .decisionDeadline(saved.getDecisionDeadline())
                .remainingSeconds(Math.max(0, remaining))
                .failureReason(saved.getFailureReason())
                .decision(saved.getDecision())
                .preferredDate(saved.getPreferredDate())
                .decisionNote(saved.getDecisionNote())
                .newReceiverPhone(saved.getNewReceiverPhone())
                .newReceiverAddress(saved.getNewReceiverAddress())
                .decidedAt(saved.getDecidedAt())
                .createdAt(saved.getCreatedAt())
                .shipmentStatus(shipment.getCurrentStatus())
                .receiverName(shipment.getReceiverName())
                .receiverPhone(shipment.getReceiverPhone())
                .receiverAddress(shipment.getReceiverAddress())
                .codAmount(shipment.getCodAmount())
                .build();
    }

    private ReturnRequestResponse mapToReturnResponse(ReturnRequest req, Shipment s) {
        return ReturnRequestResponse.builder()
                .id(req.getId())
                .trackingCode(req.getTrackingCode())
                .customerId(req.getCustomerId())
                .initiator(req.getInitiator())
                .reasonCode(req.getReasonCode())
                .reasonNote(req.getReasonNote())
                .returnMode(req.getReturnMode())
                .status(req.getStatus())
                .postalFault(req.isPostalFault())
                .returnFee(req.getReturnFee())
                .feePaymentStatus(req.getFeePaymentStatus())
                .arrivedOriginAt(req.getArrivedOriginAt())
                .pickupDeadline(req.getPickupDeadline())
                .requestedBy(req.getRequestedBy())
                .createdAt(req.getCreatedAt())
                .updatedAt(req.getUpdatedAt())
                .shipmentStatus(s != null ? s.getCurrentStatus() : null)
                .senderName(s != null ? s.getSenderName() : null)
                .senderPhone(s != null ? s.getSenderPhone() : null)
                .senderAddress(s != null ? s.getSenderAddress() : null)
                .receiverName(s != null ? s.getReceiverName() : null)
                .receiverPhone(s != null ? s.getReceiverPhone() : null)
                .receiverAddress(s != null ? s.getReceiverAddress() : null)
                .build();
    }
}
