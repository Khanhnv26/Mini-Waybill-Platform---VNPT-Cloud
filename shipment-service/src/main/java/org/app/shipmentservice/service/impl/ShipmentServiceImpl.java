package org.app.shipmentservice.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.shipmentservice.client.CustomerClient;
import org.app.shipmentservice.dto.event.CreateShipmentEvent;
import org.app.shipmentservice.dto.request.CreateShipmentRequest;
import org.app.shipmentservice.dto.response.CustomerValidationResponse;
import org.app.shipmentservice.entity.Shipment;
import org.app.shipmentservice.exception.DuplicateRequestException;
import org.app.shipmentservice.exception.ForbiddenException;
import org.app.shipmentservice.repository.ShipmentRepository;
import org.app.shipmentservice.service.ShipmentService;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShipmentServiceImpl implements ShipmentService {
    private final ShipmentRepository shipmentRepository;
    private final CustomerClient customerClient;
    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String,Object> kafkaTemplate;

    @Override
    public Shipment createShipment(CreateShipmentRequest request, String currentUserId, String permissions) {

        if (permissions != null && !permissions.contains("shipment:create")) {
            throw new ForbiddenException("Người dùng không có quyền tạo đơn hàng!");
        }

        if (currentUserId != null && !currentUserId.isBlank())  {
            request.setCustomerId(Long.parseLong(currentUserId));
        }

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
                .build();
        Shipment saved = shipmentRepository.save(shipment);
        redisTemplate.opsForValue().set(redisKey, saved.getTrackingCode(), Duration.ofMinutes(5));

        CreateShipmentEvent event = CreateShipmentEvent.builder()
                .trackingCode(saved.getTrackingCode())
                .customerId(saved.getCustomerId())
                .senderName(saved.getSenderName())
                .senderPhone(saved.getSenderPhone())
                .senderAddress(saved.getSenderAddress())
                .receiverName(saved.getReceiverName())
                .receiverPhone(saved.getReceiverPhone())
                .receiverAddress(saved.getReceiverAddress())
                .serviceType(saved.getServiceType())
                .weight(saved.getWeight())
                .codAmount(saved.getCodAmount())
                .build();
        kafkaTemplate.send("shipment-events",String.valueOf(saved.getTrackingCode()),event);


        return saved;
    }

    @Override
    public Shipment getShipmentByTrackCode(String trackCode, String currentUserId, String permissions) {
        Shipment shipment =  shipmentRepository.findShipmentByTrackingCode(trackCode).orElseThrow(() ->
                new RuntimeException("Không tìm thấy đơn hàng: " + trackCode));

        if (permissions != null && !permissions.contains("shipment:read_all")) {
            if (currentUserId != null && !shipment.getCustomerId().toString().equals(currentUserId)) {
                throw new ForbiddenException("Người dùng không có quyền xem thông tin đơn hàng!");
            }
        }
        return shipment;
    }

    @Override
    public List<Shipment> getShipmentByCustomerId(Long customerId, String currentUserId, String permissions) {

        if (permissions != null && !permissions.contains("shipment:read_all")) {
            if (currentUserId != null && !customerId.toString().equals(currentUserId)) {
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
}
