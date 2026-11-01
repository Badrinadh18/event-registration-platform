package com.eventplatform.service;

import com.eventplatform.model.Registration;
import com.eventplatform.model.User;
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
}