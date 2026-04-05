package com.example.xpandbackend.repository;
import com.example.xpandbackend.models.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface ProjectRepository extends JpaRepository<Project, Integer> {
    List<Project> findByUserId(Integer userId);
    @Query("SELECT COUNT(ps) FROM ProjectSkill ps WHERE ps.project.user.id = :userId AND ps.skill.id = :skillId")
    long countProjectsByUserAndSkill(@Param("userId") Integer userId, @Param("skillId") Integer skillId);

    long countByUserId(Integer userId);
}
