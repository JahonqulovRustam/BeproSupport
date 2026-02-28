package com.bepro.support.module.service;

import com.bepro.support.module.exeption.user.UserNotFoundException;
import com.bepro.support.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import com.bepro.support.module.model.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;
    @Override
    public UserDetails loadUserByUsername(String username)
            throws UserNotFoundException {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() ->
                        new UserNotFoundException(username));

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getUsername())
                .password(user.getPassword())
                .roles(user.getRole().name())// ADMIN / USER
                .build();
    }
}
