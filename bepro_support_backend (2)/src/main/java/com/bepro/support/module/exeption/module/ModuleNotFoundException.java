package com.bepro.support.module.exeption.module;

public class ModuleNotFoundException extends RuntimeException {
    public ModuleNotFoundException(Long id) {
        super("The module with given id not found : " + id);
    }
}
