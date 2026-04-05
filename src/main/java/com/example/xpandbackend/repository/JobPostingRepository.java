package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.JobPosting;
import com.example.xpandbackend.models.Enums.JobStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface JobPostingRepository extends JpaRepository<JobPosting, Integer> {
    List<JobPosting> findByCompanyId(Integer companyId);
    List<JobPosting> findByStatus(JobStatus status);

    @Query("SELECT j FROM JobPosting j WHERE j.status = 'ACTIVE' AND j.deadline > :now")
    List<JobPosting> findActiveJobs(@Param("now") LocalDateTime now);

    @Query("SELECT j FROM JobPosting j WHERE j.status = 'ACTIVE' AND j.deadline <= :now")
    List<JobPosting> findExpiredActiveJobs(@Param("now") LocalDateTime now);
}
