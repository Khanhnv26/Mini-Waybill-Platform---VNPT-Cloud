package org.app.shipperservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LinkTelegramRequest {
    private String courierCode;
    private String telegramChatId;
}
