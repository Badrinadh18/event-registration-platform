package com.eventplatform.controller;

import com.eventplatform.dto.response.TicketResponse;
import com.eventplatform.service.TicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping("/check-in")
    @PreAuthorize("hasAnyRole('ORGANISER', 'ADMIN')")
    public ResponseEntity<String> scanTicket(@RequestParam String token, Authentication authentication) {
        String response = ticketService.checkInAttendee(token, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{token}")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ADMIN')")
    public ResponseEntity<TicketResponse> downloadTicketMetadata(@PathVariable String token, Authentication authentication) {
        TicketResponse metadata = ticketService.getTicketMetadata(token, authentication.getName());
        return ResponseEntity.ok(metadata);
    }
}
