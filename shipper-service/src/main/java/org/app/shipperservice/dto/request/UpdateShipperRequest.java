package org.app.shipperservice.dto.request;

import lombok.Data;

@Data
public class UpdateShipperRequest {
    private String courierCode;
    private String fullName;
    private String phone;
    private String telegramChatId;
    private String stationCode;
    private String status;
}
