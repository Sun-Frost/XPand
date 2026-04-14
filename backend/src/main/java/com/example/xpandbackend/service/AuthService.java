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
import java.util.UUID;

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
        userRepository.save(user);
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
        companyRepository.save(company);
        String token = jwtUtil.generateToken(company.getEmail(), "COMPANY", company.getId());
        return new AuthResponse(token, "COMPANY", company.getId(), company.getEmail());
    }

    @Transactional
    public AuthResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid credentials."));
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials.");
        }

        // ── Update login streak tracking ──────────────────────────────────────
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastLogin = user.getLastLoginDate();

        int currentStreak = user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0;
        int loginsThisWeek = user.getLoginsThisWeek() != null ? user.getLoginsThisWeek() : 0;

        boolean isNewDay; // true only when this login counts as a new calendar day

        if (lastLogin == null) {
            // First ever login
            currentStreak = 1;
            loginsThisWeek = 1;
            isNewDay = true;
        } else {
            long daysSinceLastLogin = ChronoUnit.DAYS.between(lastLogin.toLocalDate(), now.toLocalDate());

            if (daysSinceLastLogin == 0) {
                // Same calendar day — do not re-award daily XP or update counters
                isNewDay = false;
            } else if (daysSinceLastLogin == 1) {
                // Consecutive day — extend streak
                currentStreak++;
                loginsThisWeek = isNewWeek(lastLogin, now) ? 1 : loginsThisWeek + 1;
                isNewDay = true;
            } else {
                // Streak broken
                currentStreak = 1;
                loginsThisWeek = isNewWeek(lastLogin, now) ? 1 : loginsThisWeek + 1;
                isNewDay = true;
            }
        }

        user.setLastLoginDate(now);
        user.setLoginStreakDays(currentStreak);
        user.setLoginsThisWeek(loginsThisWeek);
        userRepository.save(user);

        // ── Evaluate login-based challenges (once per calendar day only) ──────
        // Prevents DAILY_LOGIN XP from being awarded on every login within the same day.
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

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        User user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) return;

        passwordResetTokenRepository.deleteByUserId(user.getId());
        String token = UUID.randomUUID().toString();
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

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns true if the two timestamps fall in different ISO weeks.
     * Used to reset the weekly login counter at the start of each week.
     */
    private boolean isNewWeek(LocalDateTime previous, LocalDateTime current) {
        return current.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                != previous.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                || current.getYear() != previous.getYear();
    }
}