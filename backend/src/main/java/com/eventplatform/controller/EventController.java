package com.eventplatform.controller;

import com.eventplatform.dto.request.EventCreateRequest;
import com.eventplatform.model.Event;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventService eventService;

    // Fetch all events for the dashboard
    @GetMapping
    public ResponseEntity<List<Event>> getAllEvents() {
        List<Event> events = eventService.getAllEvents();
        return ResponseEntity.ok(events);
    }

    @PreAuthorize("hasAnyRole('ORGANISER', 'ADMIN')")
    @PostMapping
    public ResponseEntity<Event> createEvent(@Valid @RequestBody EventCreateRequest request, Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED).body(eventService.createEvent(request, auth.getName()));
    }

    @PreAuthorize("hasAnyRole('ORGANISER', 'ADMIN')")
    @PatchMapping("/{id}/publish")
    public ResponseEntity<String> publishEvent(@PathVariable UUID id, Authentication auth) {
        eventService.changeEventState(id, auth.getName(), EventStatus.PUBLISHED);
        return ResponseEntity.ok("Event published successfully");
    }

    @PreAuthorize("hasAnyRole('ORGANISER', 'ADMIN')")
    @PatchMapping("/{id}/unpublish")
    public ResponseEntity<String> unpublishEvent(@PathVariable UUID id, Authentication auth) {
        eventService.changeEventState(id, auth.getName(), EventStatus.DRAFT);
        return ResponseEntity.ok("Event unpublished and reverted to Draft state");
    }

    @PreAuthorize("hasAnyRole('ORGANISER', 'ADMIN')")
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<String> cancelEvent(@PathVariable UUID id, Authentication auth) {
        eventService.cancelEvent(id, auth.getName());
        return ResponseEntity.ok("Event cancelled. Eligible for refunds.");
    }

    @PreAuthorize("hasAnyRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteEvent(@PathVariable UUID id, Authentication auth) {
        eventService.softDeleteEvent(id, auth.getName());
        return ResponseEntity.ok("Event deleted");
    }
}
