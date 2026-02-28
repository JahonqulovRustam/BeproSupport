package com.bepro.support;

import com.bepro.support.module.model.*;
import com.bepro.support.module.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class DataLoader implements CommandLineRunner {

    private final UserRepository userRepository;
    private final ModuleRepository moduleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (userRepository.count() == 0) {
            User admin = new User();
            admin.setFirstName("Super");
            admin.setLastName("Admin");
            admin.setUsername("superadmin");
            admin.setPassword(passwordEncoder.encode("123"));
            admin.setRole(UserRole.ADMIN);
            userRepository.save(admin);

            User adminStd = new User();
            adminStd.setFirstName("Std");
            adminStd.setLastName("Admin");
            adminStd.setUsername("admin");
            adminStd.setPassword(passwordEncoder.encode("admin"));
            adminStd.setRole(UserRole.ADMIN);
            userRepository.save(adminStd);

            System.out.println("DataLoader: Users created successfully");
        }

        if (moduleRepository.count() == 0) {
            SystemModule module = new SystemModule();
            module.setTitle("Java Backend");
            module.setDescription("Java Spring Boot asoslari");
            module.setLessons(new ArrayList<>());

            moduleRepository.save(module);
        }
    }
}
