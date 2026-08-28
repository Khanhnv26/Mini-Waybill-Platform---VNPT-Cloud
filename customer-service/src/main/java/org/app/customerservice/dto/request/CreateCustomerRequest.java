package org.app.customerservice.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.customerservice.entity.CustomerStatus;

import java.time.LocalDateTime;

@AllArgsConstructor
@NoArgsConstructor
@Data
@Builder
public class CreateCustomerRequest {


    private String customerCode;


    private String fullName;


    private String address;


    private String email;


    private String phoneNumber;

}
