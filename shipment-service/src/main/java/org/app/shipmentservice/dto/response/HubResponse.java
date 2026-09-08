package org.app.shipmentservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class HubResponse {
    private Long id;
    private String hubCode;
    private String province;
    private Double latitude;
    private Double longitude;
}
