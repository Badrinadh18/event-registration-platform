package com.eventplatform.service;

import com.eventplatform.dto.request.EventCreateRequest;
import com.eventplatform.model.Event;
import com.eventplatform.model.User;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.repository.EventRepository;
import com.eventplatform.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;

    @Transactional
    public Event createEvent(EventCreateRequest request, String organiserEmail) {
        User organiser = userRepository.findByEmail(organiserEmail)
                .orElseThrow(() -> new IllegalArgumentException("Organiser not found"));

        Event event = Event.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .venue(request.getVenue())
                .eventDate(request.getEventDate())
                .maxCapacity(request.getMaxCapacity())
                .price(request.getPrice())
                .organiser(organiser)
                .status(EventStatus.DRAFT)
                .build();

        return eventRepository.save(event);
    }

    @Transactional
    public void changeEventState(UUID eventId, String userEmail, EventStatus newState) {
        Event event = getOrganiserEvent(eventId, userEmail);
        event.setStatus(newState);
        eventRepository.save(event);
    }

    @Transactional
    public void cancelEvent(UUID eventId, String userEmail) {
        Event event = getOrganiserEvent(eventId, userEmail);
        event.setStatus(EventStatus.CANCELLED);
        event.setRefundEligible(true); // Triggers refund eligibility flag
        eventRepository.save(event);

        // Notification logic would be triggered here in Phase 5 to alert attendees
    }

    @Transactional
    public void softDeleteEvent(UUID eventId, String userEmail) {
        Event event = getOrganiserEvent(eventId, userEmail);
        // Hibernate's @SQLDelete automatically handles the boolean swap
        eventRepository.delete(event);
    }

    // --- Admin Functions ---

    @Transactional
    public void toggleFeatureStatus(UUID eventId, boolean featureStatus) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        event.setFeatured(featureStatus);
        eventRepository.save(event);
    }

    @Transactional
    public void toggleSuppressStatus(UUID eventId, boolean suppressStatus) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        event.setSuppressed(suppressStatus);
        eventRepository.save(event);
    }

    // Helper method for authorization
    private Event getOrganiserEvent(UUID eventId, String email) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        User requestingUser = userRepository.findByEmail(email)
                .orElseThrow(() -> new SecurityException("User not found"));

        if (requestingUser.getRole() != com.eventplatform.model.enums.Role.ADMIN &&
                !event.getOrganiser().getEmail().equals(email)) {
            throw new SecurityException("Unauthorized access to event");
        }
        return event;
    }
}