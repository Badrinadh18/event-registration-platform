package com.eventplatform.repository;

import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
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

    /**
     * Used by the Admin Dashboard to fetch staff/management users.
     * Uses 'Distinct' to prevent duplicate rows since roles are stored in a separate collection table.
     */
    List<User> findDistinctByRolesIn(java.util.Collection<Role> roles);
}