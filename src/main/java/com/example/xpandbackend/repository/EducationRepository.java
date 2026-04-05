package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Education;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface EducationRepository extends JpaRepository<Education, Integer> {
    List<Education> findByUserId(Integer userId);
}
