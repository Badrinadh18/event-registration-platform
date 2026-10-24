package com.eventplatform.service;

import com.eventplatform.model.EmailRetryQueue;
import com.eventplatform.model.enums.EmailStatus;
import com.eventplatform.repository.EmailRetryQueueRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final EmailRetryQueueRepository retryQueueRepository;
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final int MAX_RETRIES = 3;

    @Async
    public void sendEmailAsync(String to, String subject, String text) {
        try {
            transmit(to, subject, text);
            logger.info("Successfully sent async email to {}", to);
        } catch (Exception e) {
            logger.error("Failed to send email to {}. Queueing for retry.", to, e);
            queueForRetry(to, subject, text, 1);
        }
    }

    public void transmit(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    @Transactional
    public void queueForRetry(String to, String subject, String text, int currentAttempts) {
        EmailRetryQueue queuedEmail = EmailRetryQueue.builder()
                .recipient(to)
                .subject(subject)
                .body(text)
                .status(EmailStatus.PENDING)
                .attempts(currentAttempts)
                .nextRetryAt(LocalDateTime.now().plusMinutes(15 * currentAttempts))
                .build();
        retryQueueRepository.save(queuedEmail);
    }
}