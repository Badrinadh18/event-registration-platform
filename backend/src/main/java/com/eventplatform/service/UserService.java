package com.eventplatform.service;

import com.eventplatform.model.Registration;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.Role;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.repository.TeamRegistrationRepository;
import com.eventplatform.repository.TicketRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service responsible for managing user accounts at an administrative level.
 * Handles complex, destructive cleanup operations required before a user can be safely deleted.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final TicketRepository ticketRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;

    /**
     * Performs a hard, cascading delete of a user from the system.
     * Bypasses standard business rules (like waitlist promotion) to forcefully clean up
     * foreign key dependencies (Tickets, Team Registrations) before deletion.
     *
     * @param userId The UUID of the user to be permanently deleted.
     */
    @Transactional
    public void deleteUserAndCleanup(UUID userId) {
        log.info("Initiating administrative hard delete for User [{}]", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.warn("Hard delete aborted: User [{}] not found in the database.", userId);
                    return new IllegalArgumentException("User not found");
                });

        // 1. Find all registrations for this user
        List<Registration> userRegistrations = registrationRepository.findByUser_UserId(userId);
        log.info("Found [{}] active registrations tied to User [{}] for cleanup.", userRegistrations.size(), userId);

        for (Registration reg : userRegistrations) {
            // 2. Delete the ticket associated with this registration to prevent foreign key errors
            ticketRepository.findByRegistration_RegistrationId(reg.getRegistrationId())
                    .ifPresent(ticket -> {
                        ticketRepository.delete(ticket);
                        // DEBUG level used here to prevent log spam if the user has dozens of tickets
                        log.debug("Force-deleted Ticket [{}] associated with Registration [{}]",
                                ticket.getId(), reg.getRegistrationId());
                    });

            // 3. If they are part of a team, we need to handle that carefully
            if (reg.getTeamRegistration() != null) {
                if (reg.getTeamRegistration().getLeadUser().getUserId().equals(userId)) {
                    // If they are the lead, delete the whole team group record
                    // (the other members' registrations will be orphaned, which is bad,
                    // but for a hard admin delete, we force it).
                    log.warn("Admin Force-Delete: User [{}] is the lead of Team Registration [{}]. " +
                                    "Deleting the team group. Warning: Other team members will be orphaned.",
                            userId, reg.getTeamRegistration().getId());
                    teamRegistrationRepository.delete(reg.getTeamRegistration());
                }
                // Disconnect this specific registration from the team
                reg.setTeamRegistration(null);
            }
        }

        if (!userRegistrations.isEmpty()) {
            // 4. Force save the disconnected registrations to clear foreign keys
            registrationRepository.saveAll(userRegistrations);
            log.debug("Successfully detached all team associations for User [{}]'s registrations.", userId);

            // 5. Now delete the registrations themselves
            registrationRepository.deleteAll(userRegistrations);
            log.info("Successfully destroyed [{}] registrations for User [{}].", userRegistrations.size(), userId);
        }

        // 6. Finally, delete the user
        userRepository.delete(user);
        log.info("User [{}] (Email: [{}]) has been permanently deleted from the system.", userId, user.getEmail());
    }

    /**
     * Admin Action: Fetches all users who are Admins or Organisers.
     */
    @Transactional(readOnly = true)
    public List<User> getManagementUsers() {
        log.debug("Fetching management users (Admins/Organisers) for the admin dashboard.");
        return userRepository.findDistinctByRolesIn(java.util.List.of(Role.ADMIN, Role.ORGANISER));
    }

    /**
     * Admin Action: Grants an additional role to an existing user.
     */
    @Transactional
    public void grantRole(String targetEmail, Role newRole, String adminEmail) {
        log.info("Admin [{}] is attempting to grant role [{}] to User [{}]", adminEmail, newRole, targetEmail);

        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + targetEmail));

        if (user.getRoles().contains(newRole)) {
            throw new IllegalStateException("User already possesses the " + newRole + " role.");
        }

        user.getRoles().add(newRole);
        userRepository.save(user);

        log.info("Successfully granted role [{}] to User [{}]", newRole, targetEmail);
    }

    /**
     * Admin Action: Revokes a role. If a user loses ORGANISER/ADMIN, they fall back to ATTENDEE.
     * This acts as the "delete user from admin dashboard" function you requested.
     */
    @Transactional
    public void revokeRole(String targetEmail, Role roleToRemove, String adminEmail) {
        log.info("Admin [{}] is revoking role [{}] from User [{}]", adminEmail, roleToRemove, targetEmail);

        if (roleToRemove == Role.ATTENDEE) {
            throw new IllegalArgumentException("Cannot revoke the base ATTENDEE role. If you want to remove the user entirely, use the hard delete function.");
        }

        User user = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found with email: " + targetEmail));

        if (!user.getRoles().contains(roleToRemove)) {
            throw new IllegalStateException("User does not possess the " + roleToRemove + " role.");
        }

        user.getRoles().remove(roleToRemove);

        // Failsafe: Ensure the user always has at least the ATTENDEE role so they aren't locked out of their purchased tickets
        if (user.getRoles().isEmpty()) {
            user.getRoles().add(Role.ATTENDEE);
        }

        userRepository.save(user);

        log.info("Successfully revoked role [{}] from User [{}]", roleToRemove, targetEmail);
    }
}