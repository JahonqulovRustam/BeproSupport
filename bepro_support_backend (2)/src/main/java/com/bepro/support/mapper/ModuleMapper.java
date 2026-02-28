package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.ModuleRequest;
import com.bepro.support.module.dto.response.ModuleResponse;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.SystemModule;

import java.util.ArrayList;
import java.util.stream.Collectors;

public class ModuleMapper {
    public static ModuleResponse toResponse(SystemModule module){
        return new ModuleResponse(module.getId(), module.getTitle(), module.getDescription(), module.getLessons().stream().map(LessonMapper::toResponse).collect(Collectors.toList()));
    }

    public static SystemModule toEntity(ModuleRequest request){
        return new SystemModule(
                request.getTitle(),
                request.getDescription(),
                new ArrayList<Lesson>()
        );
    }
}
