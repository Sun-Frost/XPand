// com/example/xpandbackend/repository/SavedJobRepository.java
package com.example.xpandbackend.repository;

import com.example.xpandbackend.models.SavedJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SavedJobRepository extends JpaRepository<SavedJob, Integer> {

    boolean existsByUserIdAndJobId(Integer userId, Integer jobId);

    Optional<SavedJob> findByUserIdAndJobId(Integer userId, Integer jobId);
}