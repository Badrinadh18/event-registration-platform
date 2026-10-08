package com.eventplatform.controller;

import com.eventplatform.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/events")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final EventService eventService;

    @PatchMapping("/{id}/feature")
    public ResponseEntity<String> featureEvent(@PathVariable UUID id, @RequestParam boolean status) {
        eventService.toggleFeatureStatus(id, status);
        return ResponseEntity.ok("Event featured status updated to: " + status);
    }

    @PatchMapping("/{id}/suppress")
    public ResponseEntity<String> suppressEvent(@PathVariable UUID id, @RequestParam boolean status) {
        eventService.toggleSuppressStatus(id, status);
        return ResponseEntity.ok("Event suppressed status updated to: " + status);
    }
}
