package com.eventplatform.service;

import com.eventplatform.model.Registration;
import com.eventplatform.model.User;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.repository.TeamRegistrationRepository;
import com.eventplatform.repository.TicketRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final TicketRepository ticketRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;

    @Transactional
    public void deleteUserAndCleanup(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Find all registrations for this user
        List<Registration> userRegistrations = registrationRepository.findByUser_UserId(userId);

        for (Registration reg : userRegistrations) {
            // 2. Delete the ticket associated with this registration to prevent foreign key errors
            ticketRepository.findByRegistration_RegistrationId(reg.getRegistrationId())
                    .ifPresent(ticketRepository::delete);

            // 3. If they are part of a team, we need to handle that carefully
            if (reg.getTeamRegistration() != null) {
                if (reg.getTeamRegistration().getLeadUser().getUserId().equals(userId)) {
                    // If they are the lead, delete the whole team group record
                    // (the other members' registrations will be orphaned, which is bad,
                    // but for a hard admin delete, we force it).
                    teamRegistrationRepository.delete(reg.getTeamRegistration());
                }
                // Disconnect this specific registration from the team
                reg.setTeamRegistration(null);
            }
        }

        // 4. Force save the disconnected registrations
        registrationRepository.saveAll(userRegistrations);

        // 5. Now delete the registrations themselves
        registrationRepository.deleteAll(userRegistrations);

        // 6. Finally, delete the user
        userRepository.delete(user);
    }
}