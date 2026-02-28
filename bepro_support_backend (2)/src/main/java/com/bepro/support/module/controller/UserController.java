package com.bepro.support.module.controller;

import com.bepro.support.module.dto.request.UserRequest;
import com.bepro.support.module.dto.response.UserResponse;
import com.bepro.support.module.dto.update.UserUpdate;
import com.bepro.support.module.model.User;
import com.bepro.support.module.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@CrossOrigin()
public class UserController {
    private final UserService service;
    UserController(UserService service){
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAll(){
        return ResponseEntity.ok(service.getAllUsers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id){
        return ResponseEntity.ok(service.getUserById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse addUser(@RequestBody UserRequest userRequest){
        return service.createUser(userRequest);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@RequestParam Long id){
        service.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == authentication.principal.id")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody UserUpdate userUpdate){
        UserResponse userResponse = service.updateUser(id,userUpdate);
        return ResponseEntity.ok(userResponse);
    }
}
