package com.eventplatform.service;

import com.eventplatform.dto.response.AuthResponse;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
import com.eventplatform.repository.UserRepository;
import com.eventplatform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service responsible for handling user authentication, registration, and credential management.
 * Integrated with Redis for temporary tokens and JWT for stateless sessions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final RedisTokenService redisTokenService;
    private final UserDetailsService userDetailsService;
    private final NotificationService notificationService;

    /**
     * Registers a new user, hashes their password, and issues an email verification token.
     */
    @Transactional
    public void register(String name, String email, String plainPassword, Role role) {
        log.debug("Attempting to register new user with email [{}]", email);

        if (userRepository.findByEmail(email).isPresent()) {
            log.warn("Registration rejected: Email [{}] is already in use.", email);
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
        log.info("User [{}] successfully saved to database with role [{}].", email, role);

        String token = redisTokenService.generateEmailVerificationToken(email);
        notificationService.sendVerificationEmailAsync(email, token);
        log.info("Verification email queued for user [{}].", email);
    }

    /**
     * Authenticates a user and issues JWT & Refresh tokens. Enforces email verification.
     */
    public AuthResponse login(String email, String password) {
        log.debug("Login attempt for email [{}]", email);

        // 1. Fetch the user from the database first
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed: Account with email [{}] not found.", email);
                    return new IllegalArgumentException("User not found.");
                });

        // 2. STRICT GUARD: Check if the user is verified before allowing authentication
        if (!user.isVerified()) {
            log.warn("Login denied: User [{}] attempted to login but email is unverified.", email);
            // Throwing this specific exception triggers the frontend's "Resend Verification" UI
            throw new IllegalStateException("Account not verified. Please check your email for the verification link.");
        }

        // 3. Authenticate against Spring Security (Throws BadCredentialsException if password mismatches)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        var userDetails = userDetailsService.loadUserByUsername(email);
        String jwtToken = jwtTokenProvider.generateToken(userDetails);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails);

        log.info("User [{}] successfully authenticated. Tokens issued.", email);
        return new AuthResponse(jwtToken, refreshToken);
    }

    /**
     * Verifies a user's email address using a token extracted from Redis.
     */
    @Transactional
    public void verifyEmail(String token) {
        String email = redisTokenService.getEmailFromVerificationToken(token);
        if (email == null) {
            log.warn("Email verification failed: Invalid or expired Redis token.");
            throw new IllegalArgumentException("Invalid or expired token");
        }

        User user = userRepository.findByEmail(email).orElseThrow(() -> {
            log.error("Data inconsistency: Token valid for email [{}], but user not found in DB.", email);
            return new IllegalArgumentException("User not found");
        });

        user.setVerified(true);
        userRepository.save(user);
        redisTokenService.deleteVerificationToken(token);

        log.info("Email [{}] has been successfully verified. User account is now active.", email);
    }

    /**
     * Issues a fresh JWT and Refresh Token pair using a valid, non-expired refresh token.
     */
    public AuthResponse refreshToken(String refreshToken) {
        String email = jwtTokenProvider.extractUsername(refreshToken);
        log.debug("Attempting to refresh token for user [{}]", email);

        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        if (!jwtTokenProvider.isTokenValid(refreshToken, userDetails)) {
            log.warn("Token refresh denied: Invalid or expired refresh token for user [{}].", email);
            throw new IllegalArgumentException("Invalid refresh token");
        }

        // Issue a fresh pair of tokens (Rotation)
        log.info("Fresh token pair successfully issued for user [{}].", email);
        return new AuthResponse(
                jwtTokenProvider.generateToken(userDetails),
                jwtTokenProvider.generateRefreshToken(userDetails)
        );
    }

    /**
     * Initiates the password reset flow by sending a secure link to the user's email.
     */
    public void forgotPassword(String email) {
        userRepository.findByEmail(email).ifPresentOrElse(user -> {
            String token = redisTokenService.generatePasswordResetToken(email);
            notificationService.sendPasswordResetEmailAsync(email, token);
            log.info("Password reset token generated and email queued for user [{}].", email);
        }, () -> {
            // We log this, but we don't throw an error to the frontend to prevent user enumeration attacks
            log.warn("Password reset requested for non-existent email [{}]. Silently ignoring.", email);
        });
    }

    /**
     * Resets a user's password if the provided Redis token is valid.
     */
    @Transactional
    public void resetPassword(String token, String newPassword) {
        String email = redisTokenService.getEmailFromResetToken(token);
        if (email == null) {
            log.warn("Password reset failed: Invalid or expired token provided.");
            throw new IllegalArgumentException("Invalid or expired reset token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Ensure single-use by deleting the token immediately
        redisTokenService.deleteResetToken(token);

        log.info("Password successfully updated for user [{}]. Token invalidated.", email);
    }

    /**
     * Resends the verification email if the user's account is still unverified.
     */
    @Transactional
    public void resendVerificationEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Resend verification failed: Email [{}] not found.", email);
                    return new IllegalArgumentException("User not found");
                });

        if (user.isVerified()) {
            log.warn("Resend verification ignored: User [{}] is already verified.", email);
            throw new IllegalArgumentException("User is already verified");
        }

        // Generate a new token in Redis
        String newToken = redisTokenService.generateEmailVerificationToken(email);
        notificationService.sendVerificationEmailAsync(email, newToken);

        log.info("Verification email successfully re-queued for user [{}].", email);
    }
}