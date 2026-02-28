package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.QuestionRequest;
import com.bepro.support.module.dto.response.QuestionResponse;
import com.bepro.support.module.model.Question;

public class QuestionMapper {

    public static QuestionResponse toResponse(Question question){
        return new QuestionResponse(question.getId(), question.getText(), question.getOptions(), question.getCorrectAns());
    }

    public static Question toEntity(QuestionRequest request){
        return new Question(request.getText(), request.getOptions(), request.getCorrectAns());
    }
}
