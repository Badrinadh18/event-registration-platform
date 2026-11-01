package com.eventplatform.service;

import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.Ticket;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service responsible for formatting and orchestrating email notifications
 * for critical business events across the platform.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;

    // Dynamically loads the frontend URL from application.yml / environment variables.
    // Defaults to localhost for local development.
    @Value("${frontend.url:http://localhost:5173}")
    private String frontendUrl;

    // --- Authentication & Account Notifications ---

    public void sendVerificationEmailAsync(String email, String token) {
        log.debug("Formatting and queueing verification email for [{}]", email);

        String subject = "Verify your Event Platform Account";
        String verificationUrl = frontendUrl + "/verify?token=" + token;

        String body = String.format(
                "Welcome to the Event Platform!\n\nPlease click the link below to verify your email address:\n%s\n\nThis link will expire shortly.",
                verificationUrl
        );

        emailService.sendEmailAsync(email, subject, body);
    }

    public void sendPasswordResetEmailAsync(String email, String token) {
        log.debug("Formatting and queueing password reset email for [{}]", email);

        String subject = "Password Reset Request";
        String resetUrl = frontendUrl + "/reset-password?token=" + token;

        String body = String.format(
                "We received a request to reset your password.\n\nClick the link below to set a new password:\n%s\n\nIf you did not request this, please ignore this email.",
                resetUrl
        );

        emailService.sendEmailAsync(email, subject, body);
    }

    // --- Event & Registration Notifications ---

    public void sendRegistrationConfirmed(Registration registration, Ticket ticket) {
        log.info("Queueing registration confirmation email for User [{}] regarding Event [{}]",
                registration.getUser().getEmail(), registration.getEvent().getEventId());

        String subject = "Registration Confirmed: " + registration.getEvent().getTitle();
        String ticketUrl = frontendUrl + "/tickets";

        String body = String.format(
                "Hello %s,\n\nYour registration for %s is confirmed!\n\nYour Ticket link: %s\nEvent Date: %s\nVenue: %s\n\nSee you there!",
                registration.getUser().getName(),
                registration.getEvent().getTitle(),
                ticketUrl,
                registration.getEvent().getEventDate(),
                registration.getEvent().getVenue()
        );

        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendWaitlistJoined(Registration registration) {
        log.info("Queueing waitlist notice email for User [{}] regarding Event [{}]",
                registration.getUser().getEmail(), registration.getEvent().getEventId());

        String subject = "You are on the Waitlist: " + registration.getEvent().getTitle();

        String body = String.format(
                "Hello %s,\n\nYou have been added to the waitlist for %s. We will notify you automatically if a spot opens up.",
                registration.getUser().getName(),
                registration.getEvent().getTitle()
        );

        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendWaitlistPromoted(Registration registration, Ticket ticket) {
        log.info("Queueing waitlist promotion triumph email for User [{}] regarding Event [{}]",
                registration.getUser().getEmail(), registration.getEvent().getEventId());

        String subject = "Waitlist Promotion: You're in for " + registration.getEvent().getTitle() + "!";

        String body = String.format(
                "Hello %s,\n\nGreat news! A spot opened up and you are now officially registered for %s.\n\nYour Ticket QR Token: %s\nEvent Date: %s\nVenue: %s",
                registration.getUser().getName(),
                registration.getEvent().getTitle(),
                ticket.getToken(),
                registration.getEvent().getEventDate(),
                registration.getEvent().getVenue()
        );

        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendEventCancelledByOrganiser(Event event, List<Registration> affectedRegistrations) {
        log.info("Queueing mass cancellation emails for [{}] attendees of Event [{}]",
                affectedRegistrations.size(), event.getEventId());

        String subject = "IMPORTANT: Event Cancelled - " + event.getTitle();
        String baseBody = "Hello %s,\n\nWe regret to inform you that the event '%s' scheduled for %s has been cancelled by the organizer. If you paid for a ticket, you are eligible for a refund.\n\nApologies for the inconvenience.";

        for (Registration reg : affectedRegistrations) {
            // Use DEBUG inside loops to prevent spamming log files during massive event cancellations
            log.debug("Queueing cancellation email for User [{}]", reg.getUser().getEmail());

            String body = String.format(baseBody, reg.getUser().getName(), event.getTitle(), event.getEventDate());
            emailService.sendEmailAsync(reg.getUser().getEmail(), subject, body);
        }
    }

    public void sendEventReminder(Event event, List<Registration> confirmedRegistrations) {
        log.info("Queueing mass reminder emails for [{}] attendees of Event [{}]",
                confirmedRegistrations.size(), event.getEventId());

        String subject = "Reminder: " + event.getTitle() + " is tomorrow!";
        String baseBody = "Hello %s,\n\nThis is a quick reminder that %s is happening tomorrow at %s!\n\nVenue: %s\n\nPlease have your ticket QR code ready for check-in.";

        for (Registration reg : confirmedRegistrations) {
            log.debug("Queueing reminder email for User [{}]", reg.getUser().getEmail());

            String body = String.format(baseBody, reg.getUser().getName(), event.getTitle(), event.getEventDate(), event.getVenue());
            emailService.sendEmailAsync(reg.getUser().getEmail(), subject, body);
        }
    }
}