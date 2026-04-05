package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Question;
import com.example.xpandbackend.models.Enums.DifficultyLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Integer> {
    List<Question> findBySkillIdAndDifficultyLevel(Integer skillId, DifficultyLevel level);

    @Query(value = "SELECT * FROM question WHERE skill_id = :skillId AND difficulty_level = :level ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<Question> findRandomBySkillAndDifficulty(@Param("skillId") Integer skillId,
                                                   @Param("level") String level,
                                                   @Param("limit") int limit);
}
