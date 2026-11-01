package com.eventplatform.repository;

import com.eventplatform.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access layer for Tickets.
 * Handles retrieval of tickets via secure QR tokens and optimized bulk fetching for user dashboards.
 */
@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {

    /**
     * Finds a ticket by its secure UUID token (the string embedded in the QR code).
     * Used by event organisers during the physical check-in process.
     */
    Optional<Ticket> findByToken(String token);

    /**
     * Finds the physical ticket associated with a specific registration record.
     * Used to invalidate (cancel) a ticket when a user cancels their registration.
     */
    Optional<Ticket> findByRegistration_RegistrationId(UUID registrationId);

    /**
     * High-Performance Bulk Fetch for the "My Tickets" dashboard.
     *
     * Uses JPQL "JOIN FETCH" to load the Ticket, its Registration, the Event details,
     * the User, and (optionally) the Team group in a single SQL query.
     *
     * This explicitly prevents the "N+1 Query Problem", which would otherwise cause
     * Spring to execute a new database query for every single relationship on every ticket,
     * crashing the database if a user has many tickets.
     */
    @Query("SELECT t FROM Ticket t " +
            "JOIN FETCH t.registration r " +
            "JOIN FETCH r.event e " +
            "JOIN FETCH r.user u " +
            "LEFT JOIN FETCH r.teamRegistration tr " +
            "WHERE u.email = :email")
    List<Ticket> findAllTicketsByUserEmailEagerly(@Param("email") String email);
}