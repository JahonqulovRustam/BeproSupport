package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.ModuleRequest;
import com.bepro.support.module.dto.response.ModuleResponse;
import com.bepro.support.module.service.ModuleService;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/modules")
@CrossOrigin()
public class ModuleController {
    @Autowired
    ModuleService moduleService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ModuleResponse> createModule(@Parameter(description = "Lesson JSON data", required = true) @RequestBody ModuleRequest moduleRequest){
        return ResponseEntity.ok(moduleService.createModule(moduleRequest));
    }

    @GetMapping
    public ResponseEntity<List<ModuleResponse>> getAll(){
        return ResponseEntity.ok(moduleService.getModules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ModuleResponse> getModule(@PathVariable Long id){
        return ResponseEntity.ok(moduleService.getModuleById(id));
    }
}
