package com.bepro.support.module.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor @Getter @Setter
public class TestAttemptRequest {
    @NotNull
    @Positive
    private Long userId;
    @NotNull
    @Positive
    private Long lessonId;
    @Min(1)
    private Integer totalQuestions;
    private Integer correctAnswers;
    @NotNull
    private LocalDateTime startedAt;
    @NotNull
    private LocalDateTime submittedAt;
}
