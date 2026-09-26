package com.eventplatform.repository;

import com.eventplatform.model.Registration;
import com.eventplatform.model.enums.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RegistrationRepository extends JpaRepository<Registration, UUID> {

    boolean existsByUserIdAndEventId(UUID userId, UUID eventId);

    // Used to find the next person in line when someone cancels
    Optional<Registration> findFirstByEventIdAndStatusOrderByRegisteredAtAsc(UUID eventId, RegistrationStatus status);

    List<Registration> findByEventId(UUID eventId);
}