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

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class JobExpiryScheduler {

    private final JobPostingRepository jobPostingRepository;

    @Scheduled(fixedRate = 3600000) // every hour
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
