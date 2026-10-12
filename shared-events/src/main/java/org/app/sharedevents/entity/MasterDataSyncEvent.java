package org.app.sharedevents.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MasterDataSyncEvent {

    private String eventId;
    private String eventType;
    private String dataType;
    private String itemCode;
    private String payloadJson;
    private LocalDateTime timestamp;
}
