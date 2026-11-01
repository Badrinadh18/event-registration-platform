package com.eventplatform.repository;

import com.eventplatform.model.Event;
import com.eventplatform.model.enums.EventStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access layer for Events.
 * Handles public directory lookups, background scheduled jobs, and critical
 * concurrency locking during ticket sales.
 */
@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    /**
     * Standard read-only fetch.
     * Typically used to load the public event page, ensuring users can only see PUBLISHED events.
     */
    Optional<Event> findByEventIdAndStatus(UUID eventId, EventStatus status);

    /**
     * CRITICAL CONCURRENCY CONTROL: Pessimistic write lock to prevent overselling.
     *
     * By using @Lock(LockModeType.PESSIMISTIC_WRITE), Spring tells the database (e.g., PostgreSQL/MySQL)
     * to append "FOR UPDATE" to the SQL query. When RegistrationService calls this method,
     * the database places a strict row-level write lock on this specific event.
     *
     * Any other concurrent thread trying to register for this same event must wait in line
     * until the first transaction finishes, making it impossible to sell 101 tickets to a 100-capacity event.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.eventId = :id")
    Optional<Event> findByIdForUpdate(@Param("id") UUID eventId);

    /**
     * Locates active events starting within a specific upcoming time window.
     * Used exclusively by the automated background job to send 24-hour reminder emails to attendees.
     */
    List<Event> findByEventDateBetweenAndStatus(LocalDateTime start, LocalDateTime end, EventStatus status);
}