package com.eventplatform.job;

import com.eventplatform.model.EmailRetryQueue;
import com.eventplatform.model.Event;
import com.eventplatform.model.Registration;
import com.eventplatform.model.enums.EmailStatus;
import com.eventplatform.model.enums.EventStatus;
import com.eventplatform.model.enums.RegistrationStatus;
import com.eventplatform.repository.EmailRetryQueueRepository;
import com.eventplatform.repository.EventRepository;
import com.eventplatform.repository.RegistrationRepository;
import com.eventplatform.service.EmailService;
import com.eventplatform.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class ScheduledNotificationJobs {

    private final EmailRetryQueueRepository retryQueueRepository;
    private final EmailService emailService;
    private final EventRepository eventRepository;
    private final RegistrationRepository registrationRepository;
    private final NotificationService notificationService;
    private static final Logger logger = LoggerFactory.getLogger(ScheduledNotificationJobs.class);

    // Runs every 5 minutes to process failed emails
    @Scheduled(fixedRate = 300000)
    @Transactional
    public void processEmailRetryQueue() {
        List<EmailRetryQueue> pendingEmails = retryQueueRepository.findByStatusAndNextRetryAtBefore(
                EmailStatus.PENDING, LocalDateTime.now());

        for (EmailRetryQueue email : pendingEmails) {
            try {
                emailService.transmit(email.getRecipient(), email.getSubject(), email.getBody());
                email.setStatus(EmailStatus.COMPLETED);
                logger.info("Successfully recovered and sent queued email to {}", email.getRecipient());
            } catch (Exception e) {
                email.setAttempts(email.getAttempts() + 1);
                if (email.getAttempts() >= 3) {
                    email.setStatus(EmailStatus.FAILED_PERMANENTLY);
                    logger.error("Permanently failed to send email to {} after 3 attempts.", email.getRecipient());
                } else {
                    // Exponential backoff
                    email.setNextRetryAt(LocalDateTime.now().plusMinutes(15L * email.getAttempts()));
                    logger.warn("Retry {} failed for email to {}. Re-queueing.", email.getAttempts(), email.getRecipient());
                }
            }
        }
        retryQueueRepository.saveAll(pendingEmails);
    }

    // Runs every hour to send 24-hour reminders
    @Scheduled(cron = "0 0 * * * *")
    @Transactional(readOnly = true)
    public void process24HourReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowStart = now.plusHours(23);
        LocalDateTime windowEnd = now.plusHours(24);

        List<Event> upcomingEvents = eventRepository.findByEventDateBetweenAndStatus(
                windowStart, windowEnd, EventStatus.PUBLISHED);

        for (Event event : upcomingEvents) {
            List<Registration> confirmedRegistrations = registrationRepository.findByEvent_EventIdAndStatus(
                    event.getEventId(), RegistrationStatus.CONFIRMED);

            if (!confirmedRegistrations.isEmpty()) {
                notificationService.sendEventReminder(event, confirmedRegistrations);
                logger.info("Dispatched 24-hour reminders for event: {}", event.getTitle());
            }
        }
    }
}