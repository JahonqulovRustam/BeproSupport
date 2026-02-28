package com.bepro.support.module.exeption.module;

public class ModuleAlreadyExistsException extends RuntimeException {
    public ModuleAlreadyExistsException(String message) {

        super("Thw module with the same title exists : " +message);
    }
    public ModuleAlreadyExistsException(Long id) {

        super("Thw module with the same title exists : " + id);
    }
}
