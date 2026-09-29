package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.CustomerClient;
import org.app.shipmentservice.client.HubClient;
import org.app.shipmentservice.consumer.ShipmentStatusConsumer;
import org.app.shipmentservice.dto.event.CreateShipmentEvent;
import org.app.shipmentservice.dto.event.ShipmentStatusUpdatedEvent;
import org.app.shipmentservice.dto.request.CancelShipmentRequest;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.app.shipmentservice.dto.response.HubResponse;
import org.app.shipmentservice.entity.*;
import org.app.shipmentservice.exception.DuplicateRequestException;
import org.app.shipmentservice.exception.ForbiddenException;
import org.app.shipmentservice.exception.UnauthorizedException;
import org.app.shipmentservice.pricing.dto.CalculateTariffRequest;
import org.app.shipmentservice.pricing.dto.TariffCalculationResponse;
import org.app.shipmentservice.pricing.service.TariffPricingService;
import org.app.shipmentservice.repository.OutboxEventRepository;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static org.app.shipmentservice.constant.ShipmentFeeConstant.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentServiceImpl implements ShipmentService {
    private final ShipmentRepository shipmentRepository;
    private final CustomerClient customerClient;
    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String,Object> kafkaTemplate;
    private final HubClient hubClient;
    private final TariffPricingService tariffPricingService;
    private final OutboxEventRepository outboxEventRepository;
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

        log.info("Đang gọi customer-service để phân giải userId {} sang customerId", userId);
        CustomerValidationResponse validationResponse = customerClient.validateCustomerByUserId(userId);
        if (validationResponse == null || !validationResponse.isValid() || validationResponse.getCustomerId() == null) {
            String reason = validationResponse != null ? validationResponse.getReason() : "CUSTOMER_PROFILE_NOT_FOUND";
            throw new RuntimeException("Không tìm thấy hồ sơ khách hàng hợp lệ gắn với tài khoản! Lý do: " + reason);
        }

        Long customerId = validationResponse.getCustomerId();
        redisTemplate.opsForValue().set(cacheKey, customerId.toString(), Duration.ofMinutes(30));
        return customerId;
    }

    private boolean hasPermission(String permissions, String code) {
        if (permissions == null || permissions.isBlank() || code == null || code.isBlank()) {
            return false;
        }
        for (String part : permissions.split(",")) {
            if (code.equals(part.trim())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Header quyền rỗng nghĩa là không có claim RBAC (khách vãng lai, hoặc gateway
     * gửi chuỗi rỗng khi token không kèm permissions). Tra cứu công khai và tạo đơn
     * của chính chủ không được hiểu chuỗi rỗng thành "bị cấm".
     */
    private boolean lacksPermissionClaim(String permissions) {
        return permissions == null || permissions.isBlank();
    }

    @Override
    public Shipment createShipment(CreateShipmentRequest request, String currentUserId, String permissions) {

        if (!lacksPermissionClaim(permissions)
                && !hasPermission(permissions, "shipment:create")
                && !hasPermission(permissions, "shipment:create_for_others")) {
            throw new ForbiddenException("Người dùng không có quyền tạo đơn hàng!");
        }

        if (currentUserId == null || currentUserId.isBlank() || "null".equalsIgnoreCase(currentUserId)) {
            throw new UnauthorizedException("Yêu cầu thông tin đăng nhập hợp lệ để tạo đơn hàng!");
        }

        if(!isSupportedAddress(request.getSenderAddress())) {
            throw new RuntimeException("Địa chỉ người gửi không được hỗ trợ: " + request.getSenderAddress());
        }

        if(!isSupportedAddress(request.getReceiverAddress())) {
            throw new RuntimeException("Địa chỉ người nhận không được hỗ trợ: " + request.getReceiverAddress());
        }


        boolean canCreateForOthers = hasPermission(permissions, "shipment:create_for_others");
        Long targetCustomerId;

        if(canCreateForOthers) {
            //tao ho khach hang
            if (request.getCustomerId() != null) {
                targetCustomerId = request.getCustomerId();
                log.info("[SHIPMENT] Nhân viên {} đang tạo đơn hộ cho customerId {}", currentUserId, targetCustomerId);
                CustomerValidationResponse validationResponse = customerClient.validateCustomer(targetCustomerId);
                if (validationResponse == null || !validationResponse.isValid()) {
                    throw new RuntimeException("Không xác thực được khách hàng với ID: " + targetCustomerId);
                }
            } else {
                log.info("[SHIPMENT] Nhân viên {} tạo đơn khách vãng lai, tự động gán CUS_RETAIL", currentUserId);
                CustomerValidationResponse retailCustomer = customerClient.getRetailCustomer();
                if (retailCustomer == null || retailCustomer.getCustomerId() == null) {
                    throw new RuntimeException("Không tìm thấy hồ sơ khách vãng lai. Không thể tạo đơn.");
                }
                targetCustomerId = retailCustomer.getCustomerId();


            }
        } else {
            targetCustomerId = resolveCustomerId(currentUserId);
        }

        request.setCustomerId(targetCustomerId);

        if (request.getRequestId() == null || request.getRequestId().isBlank()) {
            String requestId = UUID.randomUUID().toString();
            request.setRequestId(requestId);
        }

        String redisKey = "shipment:requestId:" + request.getRequestId();
        Boolean isFirstRequest = redisTemplate.opsForValue().setIfAbsent(redisKey,"PROCESSING", Duration.ofHours(24));

        if (Boolean.FALSE.equals(isFirstRequest)) {

            String existing = redisTemplate.opsForValue().get(redisKey);

            if ("PROCESSING".equals(existing)) {
                log.warn("[SHIPMENT] Request ID {} đang được xử lý dở dang, từ chối request trùng lặp!", request.getRequestId());
                throw new DuplicateRequestException(request.getRequestId(),
                        "Yêu cầu tạo đơn đang được xử lý. Vui lòng không bấm gửi lại liên tục!");
            } else {
                log.warn("[SHIPMENT] Request ID {} đã tạo đơn thành công trước đó với mã: {}", request.getRequestId(), existing);
                throw new DuplicateRequestException(request.getRequestId(),
                        "Đơn hàng của yêu cầu này đã được tạo thành công trước đó (Mã: " + existing + ")!");
            }

        }

        log.info("Đang gọi service customer để xác thực thông tin khách hàng {}",request.getCustomerId());

        CustomerValidationResponse validationResponse = customerClient.validateCustomer(request.getCustomerId());
        if (validationResponse == null || !validationResponse.isValid()) {
            redisTemplate.delete(redisKey);
            throw new RuntimeException("Không xác thực được khách hàng !" +
                    " Lí do: " + (validationResponse != null ? validationResponse.getReason() : "Unknown"));
        }

        double weight = request.getWeight() != null ? request.getWeight() : 1.0;
        BigDecimal baseFee;
        BigDecimal totalFee;

        try {
            CalculateTariffRequest tariffRequest = CalculateTariffRequest.builder()
                    .senderProvince(request.getSenderAddress())
                    .receiverProvince(request.getReceiverAddress())
                    .weightGram(weight * 1000.0)
                    .codAmount(request.getCodAmount())
                    .build();

            TariffCalculationResponse tariffResponse = tariffPricingService.calculateTariff(tariffRequest);
            String targetServiceCode = request.getServiceType() != null ? request.getServiceType().name() : "STANDARD";

            TariffCalculationResponse.PlanDetail matchedPlan = null;
            if (tariffResponse != null && tariffResponse.getPlans() != null) {
                matchedPlan = tariffResponse.getPlans().stream()
                        .filter(p -> targetServiceCode.equalsIgnoreCase(p.getServiceCode()))
                        .findFirst()
                        .orElse(null);
            }

            if (matchedPlan != null) {
                baseFee = matchedPlan.getBaseFee();
                totalFee = matchedPlan.getTotalFee();
            } else {
                if (request.getServiceType() == ServiceType.EXPRESS) {
                    baseFee = BigDecimal.valueOf(Math.max(BASE_COST_EXPRESS.doubleValue(), weight * COST_EXPRESS.doubleValue()));
                } else if (request.getServiceType() == ServiceType.ECO) {
                    baseFee = BigDecimal.valueOf(Math.max(15000.0, weight * 9000.0));
                } else {
                    baseFee = BigDecimal.valueOf(Math.max(BASE_COST_STANDARD.doubleValue(), weight * COST_STANDARD.doubleValue()));
                }
                BigDecimal codFee = BigDecimal.ZERO;
                if (request.getCodAmount() != null && request.getCodAmount().compareTo(BigDecimal.ZERO) > 0) {
                    codFee = request.getCodAmount().multiply(COD_FEE_RATE).max(BASE_COD_COST);
                }
                BigDecimal fuelFee = baseFee.multiply(FUEL_FEE);
                totalFee = baseFee.add(codFee).add(fuelFee);
            }
        } catch (Exception e) {
            log.warn("[SHIPMENT] Fallback tinh cuoc: {}", e.getMessage());
            if (request.getServiceType() == ServiceType.EXPRESS) {
                baseFee = BigDecimal.valueOf(Math.max(BASE_COST_EXPRESS.doubleValue(), weight * COST_EXPRESS.doubleValue()));
            } else if (request.getServiceType() == ServiceType.ECO) {
                baseFee = BigDecimal.valueOf(Math.max(15000.0, weight * 9000.0));
            } else {
                baseFee = BigDecimal.valueOf(Math.max(BASE_COST_STANDARD.doubleValue(), weight * COST_STANDARD.doubleValue()));
            }
            BigDecimal codFee = BigDecimal.ZERO;
            if (request.getCodAmount() != null && request.getCodAmount().compareTo(BigDecimal.ZERO) > 0) {
                codFee = request.getCodAmount().multiply(COD_FEE_RATE).max(BASE_COD_COST);
            }
            BigDecimal fuelFee = baseFee.multiply(FUEL_FEE);
            totalFee = baseFee.add(codFee).add(fuelFee);
        }


        String trackingCode = "WB" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        Shipment shipment = Shipment.builder()
                .trackingCode(trackingCode)
                .customerId(request.getCustomerId())
                .senderName(request.getSenderName())
                .senderPhone(request.getSenderPhone())
                .senderAddress(request.getSenderAddress())
                .senderLatitude(request.getSenderLatitude())
                .senderLongitude(request.getSenderLongitude())
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .receiverAddress(request.getReceiverAddress())
                .receiverLatitude(request.getReceiverLatitude())
                .receiverLongitude(request.getReceiverLongitude())
                .serviceType(request.getServiceType())
                .weight(request.getWeight())
                .codAmount(request.getCodAmount())
                .shippingFee(baseFee)
                .totalFee(totalFee)
                .build();
        Shipment saved = shipmentRepository.save(shipment);
        redisTemplate.opsForValue().set(redisKey, saved.getTrackingCode(), Duration.ofHours(24));

        CreateShipmentEvent event = CreateShipmentEvent.builder()
                .trackingCode(saved.getTrackingCode())
                .customerId(saved.getCustomerId())
                .customerEmail(validationResponse.getEmail())
                .senderName(saved.getSenderName())
                .senderPhone(saved.getSenderPhone())
                .senderAddress(saved.getSenderAddress())
                .receiverName(saved.getReceiverName())
                .receiverPhone(saved.getReceiverPhone())
                .receiverAddress(saved.getReceiverAddress())
                .serviceType(saved.getServiceType())
                .weight(saved.getWeight())
                .codAmount(saved.getCodAmount())
                .shippingFee(baseFee)
                .totalFee(totalFee)
                .build();
        kafkaTemplate.send("shipment-events",String.valueOf(saved.getTrackingCode()),event);

        return saved;
    }

    @Override
    public Shipment getShipmentByTrackCode(String trackCode, String currentUserId, String permissions) {
        Shipment shipment =  shipmentRepository.findShipmentByTrackingCode(trackCode).orElseThrow(() ->
                new RuntimeException("Không tìm thấy đơn hàng: " + trackCode));

        // Tra cứu theo mã vận đơn là chức năng công khai (gateway permitAll).
        // Khách có tracking:read_public, hoặc token không kèm claim quyền, được xem
        // cùng mức với khách vãng lai. Chỉ siết chủ sở hữu khi claim có quyền khác
        // nhưng không có quyền đọc công khai / đọc toàn bộ.
        if (canReadShipmentByCode(permissions)) {
            return shipment;
        }

        Long myCustomerId = resolveCustomerId(currentUserId);
        if (shipment.getCustomerId() == null || !shipment.getCustomerId().equals(myCustomerId)) {
            throw new ForbiddenException("Người dùng không có quyền xem thông tin đơn hàng!");
        }
        return shipment;
    }

    private boolean canReadShipmentByCode(String permissions) {
        return lacksPermissionClaim(permissions)
                || hasPermission(permissions, "shipment:read_all")
                || hasPermission(permissions, "tracking:read_public");
    }

    @Override
    public List<Shipment> getShipmentByCustomerId(Long customerId, String currentUserId, String permissions) {

        if (!lacksPermissionClaim(permissions) && !hasPermission(permissions, "shipment:read_all")) {
            Long myCustomerId = resolveCustomerId(currentUserId);
            if (!customerId.equals(myCustomerId)) {
                throw new ForbiddenException("Bạn không được phép xem trộm danh sách đơn hàng của khách khác!");
            }
        }

        CustomerValidationResponse validationResponse = customerClient.validateCustomer(customerId);
        if (validationResponse == null || !validationResponse.isValid()) {
            throw new RuntimeException("Không xác thực được khách hàng !" +
                    " Lí do: " + (validationResponse != null ? validationResponse.getReason() : "Unknown"));
        }

        return shipmentRepository.findAllByCustomerId(customerId).orElseThrow(
                () -> new RuntimeException("Không tìm thấy đơn hàng của khách hàng: " + customerId));
    }

    @Override
    public List<Shipment> getShipments(Long customerId, String currentUserId, String permissions) {
        boolean hasReadAllPermission = hasPermission(permissions, "shipment:read_all");

        if (hasReadAllPermission) {
            if (customerId == null) {
                log.info("[SHIPMENT] Admin/CSKH {} đang truy xuất toàn bộ danh sách vận đơn hệ thống", currentUserId);
                return shipmentRepository.findAllByOrderByCreatedAtDesc();
            }
            log.info("[SHIPMENT] Admin/CSKH {} đang lọc danh sách đơn của khách hàng {}", currentUserId, customerId);
            return shipmentRepository.findAllByCustomerIdOrderByCreatedAtDesc(customerId);
        }

        Long myCustomerId = resolveCustomerId(currentUserId);
        if (customerId != null && !customerId.equals(myCustomerId)) {
            throw new ForbiddenException("Người dùng không có quyền xem danh sách đơn hàng của khách khác!");
        }

        log.info("[SHIPMENT] Khách hàng {} (userId: {}) đang xem danh sách đơn của chính mình", myCustomerId, currentUserId);
        return shipmentRepository.findAllByCustomerIdOrderByCreatedAtDesc(myCustomerId);

    }

    @Override
    @Transactional
    public Shipment cancelShipment(String trackCode, String currentUserId, String roles, String permissions, CancelShipmentRequest cancelRequest) {
        Shipment shipment = shipmentRepository.findShipmentByTrackingCode(trackCode)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đơn hàng: " + trackCode));

        boolean hasCancelAllPermission = hasPermission(permissions, "shipment:cancel_all");
        boolean isAdminRole = roles != null && roles.contains("ROLE_ADMIN");
        boolean isCsRole = roles != null && roles.contains("ROLE_CS");
        boolean hasAdminPermission = hasCancelAllPermission || isAdminRole || isCsRole;

        if (!hasAdminPermission) {
            Long myCustomerId = resolveCustomerId(currentUserId);
            if (!shipment.getCustomerId().equals(myCustomerId)) {
                throw new ForbiddenException("Người dùng không có quyền hủy đơn hàng của khách khác!");
            }
        }

        ShipmentStatus currentStatus = shipment.getCurrentStatus();
        if (currentStatus == ShipmentStatus.CANCELLED) {
            throw new IllegalStateException("Đơn hàng đã bị hủy trước đó: " + trackCode);
        }

        if (currentStatus == ShipmentStatus.DELIVERED || currentStatus == ShipmentStatus.RETURNED) {
            throw new IllegalStateException("Đơn hàng không thể hủy ở trạng thái hiện tại: " + currentStatus);
        }

        shipment.setCurrentStatus(ShipmentStatus.CANCELLED);
        Shipment updatedShipment = shipmentRepository.save(shipment);
        log.info("[SHIPMENT] Đơn hàng {} đã được hủy bởi userId: {} (roles: {}, permissions: {})",
                trackCode, currentUserId, roles, permissions);

        String redisKey = "shipment-status:" + trackCode;
        redisTemplate.opsForValue().set(redisKey, ShipmentStatus.CANCELLED.name(), Duration.ofDays(7));

        String actorType;
        String locationDesc;
        if (isAdminRole) {
            actorType = "ADMIN_CANCEL";
            locationDesc = "Quản trị viên hệ thống yêu cầu hủy vận đơn";
        } else if (isCsRole) {
            actorType = "CS_CANCEL";
            locationDesc = "Nhân viên CSKH yêu cầu hủy vận đơn";
        } else if (hasCancelAllPermission) {
            actorType = "STAFF_CANCEL";
            locationDesc = "Nhân sự quản lý yêu cầu hủy vận đơn";
        } else {
            actorType = "CUSTOMER_CANCEL";
            locationDesc = "Người gửi yêu cầu hủy vận đơn";
        }

        String reasonDetail = "";
        if (cancelRequest != null) {
            if (cancelRequest.getReasonNote() != null && !cancelRequest.getReasonNote().isBlank()) {
                reasonDetail = " - " + cancelRequest.getReasonNote().trim();
            } else if (cancelRequest.getReasonCode() != null && !cancelRequest.getReasonCode().isBlank()) {
                reasonDetail = " (" + cancelRequest.getReasonCode().trim() + ")";
            }
        }

        String note = "[" + actorType + "]" + reasonDetail;

        ShipmentStatusUpdatedEvent event = ShipmentStatusUpdatedEvent.builder()
                .trackingCode(updatedShipment.getTrackingCode())
                .status(ShipmentStatus.CANCELLED.name())
                .note(note)
                .locationCode(locationDesc)
                .updateAt(LocalDateTime.now())
                .build();
        try {
            String payLoadJson = objectMapper.writeValueAsString(event);
            OutBoxEvent outBoxEvent = OutBoxEvent.builder()
                    .aggregateType("SHIPMENT")
                    .aggregateId(updatedShipment.getTrackingCode())
                    .eventType("SHIPMENT_CANCELLED")
                    .payload(payLoadJson)
                    .status("PENDING")
                    .createdAt(LocalDateTime.now())
                    .build();
            outboxEventRepository.save(outBoxEvent);

            log.info("[SHIPMENT] Đã tạo Outbox Event cho đơn: {}", trackCode);

        } catch (Exception e) {
            log.error("[SHIPMENT] Không thể tạo Outbox Event cho {}: {}", trackCode, e.getMessage(), e);
            throw new RuntimeException("Lỗi tạo sự kiện hủy đơn", e);
        }

        return updatedShipment;
    }

    private String unaccent(String text) {
        if (text == null) return "";
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        return pattern.matcher(normalized).replaceAll("")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase()
                .trim();
    }

    private boolean isSupportedAddress(String address) {
        if (address == null || address.isBlank()) {
            return false;
        }
        List<HubResponse> hubs;
        try {
            hubs = hubClient.getAllHubs();
        } catch (Exception e) {
            log.error("Lỗi khi gọi HubClient để lấy danh sách hub: {}", e.getMessage());
            return false;
        }

        if (hubs == null || hubs.isEmpty()) {
            log.warn("Danh sách hub trống hoặc null, không thể xác thực địa chỉ: {}", address);
            return false;
        }

        String addressLower = address.toLowerCase();
        String addressUnaccent = unaccent(address);

        return hubs.stream()
                .map(HubResponse::getProvince)
                .filter(Objects::nonNull)
                .anyMatch(province -> {
                    String provLower = province.toLowerCase();
                    String provUnaccent = unaccent(province);
                    if (addressLower.contains(provLower) || addressUnaccent.contains(provUnaccent)) {
                        return true;
                    }
                    if (provUnaccent.contains("ho chi minh") && (addressUnaccent.contains("hcm") || addressUnaccent.contains("sai gon") || addressUnaccent.contains("tphcm"))) {
                        return true;
                    }
                    if (provUnaccent.contains("ha noi") && (addressUnaccent.contains("hn") || addressUnaccent.contains("tp ha noi"))) {
                        return true;
                    }
                    if (provUnaccent.contains("da nang") && (addressUnaccent.contains("dn") || addressUnaccent.contains("tp da nang"))) {
                        return true;
                    }
                    if (provUnaccent.contains("hai phong") && (addressUnaccent.contains("hp") || addressUnaccent.contains("tp hai phong"))) {
                        return true;
                    }
                    if (provUnaccent.contains("can tho") && (addressUnaccent.contains("ct") || addressUnaccent.contains("tp can tho"))) {
                        return true;
                    }
                    return false;
                });
    }

    @Override
    @Transactional
    public List<Shipment> submitCodSettlement(List<String> trackingCodes, String courierId) {
        if (trackingCodes == null || trackingCodes.isEmpty()) {
            throw new IllegalArgumentException("Danh sách mã vận đơn nộp quỹ không được để trống!");
        }
        List<Shipment> updatedList = new ArrayList<>();
        for (String code : trackingCodes) {
            shipmentRepository.findShipmentByTrackingCode(code).ifPresent(s -> {
                if (s.getCodAmount() != null && s.getCodAmount().compareTo(BigDecimal.ZERO) > 0) {
                    s.setCodSettlementStatus(CodSettlementStatus.PENDING_SETTLEMENT);
                    Shipment saved = shipmentRepository.save(s);
                    updatedList.add(saved);

                    ShipmentStatusUpdatedEvent event = ShipmentStatusUpdatedEvent.builder()
                            .trackingCode(saved.getTrackingCode())
                            .status(saved.getCurrentStatus() != null ? saved.getCurrentStatus().name() : "DELIVERED")
                            .codSettlementStatus(CodSettlementStatus.PENDING_SETTLEMENT.name())
                            .locationCode(courierId != null && !courierId.isBlank() ? courierId : "Bưu tá nộp quỹ")
                            .note("Bưu tá gửi yêu cầu nộp quỹ COD")
                            .updateAt(LocalDateTime.now())
                            .build();
                    kafkaTemplate.send("tracking-status-events", saved.getTrackingCode(), event);
                }
            });
        }
        log.info("[SHIPMENT-COD] Bưu tá {} đã gửi nộp quỹ {} vận đơn", courierId, updatedList.size());
        return updatedList;
    }

    @Override
    @Transactional
    public List<Shipment> confirmCodSettlement(List<String> trackingCodes, String officerId) {
        if (trackingCodes == null || trackingCodes.isEmpty()) {
            throw new IllegalArgumentException("Danh sách mã vận đơn duyệt quỹ không được để trống!");
        }
        List<Shipment> updatedList = new ArrayList<>();
        for (String code : trackingCodes) {
            shipmentRepository.findShipmentByTrackingCode(code).ifPresent(s -> {
                s.setCodSettlementStatus(CodSettlementStatus.SETTLED);
                s.setCodSettledAt(LocalDateTime.now());
                s.setCodSettledBy(officerId != null && !officerId.isBlank() ? officerId : "Thủ quỹ bưu cục");
                Shipment saved = shipmentRepository.save(s);
                updatedList.add(saved);

                ShipmentStatusUpdatedEvent event = ShipmentStatusUpdatedEvent.builder()
                        .trackingCode(saved.getTrackingCode())
                        .status(saved.getCurrentStatus() != null ? saved.getCurrentStatus().name() : "DELIVERED")
                        .codSettlementStatus(CodSettlementStatus.SETTLED.name())
                        .locationCode(officerId != null && !officerId.isBlank() ? officerId : "Thủ quỹ bưu cục")
                        .note("Bưu cục đã xác nhận thu tiền quỹ COD")
                        .updateAt(LocalDateTime.now())
                        .build();
                kafkaTemplate.send("tracking-status-events", saved.getTrackingCode(), event);
            });
        }
        log.info("[SHIPMENT-COD] Thủ quỹ {} đã duyệt nộp quỹ thành công {} vận đơn", officerId, updatedList.size());
        return updatedList;
    }
}

