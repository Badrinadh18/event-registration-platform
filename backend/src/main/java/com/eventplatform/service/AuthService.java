package com.eventplatform.service;

import com.eventplatform.dto.response.AuthResponse;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
import com.eventplatform.repository.UserRepository;
import com.eventplatform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RedisTokenService redisTokenService;
    private final UserDetailsService userDetailsService;
    // private final NotificationService notificationService;

    @Transactional
    public void register(String name, String email, String plainPassword, Role role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(plainPassword))
                .role(role)
                .isVerified(false)
                .build();

        userRepository.save(user);

        String token = redisTokenService.generateEmailVerificationToken(email);
        // notificationService.sendVerificationEmailAsync(email, token);
    }

    public AuthResponse login(String email, String password) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        var userDetails = userDetailsService.loadUserByUsername(email);
        String jwtToken = jwtTokenProvider.generateToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails);

        return new AuthResponse(jwtToken, refreshToken);
    }

    @Transactional
    public void verifyEmail(String token) {
        String email = redisTokenService.getEmailFromVerificationToken(token);
        if (email == null) {
            throw new IllegalArgumentException("Invalid or expired token");
        }

        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setVerified(true);
        userRepository.save(user);
        redisTokenService.deleteVerificationToken(token);
    }
    public AuthResponse refreshToken(String refreshToken) {
        String email = jwtTokenProvider.extractUsername(refreshToken);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        if (!jwtTokenProvider.isTokenValid(refreshToken, userDetails)) {
            throw new IllegalArgumentException("Invalid refresh token");
        }

        // Issue a fresh pair of tokens (Rotation)
        return new AuthResponse(
                jwtTokenProvider.generateToken(userDetails),
                jwtTokenProvider.generateRefreshToken(userDetails)
        );
    }

    public void forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresent(user -> {
            String token = redisTokenService.generatePasswordResetToken(email);
            // notificationService.sendPasswordResetEmailAsync(email, token);
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        String email = redisTokenService.getEmailFromResetToken(token);
        if (email == null) {
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Ensure single-use by deleting the token immediately
        redisTokenService.deleteResetToken(token);
    }

    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.isVerified()) {
            throw new IllegalArgumentException("User is already verified");
        }

        // Generate a new token in Redis
        String newToken = redisTokenService.generateEmailVerificationToken(email);

        //notificationService.sendVerificationEmailAsync(email, newToken);
    }

}
