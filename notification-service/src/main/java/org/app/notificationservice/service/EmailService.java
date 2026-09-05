package org.app.notificationservice.service;

public interface EmailService {
    void sendSimpleEmail(String toEmail, String subject, String body);
}
