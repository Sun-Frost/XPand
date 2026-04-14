package com.example.xpandbackend.repository;
import com.example.xpandbackend.models.ProjectSkill;
import com.example.xpandbackend.models.ProjectSkillId;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProjectSkillRepository extends JpaRepository<ProjectSkill, ProjectSkillId> {
    List<ProjectSkill> findByProjectId(Integer projectId);
    void deleteByProjectId(Integer projectId);
}
