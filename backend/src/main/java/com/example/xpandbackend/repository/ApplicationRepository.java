package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ApplicationRepository extends JpaRepository<Application, Integer> {
    Optional<Application> findByUserIdAndJobId(Integer userId, Integer jobId);
    List<Application> findByUserId(Integer userId);
    List<Application> findByJobId(Integer jobId);
    boolean existsByUserIdAndJobId(Integer userId, Integer jobId);
    int countByUserId(Integer userId);
    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.id = :jobId AND a.prioritySlotRank IS NOT NULL AND a.status != 'WITHDRAWN'")
    long countActivePrioritySlots(@Param("jobId") Integer jobId);

    @Query("SELECT a FROM Application a WHERE a.job.id = :jobId ORDER BY CASE WHEN a.prioritySlotRank IS NOT NULL THEN 0 ELSE 1 END, a.prioritySlotRank ASC, a.appliedAt ASC")
    List<Application> findByJobIdOrderedByPriority(@Param("jobId") Integer jobId);

    @Query("""
    SELECT COUNT(a) > 0 
    FROM Application a 
    WHERE a.user.id = :userId 
    AND a.job.company.id = :companyId
""")
    boolean existsByCompanyIdAndUserId(@Param("companyId") Integer companyId,
                                       @Param("userId") Integer userId);

    @Query("SELECT a FROM Application a WHERE a.job.company.id = :companyId AND a.user.id = :userId")
    List<Application> findByCompanyIdAndUserId(
            @Param("companyId") Integer companyId,
            @Param("userId") Integer userId);

    boolean existsByJobIdAndPrioritySlotRank(Integer jobId, Integer prioritySlotRank);




}
