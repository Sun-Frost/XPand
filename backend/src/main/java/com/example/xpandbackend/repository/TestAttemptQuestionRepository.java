package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.TestAttemptQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TestAttemptQuestionRepository extends JpaRepository<TestAttemptQuestion, Integer> {
    List<TestAttemptQuestion> findByTestAttemptId(Integer attemptId);
    void deleteByTestAttemptId(Integer attemptId);  // useful to keep
}
