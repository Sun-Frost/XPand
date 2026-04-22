package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.exception.ForbiddenException;
import com.example.xpandbackend.exception.ResourceNotFoundException;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final EducationRepository educationRepository;
    private final WorkExperienceRepository workExperienceRepository;
    private final CertificationRepository certificationRepository;
    private final ProjectRepository projectRepository;
    private final ProjectSkillRepository projectSkillRepository;
    private final SkillRepository skillRepository;
    private final UserOnboardingSkillRepository onboardingSkillRepository;

    public UserProfileResponse getProfile(Integer userId) {
        User user = findUser(userId);
        return mapToProfileResponse(user);
    }

    @Transactional
    public UserProfileResponse updateProfile(Integer userId, UpdateUserProfileRequest request) {
        User user = findUser(userId);
        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());
        if (request.getCountry() != null) user.setCountry(request.getCountry());
        if (request.getCity() != null) user.setCity(request.getCity());
        if (request.getLinkedinUrl() != null) user.setLinkedinUrl(request.getLinkedinUrl());
        if (request.getGithubUrl() != null) user.setGithubUrl(request.getGithubUrl());
        if (request.getPortfolioUrl() != null) user.setPortfolioUrl(request.getPortfolioUrl());
        if (request.getProfilePicture() != null) user.setProfilePicture(request.getProfilePicture());
        if (request.getProfessionalTitle() != null) user.setProfessionalTitle(request.getProfessionalTitle());
        if (request.getAboutMe() != null) user.setAboutMe(request.getAboutMe());
        userRepository.save(user);
        return mapToProfileResponse(user);
    }

    // -------- Onboarding skills --------

    /**
     * Persists the skill IDs the user self-reported knowing at registration step 3.
     * Duplicate inserts (same user + skill) are silently ignored so the endpoint is safe
     * to call multiple times (e.g. if the user re-completes setup via the post-verify flow).
     */
    @Transactional
    public void saveOnboardingSkills(Integer userId, List<Integer> skillIds) {
        if (skillIds == null || skillIds.isEmpty()) return;
        User user = findUser(userId);
        for (Integer skillId : skillIds) {
            // Skip if already recorded
            if (onboardingSkillRepository.existsByUserIdAndSkillId(userId, skillId)) continue;
            Skill skill = skillRepository.findById(skillId)
                    .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + skillId));
            UserOnboardingSkill entry = new UserOnboardingSkill();
            entry.setUser(user);
            entry.setSkill(skill);
            onboardingSkillRepository.save(entry);
        }
    }

    /**
     * Returns the list of skill IDs recorded during onboarding for the given user.
     * The Skills Library uses this to show the "verify your skills" nudge popup.
     */
    public List<Integer> getOnboardingSkillIds(Integer userId) {
        return onboardingSkillRepository.findSkillIdsByUserId(userId);
    }

    // -------- Education --------
    public List<EducationResponse> getEducations(Integer userId) {
        return educationRepository.findByUserId(userId).stream()
                .map(this::mapToEducationResponse).collect(Collectors.toList());
    }

    @Transactional
    public EducationResponse addEducation(Integer userId, EducationRequest request) {
        User user = findUser(userId);
        Education education = new Education();
        education.setUser(user);
        setEducationFields(education, request);
        educationRepository.save(education);
        return mapToEducationResponse(education);
    }

    @Transactional
    public EducationResponse updateEducation(Integer userId, Integer educationId, EducationRequest request) {
        Education education = educationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("Education not found."));
        assertOwnership(education.getUser().getId(), userId);
        setEducationFields(education, request);
        educationRepository.save(education);
        return mapToEducationResponse(education);
    }

    @Transactional
    public void deleteEducation(Integer userId, Integer educationId) {
        Education education = educationRepository.findById(educationId)
                .orElseThrow(() -> new ResourceNotFoundException("Education not found."));
        assertOwnership(education.getUser().getId(), userId);
        educationRepository.delete(education);
    }

    // -------- Work Experience --------
    public List<WorkExperienceResponse> getWorkExperiences(Integer userId) {
        return workExperienceRepository.findByUserId(userId).stream()
                .map(this::mapToWorkResponse).collect(Collectors.toList());
    }

    @Transactional
    public WorkExperienceResponse addWorkExperience(Integer userId, WorkExperienceRequest request) {
        User user = findUser(userId);
        WorkExperience we = new WorkExperience();
        we.setUser(user);
        setWorkFields(we, request);
        workExperienceRepository.save(we);
        return mapToWorkResponse(we);
    }

    @Transactional
    public WorkExperienceResponse updateWorkExperience(Integer userId, Integer workId, WorkExperienceRequest request) {
        WorkExperience we = workExperienceRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Work experience not found."));
        assertOwnership(we.getUser().getId(), userId);
        setWorkFields(we, request);
        workExperienceRepository.save(we);
        return mapToWorkResponse(we);
    }

    @Transactional
    public void deleteWorkExperience(Integer userId, Integer workId) {
        WorkExperience we = workExperienceRepository.findById(workId)
                .orElseThrow(() -> new ResourceNotFoundException("Work experience not found."));
        assertOwnership(we.getUser().getId(), userId);
        workExperienceRepository.delete(we);
    }

    // -------- Certifications --------
    public List<CertificationResponse> getCertifications(Integer userId) {
        return certificationRepository.findByUserId(userId).stream()
                .map(this::mapToCertResponse).collect(Collectors.toList());
    }

    @Transactional
    public CertificationResponse addCertification(Integer userId, CertificationRequest request) {
        User user = findUser(userId);
        Certification cert = new Certification();
        cert.setUser(user);
        setCertFields(cert, request);
        certificationRepository.save(cert);
        return mapToCertResponse(cert);
    }

    @Transactional
    public CertificationResponse updateCertification(Integer userId, Integer certId, CertificationRequest request) {
        Certification cert = certificationRepository.findById(certId)
                .orElseThrow(() -> new ResourceNotFoundException("Certification not found."));
        assertOwnership(cert.getUser().getId(), userId);
        setCertFields(cert, request);
        certificationRepository.save(cert);
        return mapToCertResponse(cert);
    }

    @Transactional
    public void deleteCertification(Integer userId, Integer certId) {
        Certification cert = certificationRepository.findById(certId)
                .orElseThrow(() -> new ResourceNotFoundException("Certification not found."));
        assertOwnership(cert.getUser().getId(), userId);
        certificationRepository.delete(cert);
    }

    // -------- Projects --------
    public List<ProjectResponse> getProjects(Integer userId) {
        return projectRepository.findByUserId(userId).stream()
                .map(this::mapToProjectResponse).collect(Collectors.toList());
    }

    @Transactional
    public ProjectResponse addProject(Integer userId, ProjectRequest request) {
        User user = findUser(userId);
        Project project = new Project();
        project.setUser(user);
        setProjectFields(project, request);
        projectRepository.save(project);
        saveProjectSkills(project, request.getSkillIds());
        return mapToProjectResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(Integer userId, Integer projectId, ProjectRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found."));
        assertOwnership(project.getUser().getId(), userId);
        setProjectFields(project, request);
        projectRepository.save(project);
        projectSkillRepository.deleteByProjectId(projectId);
        saveProjectSkills(project, request.getSkillIds());
        return mapToProjectResponse(project);
    }

    @Transactional
    public void deleteProject(Integer userId, Integer projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found."));
        assertOwnership(project.getUser().getId(), userId);
        projectRepository.delete(project);
    }

    // -------- helpers --------
    private User findUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private void assertOwnership(Integer ownerId, Integer requesterId) {
        if (!ownerId.equals(requesterId)) throw new ForbiddenException("Access denied.");
    }

    private void saveProjectSkills(Project project, List<Integer> skillIds) {
        if (skillIds == null) return;
        for (Integer skillId : skillIds) {
            Skill skill = skillRepository.findById(skillId)
                    .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + skillId));
            ProjectSkill ps = new ProjectSkill(project, skill);
            projectSkillRepository.save(ps);
        }
    }

    private void setEducationFields(Education e, EducationRequest r) {
        e.setInstitutionName(r.getInstitutionName());
        e.setDegree(r.getDegree());
        e.setFieldOfStudy(r.getFieldOfStudy());
        e.setStartDate(r.getStartDate());
        e.setEndDate(r.getEndDate());
        e.setDescription(r.getDescription());
    }

    private void setWorkFields(WorkExperience w, WorkExperienceRequest r) {
        w.setJobTitle(r.getJobTitle());
        w.setCompanyName(r.getCompanyName());
        w.setLocation(r.getLocation());
        w.setStartDate(r.getStartDate());
        w.setEndDate(r.getEndDate());
        w.setDescription(r.getDescription());
    }

    private void setCertFields(Certification c, CertificationRequest r) {
        c.setName(r.getName());
        c.setIssuingOrganization(r.getIssuingOrganization());
        c.setIssueDate(r.getIssueDate());
        c.setExpirationDate(r.getExpirationDate());
    }

    private void setProjectFields(Project p, ProjectRequest r) {
        p.setTitle(r.getTitle());
        p.setDescription(r.getDescription());
        p.setTechnologiesUsed(r.getTechnologiesUsed());
        p.setProjectUrl(r.getProjectUrl());
        p.setGithubUrl(r.getGithubUrl());
        p.setStartDate(r.getStartDate());
        p.setEndDate(r.getEndDate());
    }

    public UserProfileResponse mapToProfileResponse(User user) {
        UserProfileResponse r = new UserProfileResponse();
        r.setId(user.getId());
        r.setEmail(user.getEmail());
        r.setFirstName(user.getFirstName());
        r.setLastName(user.getLastName());
        r.setPhoneNumber(user.getPhoneNumber());
        r.setCountry(user.getCountry());
        r.setCity(user.getCity());
        r.setLinkedinUrl(user.getLinkedinUrl());
        r.setGithubUrl(user.getGithubUrl());
        r.setPortfolioUrl(user.getPortfolioUrl());
        r.setProfilePicture(user.getProfilePicture());
        r.setProfessionalTitle(user.getProfessionalTitle());
        r.setAboutMe(user.getAboutMe());
        r.setXpBalance(user.getXpBalance());
        r.setLoginStreakDays(user.getLoginStreakDays() != null ? user.getLoginStreakDays() : 0);
        r.setCreatedAt(user.getCreatedAt());
        return r;
    }

    private EducationResponse mapToEducationResponse(Education e) {
        EducationResponse r = new EducationResponse();
        r.setId(e.getId());
        r.setInstitutionName(e.getInstitutionName());
        r.setDegree(e.getDegree());
        r.setFieldOfStudy(e.getFieldOfStudy());
        r.setStartDate(e.getStartDate());
        r.setEndDate(e.getEndDate());
        r.setDescription(e.getDescription());
        return r;
    }

    private WorkExperienceResponse mapToWorkResponse(WorkExperience w) {
        WorkExperienceResponse r = new WorkExperienceResponse();
        r.setId(w.getId());
        r.setJobTitle(w.getJobTitle());
        r.setCompanyName(w.getCompanyName());
        r.setLocation(w.getLocation());
        r.setStartDate(w.getStartDate());
        r.setEndDate(w.getEndDate());
        r.setDescription(w.getDescription());
        return r;
    }

    private CertificationResponse mapToCertResponse(Certification c) {
        CertificationResponse r = new CertificationResponse();
        r.setId(c.getId());
        r.setName(c.getName());
        r.setIssuingOrganization(c.getIssuingOrganization());
        r.setIssueDate(c.getIssueDate());
        r.setExpirationDate(c.getExpirationDate());
        return r;
    }

    private ProjectResponse mapToProjectResponse(Project p) {
        ProjectResponse r = new ProjectResponse();
        r.setId(p.getId());
        r.setTitle(p.getTitle());
        r.setDescription(p.getDescription());
        r.setTechnologiesUsed(p.getTechnologiesUsed());
        r.setProjectUrl(p.getProjectUrl());
        r.setGithubUrl(p.getGithubUrl());
        r.setStartDate(p.getStartDate());
        r.setEndDate(p.getEndDate());
        r.setCreatedAt(p.getCreatedAt());
        if (p.getSkills() != null) {
            r.setSkills(p.getSkills().stream().map(ps -> {
                SkillResponse sr = new SkillResponse();
                sr.setId(ps.getSkill().getId());
                sr.setName(ps.getSkill().getName());
                sr.setCategory(ps.getSkill().getCategory());
                sr.setIsActive(ps.getSkill().getIsActive());
                return sr;
            }).collect(Collectors.toList()));
        }
        return r;
    }
}