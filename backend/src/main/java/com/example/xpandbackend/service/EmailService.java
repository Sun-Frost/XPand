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

    // ── Password reset — USER ─────────────────────────────────────────────────

    /**
     * Sends a 6-digit password-reset code to a registered (LOCAL) user.
     * The code is stored in user.verificationCode and expires after 15 minutes
     * (enforced in AuthService, not here).
     */
    public void sendPasswordResetEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Password Reset Code");
        message.setText(
                "You requested a password reset for your XPand account.\n\n"
                        + "Your password reset code is:\n\n"
                        + "    " + code + "\n\n"
                        + "Enter this code on the password reset page. It expires in 15 minutes.\n\n"
                        + "If you did not request a password reset, please ignore this email.\n"
                        + "Your password will not change unless you complete the process."
        );
        mailSender.send(message);
    }

    // ── Password reset — COMPANY ──────────────────────────────────────────────

    /**
     * Sends a 6-digit password-reset code to a registered (LOCAL) company.
     */
    public void sendCompanyPasswordResetEmail(String to, String companyName, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("XPand - Company Password Reset Code");
        message.setText(
                "You requested a password reset for the XPand company account: " + companyName + ".\n\n"
                        + "Your password reset code is:\n\n"
                        + "    " + code + "\n\n"
                        + "Enter this code on the password reset page. It expires in 15 minutes.\n\n"
                        + "If you did not request a password reset, please ignore this email.\n"
                        + "Your password will not change unless you complete the process."
        );
        mailSender.send(message);
    }
}
