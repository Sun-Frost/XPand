package com.example.xpandbackend.controller;

import com.example.xpandbackend.dto.request.UpdateCompanyProfileRequest;
import com.example.xpandbackend.dto.response.CompanyProfileResponse;
import com.example.xpandbackend.dto.response.CompanyUserFullProfileResponse;
import com.example.xpandbackend.dto.response.CompanyViewUserProfileResponse;
import com.example.xpandbackend.dto.response.UserProfileResponse;
import com.example.xpandbackend.exception.ForbiddenException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.models.Application;
import com.example.xpandbackend.models.Company;
import com.example.xpandbackend.repository.ApplicationRepository;
import com.example.xpandbackend.repository.CompanyRepository;
import com.example.xpandbackend.security.AuthenticatedUser;
import com.example.xpandbackend.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/company")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyRepository companyRepository;
    private final UserService userService;
    private final ApplicationRepository applicationRepository;

    @GetMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> getProfile(@AuthenticationPrincipal AuthenticatedUser principal) {
        Company company = companyRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        return ResponseEntity.ok(mapToResponse(company));
    }

    @PutMapping("/profile")
    public ResponseEntity<CompanyProfileResponse> updateProfile(@AuthenticationPrincipal AuthenticatedUser principal,
                                                                @RequestBody UpdateCompanyProfileRequest request) {
        Company company = companyRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        if (request.getCompanyName() != null) company.setCompanyName(request.getCompanyName());
        if (request.getDescription() != null) company.setDescription(request.getDescription());
        if (request.getWebsiteUrl() != null) company.setWebsiteUrl(request.getWebsiteUrl());
        if (request.getIndustry() != null) company.setIndustry(request.getIndustry());
        if (request.getLocation() != null) company.setLocation(request.getLocation());
        companyRepository.save(company);
        return ResponseEntity.ok(mapToResponse(company));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<CompanyUserFullProfileResponse> getUserFullProfileForCompany(
            @AuthenticationPrincipal AuthenticatedUser principal,
            @PathVariable Integer userId) {

        Integer companyId = principal.getId();

        // 🔴 SECURITY CHECK — company must have at least one application from this user
        if (!applicationRepository.existsByCompanyIdAndUserId(companyId, userId)) {
            throw new ForbiddenException("You can only view applicants.");
        }

        // 🔒 DEADLINE GATE — CV is locked until the job deadline has passed.
        // Find the most recent (or any active) application from this user to this company.
        List<Application> applications = applicationRepository.findByCompanyIdAndUserId(companyId, userId);
        boolean allDeadlinesPassed = applications.stream()
                .allMatch(a -> a.getJob().getDeadline() != null
                        && a.getJob().getDeadline().isBefore(LocalDateTime.now()));
        if (!allDeadlinesPassed) {
            throw new ForbiddenException("CV locked until deadline.");
        }

        // ✅ FETCH DATA
        UserProfileResponse user = userService.getProfile(userId);

        CompanyUserFullProfileResponse response = new CompanyUserFullProfileResponse();
        response.setProfile(mapToCompanyView(user));
        response.setEducations(userService.getEducations(userId));
        response.setWorkExperiences(userService.getWorkExperiences(userId));
        response.setProjects(userService.getProjects(userId));
        response.setCertifications(userService.getCertifications(userId));

        return ResponseEntity.ok(response);
    }
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
}