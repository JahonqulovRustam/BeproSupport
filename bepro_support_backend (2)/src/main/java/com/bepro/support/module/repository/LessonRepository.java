package com.bepro.support.module.repository;

import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.SystemModule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LessonRepository extends JpaRepository<Lesson, Long> {
    List<Lesson> findAllByModule(SystemModule module);
}
