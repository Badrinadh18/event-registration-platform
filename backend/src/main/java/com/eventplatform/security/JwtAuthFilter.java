package com.eventplatform.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Core security filter that intercepts every incoming HTTP request.
 * Responsible for extracting, validating, and establishing user identity based on JWT tokens.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String requestUri = request.getRequestURI();

        // DEBUG: Trace every request entering the security perimeter
        log.debug("JwtAuthFilter inspecting request for URI: [{}]", requestUri);

        // 1. Check if the request contains a Bearer token
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.debug("No valid Bearer token found for URI [{}]. Proceeding as unauthenticated guest.", requestUri);
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);

        try {
            // 2. Extract user identity from the token
            final String userEmail = jwtTokenProvider.extractUsername(jwt);

            // 3. If identity exists and the SecurityContext is empty, validate and authorize
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                if (jwtTokenProvider.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Officially authenticate the user for this specific request
                    SecurityContextHolder.getContext().setAuthentication(authToken);

                    log.debug("SecurityContext successfully established for user [{}]", userEmail);
                } else {
                    // WARN: The token is structurally valid but logically invalid (e.g. wrong user)
                    log.warn("JWT validation failed: Token rejected for user [{}] on URI [{}]", userEmail, requestUri);
                }
            }
        } catch (Exception e) {
            // WARN: Catches ExpiredJwtException, MalformedJwtException, SignatureException, etc.
            // By catching this, we prevent a 500 error and allow Spring Security to return a clean 401/403.
            log.warn("Security Alert: Invalid or expired JWT token presented for URI [{}]. Reason: {}",
                    requestUri, e.getMessage());
        }

        // 4. Pass the request down the chain
        filterChain.doFilter(request, response);
    }
}