package com.example.xpandbackend.service;

import com.example.xpandbackend.models.*;
import com.example.xpandbackend.models.Enums.*;
import com.example.xpandbackend.dto.request.*;
import com.example.xpandbackend.dto.response.*;
import com.example.xpandbackend.exception.*;
import com.example.xpandbackend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JobService {

    private final JobPostingRepository jobPostingRepository;
    private final JobSkillRequirementRepository jobSkillRequirementRepository;
    private final ApplicationRepository applicationRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final UserSkillVerificationRepository verificationRepository;
    private final UserPurchaseRepository userPurchaseRepository;
    private final ChallengeEvaluationService challengeEvaluationService;

    // -------- Job Postings --------

    public List<JobPostingResponse> getActiveJobs() {
        return jobPostingRepository.findActiveJobs(LocalDateTime.now()).stream()
                .map(this::mapToJobResponse).collect(Collectors.toList());
    }

    public JobPostingResponse getJobById(Integer jobId) {
        return mapToJobResponse(findJob(jobId));
    }

    public long getActivePrioritySlotCount(Integer jobId) {
        return applicationRepository.countActivePrioritySlots(jobId);
    }

    public List<JobPostingResponse> getCompanyJobs(Integer companyId) {
        return jobPostingRepository.findByCompanyId(companyId).stream()
                .map(this::mapToJobResponse).collect(Collectors.toList());
    }

    @Transactional
    public JobPostingResponse createJob(Integer companyId, CreateJobRequest request) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Company not found."));
        if (!company.getIsApproved()) throw new ForbiddenException("Company is not approved.");

        if (request.getSkills() == null || request.getSkills().stream()
                .noneMatch(s -> s.getImportance() == ImportanceLevel.MAJOR)) {
            throw new BadRequestException("At least one MAJOR skill is required.");
        }
        if (request.getDeadline() == null) throw new BadRequestException("Deadline is required.");

        JobPosting job = new JobPosting();
        job.setCompany(company);
        setJobFields(job, request);
        jobPostingRepository.save(job);
        saveJobSkills(job, request.getSkills());
        return mapToJobResponse(job);
    }

    @Transactional
    public JobPostingResponse updateJob(Integer companyId, Integer jobId, CreateJobRequest request) {
        JobPosting job = findJob(jobId);
        assertCompanyOwns(job, companyId);
        if (job.getStatus() == JobStatus.EXPIRED) throw new BadRequestException("Cannot edit an expired job.");

        setJobFields(job, request);
        jobPostingRepository.save(job);
        jobSkillRequirementRepository.deleteByJobPostingId(jobId);
        saveJobSkills(job, request.getSkills());
        return mapToJobResponse(job);
    }

    @Transactional
    public void deleteJob(Integer companyId, Integer jobId) {
        JobPosting job = findJob(jobId);
        assertCompanyOwns(job, companyId);
        job.setStatus(JobStatus.CLOSED);
        jobPostingRepository.save(job);
    }

    // -------- Applications --------

    @Transactional
    public ApplicationResponse applyToJob(Integer userId, ApplyJobRequest request) {
        JobPosting job = findJob(request.getJobId());
        if (job.getStatus() != JobStatus.ACTIVE || job.getDeadline().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Job is not accepting applications.");
        }
        if (applicationRepository.existsByUserIdAndJobId(userId, request.getJobId())) {
            throw new BadRequestException("You have already applied to this job.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));

        // Check that user has badges for all MAJOR skills
        List<JobSkillRequirement> majorSkills = jobSkillRequirementRepository
                .findByJobPostingIdAndImportance(request.getJobId(), ImportanceLevel.MAJOR);

        for (JobSkillRequirement req : majorSkills) {
            boolean hasBadge = verificationRepository
                    .findByUserIdAndSkillId(userId, req.getSkill().getId())
                    .map(v -> v.getCurrentBadge() != null)
                    .orElse(false);
            if (!hasBadge) {
                throw new BadRequestException("You must have a verified badge for major skill: "
                        + req.getSkill().getName());
            }
        }

        Application application = new Application();
        application.setUser(user);
        application.setJob(job);
        application.setStatus(ApplicationStatus.PENDING);

        // Handle priority slot
        if (request.getPriorityPurchaseId() != null) {
            UserPurchase purchase = userPurchaseRepository.findById(request.getPriorityPurchaseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Purchase not found."));
            if (!purchase.getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
            if (purchase.getIsUsed()) throw new BadRequestException("This priority slot has already been used.");
            if (!purchase.getItem().getItemType().equals(ItemType.PRIORITY_SLOT)) {
                throw new BadRequestException("Invalid purchase type for priority slot.");
            }
            // Only enforce job match if the voucher was pre-associated with a specific job.
            // Vouchers purchased without a job (the normal flow) can be used on any job.
            if (purchase.getAssociatedJob() != null
                    && !purchase.getAssociatedJob().getId().equals(request.getJobId())) {
                throw new BadRequestException("Priority slot is for a different job.");
            }

            long activePriorityCount = applicationRepository.countActivePrioritySlots(request.getJobId());
            if (activePriorityCount >= 3) throw new BadRequestException("All priority slots for this job are taken.");

            int rank = (int) activePriorityCount + 1;
            application.setPrioritySlotRank(rank);
            purchase.setIsUsed(true);
            userPurchaseRepository.save(purchase);
        }

        applicationRepository.save(application);

        // ── Evaluate job application challenges ──────────────────────────────
        int totalApplications = applicationRepository.countByUserId(userId);
        boolean hasGoldBadge = verificationRepository.findVerifiedByUserId(userId).stream()
                .anyMatch(v -> v.getCurrentBadge() == BadgeLevel.GOLD);
        challengeEvaluationService.evaluateJobApplication(userId, totalApplications, hasGoldBadge);  // APPLY_JOB + APPLY_WITH_GOLD

        return mapToApplicationResponse(application);
    }

    @Transactional
    public void withdrawApplication(Integer userId, Integer applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found."));
        if (!application.getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
        if (application.getStatus() == ApplicationStatus.WITHDRAWN) throw new BadRequestException("Already withdrawn.");
        if (application.getJob().getDeadline().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Cannot withdraw after deadline.");
        }
        application.setStatus(ApplicationStatus.WITHDRAWN);
        applicationRepository.save(application);
    }

    public List<ApplicationResponse> getUserApplications(Integer userId) {
        return applicationRepository.findByUserId(userId).stream()
                .map(this::mapToApplicationResponse).collect(Collectors.toList());
    }

    public List<ApplicationResponse> getJobApplications(Integer companyId, Integer jobId) {
        JobPosting job = findJob(jobId);
        assertCompanyOwns(job, companyId);
        return applicationRepository.findByJobIdOrderedByPriority(jobId).stream()
                .map(this::mapToApplicationResponse).collect(Collectors.toList());
    }

    @Transactional
    public ApplicationResponse updateApplicationStatus(Integer companyId, Integer applicationId, ApplicationStatus status) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found."));
        assertCompanyOwns(application.getJob(), companyId);
        application.setStatus(status);
        applicationRepository.save(application);

        // ── Evaluate GET_ACCEPTED challenge on ACCEPTED status ───────────────
        // Fixed: was firing on SHORTLISTED — GET_ACCEPTED maps to ACCEPTED
        if (status == ApplicationStatus.SHORTLISTED) {
            challengeEvaluationService.evaluateAcceptance(application.getUser().getId());
        }

        return mapToApplicationResponse(application);
    }

    private void setJobFields(JobPosting job, CreateJobRequest r) {
        job.setTitle(r.getTitle());
        job.setDescription(r.getDescription());
        job.setLocation(r.getLocation());
        job.setJobType(r.getJobType());
        job.setSalaryRange(r.getSalaryRange());
        job.setDeadline(r.getDeadline());
        if (job.getStatus() == null) job.setStatus(JobStatus.ACTIVE);
    }

    private void saveJobSkills(JobPosting job, List<JobSkillRequest> skills) {
        if (skills == null) return;
        for (JobSkillRequest s : skills) {
            Skill skill = skillRepository.findById(s.getSkillId())
                    .orElseThrow(() -> new ResourceNotFoundException("Skill not found: " + s.getSkillId()));
            if (!skill.getIsActive()) throw new BadRequestException("Skill is inactive: " + skill.getName());
            JobSkillRequirement req = new JobSkillRequirement(job, skill, s.getImportance());
            jobSkillRequirementRepository.save(req);
        }
    }

    private JobPosting findJob(Integer jobId) {
        return jobPostingRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found."));
    }

    private void assertCompanyOwns(JobPosting job, Integer companyId) {
        if (!job.getCompany().getId().equals(companyId)) throw new ForbiddenException("Access denied.");
    }

    public JobPostingResponse mapToJobResponse(JobPosting job) {
        JobPostingResponse r = new JobPostingResponse();
        r.setId(job.getId());
        r.setCompanyId(job.getCompany().getId());
        r.setCompanyName(job.getCompany().getCompanyName());
        r.setTitle(job.getTitle());
        r.setDescription(job.getDescription());
        r.setLocation(job.getLocation());
        r.setJobType(job.getJobType());
        r.setSalaryRange(job.getSalaryRange());
        r.setDeadline(job.getDeadline());
        r.setStatus(job.getStatus());
        List<JobSkillRequirement> skills = jobSkillRequirementRepository.findByJobPostingId(job.getId());
        r.setRequiredSkills(skills.stream().map(s -> {
            JobSkillResponse js = new JobSkillResponse();
            js.setSkillId(s.getSkill().getId());
            js.setSkillName(s.getSkill().getName());
            js.setImportance(s.getImportance());
            return js;
        }).collect(Collectors.toList()));
        return r;
    }

    private ApplicationResponse mapToApplicationResponse(Application a) {
        ApplicationResponse r = new ApplicationResponse();
        r.setId(a.getId());
        r.setUserId(a.getUser().getId());
        r.setUserFullName(a.getUser().getFirstName() + " " + a.getUser().getLastName());
        r.setJobId(a.getJob().getId());
        r.setJobTitle(a.getJob().getTitle());
        r.setPrioritySlotRank(a.getPrioritySlotRank());
        r.setStatus(a.getStatus());
        r.setAppliedAt(a.getAppliedAt());
        return r;
    }
}