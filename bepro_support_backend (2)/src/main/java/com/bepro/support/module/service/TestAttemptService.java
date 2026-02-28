package com.bepro.support.module.service;


import com.bepro.support.mapper.TestAttemptMapper;
import com.bepro.support.module.dto.request.TestAttemptRequest;
import com.bepro.support.module.dto.response.TestAttemptResponse;
import com.bepro.support.module.exeption.lesson.LessonNotFoundException;
import com.bepro.support.module.exeption.user.UserNotFoundException;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.TestAttempt;
import com.bepro.support.module.model.User;
import com.bepro.support.module.repository.LessonRepository;
import com.bepro.support.module.repository.TestAttemptRepository;
import com.bepro.support.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TestAttemptService {
    private final UserRepository userRepository;
    private final LessonRepository lessonRepository;
    private final TestAttemptRepository testAttemptRepository;
    // getting last test attempts
    public List<TestAttemptResponse> getLastAttempts(){
        return testAttemptRepository.findAll().stream().map(TestAttemptMapper::toResponse).collect(Collectors.toList());
    }

    public List<TestAttemptResponse> getStandings(){
        return testAttemptRepository.findTop10ByOrderByScorePercentageDesc().stream().map(TestAttemptMapper::toResponse).collect(Collectors.toList());
    }

    public TestAttemptResponse addTestAttempt(TestAttemptRequest testAttemptRequest){
        User user = userRepository.findById(testAttemptRequest.getUserId()).orElseThrow(()-> new UserNotFoundException(testAttemptRequest.getUserId()));
        Lesson lesson = lessonRepository.findById(testAttemptRequest.getLessonId()).orElseThrow(()-> new LessonNotFoundException(testAttemptRequest.getLessonId()));
        TestAttempt testAttempt = TestAttemptMapper.toEntity(testAttemptRequest,lesson,user);
        testAttemptRepository.save(testAttempt);
        return TestAttemptMapper.toResponse(testAttempt);
    }

}
