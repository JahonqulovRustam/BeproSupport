package com.bepro.support.module.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor @AllArgsConstructor
public class QuestionRequest {
    private String text;
    private List<String> options;
    private String correctAns;
}
