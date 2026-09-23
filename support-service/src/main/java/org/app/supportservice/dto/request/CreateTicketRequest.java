package org.app.supportservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CreateTicketRequest {

    private String trackingCode;

    @NotBlank(message = "Tiêu dề không được để trống")
    private String title;

    @NotBlank(message = "Vui lòng chọn loại khiếu nại")
    private String category;

    private String priority = "NORMAL";

    @NotBlank(message = "Nội dung khiếu nại không được để trống")
    private String description;

    private String creatorName;
    private String creatorPhone;
    private String creatorEmail;


}
