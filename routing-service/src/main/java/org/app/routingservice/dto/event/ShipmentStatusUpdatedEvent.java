package org.app.routingservice.dto.event;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentStatusUpdatedEvent {
    private String trackingCode;
    private String status;
    private String locationCode;
    private String note;

    @JsonProperty("updateAt")
    @JsonAlias({"updateAt", "updatedAt"})
    private String updateAt;

    @JsonProperty("updatedAt")
    public String getUpdatedAt() {
        return updateAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updateAt = updatedAt;
    }
}
