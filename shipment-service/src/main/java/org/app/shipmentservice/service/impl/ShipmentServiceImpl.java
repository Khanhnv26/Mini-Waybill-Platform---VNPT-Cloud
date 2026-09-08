package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.CustomerClient;
import org.app.shipmentservice.client.HubClient;
import org.app.shipmentservice.dto.event.CreateShipmentEvent;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.app.shipmentservice.dto.response.HubResponse;
import org.app.shipmentservice.entity.ServiceType;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.exception.DuplicateRequestException;
import org.app.shipmentservice.exception.ForbiddenException;
import org.app.shipmentservice.exception.UnauthorizedException;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Duration;
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

    @Override
    public Shipment createShipment(CreateShipmentRequest request, String currentUserId, String permissions) {

        if (permissions != null && !permissions.contains("shipment:create")) {
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


        boolean canCreateForOthers = permissions != null && permissions.contains("shipment:create_for_others");
        Long targetCustomerId;

        if (canCreateForOthers && request.getCustomerId() != null) {
            targetCustomerId = request.getCustomerId();
            log.info("[SHIPMENT] Admin/CSKH {} đang tạo đơn hộ cho customerId {}", currentUserId, targetCustomerId);
            CustomerValidationResponse validationResponse = customerClient.validateCustomer(targetCustomerId);
            if (validationResponse == null || !validationResponse.isValid()) {
                throw new RuntimeException("Không xác thực được khách hàng (ID: " + targetCustomerId + ")!" +
                        " Lí do: " + (validationResponse != null ? validationResponse.getReason() : "Unknown"));
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
        Boolean isFirstRequest = redisTemplate.opsForValue().setIfAbsent(redisKey,"PROCESSING", Duration.ofMinutes(5));

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

        double weight = request.getWeight();
        BigDecimal baseFee;

        if(request.getServiceType() == ServiceType.EXPRESS) {
            baseFee = BigDecimal.valueOf(Math.max(BASE_COST_EXPRESS.doubleValue(), weight * COST_EXPRESS.doubleValue()));
        } else {
            baseFee = BigDecimal.valueOf(Math.max(BASE_COST_STANDARD.doubleValue(), weight * COST_STANDARD.doubleValue()));
        }

        BigDecimal codFee = BigDecimal.ZERO;
        if(request.getCodAmount() != null && request.getCodAmount().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal calculatedCodFee = request.getCodAmount().multiply(COD_FEE_RATE);
            codFee = calculatedCodFee.max(BASE_COD_COST);
        }

        BigDecimal fuelFee = baseFee.multiply(FUEL_FEE);
        BigDecimal totalFee = baseFee.add(codFee).add(fuelFee);


        String trackingCode = "WB" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        Shipment shipment = Shipment.builder()
                .trackingCode(trackingCode)
                .customerId(request.getCustomerId())
                .senderName(request.getSenderName())
                .senderPhone(request.getSenderPhone())
                .senderAddress(request.getSenderAddress())
                .receiverName(request.getReceiverName())
                .receiverPhone(request.getReceiverPhone())
                .receiverAddress(request.getReceiverAddress())
                .serviceType(request.getServiceType())
                .weight(request.getWeight())
                .codAmount(request.getCodAmount())
                .shippingFee(totalFee)
                .totalFee(totalFee)
                .build();
        Shipment saved = shipmentRepository.save(shipment);
        redisTemplate.opsForValue().set(redisKey, saved.getTrackingCode(), Duration.ofMinutes(5));

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

        if (permissions != null && !permissions.contains("shipment:read_all")) {
            Long myCustomerId = resolveCustomerId(currentUserId);
            if (!shipment.getCustomerId().equals(myCustomerId)) {
                throw new ForbiddenException("Người dùng không có quyền xem thông tin đơn hàng!");
            }
        }
        return shipment;
    }

    @Override
    public List<Shipment> getShipmentByCustomerId(Long customerId, String currentUserId, String permissions) {

        if (permissions != null && !permissions.contains("shipment:read_all")) {
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
        boolean hasReadAllPermission = permissions != null && permissions.contains("shipment:read_all");

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

        return hubs.stream()
                .map(HubResponse::getProvince)
                .filter(Objects::nonNull)
                .anyMatch(province -> address.toLowerCase().contains(province.toLowerCase()));
    }
}
