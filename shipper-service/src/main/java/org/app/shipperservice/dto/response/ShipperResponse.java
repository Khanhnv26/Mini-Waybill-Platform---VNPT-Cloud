package org.app.shipperservice.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ShipperResponse {
    private Long id;
    private String courierCode;
    private String fullName;
    private String phone;
    private boolean hasLinkedTelegram;
    private String stationCode;
    private String status;
}
