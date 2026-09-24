package org.app.customerservice.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class GlobalExceptionHandlerTest {

    @Test
    void phoneDuplicateIsNotReportedAsCustomerCode() {
        String root = "Violation of UNIQUE KEY constraint 'UX_customers_phone_number'. "
                + "Cannot insert duplicate key in object 'dbo.customers'. The duplicate key value is (0912345678).";

        assertEquals(
                "Số điện thoại này đã thuộc về một khách hàng khác",
                GlobalExceptionHandler.resolveConstraintMessage(root));
    }

    @Test
    void emailDuplicateUsesTheDuplicateValue() {
        String root = "Violation of UNIQUE KEY constraint 'UKrfbvkrffamfql7cjmen8v976v'. "
                + "Cannot insert duplicate key in object 'dbo.customers'. The duplicate key value is (a@gmail.com).";

        assertEquals(
                "Email này đã được đăng ký cho một khách hàng khác",
                GlobalExceptionHandler.resolveConstraintMessage(root));
    }

    @Test
    void customerCodeDuplicateStaysOnTheCode() {
        String root = "Violation of UNIQUE KEY constraint 'UKiqv746oh5t5is1vr4p2nl79r6'. "
                + "Cannot insert duplicate key in object 'dbo.customers'. The duplicate key value is (CUST-71614).";

        assertEquals(
                "Mã khách hàng này đã tồn tại trong hệ thống",
                GlobalExceptionHandler.resolveConstraintMessage(root));
    }
}
