package org.app.routingservice.dto.operation;

import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import org.app.sharedevents.entity.TransportLeg;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryOperationRequest {
    @NotEmpty(message = "Phải có ít nhất một mã bưu gửi")
    private List<String> trackingCodes;
    private String operationId;
    private String note;
    private TransportLeg transportLeg;
    private String tripCode;
    private String shipmentStatus;
}
