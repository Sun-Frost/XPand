package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.UserChallenge;
import com.example.xpandbackend.models.Enums.ChallengeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserChallengeRepository extends JpaRepository<UserChallenge, Integer> {

    List<UserChallenge> findByUserId(Integer userId);

    Optional<UserChallenge> findByUserIdAndChallengeId(Integer userId, Integer challengeId);

    // Used by evaluateMeta to count completed challenges
    long countByUserIdAndStatus(Integer userId, ChallengeStatus status);
}