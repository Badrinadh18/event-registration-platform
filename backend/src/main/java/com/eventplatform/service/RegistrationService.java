package com.eventplatform.service;

import com.eventplatform.exception.DuplicateRegistrationException;
import com.eventplatform.exception.ResourceNotFoundException;
import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.TeamRegistration;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.model.enums.RegistrationStatus;
import com.eventplatform.repository.EventRepository;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.repository.TeamRegistrationRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final UserRepository userRepository;

    @Transactional
    public String registerSingleUser(UUID eventId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (registrationRepository.existsByUser_UserIdAndEvent_EventIdAndStatusNot(user.getUserId(), eventId, RegistrationStatus.CANCELLED)) {
            throw new IllegalStateException("You already have an active registration or waitlist for this event.");
        }

        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new IllegalStateException("Event is not open for registration.");
        }

        Registration registration = Registration.builder()
                .user(user)
                .event(event)
                .build();

        if (event.getCurrentConfirmedCount() < event.getMaxCapacity()) {
            registration.setStatus(RegistrationStatus.CONFIRMED);
            event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + 1);
            eventRepository.save(event);
            registrationRepository.save(registration);
            return "Registration confirmed.";
        } else if (event.getCurrentWaitlistCount() < event.getWaitlistCapacity()) {
            registration.setStatus(RegistrationStatus.WAITLISTED);
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() + 1);
            eventRepository.save(event);
            registrationRepository.save(registration);
            return "Event full. You have been added to the waitlist.";
        } else {
            throw new IllegalStateException("Event and waitlist are completely full.");
        }
    }

    @Transactional
    public String cancelSingleRegistration(UUID registrationId, String email) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));

        if (registration.getTeamRegistration() != null) {
            throw new IllegalStateException("Cannot individually cancel a team ticket. The lead user must cancel the entire team group.");
        }

        if (!registration.getUser().getEmail().equals(email)) {
            throw new SecurityException("Unauthorized action.");
        }

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            return "Already cancelled.";
        }

        RegistrationStatus oldStatus = registration.getStatus();
        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        Event event = eventRepository.findByIdForUpdate(registration.getEvent().getEventId())
                .orElseThrow();

        if (oldStatus == RegistrationStatus.WAITLISTED) {
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);
            eventRepository.save(event);
            return "Waitlist reservation cancelled.";
        }

        if (oldStatus == RegistrationStatus.CONFIRMED) {
            event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() - 1);

            Optional<Registration> nextInLine = registrationRepository
                    .findFirstByEvent_EventIdAndStatusOrderByRegisteredAtAsc(event.getEventId(), RegistrationStatus.WAITLISTED);

            if (nextInLine.isPresent()) {
                Registration promoted = nextInLine.get();
                promoted.setStatus(RegistrationStatus.CONFIRMED);
                registrationRepository.save(promoted);

                event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + 1);
                event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);
            }

            eventRepository.save(event);
        }
        return "Registration cancelled successfully.";
    }

    @Transactional
    public String registerTeam(UUID eventId, String leadEmail, List<String> memberEmails) {
        User leadUser = userRepository.findByEmail(leadEmail)
                .orElseThrow(() -> new IllegalArgumentException("Lead user not found."));

        List<User> members = userRepository.findByEmailIn(memberEmails);
        if (members.size() != memberEmails.size()) {
            throw new IllegalArgumentException("One or more team member emails do not have registered accounts on the platform.");
        }

        List<UUID> allUserIds = new ArrayList<>();
        allUserIds.add(leadUser.getUserId());
        members.forEach(m -> allUserIds.add(m.getUserId()));

        if (registrationRepository.existsByUser_UserIdInAndEvent_EventIdAndStatusNot(allUserIds, eventId, RegistrationStatus.CANCELLED)) {
            throw new DuplicateRegistrationException("The lead user or a team member is already registered or waitlisted for this event.");
        }

        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new IllegalStateException("Event is not open for registration.");
        }

        int totalSeatsRequired = 1 + members.size();

        if (event.getCurrentConfirmedCount() + totalSeatsRequired > event.getMaxCapacity()) {
            throw new IllegalStateException("Not enough seats available for a team of this size.");
        }

        event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + totalSeatsRequired);
        eventRepository.save(event);

        TeamRegistration teamReg = TeamRegistration.builder()
                .leadUser(leadUser)
                .event(event)
                .memberCount(totalSeatsRequired)
                .groupToken(UUID.randomUUID().toString())
                .memberEmails(memberEmails)
                .build();
        teamReg = teamRegistrationRepository.save(teamReg);

        List<Registration> registrationsToSave = new ArrayList<>();

        registrationsToSave.add(Registration.builder()
                .user(leadUser)
                .event(event)
                .status(RegistrationStatus.CONFIRMED)
                .teamRegistration(teamReg)
                .build());

        for (User member : members) {
            registrationsToSave.add(Registration.builder()
                    .user(member)
                    .event(event)
                    .status(RegistrationStatus.CONFIRMED)
                    .teamRegistration(teamReg)
                    .build());
        }

        registrationRepository.saveAll(registrationsToSave);

        return "Team registration confirmed. Group Token: " + teamReg.getGroupToken() + ". Individual registrations generated.";
    }

    @Transactional
    public String cancelTeamRegistration(UUID teamRegId, String leadEmail) {
        TeamRegistration teamRegistration = teamRegistrationRepository.findByIdAndLeadUser_Email(teamRegId, leadEmail)
                .orElseThrow(() -> new SecurityException("Team registration not found or unauthorized"));

        Integer freedSeats = teamRegistration.getMemberCount();
        Event event = eventRepository.findByIdForUpdate(teamRegistration.getEvent().getEventId())
                .orElseThrow();

        List<Registration> teamMembers = registrationRepository.findByTeamRegistration_Id(teamRegId);
        for (Registration reg : teamMembers) {
            reg.setStatus(RegistrationStatus.CANCELLED);
            reg.setTeamRegistration(null);
        }
        registrationRepository.saveAll(teamMembers);

        teamRegistrationRepository.delete(teamRegistration);

        event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() - freedSeats);
        List<Registration> usersToPromote = registrationRepository.findNextWaitlistedUsers(event.getEventId(), freedSeats);

        for (Registration promotedUser : usersToPromote) {
            promotedUser.setStatus(RegistrationStatus.CONFIRMED);
            registrationRepository.save(promotedUser);
            event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + 1);
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);
        }

        eventRepository.save(event);
        return String.format("Team registration cancelled. %d seats freed, %d waitlisted users promoted.", freedSeats, usersToPromote.size());
    }
}