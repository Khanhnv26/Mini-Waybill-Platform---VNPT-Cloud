package org.app.customerservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.request.UpdateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;
import org.app.customerservice.entity.CustomerStatus;
import org.app.customerservice.repository.CustomerRepository;
import org.app.customerservice.service.CustomerService;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

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
                    .email(null)
                    .build();
        }

        if (customer.getStatus() != null && !"ACTIVE".equals(customer.getStatus().name())) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .customerId(customer.getId())
                    .reason("CUSTOMER_INACTIVE")
                    .email(customer.getEmail())
                    .build();
        }

        return CustomerValidation.builder()
                .isValid(true)
                .customerId(customer.getId())
                .email(customer.getEmail())
                .build();
    }

    @Override
    public CustomerValidation validateByUserId(Long userId) {
        if (userId == null) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .reason("USER_ID_NULL")
                    .build();
        }

        Customer customer = customerRepository.findByUserId(userId).orElse(null);
        if (customer == null) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .reason("CUSTOMER_PROFILE_NOT_LINKED")
                    .build();
        }

        if (customer.getStatus() != null && !"ACTIVE".equals(customer.getStatus().name())) {
            return CustomerValidation.builder()
                    .isValid(false)
                    .customerId(customer.getId())
                    .reason("CUSTOMER_INACTIVE")
                    .build();
        }

        return CustomerValidation.builder()
                .isValid(true)
                .customerId(customer.getId())
                .email(customer.getEmail())
                .build();
    }

    @Override
    public Customer initProfile(org.app.customerservice.dto.request.InitCustomerProfileRequest request) {
        if (request.getUserId() == null) {
            throw new IllegalArgumentException("User ID không được để trống");
        }

        Optional<Customer> existingByUserId = customerRepository.findByUserId(request.getUserId());
        if (existingByUserId.isPresent()) {
            return existingByUserId.get();
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            Optional<Customer> existingByEmail = customerRepository.findByEmail(request.getEmail().trim());
            if (existingByEmail.isPresent()) {
                Customer cust = existingByEmail.get();
                if (cust.getUserId() == null) {
                    cust.setUserId(request.getUserId());
                    if (request.getFullName() != null && !request.getFullName().isBlank()) {
                        cust.setFullName(request.getFullName().trim());
                    }
                    return customerRepository.save(cust);
                }
            }
        }

        String code = "CUS" + String.format("%06d", request.getUserId());
        Customer newCustomer = Customer.builder()
                .userId(request.getUserId())
                .customerCode(code)
                .fullName(request.getFullName() != null ? request.getFullName().trim() : request.getEmail())
                .email(request.getEmail().trim())
                .status(org.app.customerservice.entity.CustomerStatus.ACTIVE)
                .build();
        return customerRepository.save(newCustomer);
    }

    @Override
    public Customer getProfileByUserId(Long userId) {
        return customerRepository.findByUserId(userId).orElseThrow(
                () -> new RuntimeException("Chưa tìm thấy hồ sơ khách hàng cho tài khoản này!"));
    }

    @Override
    public Customer updateProfileByUserId(Long userId, UpdateCustomerRequest request) {
        Customer customer = getProfileByUserId(userId);
        if (request.getFullName() != null) {
            customer.setFullName(request.getFullName());
        }
        if (request.getAddress() != null) {
            customer.setAddress(request.getAddress());
        }
        if (request.getPhoneNumber() != null) {
            customer.setPhoneNumber(request.getPhoneNumber());
        }
        return customerRepository.save(customer);
    }

    @Override
    public Customer createCustomer(CreateCustomerRequest request) {
        String customerCode = request.getCustomerCode().trim();
        String email = request.getEmail().trim();
        String phoneNumber = normalizeVnPhone(request.getPhoneNumber());
        String fullName = request.getFullName().trim();
        String address = request.getAddress() == null || request.getAddress().isBlank()
                ? "Chưa cập nhật địa chỉ"
                : request.getAddress().trim();

        if (customerRepository.existsByCustomerCode(customerCode)) {
            throw new IllegalArgumentException("Mã khách hàng này đã tồn tại trong hệ thống");
        }
        if (customerRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email này đã được đăng ký cho một khách hàng khác");
        }
        if (customerRepository.existsByPhoneNumber(phoneNumber)) {
            throw new IllegalArgumentException("Số điện thoại này đã thuộc về một khách hàng khác");
        }

        return customerRepository.save(Customer.builder()
                .customerCode(customerCode)
                .fullName(fullName)
                .address(address)
                .email(email)
                .phoneNumber(phoneNumber)
                .build());
    }

    static String normalizeVnPhone(String raw) {
        if (raw == null) {
            return "";
        }
        String phone = raw.replaceAll("[\\s.\\-()]", "");
        if (phone.startsWith("+84")) {
            phone = "0" + phone.substring(3);
        } else if (phone.startsWith("84") && phone.length() == 11) {
            phone = "0" + phone.substring(2);
        }
        return phone;
    }

    @Override
    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    @Override
    public Customer updateCustomer(Long id, UpdateCustomerRequest request) {
        Customer customer = customerRepository.findById(id).orElseThrow(
                () -> new RuntimeException("Customer not found"));

        if (request.getFullName() != null) {
            customer.setFullName(request.getFullName());
        }
        if (request.getAddress() != null) {
            customer.setAddress(request.getAddress());
        }
        if (request.getEmail() != null) {
            customer.setEmail(request.getEmail());
        }
        if (request.getPhoneNumber() != null) {
            customer.setPhoneNumber(request.getPhoneNumber());
        }
        if (request.getStatus() != null) {
            customer.setStatus(request.getStatus());
        }

        return customerRepository.save(customer);
    }

    @Override
    public CustomerValidation getRetailCustomer() {
        Customer retail = customerRepository.findCustomerByCustomerCode("CUS_RETAIL")
                .orElseThrow(() -> new RuntimeException("Chưa khởi tạo tài khoản CUS_RETAIL trong database!"));
        return CustomerValidation.builder()
                .isValid(true)
                .customerId(retail.getId())
                .email(retail.getEmail())
                .build();
    }
}

