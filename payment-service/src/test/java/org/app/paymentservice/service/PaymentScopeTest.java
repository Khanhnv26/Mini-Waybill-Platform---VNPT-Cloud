package org.app.paymentservice.service;

import jakarta.persistence.criteria.*;
import org.app.paymentservice.dto.request.PaymentFilterRequest;
import org.app.paymentservice.entity.PaymentTransaction;
import org.app.paymentservice.repository.PaymentTransactionRepository;
import org.app.paymentservice.service.impl.PaymentServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PaymentScopeTest {
    @Test void customerCodeQueryCannotReplaceTheAuthenticatedCustomerScope() {
        PaymentTransactionRepository repository = mock(PaymentTransactionRepository.class);
        var service = new PaymentServiceImpl(repository, null, null, null, null);
        @SuppressWarnings("unchecked") Root<PaymentTransaction> root = mock(Root.class);
        CriteriaBuilder builder = mock(CriteriaBuilder.class);
        @SuppressWarnings("unchecked") Path<Object> customer = mock(Path.class), creator = mock(Path.class);
        when(root.get("customerCode")).thenReturn(customer);
        when(root.get("createdBy")).thenReturn(creator);
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenAnswer(invocation -> {
            Specification<PaymentTransaction> specification = invocation.getArgument(0);
            specification.toPredicate(root, null, builder);
            return Page.empty();
        });
        PaymentFilterRequest request = new PaymentFilterRequest();
        request.setCustomerCode("another-customer");
        service.getTransactions(request, "7", "ROLE_CUSTOMER");
        verify(builder).equal(customer, "7");
        verify(builder).equal(creator, "7");
        verify(builder, never()).equal(any(Expression.class), eq("another-customer"));
    }
}
