package com.example.xpandbackend.repository;
import com.example.xpandbackend.models.Certification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CertificationRepository extends JpaRepository<Certification, Integer> {
    List<Certification> findByUserId(Integer userId);

    long countByUserId(Integer userId);
}
