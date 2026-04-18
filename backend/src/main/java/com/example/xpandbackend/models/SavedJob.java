// com/example/xpandbackend/models/SavedJob.java
package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "saved_jobs",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "job_id"})
)
@Getter @Setter @NoArgsConstructor
public class SavedJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPosting job;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime savedAt;
}