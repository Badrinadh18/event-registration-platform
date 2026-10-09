package com.eventplatform.repository;

import com.eventplatform.model.TeamRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TeamRegistrationRepository extends JpaRepository<TeamRegistration, UUID> {

    Optional<TeamRegistration> findByGroupToken(String groupToken);

    // Validates if the lead user already has a team registered for this event
    boolean existsByLeadUser_UserIdAndEvent_EventId(UUID leadUserId, UUID eventId);

    Optional<TeamRegistration> findByIdAndLeadUser_Email(UUID id, String email);
}
