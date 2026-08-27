package org.app.customerservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.customerservice.entity.Customer;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CustomerValidation {
    private boolean isValid;
    private String reason;
    private Customer customer;
}

