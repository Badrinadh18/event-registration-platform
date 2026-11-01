package com.eventplatform.service;

import com.eventplatform.model.EmailRetryQueue;
import com.eventplatform.model.enums.EmailStatus;
import com.eventplatform.repository.EmailRetryQueueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service responsible for physically transmitting emails via SMTP.
 * Features asynchronous execution and a robust database-backed retry queue
 * to ensure email delivery even during temporary SMTP outages.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailRetryQueueRepository retryQueueRepository;

    private static final int MAX_RETRIES = 3;

    /**
     * Attempts to send an email asynchronously on a separate thread.
     * If the SMTP server is down, it safely persists the email to a database queue for future retries.
     *
     * @param to      Recipient email address
     * @param subject Email subject line
     * @param text    The body content of the email
     */
    @Async
    public void sendEmailAsync(String to, String subject, String text) {
        log.debug("Preparing to send async email to [{}] with subject [{}]", to, subject);

        try {
            transmit(to, subject, text);
            log.info("Successfully dispatched email via SMTP to [{}] with subject [{}]", to, subject);
        } catch (Exception e) {
            // We use ERROR here because an SMTP failure is an infrastructure issue (e.g., bad credentials, network down).
            // We log the exception message to capture the exact network/auth error.
            log.error("SMTP Transmission failed for email to [{}]. Queueing for retry. Reason: {}", to, e.getMessage());
            queueForRetry(to, subject, text, 1);
        }
    }

    /**
     * Performs the actual physical transmission of the email via JavaMailSender.
     */
    public void transmit(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);

        // SECURITY NOTE: We never log the 'text' variable, as it contains sensitive tokens and PII!
        message.setText(text);

        mailSender.send(message);
    }

    /**
     * Persists a failed email to the database for the background cron job to retry later.
     * Implements incremental backoff for retry attempts (e.g., 15 mins, 30 mins).
     */
    @Transactional
    public void queueForRetry(String to, String subject, String text, int currentAttempts) {
        // Fixed compilation error: Added multiplication operator for the backoff calculation
        long backoffMinutes = 15L * currentAttempts;

        EmailRetryQueue queuedEmail = EmailRetryQueue.builder()
                .recipient(to)
                .subject(subject)
                .body(text)
                .status(EmailStatus.PENDING)
                .attempts(currentAttempts)
                .nextRetryAt(LocalDateTime.now().plusMinutes(backoffMinutes))
                .build();

        retryQueueRepository.save(queuedEmail);

        log.warn("Email to [{}] added to database retry queue. Attempt [{}/{}]. Next retry scheduled in {} minutes.",
                to, currentAttempts, MAX_RETRIES, backoffMinutes);
    }
}