package org.app.shipmentservice.exception;

import lombok.Data;

@Data
public class DuplicateRequestException extends RuntimeException {
    private String id;

    public DuplicateRequestException(String message) {
        super(message);
    }

    public DuplicateRequestException(String id, String message) {
        super(message);
        this.id = id;
    }
}


