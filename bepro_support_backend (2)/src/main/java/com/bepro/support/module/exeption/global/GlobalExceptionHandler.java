package com.bepro.support.module.exeption.global;

import com.bepro.support.module.exeption.auth.InvalidCredentialsException;
import com.bepro.support.module.exeption.common.ApiErrorResponse;
import com.bepro.support.module.exeption.lesson.LessonNotFoundException;
import com.bepro.support.module.exeption.media.MediaNotFoundException;
import com.bepro.support.module.exeption.module.ModuleAlreadyExistsException;
import com.bepro.support.module.exeption.module.ModuleNotFoundException;
import com.bepro.support.module.exeption.user.UserNotFoundException;
import com.bepro.support.module.exeption.user.UsernameAlreadyExistsException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(LessonNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleLessonNotFound(LessonNotFoundException ex){
        return buildError(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(ModuleAlreadyExistsException.class)
    public ResponseEntity<ApiErrorResponse> handleModuleAlreadyExistsExeption(ModuleAlreadyExistsException ex){
        return buildError(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(ModuleNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleModuleNotFoundException(ModuleNotFoundException ex){
        return buildError(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(UsernameAlreadyExistsException.class)
    public ResponseEntity<ApiErrorResponse> handleUsernameAlreadyExistsException(UsernameAlreadyExistsException ex){
        return buildError(ex.getMessage(), HttpStatus.CONFLICT);
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleUserNotFoundException(UserNotFoundException ex){
        return buildError(ex.getMessage(), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidCredentialsException(InvalidCredentialsException ex){
        return buildError(ex.getMessage(), HttpStatus.UNAUTHORIZED);
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return buildError(
                "You are not allowed to perform this action",
                HttpStatus.FORBIDDEN
        );
    }

    @ExceptionHandler(MediaNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaNotFoundException(MediaNotFoundException exception){
        return buildError("Media not found !",HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ApiErrorResponse> handleJsonParseError(HttpMessageNotReadableException ex) {

        return buildError(
                "Invalid JSON format. Please check request body : " + ex.getMostSpecificCause(),
                HttpStatus.BAD_REQUEST
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneric(
            Exception ex,
            HttpServletRequest request
    ) throws Exception {

        String path = request.getRequestURI();

        if (path.startsWith("/v3/api-docs") || path.startsWith("/swagger-ui")) {
            throw ex; // let springdoc handle it
        }

        return buildError("Internal server error", HttpStatus.INTERNAL_SERVER_ERROR);
    }



    private ResponseEntity<ApiErrorResponse> buildError(String message, HttpStatus status){
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(message, status.value(), LocalDateTime.now())
        );
    }
}
