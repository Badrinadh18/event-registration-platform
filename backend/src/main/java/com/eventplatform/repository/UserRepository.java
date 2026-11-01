package com.eventplatform.repository;

import com.eventplatform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access layer for User accounts.
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Core lookup used during the login and JWT authentication process.
     */
    Optional<User> findByEmail(String email);

    /**
     * Bulk lookup method used during Team Registration.
     * Verifies that all invited team members actually possess valid accounts on the platform
     * before securing their tickets.
     */
    List<User> findByEmailIn(List<String> emails);
}