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

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, UUID> {

    // Required for registerSingleUser()
    boolean existsByUser_UserIdAndEvent_EventIdAndStatusNot(UUID userId, UUID eventId, RegistrationStatus status);

    // Required for registerTeam()
    boolean existsByUser_UserIdInAndEvent_EventIdAndStatusNot(List<UUID> userIds, UUID eventId, RegistrationStatus status);

    // Used to find the next person in line when someone cancels
    Optional<Registration> findFirstByEvent_EventIdAndStatusOrderByRegisteredAtAsc(UUID eventId, RegistrationStatus status);


    // Fetch a list of waitlisted users ordered by time, limited by the available seats
    @Query(value = "SELECT * FROM registrations r WHERE r.event_id = :eventId AND r.status = 'WAITLISTED' ORDER BY r.registered_at ASC LIMIT :limit", nativeQuery = true)
    List<Registration> findNextWaitlistedUsers(@Param("eventId") UUID eventId, @Param("limit") int limit);

    // Add this to fetch all registrations tied to a specific team
    List<Registration> findByTeamRegistration_Id(UUID teamRegId);

    List<Registration> findByEvent_EventId(UUID eventId);
}