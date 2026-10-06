package org.app.shipmentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostalFaultUpdateRequestDto {

    private boolean postalFault;
    private String note;
}
