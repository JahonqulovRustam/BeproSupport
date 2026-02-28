package com.bepro.support.module.exeption.user;

public class UsernameAlreadyExistsException extends RuntimeException{
    public UsernameAlreadyExistsException(String username){
        super("User with this username already in use : " + username);
    }
}
