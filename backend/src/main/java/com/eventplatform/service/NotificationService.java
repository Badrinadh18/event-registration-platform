package com.eventplatform.service;

import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.Ticket;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final EmailService emailService;

    // --- Authentication & Account Notifications ---

    public void sendVerificationEmailAsync(String email, String token) {
        String subject = "Verify your Event Platform Account";
        // In a production environment, this would point to your frontend domain
//        String verificationUrl = "http://localhost:9090/api/auth/verify?token=" + token;
        String verificationUrl = "http://localhost:5173/verify?token=" + token;
        String body = String.format("Welcome to the Event Platform!\n\nPlease click the link below to verify your email address:\n%s\n\nThis link will expire shortly.", verificationUrl);
        emailService.sendEmailAsync(email, subject, body);
    }

    public void sendPasswordResetEmailAsync(String email, String token) {
        String subject = "Password Reset Request";
        String resetUrl = "http://localhost:9090/api/auth/reset-password?token=" + token;
        String body = String.format("We received a request to reset your password.\n\nClick the link below to set a new password:\n%s\n\nIf you did not request this, please ignore this email.", resetUrl);
        emailService.sendEmailAsync(email, subject, body);
    }

    public void sendRegistrationConfirmed(Registration registration, Ticket ticket) {
        String subject = "Registration Confirmed: " + registration.getEvent().getTitle();
        String body = String.format("Hello %s,\n\nYour registration for %s is confirmed!\n\nYour Ticket QR Token: %s\nEvent Date: %s\nVenue: %s\n\nSee you there!",
                registration.getUser().getName(),
                registration.getEvent().getTitle(),
                ticket.getToken(),
                registration.getEvent().getEventDate(),
                registration.getEvent().getVenue());
        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendWaitlistJoined(Registration registration) {
        String subject = "You are on the Waitlist: " + registration.getEvent().getTitle();
        String body = String.format("Hello %s,\n\nYou have been added to the waitlist for %s. We will notify you automatically if a spot opens up.",
                registration.getUser().getName(),
                registration.getEvent().getTitle());
        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendWaitlistPromoted(Registration registration, Ticket ticket) {
        String subject = "Waitlist Promotion: You're in for " + registration.getEvent().getTitle() + "!";
        String body = String.format("Hello %s,\n\nGreat news! A spot opened up and you are now officially registered for %s.\n\nYour Ticket QR Token: %s\nEvent Date: %s\nVenue: %s",
                registration.getUser().getName(),
                registration.getEvent().getTitle(),
                ticket.getToken(),
                registration.getEvent().getEventDate(),
                registration.getEvent().getVenue());
        emailService.sendEmailAsync(registration.getUser().getEmail(), subject, body);
    }

    public void sendEventCancelled(Event event, List<Registration> affectedRegistrations) {
        String subject = "IMPORTANT: Event Cancelled - " + event.getTitle();
        String baseBody = "Hello %s,\n\nWe regret to inform you that the event '%s' scheduled for %s has been cancelled by the organizer. If you paid for a ticket, you are eligible for a refund.\n\nApologies for the inconvenience.";

        for (Registration reg : affectedRegistrations) {
            String body = String.format(baseBody, reg.getUser().getName(), event.getTitle(), event.getEventDate());
            emailService.sendEmailAsync(reg.getUser().getEmail(), subject, body);
        }
    }

    public void sendEventReminder(Event event, List<Registration> confirmedRegistrations) {
        String subject = "Reminder: " + event.getTitle() + " is tomorrow!";
        String baseBody = "Hello %s,\n\nThis is a quick reminder that %s is happening tomorrow at %s!\n\nVenue: %s\n\nPlease have your ticket QR code ready for check-in.";

        for (Registration reg : confirmedRegistrations) {
            String body = String.format(baseBody, reg.getUser().getName(), event.getTitle(), event.getEventDate(), event.getVenue());
            emailService.sendEmailAsync(reg.getUser().getEmail(), subject, body);
        }
    }
}