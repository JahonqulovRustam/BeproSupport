package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.Lesson;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ModuleResponse {
    private Long id;

    private String title;

    private String description;

    private List<LessonResponse> lessons;
}
