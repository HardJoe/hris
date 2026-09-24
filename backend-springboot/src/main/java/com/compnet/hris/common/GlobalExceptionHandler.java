package com.compnet.hris.common;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorEnvelope> validation(MethodArgumentNotValidException exception,
            HttpServletRequest request) {
        List<String> messages = exception.getBindingResult().getAllErrors().stream()
                .map(error -> error instanceof FieldError field
                        ? field.getField() + " " + error.getDefaultMessage()
                        : error.getDefaultMessage())
                .toList();
        return error(HttpStatus.BAD_REQUEST, "MethodArgumentNotValidException", messages, request);
    }

    @ExceptionHandler({HandlerMethodValidationException.class, HttpMessageNotReadableException.class,
            MissingServletRequestPartException.class, MaxUploadSizeExceededException.class,
            InvalidRequestException.class})
    ResponseEntity<ErrorEnvelope> badRequest(Exception exception, HttpServletRequest request) {
        String message = exception instanceof MaxUploadSizeExceededException
                ? "Certificate exceeds the configured size limit" : exception.getMessage();
        return error(HttpStatus.BAD_REQUEST, "BadRequestException", message, request);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ErrorEnvelope> notFound(ResourceNotFoundException exception,
            HttpServletRequest request) {
        return error(HttpStatus.NOT_FOUND, "NotFoundException", exception.getMessage(), request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ErrorEnvelope> unauthorized(BadCredentialsException exception,
            HttpServletRequest request) {
        return error(HttpStatus.UNAUTHORIZED, "UnauthorizedException", exception.getMessage(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ErrorEnvelope> conflict(DataIntegrityViolationException exception,
            HttpServletRequest request) {
        String details = rootMessage(exception);
        boolean foreignKey = details.contains("foreign key") || details.contains("23503");
        return error(HttpStatus.CONFLICT, foreignKey ? "RESOURCE_IN_USE" : "DUPLICATE_RESOURCE",
                foreignKey ? "The resource is still referenced by another resource"
                        : "A resource with the same unique value already exists", request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorEnvelope> unexpected(Exception exception, HttpServletRequest request) {
        log.error("Unexpected failure for {} {}", request.getMethod(), request.getRequestURI(), exception);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred", request);
    }

    private ResponseEntity<ErrorEnvelope> error(HttpStatus status, String code, Object message,
            HttpServletRequest request) {
        ErrorBody body = new ErrorBody(status.value(), code, message, Instant.now(), request.getRequestURI());
        return ResponseEntity.status(status).body(new ErrorEnvelope(body));
    }

    private String rootMessage(Throwable throwable) {
        Throwable root = throwable;
        while (root.getCause() != null) root = root.getCause();
        return String.valueOf(root.getMessage()).toLowerCase();
    }

    public record ErrorEnvelope(ErrorBody error) {}
    public record ErrorBody(int statusCode, String code, Object message, Instant timestamp, String path) {}
}
