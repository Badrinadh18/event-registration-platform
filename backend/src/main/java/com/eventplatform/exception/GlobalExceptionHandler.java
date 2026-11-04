package com.eventplatform.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.NoHandlerFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    // --- Custom Business Exceptions ---

    @ExceptionHandler(DuplicateRegistrationException.class)
    public ResponseEntity<Map<String, String>> handleDuplicateRegistration(DuplicateRegistrationException ex) {
        log.warn("Business Rule Violation (Duplicate): {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleResourceNotFound(ResourceNotFoundException ex) {
        log.warn("Resource Not Found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // --- Standard Java Exceptions used in Business Logic ---

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleIllegalState(IllegalStateException ex) {
        log.warn("Business Logic Constraint (IllegalState): {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Invalid Input (IllegalArgument): {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<Map<String, String>> handleSecurityException(SecurityException ex) {
        log.warn("Security Constraint Violation: {}", ex.getMessage());
        return buildResponse(HttpStatus.FORBIDDEN, ex.getMessage());
    }

    // --- Spring Security Exceptions ---

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, String>> handleBadCredentials(BadCredentialsException ex) {
        // Obfuscate the exact reason to prevent user enumeration attacks
        log.warn("Authentication Failed: Bad credentials provided.");
        return buildResponse(HttpStatus.UNAUTHORIZED, "Invalid password.");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Authorization Failed: User attempted to access a forbidden resource.");
        return buildResponse(HttpStatus.FORBIDDEN, "You do not have permission to access this resource.");
    }

    // --- Validation & HTTP Request Exceptions ---

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(error ->
                errors.put(error.getField(), error.getDefaultMessage())
        );
        log.warn("Payload Validation Failed: {}", errors);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleHttpMessageNotReadable(HttpMessageNotReadableException ex) {
        log.warn("Malformed HTTP Request (Not Readable): {}", ex.getMessage());
        return buildResponse(HttpStatus.BAD_REQUEST, "Malformed JSON request or invalid data types provided.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        log.warn("Unsupported HTTP Method: {}", ex.getMessage());
        return buildResponse(HttpStatus.METHOD_NOT_ALLOWED, ex.getMessage());
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoHandlerFound(NoHandlerFoundException ex) {
        log.warn("404 Endpoint Not Found: {}", ex.getMessage());
        return buildResponse(HttpStatus.NOT_FOUND, "The requested endpoint does not exist.");
    }

    // --- Database Exceptions ---

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.error("Database Integrity Violation: {}", ex.getMessage());
        return buildResponse(HttpStatus.CONFLICT, "Database conflict: A record with these unique constraints already exists.");
    }

    // --- Fallback for all other unexpected errors ---

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGenericException(Exception ex) {
        // CRITICAL: Passing the 'ex' object as the final parameter tells SLF4J to print the full stack trace to the log file.
        // This is how we debug server crashes without exposing internal architecture details to the frontend.
        log.error("CRITICAL UNEXPECTED ERROR: {}", ex.getMessage(), ex);
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred. Please try again later.");
    }


    /**
     * Specifically catches when the Redis Docker container is down or unreachable.
     * Prevents a generic 500 error and sends a clear message to the frontend UI.
     */
    @ExceptionHandler(RedisConnectionFailureException.class)
    public ResponseEntity<Map<String,String>> handleRedisConnectionFailure(RedisConnectionFailureException ex) {
        log.error("CRITICAL: Redis connection failed. Dependent services (email tokens, auth) are degraded.", ex);

        Map<String, String> response = new HashMap<>();
        response.put("error", "Service Unavailable");
        response.put("message", "Our secure notification system is temporarily offline. We cannot send emails right now. Please try again in a few minutes.");

        // Returning 503 (Service Unavailable) allows the frontend forms (like Login/Register)
        // to gracefully catch this and display the message in the red alert box.
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }

    // --- Internal Helper Method ---

    private ResponseEntity<Map<String, String>> buildResponse(HttpStatus status, String message) {
        Map<String, String> response = new HashMap<>();
        response.put("error", status.getReasonPhrase());
        response.put("message", message);
        return ResponseEntity.status(status).body(response);
    }
}