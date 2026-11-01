package com.eventplatform.repository;

import com.eventplatform.model.TeamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Data Access layer for Team / Group Bookings.
 * Enforces ownership and anti-hoarding rules for bulk ticket reservations.
 */
@Repository
public interface TeamRegistrationRepository extends JpaRepository<TeamRegistration, UUID> {

    /**
     * Locates a team booking using its shareable public token.
     */
    Optional<TeamRegistration> findByGroupToken(String groupToken);

    /**
     * Anti-hoarding check: Validates whether a specific user is already acting as the
     * lead for another team at the same event to prevent them from bulk-reserving the entire venue.
     */
    boolean existsByLeadUser_UserIdAndEvent_EventId(UUID leadUserId, UUID eventId);

    /**
     * Security lookup: Fetches a team registration while strictly verifying ownership.
     * Used during Team Cancellation to ensure only the original team creator (Lead User)
     * is authorized to cancel the group and drop all members' tickets.
     */
    Optional<TeamRegistration> findByIdAndLeadUser_Email(UUID id, String email);
}