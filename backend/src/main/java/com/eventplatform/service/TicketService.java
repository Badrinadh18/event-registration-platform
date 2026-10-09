package com.eventplatform.service;

import com.eventplatform.dto.response.TicketResponse;
import com.eventplatform.exception.ResourceNotFoundException;
import com.eventplatform.model.Registration;
import com.eventplatform.model.Ticket;
import com.eventplatform.model.enums.TicketStatus;
import com.eventplatform.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;

    @Transactional
    public Ticket generateTicket(Registration registration) {
        Ticket ticket = Ticket.builder()
                .token(UUID.randomUUID().toString())
                .registration(registration)
                .status(TicketStatus.CONFIRMED)
                .build();
        return ticketRepository.save(ticket);
    }

    @Transactional
    public void cancelTicket(UUID registrationId) {
        ticketRepository.findByRegistration_RegistrationId(registrationId)
                .ifPresent(ticket -> {
                    ticket.setStatus(TicketStatus.CANCELLED);
                    ticketRepository.save(ticket);
                });
    }

    @Transactional
    public String checkInAttendee(String qrToken, String organiserEmail) {
        Ticket ticket = ticketRepository.findByToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid Ticket QR Code."));

        // Validate Ownership
        if (!ticket.getRegistration().getEvent().getOrganiser().getEmail().equals(organiserEmail)) {
            throw new SecurityException("You are not authorized to scan tickets for this event.");
        }

        if (ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new IllegalStateException("This ticket has been cancelled and is invalid.");
        }

        // Idempotency: Double-scans return a success code with a distinct message, preventing scanner crash loops
        if (ticket.getStatus() == TicketStatus.USED) {
            return "Ticket already scanned. Attendee is already checked in.";
        }

        ticket.setStatus(TicketStatus.USED);
        ticketRepository.save(ticket);

        return "Check-in successful! Ticket verified.";
    }

    @Transactional(readOnly = true)
    public TicketResponse getTicketMetadata(String token, String attendeeEmail) {
        Ticket ticket = ticketRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found."));

        if (!ticket.getRegistration().getUser().getEmail().equals(attendeeEmail)) {
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
}
