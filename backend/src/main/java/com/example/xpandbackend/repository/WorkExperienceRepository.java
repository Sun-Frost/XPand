package com.example.xpandbackend.repository;
import com.example.xpandbackend.models.WorkExperience;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface WorkExperienceRepository extends JpaRepository<WorkExperience, Integer> {
    List<WorkExperience> findByUserId(Integer userId);
}
