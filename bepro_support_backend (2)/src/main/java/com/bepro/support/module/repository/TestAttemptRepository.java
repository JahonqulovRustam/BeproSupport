package com.bepro.support.module.repository;

import com.bepro.support.module.model.TestAttempt;
import com.bepro.support.module.service.MediaService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TestAttemptRepository extends JpaRepository<TestAttempt,Long> {
    List<TestAttempt> findTop10ByOrderByScorePercentageDesc();

}
