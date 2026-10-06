package org.app.shipmentservice.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.FailureDecisionType;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FailureDecisionRequestDto {

    @NotNull(message = "Quyết định xử lý không được để trống")
    private FailureDecisionType decision;

    private LocalDate preferredDate;

    private String decisionNote;

    private String newReceiverPhone;

    private String newReceiverAddress;
}
