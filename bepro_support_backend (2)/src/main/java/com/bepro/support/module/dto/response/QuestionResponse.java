package com.bepro.support.module.dto.response;

import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class QuestionResponse {
    private Long id;

    private String text;

    private List<String> options;

    private String correctAns;
}
