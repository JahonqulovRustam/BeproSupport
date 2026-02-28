package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.LessonRequest;
import com.bepro.support.module.dto.response.LessonResponse;
import com.bepro.support.module.service.LessonService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/lessons")
@CrossOrigin()
@RequiredArgsConstructor
public class LessonController {
    private final LessonService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Dars qo'shish")
    public ResponseEntity<LessonResponse> createLesson(
            @Parameter(description = "Lesson JSON data", required = true)
            @RequestPart("lesson") LessonRequest request,        // JSON part

            @Parameter(description = "Lesson files", required = false, content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "multipart/form-data"))
            @RequestPart(value = "file", required = false) List<MultipartFile> files // file part
    ) {
        return ResponseEntity.ok(service.createLesson(request, files));
    }


    @GetMapping
    @Operation(summary = "Barcha darslar")
    public ResponseEntity<List<LessonResponse>> getAll(@RequestParam(required = false) Long module_id) {
        if (module_id != null) {
            return ResponseEntity.ok(service.getByModule(module_id));
        }
        return ResponseEntity.ok(service.getAllLessons());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Modulga tegishli darslar")
    public ResponseEntity<LessonResponse> getByModule(@PathVariable Long id) {
        return ResponseEntity.ok(service.getLesson(id));
    }

}
