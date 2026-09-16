package org.app.shipperservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipperLookupResponse {
    private String courierCode;
    private String fullName;
    private String phone;
    private String telegramChatId;
    private String stationCode;
    private boolean found;
}
