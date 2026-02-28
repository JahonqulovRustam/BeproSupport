package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.LessonRequest;
import com.bepro.support.module.dto.response.ExternalMediaResponse;
import com.bepro.support.module.dto.response.LessonResponse;
import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.SystemModule;

import java.util.List;
import java.util.stream.Collectors;

public class LessonMapper {

    public static LessonResponse toResponse(Lesson lesson){
        List<MediaResponse> externalMedia = lesson.getMedia().stream().map(MediaMapper::toResponse).collect(Collectors.toList());
        return new LessonResponse(
                lesson.getId(),
                lesson.getTitle(),
                lesson.getDescription(),
                lesson.getQuestions().stream().map(QuestionMapper::toResponse).collect(Collectors.toList()),
                lesson.getModule().getId(),
                externalMedia);
    }

    public static Lesson toEntity(LessonRequest request, SystemModule module){
        return new Lesson(
                request.getTitle(),
                request.getDescription(),
                request.getQuestions().stream().map(QuestionMapper::toEntity).collect(Collectors.toList()),
                module,
                request.getExternalMedia().stream().map(MediaMapper::toEntity).collect(Collectors.toList()));
    }
}
