package org.app.shipperservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UpdateShipperRequest {
    private String courierCode;
    private String fullName;
    private String phone;
    private String telegramChatId;
    private String stationCode;
    private String status;
    private String shiftStatus;
    private Integer maxOrdersPerShift;
}
