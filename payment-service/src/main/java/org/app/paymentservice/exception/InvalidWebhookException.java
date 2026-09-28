package org.app.paymentservice.exception;

public class InvalidWebhookException extends PaymentException {

    public InvalidWebhookException(String message) {
        super("INVALID_WEBHOOK", message);
    }
}
