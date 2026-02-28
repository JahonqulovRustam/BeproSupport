package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.TestAttemptRequest;
import com.bepro.support.module.dto.response.TestAttemptResponse;
import com.bepro.support.module.service.TestAttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/testAttempts")
@RequiredArgsConstructor
@CrossOrigin
public class TestAttemptController {
    private final TestAttemptService testAttemptService;
    @GetMapping()
    public ResponseEntity<List<TestAttemptResponse>> getLastAttempts(){
        return ResponseEntity.ok(testAttemptService.getLastAttempts());
    }

    @GetMapping("/standing")
    public ResponseEntity<List<TestAttemptResponse>> getStandings(){
        return ResponseEntity.ok(testAttemptService.getStandings());
    }

    @PostMapping
    public TestAttemptResponse addTestAttempt(@RequestBody @Valid TestAttemptRequest testAttemptRequest){
        return testAttemptService.addTestAttempt(testAttemptRequest);
    }
}
