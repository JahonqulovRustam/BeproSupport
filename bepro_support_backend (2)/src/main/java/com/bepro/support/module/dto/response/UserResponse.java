package com.bepro.support.module.dto.response;

import com.bepro.support.module.model.UserRole;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class UserResponse {
    private Long id;

    private String firstName;
    private String lastName;
    private String username;
    private UserRole role;
}
