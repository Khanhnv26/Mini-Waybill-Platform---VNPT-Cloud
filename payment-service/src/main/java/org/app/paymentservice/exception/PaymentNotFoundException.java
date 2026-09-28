package org.app.paymentservice.exception;

public class PaymentNotFoundException extends PaymentException {

    public PaymentNotFoundException(String message) {
        super("PAYMENT_NOT_FOUND", message);
    }
}
