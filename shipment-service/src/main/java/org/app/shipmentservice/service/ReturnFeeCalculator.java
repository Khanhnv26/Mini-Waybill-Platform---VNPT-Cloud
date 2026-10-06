package org.app.shipmentservice.service;

import org.app.shipmentservice.entity.Shipment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Component
public class ReturnFeeCalculator {

    public static final BigDecimal RETURN_FEE_RATE = BigDecimal.valueOf(0.5);
    public static final BigDecimal DEFAULT_BASE_FEE = BigDecimal.valueOf(35000);

    public BigDecimal calculateReturnFee(Shipment shipment, boolean postalFault) {
        if (postalFault) {
            return BigDecimal.ZERO;
        }

        if (shipment == null) {
            return DEFAULT_BASE_FEE.multiply(RETURN_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
        }

        BigDecimal base = null;
        if (shipment.getShippingFee() != null && shipment.getShippingFee().compareTo(BigDecimal.ZERO) > 0) {
            base = shipment.getShippingFee();
        } else if (shipment.getTotalFee() != null && shipment.getTotalFee().compareTo(BigDecimal.ZERO) > 0) {
            base = shipment.getTotalFee();
        }

        if (base == null || base.compareTo(BigDecimal.ZERO) <= 0) {
            base = DEFAULT_BASE_FEE;
        }

        return base.multiply(RETURN_FEE_RATE).setScale(0, RoundingMode.HALF_UP);
    }
}
