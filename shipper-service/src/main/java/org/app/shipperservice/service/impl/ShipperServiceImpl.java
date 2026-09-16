package org.app.shipperservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.shipperservice.dto.request.CreateShipperRequest;
import org.app.shipperservice.dto.request.UpdateShipperRequest;
import org.app.shipperservice.dto.response.ShipperLookupResponse;
import org.app.shipperservice.dto.response.ShipperResponse;
import org.app.shipperservice.entity.Shipper;
import org.app.shipperservice.exception.ResourceNotFoundException;
import org.app.shipperservice.repository.ShipperRepository;
import org.app.shipperservice.service.ShipperService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static java.util.stream.Collectors.toList;

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
                        .build());
        return ShipperResponse.builder()
                .id(saved.getId())
                .courierCode(saved.getCourierCode())
                .fullName(saved.getFullName())
                .phone(saved.getPhone())
                .hasLinkedTelegram(saved.getTelegramChatId() != null && !saved.getTelegramChatId().isBlank())
                .stationCode(saved.getStationCode())
                .status(saved.getStatus())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShipperResponse> getAllShippers() {
        return shipperRepository.findAll().stream()
                .map(shipper -> ShipperResponse.builder()
                        .id(shipper.getId())
                        .courierCode(shipper.getCourierCode())
                        .fullName(shipper.getFullName())
                        .phone(shipper.getPhone())
                        .hasLinkedTelegram(shipper.getTelegramChatId() != null && !shipper.getTelegramChatId().isBlank())
                        .stationCode(shipper.getStationCode())
                        .status(shipper.getStatus())
                        .build())
                .collect(toList());
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

        Shipper updated = shipperRepository.save(shipper);

        return ShipperResponse.builder()
                .id(updated.getId())
                .courierCode(updated.getCourierCode())
                .fullName(updated.getFullName())
                .phone(updated.getPhone())
                .hasLinkedTelegram(updated.getTelegramChatId() != null && !updated.getTelegramChatId().isBlank())
                .stationCode(updated.getStationCode())
                .status(updated.getStatus())
                .build();
    }

    @Override
    @Transactional
    public ShipperResponse deleteShipper(Long id) {
        Shipper shipper = shipperRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy bưu tá với id: " + id));
        shipper.setStatus("INACTIVE");
        shipperRepository.save(shipper);
        return ShipperResponse.builder()
                .id(shipper.getId())
                .courierCode(shipper.getCourierCode())
                .fullName(shipper.getFullName())
                .phone(shipper.getPhone())
                .hasLinkedTelegram(shipper.getTelegramChatId() != null && !shipper.getTelegramChatId().isBlank())
                .stationCode(shipper.getStationCode())
                .status(shipper.getStatus())
                .build();
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
}
