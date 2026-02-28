package com.bepro.support.module.repository;

import com.bepro.support.module.model.SystemModule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModuleRepository extends JpaRepository<SystemModule,Long>{
    boolean existsByTitle(String title);
}
