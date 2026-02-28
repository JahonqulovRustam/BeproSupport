package com.bepro.support.module.service;

import com.bepro.support.mapper.LessonMapper;
import com.bepro.support.module.dto.request.LessonRequest;
import com.bepro.support.module.dto.request.QuestionRequest;
import com.bepro.support.module.dto.response.LessonResponse;
import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.dto.response.QuestionResponse;
import com.bepro.support.module.exeption.lesson.LessonNotFoundException;
import com.bepro.support.module.exeption.module.ModuleNotFoundException;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.Media;
import com.bepro.support.module.model.Question;
import com.bepro.support.module.model.SystemModule;
import com.bepro.support.module.repository.LessonRepository;
import com.bepro.support.module.repository.ModuleRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class LessonService {
    @Autowired
    LessonRepository repository;
    @Autowired
    ModuleRepository moduleRepository;
    @Autowired
    MediaService mediaService;

    public List<LessonResponse> getAllLessons() {
        return repository.findAll().stream().map(LessonMapper::toResponse).collect(Collectors.toList());
    }

    public LessonResponse createLesson(LessonRequest lessonRequest, List<MultipartFile> files) {

        SystemModule module = moduleRepository
                .findById(lessonRequest.getModuleId())
                .orElseThrow(() -> new ModuleNotFoundException(lessonRequest.getModuleId()));

        Lesson lesson = LessonMapper.toEntity(lessonRequest, module);
        lesson.getQuestions().forEach(question -> question.setLesson(lesson));
        lesson.getMedia().forEach(media -> media.setLesson(lesson));

        repository.save(lesson);

        if (files != null) {
            for (MultipartFile file : files) {
                if (!file.isEmpty()) {
                    mediaService.upload(file, lesson.getId());
                }
            }
        }

        return LessonMapper.toResponse(lesson);
    }

    public LessonResponse getLesson(Long id) {
        Lesson lesson = repository.findById(id).orElseThrow(() -> new LessonNotFoundException(id));
        return LessonMapper.toResponse(lesson);
    }

    public List<LessonResponse> getByModule(Long module_id) {
        SystemModule module = moduleRepository.findById(module_id).orElseThrow(()->new ModuleNotFoundException(module_id));
        return repository.findAllByModule(module).stream().map(LessonMapper::toResponse).collect(Collectors.toList());
    }
}
