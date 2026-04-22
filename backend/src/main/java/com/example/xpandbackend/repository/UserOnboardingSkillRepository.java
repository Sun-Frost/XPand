package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.UserOnboardingSkill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserOnboardingSkillRepository extends JpaRepository<UserOnboardingSkill, Integer> {

    List<UserOnboardingSkill> findByUserId(Integer userId);

    boolean existsByUserIdAndSkillId(Integer userId, Integer skillId);

    @Query("SELECT o.skill.id FROM UserOnboardingSkill o WHERE o.user.id = :userId")
    List<Integer> findSkillIdsByUserId(@Param("userId") Integer userId);
}