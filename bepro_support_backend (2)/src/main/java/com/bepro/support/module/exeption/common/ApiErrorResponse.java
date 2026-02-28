package com.bepro.support.module.exeption.common;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ApiErrorResponse {
    String message;
    int status;
    LocalDateTime timestamp;
}
