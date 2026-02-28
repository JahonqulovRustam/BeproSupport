package com.bepro.support.module.model;

import com.bepro.support.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitRunner implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        if (!userRepository.existsByUsername("admin")) {
            User admin = new User(
                    "Admin",
                    "Root",
                    "admin",
                    passwordEncoder.encode("admin123"),
                    UserRole.ADMIN
            );
            userRepository.save(admin);
        }
    }
}

