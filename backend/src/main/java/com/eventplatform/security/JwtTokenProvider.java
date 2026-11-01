package com.eventplatform.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.function.Function;

/**
 * Security utility class responsible for generating, parsing, and validating JSON Web Tokens (JWT).
 * Acts as the cryptographic engine for stateless user sessions.
 */
@Slf4j
@Component
public class JwtTokenProvider {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long jwtExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    /**
     * Generates a secure HMAC-SHA signing key from the application secret.
     */
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Generates a short-lived JWT Access Token for the authenticated user.
     */
    public String generateToken(UserDetails userDetails) {
        log.debug("Generating new JWT Access Token for user [{}]", userDetails.getUsername());
        return buildToken(userDetails, jwtExpiration);
    }

    /**
     * Generates a long-lived JWT Refresh Token for session rotation.
     */
    public String generateRefreshToken(UserDetails userDetails) {
        log.debug("Generating new JWT Refresh Token for user [{}]", userDetails.getUsername());
        return buildToken(userDetails, refreshExpiration);
    }

    /**
     * Internal builder for constructing the token payload with roles and expiration.
     */
    private String buildToken(UserDetails userDetails, long expiration) {
        // 1. Extract the role from the UserDetails object
        String role = userDetails.getAuthorities().stream()
                .findFirst()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .orElse("ROLE_ATTENDEE");

        log.debug("Building JWT payload for user [{}] assigning role [{}]", userDetails.getUsername(), role);

        return Jwts.builder()
                .subject(userDetails.getUsername())
                .claim("role", role)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Validates a provided token against the expected user details.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);

        if (!username.equals(userDetails.getUsername())) {
            log.warn("SECURITY WARNING: JWT Token subject [{}] does not match the expected authentication context [{}]",
                    username, userDetails.getUsername());
            return false;
        }

        boolean isValid = !isTokenExpired(token);
        log.debug("Token validation for user [{}]: isValid = {}", username, isValid);
        return isValid;
    }

    /**
     * Extracts the subject (username/email) from the JWT payload.
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Checks if the token's expiration date has passed.
     */
    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    /**
     * Cryptographically verifies the token signature and extracts a specific claim.
     * Note: This will throw Exceptions (like ExpiredJwtException or SignatureException)
     * if the token is tampered with or expired, which will be caught by the Security Filter.
     */
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claimsResolver.apply(claims);
        } catch (Exception e) {
            // We log this at DEBUG because tokens expiring naturally is a normal system event,
            // and we don't want to spam WARN/ERROR logs every time a user needs to refresh their token.
            log.debug("JWT extraction failed (likely expired or malformed): {}", e.getMessage());
            throw e;
        }
    }
}