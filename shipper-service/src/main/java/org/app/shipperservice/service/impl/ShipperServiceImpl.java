package org.app.shipperservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.shipperservice.dto.request.CreateShipperRequest;
import org.app.shipperservice.dto.request.UpdateShipperRequest;
import org.app.shipperservice.dto.response.ShipperLookupResponse;
import org.app.shipperservice.dto.response.ShipperResponse;
import org.app.shipperservice.dto.response.StationCapacityResponse;
import org.app.shipperservice.entity.Shipper;
import org.app.shipperservice.exception.ResourceNotFoundException;
import org.app.shipperservice.repository.ShipperRepository;
import org.app.shipperservice.service.ShipperService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShipperServiceImpl implements ShipperService {

    private final ShipperRepository shipperRepository;

    @Override
    @Transactional
    public ShipperResponse createShipper(CreateShipperRequest createShipperRequest) {
        Shipper saved = shipperRepository.save(
                Shipper.builder()
                        .courierCode(createShipperRequest.getCourierCode())
                        .fullName(createShipperRequest.getFullName())
                        .phone(createShipperRequest.getPhone())
                        .telegramChatId(createShipperRequest.getTelegramChatId())
                        .stationCode(createShipperRequest.getStationCode())
                        .status("ACTIVE")
                        .shiftStatus("ON_DUTY")
                        .maxOrdersPerShift(40)
                        .currentOrdersCount(0)
                        .ratingAvg(5.0)
                        .ratingCount(0)
                        .build());
        return toShipperResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipperResponse> getAllShippers() {
        return getShippers(null, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipperResponse> getShippers(String stationCode, String shiftStatus) {
        return shipperRepository.findAll().stream()
                .filter(s -> stationCode == null || stationCode.isBlank() || "ALL".equalsIgnoreCase(stationCode) || stationCode.equalsIgnoreCase(s.getStationCode()))
                .filter(s -> shiftStatus == null || shiftStatus.isBlank() || "ALL".equalsIgnoreCase(shiftStatus) || shiftStatus.equalsIgnoreCase(s.getShiftStatus()))
                .map(this::toShipperResponse)
                .toList();
    }

    @Override
    @Transactional
    public ShipperResponse updateShipper(Long id, UpdateShipperRequest updateShipperRequest) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bưu tá với id: " + id));

        if (updateShipperRequest.getCourierCode() != null) shipper.setCourierCode(updateShipperRequest.getCourierCode());
        if (updateShipperRequest.getFullName() != null) shipper.setFullName(updateShipperRequest.getFullName());
        if (updateShipperRequest.getPhone() != null) shipper.setPhone(updateShipperRequest.getPhone());
        if (updateShipperRequest.getTelegramChatId() != null) shipper.setTelegramChatId(updateShipperRequest.getTelegramChatId());
        if (updateShipperRequest.getStationCode() != null) shipper.setStationCode(updateShipperRequest.getStationCode());
        if (updateShipperRequest.getStatus() != null) shipper.setStatus(updateShipperRequest.getStatus());
        if (updateShipperRequest.getShiftStatus() != null) shipper.setShiftStatus(updateShipperRequest.getShiftStatus().trim().toUpperCase());
        if (updateShipperRequest.getMaxOrdersPerShift() != null) shipper.setMaxOrdersPerShift(updateShipperRequest.getMaxOrdersPerShift());

        Shipper updated = shipperRepository.save(shipper);
        return toShipperResponse(updated);
    }

    @Override
    @Transactional
    public ShipperResponse deleteShipper(Long id) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bưu tá với id: " + id));
        shipper.setStatus("INACTIVE");
        Shipper updated = shipperRepository.save(shipper);
        return toShipperResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public ShipperLookupResponse findByCourierCode(String courierCode) {
        return shipperRepository.findByCourierCode(courierCode)
                .map(shipper -> ShipperLookupResponse.builder()
                        .courierCode(shipper.getCourierCode())
                        .fullName(shipper.getFullName())
                        .phone(shipper.getPhone())
                        .telegramChatId(shipper.getTelegramChatId())
                        .stationCode(shipper.getStationCode())
                        .found(true)
                        .build())
                .orElse(ShipperLookupResponse.builder()
                        .found(false)
                        .build());
    }

    @Override
    @Transactional
    public boolean linkTelegramChatId(String courierCode, String telegramChatId) {
        return shipperRepository.findByCourierCode(courierCode)
                .map(shipper -> {
                    shipper.setTelegramChatId(telegramChatId);
                    shipperRepository.save(shipper);
                    return true;
                })
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public StationCapacityResponse getStationCapacity(String stationCode) {
        List<Shipper> stationShippers = shipperRepository.findByStationCode(stationCode);
        int totalShippers = stationShippers.size();
        List<Shipper> onDutyShippers = stationShippers.stream()
                .filter(shipper -> "ACTIVE".equals(shipper.getStatus()) && "ON_DUTY".equals(shipper.getShiftStatus()))
                .toList();
        int activeShippersOnDuty = onDutyShippers.size();
        int totalCapacity = onDutyShippers.stream().mapToInt(Shipper::getMaxOrdersPerShift).sum();
        int currentOrders = onDutyShippers.stream().mapToInt(Shipper::getCurrentOrdersCount).sum();
        int availableCapacity = Math.max(0, totalCapacity - currentOrders);
        double utilization = totalCapacity > 0 ? (double) currentOrders / totalCapacity * 100 : 0.0;
        return StationCapacityResponse.builder()
                .stationCode(stationCode)
                .totalShippers(totalShippers)
                .activeShippersOnDuty(activeShippersOnDuty)
                .totalCapacityPerShift(totalCapacity)
                .currentActiveOrders(currentOrders)
                .availableCapacity(availableCapacity)
                .utilizationRate(utilization)
                .build();
    }

    @Override
    @Transactional
    public ShipperResponse updateShiftStatus(Long shipperId, String shiftStatus) {
        Shipper shipper = shipperRepository.findById(shipperId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bưu tá với id: " + shipperId));

        String normalized = shiftStatus != null ? shiftStatus.trim().toUpperCase() : "ON_DUTY";
        if (!List.of("ON_DUTY", "OFF_DUTY").contains(normalized)) {
            throw new IllegalArgumentException("Trạng thái ca trực không hợp lệ: " + shiftStatus);
        }

        shipper.setShiftStatus(normalized);
        Shipper updated = shipperRepository.save(shipper);
        return toShipperResponse(updated);
    }

    private ShipperResponse toShipperResponse(Shipper shipper) {
        if (shipper == null) return null;
        return ShipperResponse.builder()
                .id(shipper.getId())
                .courierCode(shipper.getCourierCode())
                .fullName(shipper.getFullName())
                .phone(shipper.getPhone())
                .hasLinkedTelegram(shipper.getTelegramChatId() != null && !shipper.getTelegramChatId().isBlank())
                .stationCode(shipper.getStationCode())
                .status(shipper.getStatus())
                .shiftStatus(shipper.getShiftStatus() != null ? shipper.getShiftStatus() : "ON_DUTY")
                .maxOrdersPerShift(shipper.getMaxOrdersPerShift() != null ? shipper.getMaxOrdersPerShift() : 40)
                .currentOrdersCount(shipper.getCurrentOrdersCount() != null ? shipper.getCurrentOrdersCount() : 0)
                .ratingAvg(shipper.getRatingAvg() != null ? shipper.getRatingAvg() : 5.0)
                .ratingCount(shipper.getRatingCount() != null ? shipper.getRatingCount() : 0)
                .build();
    }
}
