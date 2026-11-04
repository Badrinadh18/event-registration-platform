package com.eventplatform.service;

import com.eventplatform.exception.DuplicateRegistrationException;
import com.eventplatform.exception.ResourceNotFoundException;
import com.eventplatform.model.*;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.model.enums.RegistrationStatus;
import com.eventplatform.repository.EventRepository;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.repository.TeamRegistrationRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Core business logic for managing event registrations, capacity constraints,
 * team bookings, and automated waitlist promotions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final TeamRegistrationRepository teamRegistrationRepository;
    private final UserRepository userRepository;
    private final TicketService ticketService;
    private final NotificationService notificationService;

    @Transactional
    public String registerSingleUser(UUID eventId, String email) {
        log.debug("User [{}] attempting single registration for Event [{}]", email, eventId);

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (registrationRepository.existsByUser_UserIdAndEvent_EventIdAndStatusNot(user.getUserId(), eventId, RegistrationStatus.CANCELLED)) {
            log.warn("Registration blocked: User [{}] already has an active registration/waitlist for Event [{}]", email, eventId);
            throw new IllegalStateException("You already have an active registration or waitlist for this event.");
        }

        // Acquires a Pessimistic Write Lock to prevent race conditions during concurrent bookings
        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        log.debug("Acquired database write lock for Event [{}]", eventId);

        if (event.getStatus() != EventStatus.PUBLISHED) {
            log.warn("Registration blocked: Event [{}] is in status [{}]", eventId, event.getStatus());
            throw new IllegalStateException("Event is not open for registration.");
        }
        // Block new registrations if event is suppressed
        if (event.isSuppressed()) {
            log.warn("Registration blocked: Event [{}] is suppressed.", event.getEventId());
            throw new IllegalStateException("Registration is currently unavailable for this event.");
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

            Ticket ticket = ticketService.generateTicket(registration);
            notificationService.sendRegistrationConfirmed(registration, ticket);

            log.info("Registration CONFIRMED for User [{}] to Event [{}]. Event capacity now: {}/{}",
                    email, eventId, event.getCurrentConfirmedCount(), event.getMaxCapacity());
            return "Registration confirmed.";

        } else if (event.getCurrentWaitlistCount() < event.getWaitlistCapacity()) {
            registration.setStatus(RegistrationStatus.WAITLISTED);
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() + 1);
            eventRepository.save(event);
            registrationRepository.save(registration);

            notificationService.sendWaitlistJoined(registration);

            log.info("Registration WAITLISTED for User [{}] to Event [{}]. Waitlist size now: {}/{}",
                    email, eventId, event.getCurrentWaitlistCount(), event.getWaitlistCapacity());
            return "Event full. You have been added to the waitlist.";

        } else {
            log.warn("Registration rejected: Event [{}] and its waitlist are completely full.", eventId);
            throw new IllegalStateException("Event and waitlist are completely full.");
        }
    }

    @Transactional
    public String cancelSingleRegistration(UUID registrationId, String email) {
        log.info("User [{}] requesting cancellation of Registration [{}]", email, registrationId);

        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new IllegalArgumentException("Registration not found"));

        if (registration.getTeamRegistration() != null) {
            log.warn("Cancellation blocked: User [{}] attempted to single-cancel a team ticket.", email);
            throw new IllegalStateException("Cannot individually cancel a team ticket. The lead user must cancel the entire team group.");
        }

        if (!registration.getUser().getEmail().equals(email)) {
            log.warn("SECURITY INCIDENT: User [{}] attempted to cancel Registration [{}] owned by [{}]",
                    email, registrationId, registration.getUser().getEmail());
            throw new SecurityException("Unauthorized action.");
        }

        if (registration.getStatus() == RegistrationStatus.CANCELLED) {
            return "Already cancelled.";
        }

        RegistrationStatus oldStatus = registration.getStatus();
        registration.setStatus(RegistrationStatus.CANCELLED);
        registrationRepository.save(registration);

        ticketService.cancelTicket(registration.getRegistrationId());
        log.info("Registration [{}] successfully cancelled. Ticket invalidated.", registrationId);

        Event event = eventRepository.findByIdForUpdate(registration.getEvent().getEventId())
                .orElseThrow();

        if (oldStatus == RegistrationStatus.WAITLISTED) {
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);
            eventRepository.save(event);
            log.info("Removed Registration [{}] from Event [{}] waitlist.", registrationId, event.getEventId());
            return "Waitlist reservation cancelled.";
        }

        if (oldStatus == RegistrationStatus.CONFIRMED) {
            event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() - 1);

            // Waitlist Promotion Logic
            Optional<Registration> nextInLine = registrationRepository
                    .findFirstByEvent_EventIdAndStatusOrderByRegisteredAtAsc(event.getEventId(), RegistrationStatus.WAITLISTED);

            if (nextInLine.isPresent()) {
                Registration promoted = nextInLine.get();
                promoted.setStatus(RegistrationStatus.CONFIRMED);
                registrationRepository.save(promoted);

                Ticket newTicket = ticketService.generateTicket(promoted);
                notificationService.sendWaitlistPromoted(promoted, newTicket);

                event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + 1);
                event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);

                log.info("Waitlist Promotion: User [{}] promoted to CONFIRMED for Event [{}] due to cancellation.",
                        promoted.getUser().getEmail(), event.getEventId());
            }

            eventRepository.save(event);
        }
        return "Registration cancelled successfully.";
    }

    @Transactional
    public String registerTeam(UUID eventId, String leadEmail, List<String> memberEmails) {
        log.info("User [{}] attempting TEAM registration for Event [{}] with [{}] members.",
                leadEmail, eventId, memberEmails.size());

        User leadUser = userRepository.findByEmail(leadEmail)
                .orElseThrow(() -> new IllegalArgumentException("Lead user not found."));

        List<User> members = userRepository.findByEmailIn(memberEmails);
        if (members.size() != memberEmails.size()) {
            log.warn("Team Registration failed: One or more member emails do not exist in the database.");
            throw new IllegalArgumentException("One or more team member emails do not have registered accounts on the platform.");
        }

        List<UUID> allUserIds = new ArrayList<>();
        allUserIds.add(leadUser.getUserId());
        members.forEach(m -> allUserIds.add(m.getUserId()));

        if (registrationRepository.existsByUser_UserIdInAndEvent_EventIdAndStatusNot(allUserIds, eventId, RegistrationStatus.CANCELLED)) {
            // 2. If it fails, fetch the actual active registrations so we can name the culprits
            List<Registration> activeRegs = registrationRepository.findByEvent_EventId(eventId).stream()
                    .filter(reg -> allUserIds.contains(reg.getUser().getUserId()))
                    .filter(reg -> reg.getStatus() != RegistrationStatus.CANCELLED)
                    .toList();

            // 3. Extract their emails
            List<String> alreadyRegisteredEmails = activeRegs.stream()
                    .map(reg -> reg.getUser().getEmail())
                    .distinct()
                    .toList();
            // 4. Throw the exact requested message
            String emailsStr = String.join(", ", alreadyRegisteredEmails);
            log.warn("Team Registration blocked: A requested members ["+emailsStr+"] are already registered for Event [{}]", eventId);
            throw new DuplicateRegistrationException("The following lead user or a team members["+emailsStr+"] are already registered or waitlisted for this event.");
        }

        Event event = eventRepository.findByIdForUpdate(eventId)
                .orElseThrow(() -> new ResourceNotFoundException("Event not found"));

        if (event.getStatus() != EventStatus.PUBLISHED) {
            throw new IllegalStateException("Event is not open for registration.");
        }

        //Block new registrations if event is suppressed
        if (event.isSuppressed()) {
            log.warn("Registration blocked: Event [{}] is suppressed.", event.getEventId());
            throw new IllegalStateException("Registration is currently unavailable for this event.");
        }

        int totalSeatsRequired = 1 + members.size();

        if (event.getCurrentConfirmedCount() + totalSeatsRequired > event.getMaxCapacity()) {
            log.warn("Team Registration blocked: Not enough seats for team of size [{}]. Event [{}] has {}/{} confirmed.",
                    totalSeatsRequired, eventId, event.getCurrentConfirmedCount(), event.getMaxCapacity());
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
        registrationsToSave.add(Registration.builder().user(leadUser).event(event).status(RegistrationStatus.CONFIRMED).teamRegistration(teamReg).build());
        for (User member : members) {
            registrationsToSave.add(Registration.builder().user(member).event(event).status(RegistrationStatus.CONFIRMED).teamRegistration(teamReg).build());
        }

        registrationRepository.saveAll(registrationsToSave);
        log.info("Team Registration CONFIRMED. Event [{}], GroupToken [{}], Size [{}]",
                eventId, teamReg.getGroupToken(), totalSeatsRequired);

        for (Registration savedReg : registrationsToSave) {
            Ticket ticket = ticketService.generateTicket(savedReg);
            notificationService.sendRegistrationConfirmed(savedReg, ticket);
        }

        return "Team registration confirmed. Group Token: " + teamReg.getGroupToken() + ". Individual registrations generated.";
    }

    @Transactional
    public String cancelTeamRegistration(UUID teamRegId, String leadEmail) {
        log.info("User [{}] attempting to cancel entire Team Registration [{}]", leadEmail, teamRegId);

        TeamRegistration teamRegistration = teamRegistrationRepository.findByIdAndLeadUser_Email(teamRegId, leadEmail)
                .orElseThrow(() -> {
                    log.warn("Team cancellation failed: Registration [{}] not found or not owned by [{}]", teamRegId, leadEmail);
                    return new SecurityException("Team registration not found or unauthorized");
                });

        Integer freedSeats = teamRegistration.getMemberCount();
        Event event = eventRepository.findByIdForUpdate(teamRegistration.getEvent().getEventId())
                .orElseThrow();

        List<Registration> teamMembers = registrationRepository.findByTeamRegistration_Id(teamRegId);
        for (Registration reg : teamMembers) {
            reg.setStatus(RegistrationStatus.CANCELLED);
            reg.setTeamRegistration(null);
            ticketService.cancelTicket(reg.getRegistrationId());
        }
        registrationRepository.saveAll(teamMembers);
        teamRegistrationRepository.delete(teamRegistration);

        log.info("Team Registration [{}] cancelled successfully. Freed [{}] seats for Event [{}]",
                teamRegId, freedSeats, event.getEventId());

        event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() - freedSeats);

        // Waitlist Bulk Promotion Logic
        List<Registration> usersToPromote = registrationRepository.findNextWaitlistedUsers(event.getEventId(), freedSeats);

        for (Registration promotedUser : usersToPromote) {
            promotedUser.setStatus(RegistrationStatus.CONFIRMED);
            registrationRepository.save(promotedUser);

            Ticket newTicket = ticketService.generateTicket(promotedUser);
            notificationService.sendWaitlistPromoted(promotedUser, newTicket);

            event.setCurrentConfirmedCount(event.getCurrentConfirmedCount() + 1);
            event.setCurrentWaitlistCount(event.getCurrentWaitlistCount() - 1);
        }

        eventRepository.save(event);
        log.info("Bulk Waitlist Promotion complete for Event [{}]: [{}] users promoted.",
                event.getEventId(), usersToPromote.size());

        return String.format("Team registration cancelled. %d seats freed, %d waitlisted users promoted.", freedSeats, usersToPromote.size());
    }
}