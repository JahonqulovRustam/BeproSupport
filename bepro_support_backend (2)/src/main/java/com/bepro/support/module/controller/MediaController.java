package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.ExternalMediaRequest;
import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.model.Media;
import com.bepro.support.module.service.MediaService;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@CrossOrigin(
        origins = "http://localhost:5173",
        allowCredentials = "true"
)
public class MediaController {

    private final MediaService mediaService;

    @PostMapping("/external")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Posting public link of media")
    public MediaResponse addExternal(
            @RequestParam Long lessonId,
            @RequestBody ExternalMediaRequest request
    ) {
        return mediaService.addExternalMedia(lessonId, request);
    }


    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload lesson media")
    public MediaResponse upload(
            @Parameter(description = "File to upload", required = true, content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "multipart/form-data"))
            @RequestParam MultipartFile file,
            @Parameter(description = "Lesson ID", required = true)
            @RequestParam Long lessonId
    ) {
        return mediaService.upload(file, lessonId);
    }

    @GetMapping("/stream/{id}")
    @Operation(summary = "Stream media with id = {id}")
    public ResponseEntity<Resource> stream(@PathVariable Long id) {
        Path path = mediaService.getFilePath(id); // your existing logic
        Resource resource = new FileSystemResource(path.toFile());

        return ResponseEntity.ok()
                .contentType(mediaService.getMediaType(path))
                .body(resource);
    }

    @GetMapping("/{lesson_id}")
    @Operation(summary = "Get media metadata, belongs to lesson with id = {lesson_id}")
    public ResponseEntity<List<MediaResponse>> getMediaMeta(@PathVariable Long lesson_id){
        return ResponseEntity.ok(mediaService.getMediaMeta(lesson_id));
    }


    @DeleteMapping("/{id}")
    @Operation(summary = "Deleting the media id = {id}")
    public ResponseEntity<Void> deleteMedia(@PathVariable Long id){
        mediaService.deleteMedia(id);
        return ResponseEntity.noContent().build();
    }


}
