package org.app.shipmentservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EtaCalculationRequest {
    private String senderAddress;
    private String receiverAddress;
    private String originHub;
    private String destinationHub;
    private Double weight;
    private String serviceType;
    private LocalDateTime createdAt;
}
