package com.example.xpandbackend.config;

import com.example.xpandbackend.models.JobPosting;
import com.example.xpandbackend.models.Enums.JobStatus;
import com.example.xpandbackend.repository.JobPostingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Background scheduler that automatically expires job postings once their deadline passes.
 *
 * <p>Runs every hour. Any {@code ACTIVE} job whose {@code deadline} is in the past
 * is transitioned to {@code EXPIRED}. Expired jobs no longer appear in the public
 * job listing and cannot accept new applications.</p>
 */
@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class JobExpiryScheduler {

    private final JobPostingRepository jobPostingRepository;

    /** Checks for and expires overdue active jobs. Runs every 60 minutes. */
    @Scheduled(fixedRate = 3600000)
    @Transactional
    public void expireJobs() {
        List<JobPosting> expired = jobPostingRepository.findExpiredActiveJobs(LocalDateTime.now());
        if (!expired.isEmpty()) {
            expired.forEach(j -> j.setStatus(JobStatus.EXPIRED));
            jobPostingRepository.saveAll(expired);
            log.info("Expired {} job postings.", expired.size());
        }
    }
}