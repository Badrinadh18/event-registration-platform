package com.eventplatform.repository;

import com.eventplatform.model.Event;
import com.eventplatform.model.enums.EventStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;
// By using @Lock(LockModeType.PESSIMISTIC_WRITE), Spring tells Hibernate to append FOR UPDATE to the SQL query.
// When RegistrationService calls findByIdForUpdate(), MySQL places a row-level write lock on that specific event.
// Any other concurrent thread trying to register for the same event must wait until the first transaction commits or rolls back.

@Repository
public interface EventRepository extends JpaRepository<Event, UUID> {

    // Standard read-only fetch
    Optional<Event> findByIdAndStatus(UUID eventId, EventStatus status);

    // CRITICAL: Pessimistic write lock to prevent overselling
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Event e WHERE e.eventId = :id")
    Optional<Event> findByIdForUpdate(@Param("id") UUID id);
}
