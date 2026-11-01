package com.eventplatform.service;

import com.eventplatform.dto.request.EventCreateRequest;
import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.model.enums.RegistrationStatus;
import com.eventplatform.repository.EventRepository;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Service responsible for the complete lifecycle of Events.
 * Handles creation, status transitions, cancellations, and administrative overrides.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final RegistrationRepository registrationRepository;
    private final NotificationService notificationService;

    /**
     * Creates a new event in DRAFT status.
     */
    @Transactional
    public Event createEvent(EventCreateRequest request, String organiserEmail) {
        log.debug("Organiser [{}] is attempting to create a new event: [{}]", organiserEmail, request.getTitle());

        User organiser = userRepository.findByEmail(organiserEmail)
                .orElseThrow(() -> {
                    log.warn("Event creation failed: Organiser with email [{}] not found.", organiserEmail);
                    return new IllegalArgumentException("Organiser not found");
                });

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .venue(request.getVenue())
                .eventDate(request.getEventDate())
                .maxCapacity(request.getMaxCapacity())
                .waitlistCapacity(request.getWaitlistCapacity())
                .price(request.getPrice())
                .organiser(organiser)
                .status(EventStatus.DRAFT)
                .build();

        Event savedEvent = eventRepository.save(event);
        log.info("Event successfully created: [{}] (ID: [{}]) by Organiser [{}]",
                savedEvent.getTitle(), savedEvent.getEventId(), organiserEmail);

        return savedEvent;
    }

    /**
     * Changes the publishing state of an event (e.g., DRAFT to PUBLISHED).
     */
    @Transactional
    public void changeEventState(UUID eventId, String userEmail, EventStatus newState) {
        Event event = getOrganiserEvent(eventId, userEmail);

        EventStatus oldState = event.getStatus();
        event.setStatus(newState);
        eventRepository.save(event);

        log.info("Event [{}] state transitioned from [{}] to [{}] by User [{}]",
                eventId, oldState, newState, userEmail);
    }

    /**
     * Cancels an active event, flags it for refunds, and triggers mass notifications to attendees.
     */
    @Transactional
    public void cancelEvent(UUID eventId, String userEmail) {
        log.info("Initiating event cancellation sequence for Event [{}] requested by User [{}]", eventId, userEmail);

        Event event = getOrganiserEvent(eventId, userEmail);
        event.setStatus(EventStatus.CANCELLED);
        event.setRefundEligible(true); // Triggers refund eligibility flag
        eventRepository.save(event);

        // Fetch all confirmed users using the new repository method
        List<Registration> affectedRegistrations = registrationRepository
                .findByEvent_EventIdAndStatus(eventId, RegistrationStatus.CONFIRMED);

        log.info("Event [{}] cancelled. Found [{}] confirmed registrations to notify.",
                eventId, affectedRegistrations.size());

        // Dispatch batch cancellation emails asynchronously
        if (!affectedRegistrations.isEmpty()) {
            notificationService.sendEventCancelledByOrganiser(event, affectedRegistrations);
            log.info("Mass cancellation notifications dispatched for Event [{}]", eventId);
        }
    }

    /**
     * Performs a soft delete on an event (hides it from the platform without destroying DB records).
     */
    @Transactional
    public void softDeleteEvent(UUID eventId, String userEmail) {
        Event event = getOrganiserEvent(eventId, userEmail);

        // Hibernate's @SQLDelete automatically handles the boolean swap
        eventRepository.delete(event);

        log.info("Event [{}] was softly deleted by User [{}]", eventId, userEmail);
    }

    // --- Admin Functions ---

    /**
     * Admin action to toggle whether an event is featured on the platform.
     */
    @Transactional
    public void toggleFeatureStatus(UUID eventId, boolean featureStatus) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        event.setFeatured(featureStatus);
        eventRepository.save(event);

        log.info("Admin updated feature status for Event [{}] to [{}]", eventId, featureStatus);
    }

    /**
     * Admin action to suppress (hide) an event for violations.
     */
    @Transactional
    public void toggleSuppressStatus(UUID eventId, boolean suppressStatus) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        event.setSuppressed(suppressStatus);
        eventRepository.save(event);

        log.info("Admin updated suppression status for Event [{}] to [{}]", eventId, suppressStatus);
    }

    /**
     * Helper method to fetch an event and verify the requesting user owns it (or is an Admin).
     */
    private Event getOrganiserEvent(UUID eventId, String email) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> {
                    log.warn("Event access failed: Event [{}] not found.", eventId);
                    return new IllegalArgumentException("Event not found");
                });

        User requestingUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new SecurityException("User not found"));

        if (requestingUser.getRole() != com.eventplatform.model.enums.Role.ADMIN &&
                !event.getOrganiser().getEmail().equals(email)) {

            // SECURITY AUDIT LOG: Someone is trying to modify an event they don't own
            log.warn("SECURITY INCIDENT: User [{}] attempted unauthorized access to modify Event [{}]", email, eventId);
            throw new SecurityException("Unauthorized access to event");
        }

        return event;
    }

    /**
     * Retrieves all active events for the public directory.
     */
    public List<Event> getAllEvents() {
        log.debug("Fetching all public events for directory view.");
        return eventRepository.findAll();
    }
}