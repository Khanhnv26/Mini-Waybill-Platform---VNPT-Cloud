package org.app.supportservice.dto.request;


import lombok.Data;

import java.math.BigDecimal;

@Data
public class ResolveTicketRequest {

    private String resolutionNote;
    private BigDecimal compensationAmount = BigDecimal.ZERO;
    private String status = "RESOLVED";
}
