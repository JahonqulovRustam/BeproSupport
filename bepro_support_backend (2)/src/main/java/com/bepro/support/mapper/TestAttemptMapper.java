package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.TestAttemptRequest;
import com.bepro.support.module.dto.response.TestAttemptResponse;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.TestAttempt;
import com.bepro.support.module.model.User;

public class TestAttemptMapper {
    static int PASSING_PERCENTAGE = 80;
    public static TestAttempt toEntity(TestAttemptRequest request, Lesson lesson, User user){
        TestAttempt testAttempt = new TestAttempt();
        testAttempt.setUser(user);
        testAttempt.setLesson(lesson);
        testAttempt.setTotalQuestions(request.getTotalQuestions());
        testAttempt.setCorrectAnswers(request.getCorrectAnswers());
        double percentage = (double) request.getCorrectAnswers() * 100 / request.getTotalQuestions();
        testAttempt.setScorePercentage(percentage);
        testAttempt.setPassed(percentage >= PASSING_PERCENTAGE);
        testAttempt.setStartedAt(request.getStartedAt());
        testAttempt.setSubmittedAt(request.getSubmittedAt());
        return testAttempt;
    }

    public static TestAttemptResponse toResponse(TestAttempt testAttempt){
        return new TestAttemptResponse(
                testAttempt.getId(),
                testAttempt.getUser().getId(),
                testAttempt.getLesson().getId(),
                testAttempt.getTotalQuestions(),
                testAttempt.getCorrectAnswers(),
                testAttempt.getScorePercentage(),
                testAttempt.getPassed(),
                testAttempt.getStartedAt(),
                testAttempt.getSubmittedAt());
    }
}
