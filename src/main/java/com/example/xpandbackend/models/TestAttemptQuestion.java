package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "test_attempt_question")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TestAttemptQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;  // ← new surrogate PK

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attempt_id", referencedColumnName = "attempt_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private TestAttempt testAttempt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", referencedColumnName = "question_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Question question;

    @Column(length = 1)
    private String userAnswer;

    private Boolean isCorrect;
}