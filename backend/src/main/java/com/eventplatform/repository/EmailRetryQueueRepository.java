package com.eventplatform.repository;

import com.eventplatform.model.EmailRetryQueue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailRetryQueueRepository extends JpaRepository<EmailRetryQueue, UUID> {

    // Fetches emails that are PENDING and whose retry time has arrived or passed
    @Query("SELECT e FROM EmailRetryQueue e WHERE e.status = 'PENDING' AND e.nextRetryAt <= :currentTime")
    List<EmailRetryQueue> findPendingEmailsToRetry(@Param("currentTime") LocalDateTime currentTime);
}
