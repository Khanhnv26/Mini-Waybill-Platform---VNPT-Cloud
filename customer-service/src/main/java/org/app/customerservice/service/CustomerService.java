package org.app.customerservice.service;

import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.request.UpdateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;

import java.util.List;

public interface CustomerService {
    Customer getCustomerById(Long id);
    CustomerValidation validateCustomer(Long id);
    Customer createCustomer(CreateCustomerRequest request);
    List<Customer> getAllCustomers();
    Customer updateCustomer(Long id, UpdateCustomerRequest request);
}
