package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.UserSkillVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserSkillVerificationRepository extends JpaRepository<UserSkillVerification, Integer> {

    @Query("SELECT v FROM UserSkillVerification v WHERE v.user.id = :userId AND v.skill.id = :skillId ORDER BY v.id ASC")
    List<UserSkillVerification> findAllByUserIdAndSkillId(
            @Param("userId") Integer userId,
            @Param("skillId") Integer skillId
    );

    default Optional<UserSkillVerification> findByUserIdAndSkillId(Integer userId, Integer skillId) {
        List<UserSkillVerification> results = findAllByUserIdAndSkillId(userId, skillId);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    List<UserSkillVerification> findByUserId(Integer userId);

    @Query("SELECT COUNT(DISTINCT v.skill.category) FROM UserSkillVerification v WHERE v.user.id = :userId AND v.currentBadge IS NOT NULL")
    long countDistinctCategoriesByUserId(@Param("userId") Integer userId);

    @Query("SELECT v FROM UserSkillVerification v WHERE v.user.id = :userId AND v.currentBadge IS NOT NULL")
    List<UserSkillVerification> findVerifiedByUserId(@Param("userId") Integer userId);
}
