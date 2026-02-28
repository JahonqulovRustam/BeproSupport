package com.bepro.support.module.service;

import com.bepro.support.mapper.ModuleMapper;
import com.bepro.support.module.dto.request.ModuleRequest;
import com.bepro.support.module.dto.response.LessonResponse;
import com.bepro.support.module.dto.response.ModuleResponse;
import com.bepro.support.module.dto.response.QuestionResponse;
import com.bepro.support.module.exeption.module.ModuleAlreadyExistsException;
import com.bepro.support.module.exeption.module.ModuleNotFoundException;
import com.bepro.support.module.model.Lesson;
import com.bepro.support.module.model.SystemModule;
import com.bepro.support.module.repository.ModuleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ModuleService {
    @Autowired
    ModuleRepository moduleRepository;

    public ModuleResponse createModule(ModuleRequest request) {
        if (moduleRepository.existsByTitle(request.getTitle())) {
            throw new ModuleAlreadyExistsException(request.getTitle());
        }

        SystemModule module = ModuleMapper.toEntity(request);
        moduleRepository.save(module);
        return ModuleMapper.toResponse(module);
    }

    public List<ModuleResponse> getModules() {
        return moduleRepository.findAll().stream().map(ModuleMapper::toResponse).collect(Collectors.toList());
    }

    public ModuleResponse getModuleById(Long id) {

        SystemModule module = moduleRepository.findById(id).orElseThrow(() -> new ModuleNotFoundException(id));

        return ModuleMapper.toResponse(module);
    }
}
