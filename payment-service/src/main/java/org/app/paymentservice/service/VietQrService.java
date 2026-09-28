package org.app.paymentservice.service;

import java.math.BigDecimal;

public interface VietQrService {

    String generateQrUrl(BigDecimal amount, String trackingCode, String paymentCode);

    String getDefaultBank();

    String getDefaultAcc();
}
