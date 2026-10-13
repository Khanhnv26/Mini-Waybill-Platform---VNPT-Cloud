package org.app.paymentservice.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.format.FormatterRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addFormatters(FormatterRegistry registry) {
        registry.addConverter(new StringToLocalDateTimeConverter());
    }

    public static class StringToLocalDateTimeConverter implements Converter<String, LocalDateTime> {
        @Override
        public LocalDateTime convert(String source) {
            if (source == null || source.isBlank()) {
                return null;
            }
            String val = source.trim();
            try {
                // Hỗ trợ ISO có múi giờ hoặc đuôi Z (vd: 2026-10-13T06:36:30.589Z)
                if (val.endsWith("Z") || val.contains("+") || (val.lastIndexOf('-') > 10)) {
                    return OffsetDateTime.parse(val).atZoneSameInstant(ZoneId.systemDefault()).toLocalDateTime();
                }
            } catch (Exception ignored) {
            }
            try {
                // Hỗ trợ ISO LocalDateTime chuẩn (vd: 2026-10-13T00:00:00 hoặc 2026-10-13T06:36:30.589)
                if (val.contains("T")) {
                    return LocalDateTime.parse(val);
                }
            } catch (Exception ignored) {
            }
            try {
                // Hỗ trợ định dạng chỉ có ngày (vd: 2026-10-13)
                return LocalDate.parse(val).atStartOfDay();
            } catch (Exception ignored) {
            }
            try {
                return LocalDateTime.parse(val, DateTimeFormatter.ISO_DATE_TIME);
            } catch (Exception ignored) {
            }
            return null;
        }
    }
}
