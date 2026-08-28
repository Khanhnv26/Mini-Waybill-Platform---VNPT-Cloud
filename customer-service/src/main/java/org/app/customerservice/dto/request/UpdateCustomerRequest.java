package org.app.customerservice.dto.request;

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

    private String fullName;

    private String address;

    private String email;

    private String phoneNumber;

    private CustomerStatus status;
}
