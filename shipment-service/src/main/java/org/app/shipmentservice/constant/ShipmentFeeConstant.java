package org.app.shipmentservice.constant;

import java.math.BigDecimal;

public class ShipmentFeeConstant {
    public static final BigDecimal BASE_COST_EXPRESS = BigDecimal.valueOf(35000L);;
    public static final BigDecimal BASE_COST_STANDARD = BigDecimal.valueOf(20000L);
    public static final BigDecimal COST_EXPRESS = BigDecimal.valueOf(22000L);
    public static final BigDecimal COST_STANDARD = BigDecimal.valueOf(13000L);
    public static final BigDecimal COD_FEE_RATE = BigDecimal.valueOf(0.01);
    public static final BigDecimal BASE_COD_COST = BigDecimal.valueOf(10000L);
    public static final BigDecimal FUEL_FEE = BigDecimal.valueOf(0.06);
}
