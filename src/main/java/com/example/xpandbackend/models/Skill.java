package com.example.xpandbackend.models;

import jakarta.persistence.*;
import lombok.*;
import java.util.Set;

@Entity
@Table(name = "skill")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Skill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "skill_id")
    private Integer id;

    @Column(unique = true, nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Boolean isActive = true;

    @OneToMany(mappedBy = "skill")
    private Set<Question> questions;

    @OneToMany(mappedBy = "skill")
    private Set<UserSkillVerification> userVerifications;
}
