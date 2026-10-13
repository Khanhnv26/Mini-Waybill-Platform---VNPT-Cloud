package org.app.customerservice.service;

import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.request.InitCustomerProfileRequest;
import org.app.customerservice.dto.request.UpdateCustomerRequest;
import org.app.customerservice.dto.response.CustomerResponse;
import org.app.customerservice.dto.response.CustomerValidation;

import java.util.List;

public interface CustomerService {
    CustomerResponse getCustomerById(Long id);
    CustomerValidation validateCustomer(Long id);
    CustomerValidation validateByUserId(Long userId);
    CustomerResponse initProfile(InitCustomerProfileRequest request);
    CustomerResponse getProfileByUserId(Long userId);
    CustomerResponse updateProfileByUserId(Long userId, UpdateCustomerRequest request);
    CustomerResponse createCustomer(CreateCustomerRequest request);
    List<CustomerResponse> getAllCustomers();
    CustomerResponse updateCustomer(Long id, UpdateCustomerRequest request);
    CustomerValidation getRetailCustomer();
}
