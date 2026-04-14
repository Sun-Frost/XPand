package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SkillRepository extends JpaRepository<Skill, Integer> {
    List<Skill> findByIsActive(Boolean isActive);
    Optional<Skill> findByNameIgnoreCase(String name);
    List<Skill> findByCategory(String category);
}
