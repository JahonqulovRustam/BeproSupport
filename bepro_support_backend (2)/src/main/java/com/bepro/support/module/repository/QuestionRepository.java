package com.bepro.support.module.repository;

import com.bepro.support.module.model.Question;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuestionRepository extends JpaRepository<Question,Long> {
}
