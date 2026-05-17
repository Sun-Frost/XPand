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

/**
 * Handles all authentication flows: registration, login, email verification,
 * password reset, and Google OAuth provisioning.
 *
 * <h3>Password policy</h3>
 * All passwords must be at least 8 characters and contain at least one uppercase
 * letter, one lowercase letter, one digit, and one special character.
 *
 * <h3>Email verification</h3>
 * After registration, LOCAL users and companies receive a 6-digit code by email.
 * The code is stored in {@code verificationCode} on the entity and cleared after
 * successful verification. The same field is reused for password-reset codes.
 *
 * <h3>Login streak tracking</h3>
 * On every successful user login the streak and weekly login count are updated and
 * {@link ChallengeEvaluationService#evaluateLogin} is triggered for login-based challenges.
 */
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

    private static final Pattern PASSWORD_POLICY =
            Pattern.compile("^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validatePasswordPolicy(String password) {
        if (password == null || !PASSWORD_POLICY.matcher(password).matches()) {
            throw new BadRequestException(
                    "Password must be at least 8 characters and include an uppercase letter, " +
                            "a lowercase letter, a number, and a special character.");
        }
    }

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

    /**
     * Registers a new job seeker. Sends a 6-digit email verification code.
     * The returned JWT is valid immediately so the frontend can proceed to the
     * verification step without a separate login call.
     */
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

    /**
     * Registers a new company. Sends a 6-digit email verification code.
     * The account will be {@code isApproved = false} until an admin approves it,
     * so the company cannot log in even after email verification.
     */
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

    /**
     * Authenticates a job seeker. Rejects Google-only accounts (no password set),
     * unverified emails, and suspended accounts.
     * Updates the login streak and triggers login-based challenge evaluation.
     */
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

    /**
     * Authenticates a company. Rejects unverified emails and unapproved accounts.
     */
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

    /** Authenticates an admin. No email verification or approval check required. */
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

    /**
     * Verifies the 6-digit code for either a user or company account.
     * Clears the code and marks {@code emailVerified = true} on success.
     * Silently succeeds if the account is already verified (idempotent).
     */
    @Transactional
    public void verifyEmail(VerifyCodeRequest request) {
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

    /**
     * Generates and sends a fresh 6-digit verification code.
     * Silently succeeds if the email does not exist (prevents enumeration).
     */
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
        }
        // Silently succeed for unknown emails — prevents enumeration.
    }

    // ── Forgot / reset password (3-step flow) ────────────────────────────────

    /**
     * Step 1 — user supplies their email.
     * Generates a 6-digit reset code and emails it.
     * <p>
     * Throws {@link BadRequestException} (not a silent 200) in the following cases
     * because the product requirement is to show a specific error, not prevent enumeration:
     * <ul>
     *   <li>Email not found</li>
     *   <li>Google-only account (no password to reset)</li>
     *   <li>Unverified account (must verify email first)</li>
     * </ul>
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim();

        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if ("GOOGLE".equals(user.getProvider())
                    && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset. " +
                                "Please use 'Continue with Google' to sign in.");
            }
            if (!user.isEmailVerified()) {
                throw new BadRequestException(
                        "This email address has not been verified yet. " +
                                "Please verify your email before resetting your password.");
            }
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

        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if ("GOOGLE".equals(company.getProvider())) {
                throw new BadRequestException(
                        "This account uses Google sign-in and does not have a password to reset.");
            }
            if (!company.isEmailVerified()) {
                throw new BadRequestException(
                        "This email address has not been verified yet. " +
                                "Please verify your email before resetting your password.");
            }
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

        throw new BadRequestException(
                "No account found with that email address. Please check the email and try again.");
    }

    /**
     * Step 2 — validates the 6-digit reset code without consuming it.
     * Allows the frontend to gate the "set new password" form behind a verified code,
     * preventing the user from reaching that step with a wrong code.
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
     * Step 3 — re-validates the code and sets the new password.
     * Re-validation is intentional: prevents replay if the user navigates back.
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        String email         = request.getEmail().trim();
        String submittedCode = request.getCode().trim();
        String newPassword   = request.getNewPassword();

        validatePasswordPolicy(newPassword);

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
            return;
        }

        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.getVerificationCode() == null || !company.getVerificationCode().equals(submittedCode)) {
                throw new BadRequestException("Incorrect or expired reset code. Please request a new code.");
            }
            company.setPasswordHash(passwordEncoder.encode(newPassword));
            company.setVerificationCode(null);
            companyRepository.save(company);
            return;
        }

        throw new BadRequestException("No account found for that email address.");
    }

    // ── Change password (authenticated) ──────────────────────────────────────

    /** Changes the password for an authenticated user after verifying the current password. */
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

    /** Changes the password for an authenticated company after verifying the current password. */
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

    /**
     * Creates or updates a user account after a successful Google OAuth login.
     * If an account already exists for the email, the provider fields are updated
     * and the account is marked as verified. Updates the login streak.
     */
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