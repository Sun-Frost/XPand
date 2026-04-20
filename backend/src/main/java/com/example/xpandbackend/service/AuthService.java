package com.example.xpandbackend.service;

import com.example.xpandbackend.models.Admin;
import com.example.xpandbackend.models.Company;
import com.example.xpandbackend.models.User;
import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.AuthResponse;
import com.example.xpandbackend.exception.BadRequestException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.exception.UnauthorizedException;
import com.example.xpandbackend.repository.*;
import com.example.xpandbackend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Random;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final ChallengeEvaluationService challengeEvaluationService;

    private final Random random = new Random();

    /**
     * Password policy: >= 8 chars, at least one uppercase, one lowercase,
     * one digit, one special character.
     */
    private static final Pattern PASSWORD_POLICY =
            Pattern.compile("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private void validatePasswordPolicy(String password) {
        if (password == null || !PASSWORD_POLICY.matcher(password).matches()) {
            throw new BadRequestException(
                    "Password must be at least 8 characters and include an uppercase letter, " +
                            "a lowercase letter, a number, and a special character.");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String generateVerificationCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private void sendUserVerificationEmailSafely(User user) {
        try {
            emailService.sendVerificationEmail(user.getEmail(), user.getVerificationCode());
        } catch (Exception ex) {
            System.err.println("[AuthService] Failed to send verification email to "
                    + user.getEmail() + ": " + ex.getMessage());
        }
    }

    private void sendCompanyVerificationEmailSafely(Company company) {
        try {
            emailService.sendCompanyVerificationEmail(
                    company.getEmail(), company.getCompanyName(), company.getVerificationCode());
        } catch (Exception ex) {
            System.err.println("[AuthService] Failed to send company verification email to "
                    + company.getEmail() + ": " + ex.getMessage());
        }
    }

    // ── Registration ──────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse registerUser(RegisterUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already in use.");
        }

        validatePasswordPolicy(request.getPassword());

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setCountry(request.getCountry());
        user.setCity(request.getCity());
        user.setXpBalance(0);

        user.setEmailVerified(false);
        user.setVerificationCode(generateVerificationCode());
        user.setProvider("LOCAL");

        userRepository.save(user);
        sendUserVerificationEmailSafely(user);

        String token = jwtUtil.generateToken(user.getEmail(), "USER", user.getId());
        return new AuthResponse(token, "USER", user.getId(), user.getEmail());
    }

    @Transactional
    public AuthResponse registerCompany(RegisterCompanyRequest request) {
        if (companyRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email already in use.");
        }

        validatePasswordPolicy(request.getPassword());

        Company company = new Company();
        company.setEmail(request.getEmail());
        company.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        company.setCompanyName(request.getCompanyName());
        company.setDescription(request.getDescription());
        company.setWebsiteUrl(request.getWebsiteUrl());
        company.setIndustry(request.getIndustry());
        company.setLocation(request.getLocation());
        company.setIsApproved(false);

        company.setEmailVerified(false);
        company.setVerificationCode(generateVerificationCode());
        company.setProvider("LOCAL");

        companyRepository.save(company);
        sendCompanyVerificationEmailSafely(company);

        String token = jwtUtil.generateToken(company.getEmail(), "COMPANY", company.getId());
        return new AuthResponse(token, "COMPANY", company.getId(), company.getEmail());
    }

    // ── Login ─────────────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials."));

        if ("GOOGLE".equals(user.getProvider()) && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
            throw new UnauthorizedException("This account uses Google sign-in. Please use 'Continue with Google'.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials.");
        }

        if ("LOCAL".equals(user.getProvider()) && !user.isEmailVerified()) {
            throw new UnauthorizedException(
                    "Please verify your email before logging in. Check your inbox for a 6-digit verification code.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLogin = user.getLastLoginDate();

        int currentStreak = user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0;
        int loginsThisWeek = user.getLoginsThisWeek() != null ? user.getLoginsThisWeek() : 0;
        boolean isNewDay;

        if (lastLogin == null) {
            currentStreak = 1; loginsThisWeek = 1; isNewDay = true;
        } else {
            long daysSince = ChronoUnit.DAYS.between(lastLogin.toLocalDate(), now.toLocalDate());
            if (daysSince == 0) {
                isNewDay = false;
            } else if (daysSince == 1) {
                currentStreak++;
                loginsThisWeek = isNewWeek(lastLogin, now) ? 1 : loginsThisWeek + 1;
                isNewDay = true;
            } else {
                currentStreak = 1;
                loginsThisWeek = isNewWeek(lastLogin, now) ? 1 : loginsThisWeek + 1;
                isNewDay = true;
            }
        }

        user.setLastLoginDate(now);
        user.setLoginStreakDays(currentStreak);
        user.setLoginsThisWeek(loginsThisWeek);
        userRepository.save(user);

        if (isNewDay) {
            challengeEvaluationService.evaluateLogin(user.getId(), currentStreak, loginsThisWeek);
        }

        String token = jwtUtil.generateToken(user.getEmail(), "USER", user.getId());
        return new AuthResponse(token, "USER", user.getId(), user.getEmail());
    }

    public AuthResponse loginCompany(LoginRequest request) {
        Company company = companyRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials."));
        if (!passwordEncoder.matches(request.getPassword(), company.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials.");
        }

        if (!company.isEmailVerified()) {
            throw new UnauthorizedException(
                    "Please verify your email before logging in. Check your inbox for a 6-digit verification code.");
        }

        if (!company.getIsApproved()) {
            throw new UnauthorizedException("Company account is pending approval.");
        }
        String token = jwtUtil.generateToken(company.getEmail(), "COMPANY", company.getId());
        return new AuthResponse(token, "COMPANY", company.getId(), company.getEmail());
    }

    public AuthResponse loginAdmin(LoginRequest request) {
        Admin admin = adminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials."));
        if (!passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials.");
        }
        String token = jwtUtil.generateToken(admin.getEmail(), "ADMIN", admin.getId());
        return new AuthResponse(token, "ADMIN", admin.getId(), admin.getEmail());
    }

    // ── Email verification ────────────────────────────────────────────────────

    @Transactional
    public void verifyEmail(VerifyCodeRequest request) {
        System.out.println("[AuthService] verifyEmail called for email: " + request.getEmail());

        String email = request.getEmail().trim();
        String submittedCode = request.getCode().trim();

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if (user.isEmailVerified()) return;
            if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect verification code. Please try again.");
            }
            user.setEmailVerified(true);
            user.setVerificationCode(null);
            userRepository.save(user);
            return;
        }

        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.isEmailVerified()) return;
            if (company.getVerificationCode() == null || !company.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect verification code. Please try again.");
            }
            company.setEmailVerified(true);
            company.setVerificationCode(null);
            companyRepository.save(company);
            return;
        }

        throw new BadRequestException("No account found for that email address.");
    }

    @Transactional
    public void resendVerificationEmail(ResendVerificationRequest request) {
        String email = request.getEmail().trim();

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if (user.isEmailVerified() || !"LOCAL".equals(user.getProvider())) return;
            user.setVerificationCode(generateVerificationCode());
            userRepository.save(user);
            sendUserVerificationEmailSafely(user);
            return;
        }

        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.isEmailVerified()) return;
            company.setVerificationCode(generateVerificationCode());
            companyRepository.save(company);
            sendCompanyVerificationEmailSafely(company);
            return;
        }
        // Silently succeed — prevents enumeration
    }

    // ── Forgot / reset password ───────────────────────────────────────────────

    /**
     * Step 1: user supplies their email.
     *
     * Requirements:
     *  - Account must exist (user or company).
     *  - Account must NOT be an OAuth-only account (no password to reset).
     *  - Account email must be verified (emailVerified = true). Unverified
     *    accounts should verify their email first, not reset a password.
     *
     * If none of these conditions are met, a BadRequestException is thrown
     * with a clear message so the frontend can display it to the user.
     * We intentionally do NOT silently ignore missing emails here — the product
     * requirement is to show an error, not prevent enumeration for this flow.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim();

        // ── Try User ──
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            // Block Google-only accounts — they have no password to reset
            if ("GOOGLE".equals(user.getProvider())
                    && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset. " +
                                "Please use 'Continue with Google' to sign in.");
            }
            // Block unverified accounts — they should verify email first
            if (!user.isEmailVerified()) {
                throw new BadRequestException(
                        "This email address has not been verified yet. " +
                                "Please verify your email before resetting your password.");
            }
            // All checks passed — generate and send reset code
            String code = generateVerificationCode();
            user.setVerificationCode(code);
            userRepository.save(user);
            try {
                emailService.sendPasswordResetEmail(user.getEmail(), code);
            } catch (Exception ex) {
                System.err.println("[AuthService] Failed to send password-reset email to "
                        + user.getEmail() + ": " + ex.getMessage());
            }
            return;
        }

        // ── Try Company ──
        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            // Companies are always LOCAL, but guard anyway
            if ("GOOGLE".equals(company.getProvider())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset.");
            }
            // Block unverified company accounts
            if (!company.isEmailVerified()) {
                throw new BadRequestException(
                        "This email address has not been verified yet. " +
                                "Please verify your email before resetting your password.");
            }
            // All checks passed — generate and send reset code
            String code = generateVerificationCode();
            company.setVerificationCode(code);
            companyRepository.save(company);
            try {
                emailService.sendCompanyPasswordResetEmail(
                        company.getEmail(), company.getCompanyName(), code);
            } catch (Exception ex) {
                System.err.println("[AuthService] Failed to send company password-reset email to "
                        + company.getEmail() + ": " + ex.getMessage());
            }
            return;
        }

        // Email not found — return a clear error (product requirement: show an error)
        throw new BadRequestException(
                "No account found with that email address. Please check the email and try again.");
    }

    /**
     * Step 2: verify the 6-digit reset code before showing the new-password form.
     * Does NOT consume the code — resetPassword() re-validates and consumes it.
     */
    @Transactional(readOnly = true)
    public void verifyResetCode(VerifyResetCodeRequest request) {
        String email         = request.getEmail().trim();
        String submittedCode = request.getCode().trim();

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if ("GOOGLE".equals(user.getProvider())
                    && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset.");
            }
            if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect or expired reset code. Please try again.");
            }
            return;
        }

        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.getVerificationCode() == null || !company.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect or expired reset code. Please try again.");
            }
            return;
        }

        throw new BadRequestException("No account found for that email address.");
    }

    /**
     * Step 3: set the new password after re-validating the code.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email         = request.getEmail().trim();
        String submittedCode = request.getCode().trim();
        String newPassword   = request.getNewPassword();

        validatePasswordPolicy(newPassword);

        // ── Try User ──
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if ("GOOGLE".equals(user.getProvider())
                    && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset.");
            }
            if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect or expired reset code. Please request a new code.");
            }
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            user.setVerificationCode(null);
            userRepository.save(user);
            System.out.println("[AuthService] Password reset for user: " + email);
            return;
        }

        // ── Try Company ──
        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.getVerificationCode() == null || !company.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect or expired reset code. Please request a new code.");
            }
            company.setPasswordHash(passwordEncoder.encode(newPassword));
            company.setVerificationCode(null);
            companyRepository.save(company);
            System.out.println("[AuthService] Password reset for company: " + email);
            return;
        }

        throw new BadRequestException("No account found for that email address.");
    }

    // ── Change password (authenticated) ──────────────────────────────────────

    @Transactional
    public void changeUserPassword(Integer userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        if ("GOOGLE".equals(user.getProvider())
                && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
            throw new BadRequestException("This account uses Google sign-in and has no password to change.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        validatePasswordPolicy(request.getNewPassword());
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void changeCompanyPassword(Integer companyId, ChangePasswordRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        if (!passwordEncoder.matches(request.getCurrentPassword(), company.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
        validatePasswordPolicy(request.getNewPassword());
        company.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        companyRepository.save(company);
    }

    // ── OAuth user provisioning ───────────────────────────────────────────────

    @Transactional
    public AuthResponse loginOrRegisterOAuthUser(String email, String providerId,
                                                 String firstName, String lastName) {
        System.out.println("[AuthService] OAuth login/register: email=" + email + " providerId=" + providerId);

        String safeFirst = (firstName != null && !firstName.isBlank()) ? firstName : "User";
        String safeLast  = (lastName  != null && !lastName.isBlank())  ? lastName  : "";

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            user = new User();
            user.setEmail(email);
            user.setPasswordHash("");
            user.setFirstName(safeFirst);
            user.setLastName(safeLast);
            user.setXpBalance(0);
            user.setLoginStreakDays(0);
            user.setLoginsThisWeek(0);
            user.setProvider("GOOGLE");
            user.setProviderId(providerId);
            user.setEmailVerified(true);
        } else {
            user.setProvider("GOOGLE");
            user.setProviderId(providerId);
            user.setEmailVerified(true);
            if (user.getFirstName() == null || user.getFirstName().isBlank()) user.setFirstName(safeFirst);
            if (user.getLastName()  == null || user.getLastName().isBlank())  user.setLastName(safeLast);
            if (user.getLoginStreakDays() == null) user.setLoginStreakDays(0);
            if (user.getLoginsThisWeek()  == null) user.setLoginsThisWeek(0);
        }

        user = userRepository.save(user);

        try {
            updateLoginStreak(user);
        } catch (Exception ex) {
            System.err.println("[AuthService] OAuth: streak update failed for userId=" + user.getId()
                    + " (non-fatal): " + ex.getMessage());
        }

        String token = jwtUtil.generateToken(user.getEmail(), "USER", user.getId());
        return new AuthResponse(token, "USER", user.getId(), user.getEmail());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @Transactional
    protected void updateLoginStreak(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLogin = user.getLastLoginDate();

        int streak = user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0;
        int weekly = user.getLoginsThisWeek()  != null ? user.getLoginsThisWeek()  : 0;
        boolean isNewDay;

        if (lastLogin == null) {
            streak = 1; weekly = 1; isNewDay = true;
        } else {
            long days = ChronoUnit.DAYS.between(lastLogin.toLocalDate(), now.toLocalDate());
            if (days == 0) {
                isNewDay = false;
            } else {
                streak = (days == 1) ? streak + 1 : 1;
                weekly = isNewWeek(lastLogin, now) ? 1 : weekly + 1;
                isNewDay = true;
            }
        }

        user.setLastLoginDate(now);
        user.setLoginStreakDays(streak);
        user.setLoginsThisWeek(weekly);
        userRepository.save(user);

        if (isNewDay) {
            challengeEvaluationService.evaluateLogin(user.getId(), streak, weekly);
        }
    }

    private boolean isNewWeek(LocalDateTime previous, LocalDateTime current) {
        return current.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                != previous.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                || current.getYear() != previous.getYear();
    }
}
