package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.ReadinessReport;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ReadinessReportRepository extends JpaRepository<ReadinessReport, Integer> {
    Optional<ReadinessReport> findByPurchaseId(Integer purchaseId);
}
