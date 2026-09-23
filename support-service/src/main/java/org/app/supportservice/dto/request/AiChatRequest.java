package org.app.supportservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiChatRequest {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String message;
}
