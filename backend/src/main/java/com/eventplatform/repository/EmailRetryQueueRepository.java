package com.eventplatform.repository;

import com.eventplatform.model.EmailRetryQueue;
import com.eventplatform.model.enums.EmailStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Data Access layer for the resilient Email Retry system.
 * Used by background cron jobs to find and re-process failed SMTP transmissions.
 */
@Repository
public interface EmailRetryQueueRepository extends JpaRepository<EmailRetryQueue, UUID> {

    /**
     * Locates emails that are in a specific status (e.g., PENDING) and whose
     * scheduled retry time has passed. This enforces the incremental backoff strategy.
     *
     * @param status The current status of the email (usually PENDING).
     * @param time The current system time (to find records scheduled in the past).
     * @return A list of emails ready to be retried.
     */
    List<EmailRetryQueue> findByStatusAndNextRetryAtBefore(EmailStatus status, LocalDateTime time);
}