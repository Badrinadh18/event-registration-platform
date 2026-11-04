package com.eventplatform.service;

import com.eventplatform.dto.response.TicketResponse;
import com.eventplatform.exception.ResourceNotFoundException;
import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.Ticket;
import com.eventplatform.model.enums.TicketStatus;
import com.eventplatform.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Service responsible for ticket lifecycle: generation, cancellation,
 * data retrieval, and event-day check-in validation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    /**
     * Generates a unique QR token and ticket record for a confirmed registration.
     */
    @Transactional
    public Ticket generateTicket(Registration registration) {
        Ticket ticket = Ticket.builder()
                .token(UUID.randomUUID().toString())
                .registration(registration)
                .status(TicketStatus.CONFIRMED)
                .build();

        Ticket savedTicket = ticketRepository.save(ticket);
        log.info("Ticket [{}] successfully generated for Registration [{}]",
                savedTicket.getToken(), registration.getRegistrationId());

        return savedTicket;
    }

    /**
     * Invalidates a ticket when the underlying registration is cancelled.
     */
    @Transactional
    public void cancelTicket(UUID registrationId) {
        ticketRepository.findByRegistration_RegistrationId(registrationId)
                .ifPresent(ticket -> {
                    ticket.setStatus(TicketStatus.CANCELLED);
                    ticketRepository.save(ticket);
                    log.info("Ticket [{}] status updated to CANCELLED due to registration cancellation.", ticket.getId());
                });
    }

    /**
     * Event-day scanner logic. Validates the QR token, ensures Organiser ownership(or Admin override),
     * and prevents double-entry.
     */
    @Transactional
    public String checkInAttendee(String qrToken, String scannerEmail, Collection<? extends GrantedAuthority> authorities) {
        log.debug("User [{}] is attempting to scan ticket token [{}]", scannerEmail, qrToken);

        Ticket ticket = ticketRepository.findByToken(qrToken)
                .orElseThrow(() -> {
                    log.warn("Check-in failed: Scanned token [{}] does not exist in the database.", qrToken);
                    return new ResourceNotFoundException("Invalid Ticket QR Code.");
                });

        Event event = ticket.getRegistration().getEvent();

        // Block scanner if event is suppressed
        if (event.isSuppressed()) {
            log.warn("Check-in denied: Event [{}] is suppressed. Scanner locked.", event.getEventId());
            throw new IllegalStateException("This event has been suppressed by an Administrator. Ticket scanning is currently disabled.");
        }

        // 1. Validate Ownership (Allow Admins OR the actual Organiser)
        boolean isAdmin = authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isOwner = ticket.getRegistration().getEvent().getOrganiser().getEmail().equals(scannerEmail);
        
        if (!isAdmin && !isOwner) {
            log.warn("SECURITY INCIDENT: User [{}] attempted to scan a ticket for Event [{}] which they do not own.",
                    scannerEmail, ticket.getRegistration().getEvent().getEventId());
            throw new SecurityException("You are not authorized to scan tickets for this event.");
        }

        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            log.warn("Check-in denied: User [{}] scanned a CANCELLED ticket [{}]", scannerEmail, qrToken);
            throw new IllegalStateException("This ticket has been cancelled and is invalid.");
        }

        // Idempotency: Double-scans return a success code with a distinct message, preventing scanner crash loops
        if (ticket.getStatus() == TicketStatus.USED) {
            log.warn("Check-in alert: Double-scan detected for Ticket [{}] by Organiser [{}]. Attendee already inside.",
                    qrToken, scannerEmail);
            return "Ticket already scanned. Attendee is already checked in.";
        }

        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);

        log.info("Check-in SUCCESS: Ticket [{}] verified and marked as USED by Organiser [{}]", qrToken, scannerEmail);
        return "Check-in successful! Ticket verified.";
    }

    /**
     * Retrieves ticket metadata (useful for future PDF generation).
     */
    @Transactional(readOnly = true)
    public TicketResponse getTicketMetadata(String token, String attendeeEmail) {
        log.debug("Fetching ticket metadata for token [{}] requested by [{}]", token, attendeeEmail);

        Ticket ticket = ticketRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getRegistration().getUser().getEmail().equals(attendeeEmail)) {
            log.warn("SECURITY INCIDENT: User [{}] attempted to access metadata for Ticket [{}] owned by someone else.",
                    attendeeEmail, token);
            throw new SecurityException("Unauthorized access to ticket metadata.");
        }

        return TicketResponse.builder()
                .eventName(ticket.getRegistration().getEvent().getTitle())
                .venue(ticket.getRegistration().getEvent().getVenue())
                .eventDate(ticket.getRegistration().getEvent().getEventDate())
                .attendeeName(ticket.getRegistration().getUser().getName())
                .attendeeEmail(ticket.getRegistration().getUser().getEmail())
                .ticketToken(ticket.getToken())
                .status(ticket.getStatus().name())
                .metadata("PDF generation module ready to plug in.")
                .build();
    }

    /**
     * N+1 optimized bulk fetch for the frontend "My Tickets" dashboard.
     */
    @Transactional(readOnly = true)
    public List<TicketResponse> getTicketsByUserEmail(String userEmail) {
        // DEBUG level because this is called every time a user opens their dashboard
        log.debug("Fetching all eager-loaded tickets for User [{}]", userEmail);

        List<Ticket> tickets = ticketRepository.findAllTicketsByUserEmailEagerly(userEmail);

        return tickets.stream().map(ticket -> {
            var registration = ticket.getRegistration();
            var event = registration != null ? registration.getEvent() : null;
            var user = registration != null ? registration.getUser() : null;
            var teamReg = registration != null ? registration.getTeamRegistration() : null;

            return TicketResponse.builder()
                    // Use fallback strings if any relationship is missing
                    .eventName(event != null && event.getTitle() != null ? event.getTitle() : "Event Name Unavailable")
                    .venue(event != null && event.getVenue() != null ? event.getVenue() : "Venue TBD")
                    .eventDate(event != null ? event.getEventDate() : null)

                    // Fallback to the requested email if the user object is detached
                    .attendeeName(user != null && user.getName() != null ? user.getName() : "Attendee")
                    .attendeeEmail(user != null && user.getEmail() != null ? user.getEmail() : userEmail)

                    // Fallback for ticket details
                    .ticketToken(ticket.getToken() != null ? ticket.getToken() : UUID.randomUUID().toString())
                    .status(ticket.getStatus() != null ? ticket.getStatus().name() : "UNKNOWN")

                    // Registration tracking
                    .registrationId(registration != null ? registration.getRegistrationId() : null)
                    .isTeamRegistration(teamReg != null)
                    .build();
        }).toList();
    }
}