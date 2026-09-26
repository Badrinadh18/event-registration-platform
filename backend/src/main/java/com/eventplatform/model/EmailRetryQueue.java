package com.eventplatform.model;

import com.eventplatform.model.enums.EmailStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_retry_queue")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailRetryQueue {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false)
    private String subject;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    @Column(nullable = false)
    private LocalDateTime nextRetryAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailStatus status;

}
