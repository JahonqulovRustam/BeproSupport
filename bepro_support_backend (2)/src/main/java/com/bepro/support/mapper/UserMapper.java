package com.bepro.support.mapper;

import com.bepro.support.module.dto.request.UserRequest;
import com.bepro.support.module.dto.response.UserResponse;
import com.bepro.support.module.model.User;

public class UserMapper {

    public static UserResponse toResponse(User user){
        return new UserResponse(user.getId(), user.getFirstName(), user.getLastName(), user.getUsername(), user.getRole());
    }

    public static User toEntity(UserRequest request, String encodedPassword){
        return new User(request.getFirstName(), request.getLastName(), request.getUsername(), encodedPassword, request.getRole());
    }


}
