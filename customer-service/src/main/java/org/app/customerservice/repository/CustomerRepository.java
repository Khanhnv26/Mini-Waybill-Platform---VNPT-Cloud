package org.app.customerservice.repository;

import org.app.customerservice.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Customer findCustomerByCustomerCode(String customerCode);
}
