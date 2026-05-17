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

/**
 * Manages job postings, applications, and saved jobs.
 *
 * <h3>Applying to a job</h3>
 * A user may only apply if they hold a verified badge for every MAJOR skill
 * required by the job. An optional {@code priorityPurchaseId} redeems a
 * previously purchased {@code PRIORITY_SLOT} voucher to rank the application
 * at position 1, 2, or 3 in the company's applicant list.
 *
 * <h3>Deadline gate</h3>
 * Companies may not change an application's status until the job deadline has
 * passed. This ensures all applications are collected before decisions are made.
 * Similarly, applicant CVs are locked behind the deadline in {@code CompanyService}.
 */
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
    private final SavedJobRepository savedJobRepository;

    // ── Saved jobs ────────────────────────────────────────────────────────────

    /** Returns whether the given job is saved by the user. */
    public Map<String, Boolean> isJobSaved(Integer userId, Integer jobId) {
        return Map.of("saved", savedJobRepository.existsByUserIdAndJobId(userId, jobId));
    }

    /** Saves a job for the user. Idempotent — silently ignores duplicate saves. */
    @Transactional
    public void saveJob(Integer userId, Integer jobId) {
        if (savedJobRepository.existsByUserIdAndJobId(userId, jobId)) return;

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
        JobPosting job = findJob(jobId);

        SavedJob savedJob = new SavedJob();
        savedJob.setUser(user);
        savedJob.setJob(job);
        savedJobRepository.save(savedJob);
    }

    /** Removes a saved job. Silently succeeds if the job was not saved. */
    @Transactional
    public void unsaveJob(Integer userId, Integer jobId) {
        savedJobRepository.findByUserIdAndJobId(userId, jobId)
                .ifPresent(savedJobRepository::delete);
    }

    // ── Job postings ──────────────────────────────────────────────────────────

    /** Returns all active jobs whose deadline is in the future. */
    public List<JobPostingResponse> getActiveJobs() {
        return jobPostingRepository.findActiveJobs(LocalDateTime.now()).stream()
                .map(this::mapToJobResponse).collect(Collectors.toList());
    }

    public JobPostingResponse getJobById(Integer jobId) {
        return mapToJobResponse(findJob(jobId));
    }

    /** Returns the number of non-withdrawn priority-slot applications for a job. */
    public long getActivePrioritySlotCount(Integer jobId) {
        return applicationRepository.countActivePrioritySlots(jobId);
    }

    public List<JobPostingResponse> getCompanyJobs(Integer companyId) {
        return jobPostingRepository.findByCompanyId(companyId).stream()
                .map(this::mapToJobResponse).collect(Collectors.toList());
    }

    /**
     * Creates a new job posting. Requires at least one MAJOR skill and a deadline.
     * The company must be admin-approved.
     */
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

    /**
     * Updates an existing job posting. Expired jobs cannot be edited.
     * Skill requirements are replaced entirely on each update.
     */
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

    /** Soft-deletes a job by setting its status to CLOSED. */
    @Transactional
    public void deleteJob(Integer companyId, Integer jobId) {
        JobPosting job = findJob(jobId);
        assertCompanyOwns(job, companyId);
        job.setStatus(JobStatus.CLOSED);
        jobPostingRepository.save(job);
    }

    // ── Applications ──────────────────────────────────────────────────────────

    /**
     * Submits a job application. Validates that:
     * <ul>
     *   <li>The job is ACTIVE and the deadline has not passed.</li>
     *   <li>The user has not already applied.</li>
     *   <li>The user holds a verified badge for every MAJOR required skill.</li>
     * </ul>
     * If {@code priorityPurchaseId} is provided, the corresponding purchase is
     * validated and marked as used, and the application is ranked at the slot's position.
     */
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

        List<JobSkillRequirement> majorSkills = jobSkillRequirementRepository
                .findByJobPostingIdAndImportance(request.getJobId(), ImportanceLevel.MAJOR);

        for (JobSkillRequirement req : majorSkills) {
            boolean hasBadge = verificationRepository
                    .findByUserIdAndSkillId(userId, req.getSkill().getId())
                    .stream().findFirst()
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

        if (request.getPriorityPurchaseId() != null) {
            UserPurchase purchase = userPurchaseRepository.findById(request.getPriorityPurchaseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Purchase not found."));
            if (!purchase.getUser().getId().equals(userId)) throw new ForbiddenException("Access denied.");
            if (purchase.getIsUsed()) throw new BadRequestException("This priority slot has already been used.");
            if (!purchase.getItem().getItemType().equals(ItemType.PRIORITY_SLOT)) {
                throw new BadRequestException("Invalid purchase type for priority slot.");
            }
            // Vouchers purchased without a job can be used on any job.
            // Vouchers pre-associated with a specific job are restricted to that job.
            if (purchase.getAssociatedJob() != null
                    && !purchase.getAssociatedJob().getId().equals(request.getJobId())) {
                throw new BadRequestException("Priority slot is for a different job.");
            }

            SlotRank slotRank = purchase.getSlotRank();
            if (slotRank == null) throw new BadRequestException("Purchase has no slot rank.");
            int rank = switch (slotRank) {
                case FIRST  -> 1;
                case SECOND -> 2;
                case THIRD  -> 3;
            };

            if (applicationRepository.existsByJobIdAndPrioritySlotRank(request.getJobId(), rank)) {
                throw new BadRequestException("Priority slot rank " + rank + " is already taken for this job.");
            }

            application.setPrioritySlotRank(rank);
            purchase.setIsUsed(true);
            userPurchaseRepository.save(purchase);
        }

        applicationRepository.save(application);

        int totalApplications = applicationRepository.countByUserId(userId);
        boolean hasGoldBadge = verificationRepository.findVerifiedByUserId(userId).stream()
                .anyMatch(v -> v.getCurrentBadge() == BadgeLevel.GOLD);
        challengeEvaluationService.evaluateJobApplication(userId, totalApplications, hasGoldBadge);

        return mapToApplicationResponse(application);
    }

    /**
     * Withdraws an application. Only allowed before the job deadline.
     * Once withdrawn, the application cannot be re-submitted.
     */
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

    /**
     * Returns applications for a job, ordered by priority slot rank then apply date.
     * Only the owning company can call this.
     */
    public List<ApplicationResponse> getJobApplications(Integer companyId, Integer jobId) {
        JobPosting job = findJob(jobId);
        assertCompanyOwns(job, companyId);
        return applicationRepository.findByJobIdOrderedByPriority(jobId).stream()
                .map(this::mapToApplicationResponse).collect(Collectors.toList());
    }

    /**
     * Updates an application's status. Blocked until the job deadline has passed.
     * Triggers {@code GET_ACCEPTED} challenge evaluation when status is SHORTLISTED.
     */
    @Transactional
    public ApplicationResponse updateApplicationStatus(Integer companyId, Integer applicationId,
                                                       ApplicationStatus status) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found."));
        assertCompanyOwns(application.getJob(), companyId);

        if (application.getJob().getDeadline() != null
                && application.getJob().getDeadline().isAfter(LocalDateTime.now())) {
            throw new ForbiddenException("Decisions locked until deadline.");
        }

        application.setStatus(status);
        applicationRepository.save(application);

        if (status == ApplicationStatus.SHORTLISTED) {
            challengeEvaluationService.evaluateAcceptance(application.getUser().getId());
        }

        return mapToApplicationResponse(application);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

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
            jobSkillRequirementRepository.save(new JobSkillRequirement(job, skill, s.getImportance()));
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