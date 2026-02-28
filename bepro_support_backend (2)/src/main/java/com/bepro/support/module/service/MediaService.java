package com.bepro.support.module.service;

import com.bepro.support.mapper.MediaMapper;
import com.bepro.support.module.dto.request.ExternalMediaRequest;
import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.exeption.lesson.LessonNotFoundException;
import com.bepro.support.module.exeption.media.FileStoringException;
import com.bepro.support.module.exeption.media.MediaNotFoundException;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.Media;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import com.bepro.support.module.repository.LessonRepository;
import com.bepro.support.module.repository.MediaRepository;

import lombok.AllArgsConstructor;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.web.servlet.function.RequestPredicates.contentType;

@Service
@RequiredArgsConstructor
public class MediaService {
    private final MediaRepository mediaRepository;
    private final LessonRepository lessonRepository;

    @Value("${app.upload-dir}")
    private String uploadDir;

    @Transactional
    public MediaResponse addExternalMedia(
            Long lessonId,
            ExternalMediaRequest request
    ) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));

        Media media = new Media();
        media.setLesson(lesson);
        media.setType(request.getType());
        media.setExternalUrl(request.getExternalUrl());

        mediaRepository.save(media);

        return new MediaResponse(
                media.getId(),
                media.getType(),
                media.getExternalUrl()
        );
    }


    @Transactional
    public MediaResponse upload(
            MultipartFile file,
            Long lessonId
    ) {
        Lesson lesson = lessonRepository.findById(lessonId)
                .orElseThrow(() -> new LessonNotFoundException(lessonId));

        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        try {
            Path uploadRoot = Paths.get("uploads");
            Path lessonDir = uploadRoot.resolve("lessons").resolve("lesson-" + lesson.getId()).resolve(detectMediaType(file.getContentType()).toString());
            Files.createDirectories(lessonDir);

            String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
            Path filePath = lessonDir.resolve(filename);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            Media media = new Media();
            media.setLesson(lesson);
            media.setFilename(filename);
            media.setPath(filePath.toString());
            media.setSize(file.getSize());
            media.setContentType(file.getContentType());
            media.setType(detectMediaType(file.getContentType()));

            Media media1 = mediaRepository.save(media);

            return MediaMapper.toResponse(media1);

        } catch (IOException e) {
            throw new FileStoringException("Failed to store file");
        }
    }

    @Transactional(readOnly = true)
    public ResponseEntity<Resource> stream(Long id) {

        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new MediaNotFoundException(id));

        Path path = Paths.get(media.getPath());
        Resource resource = new FileSystemResource(path);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(media.getContentType()))
                .body(resource);

    }


    private com.bepro.support.module.model.MediaType detectMediaType(String contentType) {
        if (contentType == null) return com.bepro.support.module.model.MediaType.OTHER;

        if (contentType.startsWith("video")) return com.bepro.support.module.model.MediaType.VIDEO;
        if (contentType.startsWith("image")) return com.bepro.support.module.model.MediaType.IMAGE;

        return com.bepro.support.module.model.MediaType.OTHER;
    }


    public Path getFilePath(Long id) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found"));

        Path path = Paths.get(uploadDir)
                .resolve(media.getPath())
                .resolve(media.getFilename())
                .normalize();

        if (!Files.exists(path)) {
            throw new RuntimeException("File not found on disk: " + path);
        }

        return path;
    }


    public MediaType getMediaType(Path path) {
        try {
            // detect MIME type from file
            String mimeType = Files.probeContentType(path);
            if (mimeType != null) {
                return MediaType.parseMediaType(mimeType);
            }
            System.out.println(path);
        } catch (Exception e) {
            e.printStackTrace();
        }
        // fallback
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    public List<MediaResponse> getMediaMeta(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElseThrow(()->new LessonNotFoundException(lessonId));
        return mediaRepository.findAllByLesson(lesson).stream().map(MediaMapper::toResponse).collect(Collectors.toList());
    }

    public void deleteMedia(Long id) {
        Media media = mediaRepository.findById(id).orElseThrow(()->new MediaNotFoundException(id));
        if (media.getPath() != null){
            try{
                Path path = Paths.get(media.getPath());
                Files.deleteIfExists(path);
            } catch (IOException e) {
                throw new RuntimeException(e);
            }
        }
        mediaRepository.delete(media);
    }
}
