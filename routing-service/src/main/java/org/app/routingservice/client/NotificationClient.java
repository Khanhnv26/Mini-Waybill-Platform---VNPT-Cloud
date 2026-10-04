package org.app.routingservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "notification-service")
public interface NotificationClient {

    @PostMapping("/api/notifications/telegram/send")
    Map<String, Object> sendTelegramMessage(@RequestBody Map<String, String> payload);
}
