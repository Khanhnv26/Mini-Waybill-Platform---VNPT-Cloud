package org.app.supportservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AddMessageRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @jakarta.validation.constraints.Size(max = 4000)
    private String content;

    private String attachmentUrls;
    private String senderName;
}
