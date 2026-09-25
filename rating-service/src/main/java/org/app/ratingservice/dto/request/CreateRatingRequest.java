package org.app.ratingservice.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateRatingRequest {

    @NotBlank(message = "Mã vận đơn không được để trống")
    private String trackingCode;

    private String courierCode;

    @NotNull(message = "Đánh giá dịch vụ không được để trống")
    @Min(value = 1, message = "Đánh giá dịch vụ phải lớn hơn hoặc bằng 1 sao")
    @Max(value = 5, message = "Đánh giá dịch vụ phải nhỏ hơn hoặc bằng 5 sao")
    private Integer serviceRating;


    @NotNull(message = "Điểm thái độ tài xế không được để trống")
    @Min(value = 1, message = "Điểm đánh giá tối thiểu là 1 sao")
    @Max(value = 5, message = "Điểm đánh giá tối đa là 5 sao")
    private Integer shipperRating;
    private List<String> tags;
    private String comment;
    private List<String> attachmentUrls;
    @NotBlank(message = "Vui lòng nhập 4 số cuối điện thoại người nhận")
    @Pattern(regexp = "\\d{4}", message = "Số điện thoại xác thực phải gồm đúng 4 chữ số")
    private String verifiedPhone;
    private String token;


}
