package org.app.customerservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;
import org.app.customerservice.repository.CustomerRepository;
import org.app.customerservice.service.CustomerService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    public Customer getCustomerById(Long id) {
        return customerRepository.findById(id).orElseThrow(
                () -> new RuntimeException("Customer not found"));
    }

    @Override
    public CustomerValidation validateCustomer(Long id) {
        Customer customer = customerRepository.findById(id).orElse(null);

        if(customer == null) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .reason("CUSTOMER_NOT_FOUND")
                    .build();
        }

        if (customer.getStatus() != null && !"ACTIVE".equals(customer.getStatus().name())) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .reason("CUSTOMER_INACTIVE")
                    .build();
        }

        return CustomerValidation.builder()
                .isValid(true)
                .build();
    }

    @Override
    public Customer createCustomer(CreateCustomerRequest request) {
        return customerRepository.save(Customer.builder()
                .customerCode(request.getCustomerCode())
                .fullName(request.getFullName())
                .address(request.getAddress())
                .email(request.getEmail())
                .phoneNumber(request.getPhoneNumber())
                .build());
    }
}

