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

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<String> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(
                request.getName(),
                request.getEmail(),
                request.getPassword(),
                request.getRole()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body("User registered successfully. Please check your email for the verification link.");
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request.getEmail(), request.getPassword());
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
}
