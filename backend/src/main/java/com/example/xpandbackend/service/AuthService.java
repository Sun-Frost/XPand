package com.example.xpandbackend.service;

import com.example.xpandbackend.models.Admin;
import com.example.xpandbackend.models.Company;
import com.example.xpandbackend.models.PasswordResetToken;
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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final AdminRepository adminRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;
    private final ChallengeEvaluationService challengeEvaluationService;

    private final Random random = new Random();

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

        // ── Login streak tracking ─────────────────────────────────────────────
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLogin = user.getLastLoginDate();

        int currentStreak = user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0;
        int loginsThisWeek = user.getLoginsThisWeek() != null ? user.getLoginsThisWeek() : 0;
        boolean isNewDay;

        if (lastLogin == null) {
            currentStreak = 1;
            loginsThisWeek = 1;
            isNewDay = true;
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

    /**
     * Validates the 6-digit code the user typed.
     *
     * FIX: Uses findByEmailIgnoreCase so that emails stored with mixed casing
     * (e.g. "HR@Company.com") are found even when the submitted email has been
     * normalised to lowercase ("hr@company.com") by the frontend or the old
     * version of this method.  This was the root cause of company verification
     * appearing to succeed on the frontend but silently failing to update the DB.
     */
    @Transactional
    public void verifyEmail(VerifyCodeRequest request) {
        System.out.println("[AuthService] verifyEmail called for email: " + request.getEmail());

        // Normalise submitted email — stored email may differ in case
        String email = request.getEmail().trim();
        String submittedCode = request.getCode().trim();

        // Try User first (case-insensitive lookup)
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if (user.isEmailVerified()) {
                System.out.println("[AuthService] User email already verified: " + email);
                return; // idempotent
            }
            if (user.getVerificationCode() == null || !user.getVerificationCode().equals(submittedCode)) {
                System.err.println("[AuthService] Wrong code for user: " + email);
                throw new BadRequestException("Incorrect verification code. Please try again.");
            }
            user.setEmailVerified(true);
            user.setVerificationCode(null); // consumed — cannot be reused
            userRepository.save(user);
            System.out.println("[AuthService] User email verified: " + email);
            return;
        }

        // Try Company (case-insensitive lookup)
        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.isEmailVerified()) {
                System.out.println("[AuthService] Company email already verified: " + email);
                return;
            }
            if (company.getVerificationCode() == null || !company.getVerificationCode().equals(submittedCode)) {
                System.err.println("[AuthService] Wrong code for company: " + email);
                throw new BadRequestException("Incorrect verification code. Please try again.");
            }
            company.setEmailVerified(true);
            company.setVerificationCode(null); // consumed
            companyRepository.save(company);
            System.out.println("[AuthService] Company email verified: " + email);
            return;
        }

        System.err.println("[AuthService] verifyEmail: no account found for email: " + email);
        throw new BadRequestException("No account found for that email address.");
    }

    /**
     * Resends the verification code.
     * FIX: Uses findByEmailIgnoreCase so the account is always found regardless
     * of how the email was originally cased at registration.
     */
    @Transactional
    public void resendVerificationEmail(ResendVerificationRequest request) {
        String email = request.getEmail().trim();

        // Try User (case-insensitive)
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user != null) {
            if (user.isEmailVerified() || !"LOCAL".equals(user.getProvider())) {
                return; // already verified or OAuth account — silently do nothing
            }
            user.setVerificationCode(generateVerificationCode());
            userRepository.save(user);
            sendUserVerificationEmailSafely(user);
            return;
        }

        // Try Company (case-insensitive)
        Company company = companyRepository.findByEmailIgnoreCase(email).orElse(null);
        if (company != null) {
            if (company.isEmailVerified()) {
                return;
            }
            company.setVerificationCode(generateVerificationCode());
            companyRepository.save(company);
            sendCompanyVerificationEmailSafely(company);
            return;
        }

        // Neither found — silently succeed (prevents enumeration)
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
            System.out.println("[AuthService] OAuth: creating new user for email=" + email);
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
            System.out.println("[AuthService] OAuth: existing user found for email=" + email
                    + " (provider was: " + user.getProvider() + ")");
            user.setProvider("GOOGLE");
            user.setProviderId(providerId);
            user.setEmailVerified(true);
            if (user.getFirstName() == null || user.getFirstName().isBlank()) user.setFirstName(safeFirst);
            if (user.getLastName()  == null || user.getLastName().isBlank())  user.setLastName(safeLast);
            if (user.getLoginStreakDays() == null) user.setLoginStreakDays(0);
            if (user.getLoginsThisWeek()  == null) user.setLoginsThisWeek(0);
        }

        user = userRepository.save(user);
        System.out.println("[AuthService] OAuth: user saved with id=" + user.getId());

        try {
            updateLoginStreak(user);
        } catch (Exception ex) {
            System.err.println("[AuthService] OAuth: streak update failed for userId=" + user.getId()
                    + " (non-fatal): " + ex.getMessage());
        }

        String token = jwtUtil.generateToken(user.getEmail(), "USER", user.getId());
        System.out.println("[AuthService] OAuth: JWT generated for userId=" + user.getId());
        return new AuthResponse(token, "USER", user.getId(), user.getEmail());
    }

    // ── Password reset ────────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null || "GOOGLE".equals(user.getProvider())) return;

        passwordResetTokenRepository.deleteByUserId(user.getId());
        String token = java.util.UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setToken(token);
        resetToken.setExpiryDate(LocalDateTime.now().plusHours(1));
        passwordResetTokenRepository.save(resetToken);
        emailService.sendPasswordResetEmail(user.getEmail(), token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired token."));
        if (resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            passwordResetTokenRepository.delete(resetToken);
            throw new BadRequestException("Token has expired.");
        }
        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        passwordResetTokenRepository.delete(resetToken);
    }

    @Transactional
    public void changeUserPassword(Integer userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        if ("GOOGLE".equals(user.getProvider()) && (user.getPasswordHash() == null || user.getPasswordHash().isEmpty())) {
            throw new BadRequestException("This account uses Google sign-in and has no password to change.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect.");
        }
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
        company.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        companyRepository.save(company);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    @Transactional
    protected void updateLoginStreak(User user) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLogin = user.getLastLoginDate();

        int streak = user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0;
        int weekly = user.getLoginsThisWeek() != null ? user.getLoginsThisWeek() : 0;
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






