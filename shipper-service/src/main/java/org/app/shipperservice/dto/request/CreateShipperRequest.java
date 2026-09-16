package org.app.shipperservice.dto.request;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data

public class CreateShipperRequest {
    @NotBlank(message = "Mã nhân viên không được để trống")
    private String courierCode;

    @NotBlank(message = "Tên nhân viên không được để trống")
    private String fullName;

    @Pattern(regexp = "^\\+?[0-9]{7,15}$", message = "Số điện thoại không hợp lệ")
    private String phone;

    private String telegramChatId;
    private String stationCode;
}
