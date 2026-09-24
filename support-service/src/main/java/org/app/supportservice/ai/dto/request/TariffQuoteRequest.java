package org.app.supportservice.ai.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TariffQuoteRequest {
    private String senderProvince;
    private String receiverProvince;
    private Double weightGram;
}
