package com.eventplatform.model;

import com.eventplatform.model.enums.EventStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "events")
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
// Overrides the standard DELETE command with an UPDATE for soft-deleting
@SQLDelete(sql = "UPDATE events SET is_deleted = true WHERE event_id=?")
// Automatically hides deleted events from all standard SELECT queries
@SQLRestriction("is_deleted = false")
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID eventId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User organiser;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String venue;

    @Column(nullable = false)
    private LocalDateTime eventDate;

    @Column(nullable = false)
    private Integer maxCapacity;

    @Column(nullable = false)
    @Builder.Default
    private Integer currentConfirmedCount = 0;

    @Column(nullable = false)
    private BigDecimal price;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status;

    // --- New Requirement Flags ---

    @Column(nullable = false)
    @Builder.Default
    private boolean isRefundEligible = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean isFeatured = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean isSuppressed = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer waitlistCapacity = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer currentWaitlistCount = 0;
}