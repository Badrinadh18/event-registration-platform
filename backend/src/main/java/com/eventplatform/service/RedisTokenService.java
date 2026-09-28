package com.eventplatform.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RedisTokenService {

    private final StringRedisTemplate redisTemplate;

    private static final String EMAIL_VERIFY_PREFIX = "verify_email:";
    private static final String PWD_RESET_PREFIX = "reset_pwd:";
    private static final Duration TOKEN_TTL = Duration.ofMinutes(15);

    public String generateEmailVerificationToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(EMAIL_VERIFY_PREFIX + token, email, TOKEN_TTL);
        return token;
    }

    public String getEmailFromVerificationToken(String token) {
        return redisTemplate.opsForValue().get(EMAIL_VERIFY_PREFIX + token);
    }

    public void deleteVerificationToken(String token) {
        redisTemplate.delete(EMAIL_VERIFY_PREFIX + token);
    }
    public String generatePasswordResetToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(PWD_RESET_PREFIX + token, email, TOKEN_TTL);
        return token;
    }

    public String getEmailFromResetToken(String token) {
        return redisTemplate.opsForValue().get(PWD_RESET_PREFIX + token);
    }

    public void deleteResetToken(String token) {
        redisTemplate.delete(PWD_RESET_PREFIX + token);
    }
}
