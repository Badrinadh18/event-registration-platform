package com.eventplatform.repository;

import com.eventplatform.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    Optional<Ticket> findByToken(String token);
    Optional<Ticket> findByRegistration_RegistrationId(UUID registrationId);
    // NEW: Single high-performance query to prevent Lazy Loading crashes
    @Query("SELECT t FROM Ticket t " +
            "JOIN FETCH t.registration r " +
            "JOIN FETCH r.event e " +
            "JOIN FETCH r.user u " +
            "LEFT JOIN FETCH r.teamRegistration tr " +
            "WHERE u.email = :email")
    List<Ticket> findAllTicketsByUserEmailEagerly(@Param("email") String email);
}
