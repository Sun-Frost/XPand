package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.XPTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface XPTransactionRepository extends JpaRepository<XPTransaction, Integer> {

    List<XPTransaction> findByUserIdOrderByCreatedAtDesc(Integer userId);

    /**
     * Returns the total absolute XP spent by a user across all store purchases.
     * Amounts are stored as negative integers for deductions, so we negate them.
     */
    @Query("SELECT COALESCE(SUM(ABS(t.amount)), 0) FROM XPTransaction t " +
            "WHERE t.user.id = :userId AND t.sourceType = 'STORE_PURCHASE' AND t.amount < 0")
    int sumXpSpentByUserId(@Param("userId") Integer userId);
}