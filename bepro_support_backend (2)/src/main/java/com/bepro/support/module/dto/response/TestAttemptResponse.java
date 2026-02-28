package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@NoArgsConstructor
@Getter
@Setter
@AllArgsConstructor
public class TestAttemptResponse {
    private Long id;
    private Long userId;
    private Long lessonId;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private Double scorePercentage;

    private Boolean passed;

    private LocalDateTime startedAt;
    private LocalDateTime submittedAt;

}