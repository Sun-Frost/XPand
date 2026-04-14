package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.JobSkillRequirement;
import com.example.xpandbackend.models.JobSkillRequirementId;
import com.example.xpandbackend.models.Enums.ImportanceLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobSkillRequirementRepository extends JpaRepository<JobSkillRequirement, JobSkillRequirementId> {
    List<JobSkillRequirement> findByJobPostingId(Integer jobId);
    List<JobSkillRequirement> findByJobPostingIdAndImportance(Integer jobId, ImportanceLevel importance);
    void deleteByJobPostingId(Integer jobId);
}
