package org.app.trackingservice.dto.event;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class ShipmentStatusUpdatedEvent {
    private String trackingCode;
    private String status;
    private String locationCode;
    private String note;

    @JsonProperty("updatedAt")
    @JsonAlias({"updateAt", "updatedAt"})
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private LocalDateTime updatedAt;

    public void setUpdateAt(String updateAt) {
        if (updateAt != null && this.updatedAt == null) {
            try {
                this.updatedAt = LocalDateTime.parse(updateAt);
            } catch (Exception ignored) {
            }
        }
    }
}
