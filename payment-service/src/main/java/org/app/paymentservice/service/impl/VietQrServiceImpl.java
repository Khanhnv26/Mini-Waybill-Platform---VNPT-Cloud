package org.app.paymentservice.service.impl;

import org.app.paymentservice.service.VietQrService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class VietQrServiceImpl implements VietQrService {

    @Value("${vietqr.bank-code:MB}")
    private String defaultBank;

    @Value("${vietqr.account-no:0987654321}")
    private String defaultAcc;

    @Value("${vietqr.account-name:VNPT POST LOGISTICS}")
    private String accountName;

    @Value("${vietqr.template:compact2}")
    private String template;

    @Override
    public String generateQrUrl(BigDecimal amount, String trackingCode, String paymentCode) {
        String cleanCode = trackingCode != null ? trackingCode.trim() : "";
        String memo = cleanCode.toUpperCase().startsWith("COD") || cleanCode.toUpperCase().startsWith("CUOC")
                ? cleanCode
                : "COD " + cleanCode;

        String encodedMemo = URLEncoder.encode(memo, StandardCharsets.UTF_8);
        String encodedName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);
        String amountStr = amount != null ? amount.toBigInteger().toString() : "0";

        return String.format(
                "https://img.vietqr.io/image/%s-%s-%s.png?amount=%s&addInfo=%s&accountName=%s",
                defaultBank,
                defaultAcc,
                template,
                amountStr,
                encodedMemo,
                encodedName
        );
    }

    @Override
    public String getDefaultBank() {
        return defaultBank;
    }

    @Override
    public String getDefaultAcc() {
        return defaultAcc;
    }
}
