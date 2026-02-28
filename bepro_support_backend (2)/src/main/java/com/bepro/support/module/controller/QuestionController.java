package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.QuestionRequest;
import com.bepro.support.module.dto.response.QuestionResponse;
import com.bepro.support.module.service.QuestionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController()
@RequestMapping("/api/questions")
@CrossOrigin()
public class QuestionController {

    @Autowired
    QuestionService service;

    @PostMapping()
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<QuestionResponse> createQuestion(@RequestBody QuestionRequest request){
        return ResponseEntity.ok(service.createQuestion(request));
    }

    @GetMapping
    public ResponseEntity<List<QuestionResponse>> getALl(){
        return ResponseEntity.ok(service.getAllQuestions());
    }
}
