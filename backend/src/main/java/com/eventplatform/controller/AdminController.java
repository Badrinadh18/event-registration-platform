package com.eventplatform.controller;

import com.eventplatform.dto.response.UserAdminDtoResponse;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
import com.eventplatform.service.EventService;
import com.eventplatform.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final EventService eventService;
    private final UserService userService;

    @PatchMapping("/events/{id}/feature")
    public ResponseEntity<String> featureEvent(@PathVariable UUID id, @RequestParam boolean status) {
        eventService.toggleFeatureStatus(id, status);
        return ResponseEntity.ok("Event featured status updated to: " + status);
    }

    @PatchMapping("/events/{id}/suppress")
    public ResponseEntity<String> suppressEvent(@PathVariable UUID id, @RequestParam boolean status) {
        eventService.toggleSuppressStatus(id, status);
        return ResponseEntity.ok("Event suppressed status updated to: " + status);
    }
    /**
     * Retrieves a list of all Admins and Organisers for the Admin Dashboard.
     * We map the User entities to a simple DTO structure to hide password hashes.
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserAdminDtoResponse>> getManagementUsers() {
        List<User> users = userService.getManagementUsers();

        List<UserAdminDtoResponse> response = users.stream().map(user -> new UserAdminDtoResponse(
                        user.getUserId(),
                        user.getName(),
                        user.getEmail(),
                        user.getRoles(),
                        user.isVerified()
                )).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    /**
     * Grants a new role to an existing user.
     * Example Body: { "email": "john@example.com", "role": "ORGANISER" }
     */
    @PostMapping("/users/grant-role")
    public ResponseEntity<String> grantRole(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails adminDetails) {

        String targetEmail = request.get("email");
        Role role = Role.valueOf(request.get("role").toUpperCase());

        userService.grantRole(targetEmail, role, adminDetails.getUsername());

        return ResponseEntity.ok("Successfully granted " + role + " role to " + targetEmail);
    }

    /**
     * Revokes a role from a user.
     * Example Body: { "email": "john@example.com", "role": "ORGANISER" }
     */
    @PostMapping("/users/revoke-role")
    public ResponseEntity<String> revokeRole(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetails adminDetails) {

        String targetEmail = request.get("email");
        Role role = Role.valueOf(request.get("role").toUpperCase());

        userService.revokeRole(targetEmail, role, adminDetails.getUsername());

        return ResponseEntity.ok("Successfully revoked " + role + " role from " + targetEmail);
    }
}
