package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.Question;
import com.bepro.support.module.model.SystemModule;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter @Setter
@AllArgsConstructor @NoArgsConstructor
public class LessonResponse {
    private Long id;

    private String title;

    private String description;

    private List<QuestionResponse> questions;

    private Long module;

    // only external media URLs
    private List<MediaResponse> media;
}
