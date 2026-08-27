package org.app.customerservice.service;

import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;

public interface CustomerService {
    Customer getCustomerById(Long id);
    CustomerValidation validateCustomer(Long id);
    Customer createCustomer(CreateCustomerRequest request);
}
