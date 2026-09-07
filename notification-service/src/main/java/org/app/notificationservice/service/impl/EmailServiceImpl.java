package org.app.notificationservice.service.impl;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.app.notificationservice.service.EmailService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendSimpleEmail(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("[EMAIL ERROR] Gửi mail thất bại tới {}: {}", toEmail, e.getMessage());
            log.warn("[EMAIL FALLBACK - CONSOLE] To: {}, Subject: {}, Body: \n{}", toEmail, subject, body);
        }
    }

    @Override
    public void sendHtmlEmail(String toEmail, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("[EMAIL] Gửi email HTML thành công tới: {}", toEmail);

        } catch (Exception e) {
            log.error("[EMAIL ERROR] Gửi mail HTML thất bại tới {}: {}", toEmail, e.getMessage());
            log.warn("[EMAIL FALLBACK - CONSOLE] To: {}, Subject: {}, HTML Body: \n{}", toEmail, subject, htmlBody);
        }
    }
}
