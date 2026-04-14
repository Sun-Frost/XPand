package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.TestAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestAttemptRepository extends JpaRepository<TestAttempt, Integer> {
    List<TestAttempt> findByUserIdAndSkillId(Integer userId, Integer skillId);
    List<TestAttempt> findByUserId(Integer userId);
}
