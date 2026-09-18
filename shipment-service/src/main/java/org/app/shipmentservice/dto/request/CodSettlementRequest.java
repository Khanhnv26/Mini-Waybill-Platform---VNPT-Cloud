package org.app.shipmentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CodSettlementRequest {
    private List<String> trackingCodes;
    private String courierId;
    private String officerId;
    private String note;
}
