package com.example.xpandbackend.service;

import com.example.xpandbackend.dto.request.UpdateCompanyProfileRequest;
import com.example.xpandbackend.dto.response.CompanyProfileResponse;
import com.example.xpandbackend.dto.response.CompanyUserFullProfileResponse;
import com.example.xpandbackend.dto.response.CompanyViewUserProfileResponse;
import com.example.xpandbackend.dto.response.UserProfileResponse;
import com.example.xpandbackend.dto.response.UserSkillVerificationResponse;
import com.example.xpandbackend.exception.ForbiddenException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.models.Application;
import com.example.xpandbackend.models.Company;
import com.example.xpandbackend.models.UserSkillVerification;
import com.example.xpandbackend.repository.ApplicationRepository;
import com.example.xpandbackend.repository.CompanyRepository;
import com.example.xpandbackend.repository.UserSkillVerificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyService {

    private final CompanyRepository companyRepository;
    private final UserService userService;
    private final ApplicationRepository applicationRepository;
    private final UserSkillVerificationRepository userSkillVerificationRepository;

    public CompanyProfileResponse getProfile(Integer companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        return mapToResponse(company);
    }

    @Transactional
    public CompanyProfileResponse updateProfile(Integer companyId, UpdateCompanyProfileRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        if (request.getCompanyName() != null) company.setCompanyName(request.getCompanyName());
        if (request.getDescription() != null) company.setDescription(request.getDescription());
        if (request.getWebsiteUrl() != null) company.setWebsiteUrl(request.getWebsiteUrl());
        if (request.getIndustry() != null) company.setIndustry(request.getIndustry());
        if (request.getLocation() != null) company.setLocation(request.getLocation());
        companyRepository.save(company);
        return mapToResponse(company);
    }

    public CompanyUserFullProfileResponse getUserFullProfileForCompany(Integer companyId,
                                                                       Integer userId,
                                                                       Integer jobId) {
        // Security check: application must exist for this user+job, and job must belong to this company
        Application application = applicationRepository.findByUserIdAndJobId(userId, jobId)
                .orElseThrow(() -> new ForbiddenException("You can only view applicants."));

        if (!application.getJob().getCompany().getId().equals(companyId)) {
            throw new ForbiddenException("You can only view applicants.");
        }

        // CV locked until deadline has passed
        if (application.getJob().getDeadline() == null
                || application.getJob().getDeadline().isAfter(LocalDateTime.now())) {
            throw new ForbiddenException("CV locked until deadline.");
        }

        UserProfileResponse user = userService.getProfile(userId);

        CompanyUserFullProfileResponse response = new CompanyUserFullProfileResponse();
        response.setProfile(mapToCompanyView(user));
        response.setEducations(userService.getEducations(userId));
        response.setWorkExperiences(userService.getWorkExperiences(userId));
        response.setProjects(userService.getProjects(userId));
        response.setCertifications(userService.getCertifications(userId));
        return response;
    }

    public List<UserSkillVerificationResponse> getApplicantSkillVerifications(Integer companyId, Integer userId) {
        // Security check: company must have at least one application from this user
        if (!applicationRepository.existsByCompanyIdAndUserId(companyId, userId)) {
            throw new ForbiddenException("You can only view applicants.");
        }

        List<UserSkillVerification> verifications = userSkillVerificationRepository.findByUserId(userId);
        return verifications.stream()
                .map(this::mapToVerificationResponse)
                .collect(Collectors.toList());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private CompanyProfileResponse mapToResponse(Company c) {
        CompanyProfileResponse r = new CompanyProfileResponse();
        r.setId(c.getId());
        r.setEmail(c.getEmail());
        r.setCompanyName(c.getCompanyName());
        r.setDescription(c.getDescription());
        r.setWebsiteUrl(c.getWebsiteUrl());
        r.setIndustry(c.getIndustry());
        r.setLocation(c.getLocation());
        r.setIsApproved(c.getIsApproved());
        r.setCreatedAt(c.getCreatedAt());
        return r;
    }

    private CompanyViewUserProfileResponse mapToCompanyView(UserProfileResponse u) {
        CompanyViewUserProfileResponse r = new CompanyViewUserProfileResponse();
        r.setId(u.getId());
        r.setEmail(u.getEmail());
        r.setFirstName(u.getFirstName());
        r.setLastName(u.getLastName());
        r.setPhoneNumber(u.getPhoneNumber());
        r.setCountry(u.getCountry());
        r.setCity(u.getCity());
        r.setLinkedinUrl(u.getLinkedinUrl());
        r.setGithubUrl(u.getGithubUrl());
        r.setPortfolioUrl(u.getPortfolioUrl());
        r.setProfilePicture(u.getProfilePicture());
        r.setProfessionalTitle(u.getProfessionalTitle());
        r.setAboutMe(u.getAboutMe());
        r.setCreatedAt(u.getCreatedAt());
        r.setXpBalance(u.getXpBalance());
        return r;
    }

    private UserSkillVerificationResponse mapToVerificationResponse(UserSkillVerification v) {
        UserSkillVerificationResponse r = new UserSkillVerificationResponse();
        r.setVerificationId(v.getId());
        r.setSkillId(v.getSkill().getId());
        r.setSkillName(v.getSkill().getName());
        r.setCategory(v.getSkill().getCategory());
        r.setCurrentBadge(v.getCurrentBadge());
        r.setAttemptCount(v.getAttemptCount());
        r.setIsLocked(v.getIsLocked());
        r.setLockExpiry(v.getLockExpiry());
        r.setVerifiedDate(v.getVerifiedDate());
        return r;
    }
}