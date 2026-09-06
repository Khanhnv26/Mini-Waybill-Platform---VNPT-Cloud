package org.app.customerservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.request.UpdateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;
import org.app.customerservice.service.CustomerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.createCustomer(request));
    }

    @GetMapping
    public ResponseEntity<List<Customer>> getAllCustomers() {
        return ResponseEntity.ok(customerService.getAllCustomers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(@PathVariable Long id,
                                                   @RequestBody UpdateCustomerRequest request) {
        return ResponseEntity.ok(customerService.updateCustomer(id, request));
    }

    @GetMapping("/{id}/validation")
    public ResponseEntity<CustomerValidation> validateCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.validateCustomer(id));
    }

    @GetMapping("/by-user/{userId}/validation")
    public ResponseEntity<CustomerValidation> validateCustomerByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(customerService.validateByUserId(userId));
    }

    @PostMapping("/internal/init-profile")
    public ResponseEntity<Customer> initProfile(@Valid @RequestBody org.app.customerservice.dto.request.InitCustomerProfileRequest request) {
        return ResponseEntity.ok(customerService.initProfile(request));
    }

    @GetMapping("/me")
    public ResponseEntity<Customer> getMyProfile(@RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        if (currentUserId == null || currentUserId.isBlank() || "null".equalsIgnoreCase(currentUserId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(customerService.getProfileByUserId(Long.parseLong(currentUserId)));
    }

    @PutMapping("/me")
    public ResponseEntity<Customer> updateMyProfile(
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestBody UpdateCustomerRequest request) {
        if (currentUserId == null || currentUserId.isBlank() || "null".equalsIgnoreCase(currentUserId)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(customerService.updateProfileByUserId(Long.parseLong(currentUserId), request));
    }
}
