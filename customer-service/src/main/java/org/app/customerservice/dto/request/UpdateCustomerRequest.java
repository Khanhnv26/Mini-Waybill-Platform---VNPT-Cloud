package org.app.customerservice.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.customerservice.entity.CustomerStatus;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class UpdateCustomerRequest {

    @NotBlank(message = "Họ tên khách hàng không được để trống")
    @Size(min = 2, max = 100, message = "Họ tên khách hàng phải có độ dài từ 2 đến 100 ký tự")
    private String fullName;

    @NotBlank(message = "Địa chỉ khách hàng không được để trống")
    private String address;

    @NotBlank(message = "Email khách hàng không được để trống")
    @Email(message = "Định dạng email không hợp lệ")
    private String email;

    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^(0|\\+84)(3|5|7|8|9)[0-9]{8}$", message = "Số điện thoại không đúng định dạng di động Việt Nam")
    private String phoneNumber;

    private CustomerStatus status;
}
