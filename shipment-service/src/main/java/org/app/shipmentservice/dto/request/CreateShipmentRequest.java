package org.app.shipmentservice.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.shipmentservice.entity.ServiceType;

import java.math.BigDecimal;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CreateShipmentRequest {

    private String requestId;
    private String trackingCode;
    private Long customerId;

    @NotBlank(message = "Tên người gửi không được để trống")
    @Size(min = 2, max = 100, message = "Tên người gửi phải từ 2 đến 100 ký tự")
    private String senderName;

    @NotBlank(message = "Số điện thoại người gửi không được để trống")
    @Pattern(regexp = "^(0|\\+84)(2|3|5|7|8|9)[0-9]{8,9}$", message = "Số điện thoại người gửi không đúng định dạng số điện thoại Việt Nam")
    private String senderPhone;

    @NotBlank(message = "Địa chỉ người gửi không được để trống")
    @Size(min = 8, max = 255, message = "Địa chỉ người gửi phải từ 8 đến 255 ký tự")
    private String senderAddress;

    @DecimalMin(value = "-90.0", message = "Vĩ độ người gửi không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ người gửi không hợp lệ")
    private Double senderLatitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ người gửi không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ người gửi không hợp lệ")
    private Double senderLongitude;

    @NotBlank(message = "Tên người nhận không được để trống")
    @Size(min = 2, max = 100, message = "Tên người nhận phải từ 2 đến 100 ký tự")
    private String receiverName;

    @NotBlank(message = "Số điện thoại người nhận không được để trống")
    @Pattern(regexp = "^(0|\\+84)(2|3|5|7|8|9)[0-9]{8,9}$", message = "Số điện thoại người nhận không đúng định dạng số điện thoại Việt Nam")
    private String receiverPhone;

    @NotBlank(message = "Địa chỉ người nhận không được để trống")
    @Size(min = 8, max = 255, message = "Địa chỉ người nhận phải từ 8 đến 255 ký tự")
    private String receiverAddress;

    @DecimalMin(value = "-90.0", message = "Vĩ độ người nhận không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ người nhận không hợp lệ")
    private Double receiverLatitude;

    @DecimalMin(value = "-180.0", message = "Kinh độ người nhận không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ người nhận không hợp lệ")
    private Double receiverLongitude;

    private ServiceType serviceType;

    @NotNull(message = "Khối lượng bưu kiện không được để trống")
    @DecimalMin(value = "0.01", message = "Khối lượng tối thiểu là 0.01 kg (10g)")
    @DecimalMax(value = "50.0", message = "Khối lượng tối đa cho phép là 50 kg")
    private Double weight;

    @NotNull(message = "Giá trị COD không được để trống")
    @DecimalMin(value = "0.0", message = "Giá trị COD không được âm")
    @DecimalMin(value = "0.0", message = "Giá trị COD không được âm")
    @DecimalMax(value = "50000000.0", message = "Tiền thu hộ COD tối đa là 50,000,000 VNĐ")
    private BigDecimal codAmount;
}
