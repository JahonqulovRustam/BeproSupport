package com.bepro.support.module.service;

import com.bepro.support.mapper.QuestionMapper;
import com.bepro.support.module.dto.request.QuestionRequest;
import com.bepro.support.module.dto.response.QuestionResponse;
import com.bepro.support.module.model.Question;
import com.bepro.support.module.repository.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class QuestionService {
    @Autowired
    QuestionRepository repository;

    public QuestionResponse createQuestion(QuestionRequest questionRequest){
        Question question = QuestionMapper.toEntity(questionRequest);
        repository.save(question);
        return QuestionMapper.toResponse(question);
    }

    public List<QuestionResponse> getAllQuestions(){
        return repository.findAll().stream().map(QuestionMapper::toResponse).collect(Collectors.toList());
    }
}
