package com.eventplatform.controller;


import com.eventplatform.dto.request.LoginRequest;
import com.eventplatform.dto.request.RegisterRequest;
import com.eventplatform.dto.response.AuthResponse;
import com.eventplatform.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {

        // Receives the dynamic message based on whether it was a new account or a role update
        String responseMessage = authService.register(request.getName(), request.getEmail(), request.getPassword(), request.getRole());

        return ResponseEntity.status(HttpStatus.CREATED).body(responseMessage);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request.getEmail(), request.getPassword(),request.getRequestedRole());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/verify")
    public ResponseEntity<String> verifyEmail(@RequestParam("token") String token) {
        authService.verifyEmail(token.trim());
        return ResponseEntity.ok("Email verified successfully. You may now log in.");
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<String> resendVerification(@RequestParam String email) {
        authService.resendVerificationEmail(email);
        return ResponseEntity.ok("A new verification link has been generated. Please check your email.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestParam String email) {
        authService.forgotPassword(email);
        // We return a generic message to prevent malicious actors from guessing registered emails
        return ResponseEntity.ok("If an account with that email exists, a password reset link has been sent.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword( @RequestBody Map<String, String> requestBody) {
        // Extracts the new password from a simple JSON body: { "newPassword": "mySecretPassword123" }
        String token=requestBody.get("token");
        String newPassword = requestBody.get("newPassword");

        if ( token==null || token.isBlank()) {
            return ResponseEntity.badRequest().body("token should be required");
        }

        if ( newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body("New password cannot be empty.");
        }


        authService.resetPassword(token, newPassword);
        return ResponseEntity.ok("Password successfully updated. You may now log in.");
    }

}
