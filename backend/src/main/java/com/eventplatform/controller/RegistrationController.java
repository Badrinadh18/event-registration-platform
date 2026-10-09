package com.eventplatform.controller;

import com.eventplatform.dto.request.TeamRegisterRequest;
import com.eventplatform.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping("/{eventId}/register")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ADMIN')")
    public ResponseEntity<String> registerSingle(@PathVariable UUID eventId, Authentication authentication) {
        String response = registrationService.registerSingleUser(eventId, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{eventId}/team-register")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ADMIN')")
    public ResponseEntity<String> registerTeam(
            @PathVariable UUID eventId,
            @Valid @RequestBody TeamRegisterRequest request,
            Authentication authentication) {
        String response = registrationService.registerTeam(eventId, authentication.getName(), request.getMemberEmails());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/registrations/{registrationId}")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ADMIN')")
    public ResponseEntity<String> cancelRegistration(@PathVariable UUID registrationId, Authentication authentication) {
        String response = registrationService.cancelSingleRegistration(registrationId, authentication.getName());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/team-registrations/{teamRegId}")
    @PreAuthorize("hasAnyRole('ATTENDEE', 'ADMIN')")
    public ResponseEntity<String> cancelTeamRegistration(@PathVariable UUID teamRegId, Authentication authentication) {
        String response = registrationService.cancelTeamRegistration(teamRegId, authentication.getName());
        return ResponseEntity.ok(response);
    }
}