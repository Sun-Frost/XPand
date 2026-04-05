package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.Challenge;
import com.example.xpandbackend.models.Enums.ChallengeType;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChallengeRepository extends JpaRepository<Challenge, Integer> {

    // Used by ChallengeEvaluationService — finds active challenges of a given type
    List<Challenge> findByTypeAndIsActiveTrue(ChallengeType type);
}