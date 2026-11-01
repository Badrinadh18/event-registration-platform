package com.eventplatform.service;

import com.eventplatform.model.User;
import com.eventplatform.repository.UserRepository;
import com.eventplatform.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Custom implementation of Spring Security's UserDetailsService.
 * Responsible for retrieving user credentials and roles from the database
 * during the login process and JWT token validation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    /**
     * Loads a user by their email address.
     * Note: This is called by Spring Security during authentication AND by the JwtAuthFilter
     * on every protected request to reconstruct the SecurityContext.
     *
     * @param email The email address (username) of the user.
     * @return UserDetails containing the user's credentials and authorities.
     * @throws UsernameNotFoundException if the user is not found in the database.
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // DEBUG level used here because this method is called constantly by the JWT filter.
        // Using INFO here would severely spam and bloat the production log files.
        log.debug("Spring Security is loading user details for email [{}]", email);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    // WARN level because a missing user during auth is a security anomaly
                    // (e.g., failed login, or JWT token used for a deleted account).
                    log.warn("Authentication anomaly: No user found in database with email [{}]", email);
                    return new UsernameNotFoundException("User not found with email: " + email);
                });

        return new CustomUserDetails(user);
    }
}