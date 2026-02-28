package com.bepro.support.module.exeption.media;

public class FileStoringException extends RuntimeException {
    public FileStoringException(String message) {

        super("Failed to store file !");
    }
}
