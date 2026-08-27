package org.app.customerservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.app.customerservice.dto.request.CreateCustomerRequest;
import org.app.customerservice.dto.response.CustomerValidation;
import org.app.customerservice.entity.Customer;
import org.app.customerservice.service.CustomerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.function.EntityResponse;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<Customer> createCustomer(@Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(customerService.createCustomer(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getCustomerById(id));
    }

    @GetMapping("/{id}/validation")
    public ResponseEntity<CustomerValidation> validateCustomer(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.validateCustomer(id));
    }

}
