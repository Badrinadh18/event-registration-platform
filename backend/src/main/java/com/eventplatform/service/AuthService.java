package com.eventplatform.service;

import com.eventplatform.dto.response.AuthResponse;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
import com.eventplatform.repository.UserRepository;
import com.eventplatform.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException; // FIXED: Was java.nio.file.AccessDeniedException
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * Service responsible for handling user authentication, registration, and credential management.
 * Integrated with Redis for temporary tokens and JWT for stateless, role-scoped sessions.
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
     * Registers a new user OR appends a new role to an existing user.
     * Returns a dynamic success message for the frontend.
     */
    @Transactional
    public String register(String name, String email, String plainPassword, Role role) {
        log.debug("Attempting to register user with email [{}] for role [{}]", email, role);

        Optional<User> existingUserOpt = userRepository.findByEmail(email);

        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();

            // 1. If they already have this exact role, block it.
            if (existingUser.getRoles().contains(role)) {
                log.warn("Registration rejected: User [{}] already possesses the role [{}].", email, role);
                throw new IllegalStateException("User already exists for the respective role.");
            }

            // 2. SECURITY CHECK: Ensure the person trying to add a role actually owns the account
            if (!passwordEncoder.matches(plainPassword, existingUser.getPassword())) {
                log.warn("SECURITY INCIDENT: Attempt to append role to existing user [{}] with incorrect password.", email);
                throw new SecurityException("This email is already registered. To add a new role to your account, please provide your correct existing password.");
            }

            // 3. Append the new role to the existing account
            existingUser.getRoles().add(role);
            userRepository.save(existingUser);
            log.info("Appended new role [{}] to existing user [{}].", role, email);

            // If their email is already verified, they are good to go immediately.
            if (existingUser.isVerified()) {
                return "Role " + role + " has been successfully added to your account. You may now log in.";
            } else {
                // If they never verified their original account, re-send the email.
                String token = redisTokenService.generateEmailVerificationToken(email);
                notificationService.sendVerificationEmailAsync(email, token);
                return "Role added, but your account is unverified. A new verification link has been sent to your email.";
            }
        }

        // 4. Brand new user flow
        User newUser = User.builder()
                .name(name)
                .email(email)
                .password(passwordEncoder.encode(plainPassword))
                // Use a mutable HashSet so we can add roles to it later!
                .roles(new HashSet<>(Set.of(role)))
                .isVerified(false)
                .build();

        userRepository.save(newUser);
        log.info("New user [{}] successfully saved to database with role [{}].", email, role);

        String token = redisTokenService.generateEmailVerificationToken(email);
        notificationService.sendVerificationEmailAsync(email, token);
        log.info("Verification email queued for user [{}].", email);

        return "User registered successfully. Please check your email for the verification link.";
    }

    /**
     * Authenticates a user and issues JWT & Refresh tokens scoped to a specific dashboard.
     */
    public AuthResponse login(String email, String password, Role requestedRole) {
        log.debug("Login attempt for email [{}] requesting role context [{}]", email, requestedRole);

        // 1. Fetch the user from the database first
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Login failed: Account with email [{}] not found.", email);
                    return new IllegalArgumentException("User email not found. Provide Correct Email or Signup as new user.");
                });

        // 2. STRICT GUARD: Check if the user is verified before allowing authentication
        if (!user.isVerified()) {
            log.warn("Login denied: User [{}] attempted to login but email is unverified.", email);
            throw new IllegalStateException("Account not verified. Please check your email for the verification link.");
        }

        // 3. MULTI-ROLE GUARD: Check if the user actually possesses the requested role
        if (!user.getRoles().contains(requestedRole)) {
            log.warn("SECURITY INCIDENT: User [{}] attempted to login as [{}] but does not possess this role.", email, requestedRole);
            throw new AccessDeniedException("You do not have permission to log in as " + requestedRole);
        }

        // 4. Authenticate against Spring Security (Throws BadCredentialsException if password mismatches)
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        var userDetails = userDetailsService.loadUserByUsername(email);

        // 5. Issue role-scoped tokens
        String jwtToken = jwtTokenProvider.generateToken(userDetails, requestedRole);
        String refreshToken = jwtTokenProvider.generateRefreshToken(userDetails, requestedRole);

        log.info("User [{}] successfully authenticated into [{}] context.", email, requestedRole);
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

        // Extract the role context from the old token so we can preserve it in the new token
        String roleClaim = jwtTokenProvider.extractClaim(refreshToken, claims -> claims.get("role", String.class));
        Role scopedRole = Role.valueOf(roleClaim.replace("ROLE_", ""));

        // Issue a fresh pair of scoped tokens (Rotation)
        log.info("Fresh token pair successfully issued for user [{}] scoped to [{}].", email, scopedRole);
        return new AuthResponse(
                jwtTokenProvider.generateToken(userDetails, scopedRole),
                jwtTokenProvider.generateRefreshToken(userDetails, scopedRole)
        );
    }

    /**
     * Initiates the password reset flow by sending a secure link to the user's email.
     * Throws an exception if the email does not exist in the system.
     */
    public void forgotPassword(String email) {
        // 1. Explicitly check if the user exists and throw an error if not
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Password reset rejected: No account found for email [{}].", email);
                    return new IllegalArgumentException("No account found with this email address.");
                });

        // 2. Generate the token and send the email
        String token = redisTokenService.generatePasswordResetToken(email);
        notificationService.sendPasswordResetEmailAsync(email, token);

        log.info("Password reset token generated and email queued for user [{}].", email);
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

        String newToken = redisTokenService.generateEmailVerificationToken(email);
        notificationService.sendVerificationEmailAsync(email, newToken);

        log.info("Verification email successfully re-queued for user [{}].", email);
    }
}