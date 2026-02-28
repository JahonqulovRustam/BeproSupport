package com.bepro.support.module.exeption.lesson;

public class LessonNotFoundException extends RuntimeException {

    public LessonNotFoundException(Long id) {

        super("Lesson with given " + id + " id not found !");
    }
}
