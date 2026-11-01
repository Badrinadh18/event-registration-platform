package com.eventplatform.repository;

import com.eventplatform.model.Registration;
import com.eventplatform.model.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Data Access layer for Registrations.
 * Handles complex querying for capacity management, waitlist promotions, and team validation.
 */
@Repository
public interface RegistrationRepository extends JpaRepository<Registration, UUID> {

    /**
     * Prevents double-booking. Checks if a specific user already has an active
     * (CONFIRMED or WAITLISTED) registration for a given event.
     */
    boolean existsByUser_UserIdAndEvent_EventIdAndStatusNot(UUID userId, UUID eventId, RegistrationStatus status);

    /**
     * Bulk double-booking check. Used during team registrations to ensure
     * no one in the requested team roster is already registered for the event.
     */
    boolean existsByUser_UserIdInAndEvent_EventIdAndStatusNot(List<UUID> userIds, UUID eventId, RegistrationStatus status);

    /**
     * Single Waitlist Promotion (FIFO).
     * Finds the person who has been on the waitlist the longest so they can be
     * promoted when a single confirmed attendee cancels.
     */
    Optional<Registration> findFirstByEvent_EventIdAndStatusOrderByRegisteredAtAsc(UUID eventId, RegistrationStatus status);

    /**
     * Bulk Waitlist Promotion.
     * Uses a native SQL query to apply a LIMIT clause. This is critical for team cancellations,
     * allowing us to promote exactly 'N' waitlisted users to fill the newly freed seats.
     */
    @Query(value = "SELECT * FROM registrations r WHERE r.event_id = :eventId AND r.status = 'WAITLISTED' ORDER BY r.registered_at ASC LIMIT :limit", nativeQuery = true)
    List<Registration> findNextWaitlistedUsers(@Param("eventId") UUID eventId, @Param("limit") int limit);

    /**
     * Retrieves all individual registrations tied to a specific team booking group.
     * Used when the team leader cancels the group, so we can cancel all member tickets.
     */
    List<Registration> findByTeamRegistration_Id(UUID teamRegId);

    /**
     * Retrieves the entire registration history (confirmed, waitlisted, cancelled) for an event.
     */
    List<Registration> findByEvent_EventId(UUID eventId);

    /**
     * Retrieves registrations for a specific event filtered by their status.
     * Primarily used to fetch all CONFIRMED attendees for mass email blasts (reminders/cancellations).
     */
    List<Registration> findByEvent_EventIdAndStatus(UUID eventId, RegistrationStatus status);

    /**
     * Retrieves a specific user's entire registration history across all events.
     * Used for the "My Tickets" dashboard and administrative user deletion.
     */
    List<Registration> findByUser_UserId(UUID userId);
}