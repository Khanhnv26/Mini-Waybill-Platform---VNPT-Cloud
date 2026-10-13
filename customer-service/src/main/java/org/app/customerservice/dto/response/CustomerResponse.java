package org.app.customerservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.app.customerservice.entity.Customer;
import org.app.customerservice.enums.CustomerStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {

    private Long id;
    private Long userId;
    private String customerCode;
    private String fullName;
    private String address;
    private String email;
    private String phoneNumber;
    private CustomerStatus status;
    private LocalDateTime createdAt;

    public static CustomerResponse fromEntity(Customer customer) {
        if (customer == null) {
            return null;
        }
        return CustomerResponse.builder()
                .id(customer.getId())
                .userId(customer.getUserId())
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .address(customer.getAddress())
                .email(customer.getEmail())
                .phoneNumber(customer.getPhoneNumber())
                .status(customer.getStatus())
                .createdAt(customer.getCreatedAt())
                .build();
    }
}
