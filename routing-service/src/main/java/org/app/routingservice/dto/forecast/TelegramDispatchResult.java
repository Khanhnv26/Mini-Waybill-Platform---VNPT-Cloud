package org.app.routingservice.dto.forecast;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TelegramDispatchResult {
    private String stationCode;
    private int totalShippersTargeted;
    private int successfullyDispatched;
    private int skippedNoTelegram;
    private int failedDispatched;
    private List<String> details;
}
