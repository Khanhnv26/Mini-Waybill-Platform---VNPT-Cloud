package org.app.trackingservice.exception;


import lombok.Data;
import org.app.trackingservice.entity.ShipmentStatus;

@Data
public class InvalidStateTransitionException extends RuntimeException {
    private final ShipmentStatus  fromStatus;
    private final ShipmentStatus  toStatus;

    public InvalidStateTransitionException(ShipmentStatus fromStatus, ShipmentStatus toStatus) {
        super(String.format("Invalid state transition from %s to %s", fromStatus, toStatus));
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
    }
}

