package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.UserPurchase;
import com.example.xpandbackend.models.Enums.ItemType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface UserPurchaseRepository extends JpaRepository<UserPurchase, Integer> {
    List<UserPurchase> findByUserId(Integer userId);
    List<UserPurchase> findByUserIdAndIsUsed(Integer userId, Boolean isUsed);

    @Query("SELECT p FROM UserPurchase p WHERE p.user.id = :userId AND p.item.itemType = :type AND p.isUsed = false")
    List<UserPurchase> findUnusedByUserAndType(@Param("userId") Integer userId, @Param("type") ItemType type);

    @Query("SELECT p FROM UserPurchase p WHERE p.user.id = :userId AND p.item.itemType = :type AND p.associatedJob.id = :jobId AND p.isUsed = false")
    Optional<UserPurchase> findUnusedByUserTypeAndJob(@Param("userId") Integer userId,
                                                      @Param("type") ItemType type,
                                                      @Param("jobId") Integer jobId);
}
