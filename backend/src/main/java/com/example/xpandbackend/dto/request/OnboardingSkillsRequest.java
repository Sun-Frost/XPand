package com.example.xpandbackend.dto.request;

import lombok.Data;
import java.util.List;

/**
 * Payload sent by the frontend after registration step 3.
 * Contains skill IDs the user self-reported knowing.
 * These are stored so the Skills Library can prompt the user to verify them.
 */
@Data
public class OnboardingSkillsRequest {
    private List<Integer> skillIds;
}