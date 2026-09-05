package org.app.authservice.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SendEmailEvent {
    private String toEmail;
    private String subject;
    private String body;
    private String type;
    private String trackingCode;
}
