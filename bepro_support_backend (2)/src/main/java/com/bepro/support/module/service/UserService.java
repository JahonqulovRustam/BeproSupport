package com.bepro.support.module.service;

import com.bepro.support.mapper.UserMapper;
import com.bepro.support.module.dto.request.UserRequest;
import com.bepro.support.module.dto.response.UserResponse;
import com.bepro.support.module.dto.update.UserUpdate;
import com.bepro.support.module.exeption.user.UserNotFoundException;
import com.bepro.support.module.exeption.user.UsernameAlreadyExistsException;
import com.bepro.support.module.model.User;
import com.bepro.support.module.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.hibernate.query.IllegalQueryOperationException;
import org.springframework.boot.autoconfigure.neo4j.Neo4jProperties;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return repository.findAll().stream()
                .map(UserMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        User user = repository.findById(id).orElseThrow(() -> new UserNotFoundException(id));
        return UserMapper.toResponse(user);
    }

    public UserResponse createUser(UserRequest request) {
        if (repository.existsByUsername(request.getUsername())){
            throw new UsernameAlreadyExistsException(request.getUsername());
        }
        User saved = repository.save(UserMapper.toEntity(request,passwordEncoder.encode(request.getPassword())));

        return UserMapper.toResponse(saved);
    }

    @Transactional
    public void deleteUser(Long id){
        User user = repository.findById(id).orElseThrow(()->new UserNotFoundException(id));
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        if (user.getUsername().equals(username)){
            throw new AccessDeniedException("You can't delete yourself");
        }
        repository.delete(user);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdate userUpdate){

        User user = repository.findById(id).orElseThrow(()->new UserNotFoundException(id));
        if (userUpdate.getFirstName() != null) user.setFirstName(userUpdate.getFirstName());
        if (userUpdate.getLastName() != null) user.setLastName(userUpdate.getLastName());
        if (userUpdate.getPassword() != null) user.setPassword(passwordEncoder.encode(userUpdate.getPassword()));

        return UserMapper.toResponse(user);
    }
}
