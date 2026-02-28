package com.bepro.support.module.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "test_attempts")
@Getter
@NoArgsConstructor
@Setter
public class TestAttempt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // who took the test
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    // which lesson/test
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Lesson lesson;

    private Integer totalQuestions;
    private Integer correctAnswers;

    // 0–100
    private Double scorePercentage;

    private Boolean passed;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

    // optional: prevent modification after submit
    public boolean isCompleted() {
        return submittedAt != null;
    }
}
