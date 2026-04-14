package com.example.xpandbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String from;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Password Reset Request");
        message.setText("Click the link below to reset your password. This link expires in 1 hour.\n\n" + resetLink
                + "\n\nIf you did not request this, please ignore this email.");
        mailSender.send(message);
    }

    public void sendCompanyApprovalEmail(String to, String companyName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Company Account Approved");
        message.setText("Congratulations! Your company account for " + companyName
                + " has been approved. You can now log in and start posting jobs.");
        mailSender.send(message);
    }

    public void sendCompanySuspensionEmail(String to, String companyName) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Company Account Suspended");
        message.setText("Your company account for " + companyName
                + " has been suspended. Please contact support for more information.");
        mailSender.send(message);
    }

    public void sendUserSuspensionEmail(String to) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Account Suspended");
        message.setText("Your XPand account has been suspended. Please contact support for more information.");
        mailSender.send(message);
    }
}
