package org.app.customerservice.repository;

import org.app.customerservice.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Customer findCustomerByCustomerCode(String customerCode);
    Optional<Customer> findByUserId(Long userId);
    Optional<Customer> findByEmail(String email);
}
