package org.app.reportservice.dto.event;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
@Builder
public class ShipmentStatusUpdatedEvent {
    private String trackingCode;
    private String status;
    private String locationCode;
    private String note;
    private String codSettlementStatus;

    @JsonProperty("updatedAt")
    @JsonAlias({"updateAt", "updatedAt"})
    private LocalDateTime updatedAt;
}
