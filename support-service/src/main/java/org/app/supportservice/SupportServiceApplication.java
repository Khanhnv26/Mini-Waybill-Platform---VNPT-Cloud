package org.app.supportservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableFeignClients
public class SupportServiceApplication {

    public static void main(String[] args) {
        loadLocalGeminiEnv();
        SpringApplication.run(SupportServiceApplication.class, args);
    }

    /**
     * Chạy từ IDE không nạp file .env. Nếu máy chưa đặt GEMINI_API_KEY thì lấy từ .env ở thư mục gốc repo.
     * Biến môi trường có sẵn (Docker, Kubernetes) được giữ nguyên.
     */
    static void loadLocalGeminiEnv() {
        Path dir = Path.of(System.getProperty("user.dir", ".")).toAbsolutePath();
        for (int i = 0; i < 4 && dir != null; i++) {
            Path envFile = dir.resolve(".env");
            if (Files.isRegularFile(envFile)) {
                applyGeminiKeys(envFile);
                return;
            }
            dir = dir.getParent();
        }
    }

    private static void applyGeminiKeys(Path envFile) {
        List<String> lines;
        try {
            lines = Files.readAllLines(envFile);
        } catch (IOException ex) {
            return;
        }
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                continue;
            }
            int split = trimmed.indexOf('=');
            if (split <= 0) {
                continue;
            }
            String key = trimmed.substring(0, split).trim();
            if (!"GEMINI_API_KEY".equals(key) && !"GEMINI_MODEL".equals(key)) {
                continue;
            }
            if (hasText(System.getProperty(key))) {
                continue;
            }
            String value = stripQuotes(trimmed.substring(split + 1).trim());
            if (hasText(value)) {
                System.setProperty(key, value);
            }
        }
    }

    private static String stripQuotes(String value) {
        if (value.length() >= 2) {
            char start = value.charAt(0);
            char end = value.charAt(value.length() - 1);
            if ((start == '"' && end == '"') || (start == '\'' && end == '\'')) {
                return value.substring(1, value.length() - 1);
            }
        }
        return value;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

}
