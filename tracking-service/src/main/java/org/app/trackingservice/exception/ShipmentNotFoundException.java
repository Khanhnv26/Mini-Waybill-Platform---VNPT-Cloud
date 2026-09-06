package org.app.trackingservice.exception;

import lombok.Getter;

@Getter
public class ShipmentNotFoundException extends RuntimeException {
    private final String trackingCode;

    public ShipmentNotFoundException(String trackingCode) {
        super("Không tìm thấy bưu gửi với mã: " + trackingCode);
        this.trackingCode = trackingCode;
    }
}
