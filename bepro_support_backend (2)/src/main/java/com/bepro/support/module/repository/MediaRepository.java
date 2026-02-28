package com.bepro.support.module.repository;

import com.bepro.support.module.dto.response.MediaResponse;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.Media;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MediaRepository extends JpaRepository<Media,Long> {
    List<Media> findAllByLesson(Lesson lesson);
}
