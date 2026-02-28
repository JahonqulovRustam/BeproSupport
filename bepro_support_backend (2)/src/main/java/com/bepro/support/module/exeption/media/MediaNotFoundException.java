package com.bepro.support.module.exeption.media;

public class MediaNotFoundException extends RuntimeException {
    public MediaNotFoundException(Long id) {
        super("This media not found ! ID="+id);
    }
}
