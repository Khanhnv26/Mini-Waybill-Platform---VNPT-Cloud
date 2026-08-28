package org.app.shipmentservice.exception;

public class DuplicateRequestException extends RuntimeException {

    public DuplicateRequestException(String message) {
        super(message);
    }

}
