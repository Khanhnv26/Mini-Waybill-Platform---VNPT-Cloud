package org.app.shipperservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ShipperResponse {
    private Long id;
    private String courierCode;
    private String fullName;
    private String phone;
    private String telegramChatId;
    private boolean hasLinkedTelegram;
    private String stationCode;
    private String status;
    private String shiftStatus;
    private Integer maxOrdersPerShift;
    private Integer currentOrdersCount;
    private Double ratingAvg;
    private Integer ratingCount;
}
