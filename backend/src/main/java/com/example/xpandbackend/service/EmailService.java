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

    // ── Existing methods — unchanged ──────────────────────────────────────────

    public void sendPasswordResetEmail(String to, String token) {
        String resetLink = frontendUrl + "/reset-password?token=" + token;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Password Reset Request");
        message.setText("Click the link below to reset your password. This link expires in 1 hour.\n\n"
                + resetLink + "\n\nIf you did not request this, please ignore this email.");
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

    // ── Email verification — USER ─────────────────────────────────────────────

    /**
     * Sends a verification email containing a 6-digit code.
     * The user enters this code on the /verify page (or inline after registration).
     *
     * @param to   recipient email address
     * @param code 6-digit numeric code stored on the User entity
     */
    public void sendVerificationEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Your Verification Code");
        message.setText(
                "Welcome to XPand!\n\n"
                        + "Your email verification code is:\n\n"
                        + "    " + code + "\n\n"
                        + "Enter this code on the verification page to activate your account.\n"
                        + "This code expires in 24 hours.\n\n"
                        + "If you did not create an account, please ignore this email."
        );
        mailSender.send(message);
    }

    // ── Email verification — COMPANY ──────────────────────────────────────────

    /**
     * Sends a verification email with a 6-digit code to a newly registered company.
     *
     * @param to          company email address
     * @param companyName company display name (used in the email body)
     * @param code        6-digit numeric code stored on the Company entity
     */
    public void sendCompanyVerificationEmail(String to, String companyName, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Your Company Verification Code");
        message.setText(
                "Welcome to XPand, " + companyName + "!\n\n"
                        + "Your email verification code is:\n\n"
                        + "    " + code + "\n\n"
                        + "Enter this code on the verification page to confirm your email address.\n"
                        + "This code expires in 24 hours.\n\n"
                        + "Once verified, your account will be reviewed for admin approval.\n\n"
                        + "If you did not create an account, please ignore this email."
        );
        mailSender.send(message);
    }
}
