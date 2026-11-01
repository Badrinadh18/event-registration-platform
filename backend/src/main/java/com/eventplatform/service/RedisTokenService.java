package com.eventplatform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

/**
 * Service responsible for generating, retrieving, and managing short-lived,
 * time-sensitive tokens (like email verification and password resets) using Redis.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RedisTokenService {

    private final StringRedisTemplate redisTemplate;

    private static final String EMAIL_VERIFY_PREFIX = "verify_email:";
    private static final String PWD_RESET_PREFIX = "reset_pwd:";
    private static final Duration TOKEN_TTL = Duration.ofMinutes(15);

    /**
     * Generates a secure, 15-minute UUID token for email verification and stores it in Redis.
     *
     * @param email The user's email address.
     * @return The generated secure token (UUID).
     */
    public String generateEmailVerificationToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(EMAIL_VERIFY_PREFIX + token, email, TOKEN_TTL);

        // DEBUG level because the calling AuthService already logs the business action at INFO level.
        // SECURITY: We never log the actual 'token' string to prevent credential leakage in log files.
        log.debug("Stored email verification token in Redis for email [{}] with TTL {} minutes.",
                email, TOKEN_TTL.toMinutes());

        return token;
    }

    /**
     * Retrieves the associated email for a given verification token.
     *
     * @param token The verification token provided by the user.
     * @return The associated email, or null if the token is invalid or expired.
     */
    public String getEmailFromVerificationToken(String token) {
        log.debug("Attempting to retrieve email from Redis using an email verification token.");
        return redisTemplate.opsForValue().get(EMAIL_VERIFY_PREFIX + token);
    }

    /**
     * Deletes the verification token from Redis to ensure it cannot be reused.
     */
    public void deleteVerificationToken(String token) {
        redisTemplate.delete(EMAIL_VERIFY_PREFIX + token);
        log.debug("Deleted email verification token from Redis to ensure single-use.");
    }

    /**
     * Generates a secure, 15-minute UUID token for password resets and stores it in Redis.
     *
     * @param email The user's email address.
     * @return The generated secure token (UUID).
     */
    public String generatePasswordResetToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PWD_RESET_PREFIX + token, email, TOKEN_TTL);

        log.debug("Stored password reset token in Redis for email [{}] with TTL {} minutes.",
                email, TOKEN_TTL.toMinutes());

        return token;
    }

    /**
     * Retrieves the associated email for a given password reset token.
     *
     * @param token The reset token provided by the user.
     * @return The associated email, or null if the token is invalid or expired.
     */
    public String getEmailFromResetToken(String token) {
        log.debug("Attempting to retrieve email from Redis using a password reset token.");
        return redisTemplate.opsForValue().get(PWD_RESET_PREFIX + token);
    }

    /**
     * Deletes the password reset token from Redis to ensure it cannot be reused.
     */
    public void deleteResetToken(String token) {
        redisTemplate.delete(PWD_RESET_PREFIX + token);
        log.debug("Deleted password reset token from Redis to ensure single-use.");
    }
}