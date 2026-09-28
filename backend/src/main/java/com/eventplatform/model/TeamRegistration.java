package com.eventplatform.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "team_registrations", uniqueConstraints = {@UniqueConstraint(columnNames = {"lead_user_id", "event_id"})})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TeamRegistration {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private User leadUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Event eventId;

    @Column(nullable = false)
    private Integer memberCount;

    @Column(nullable = false, unique = true, updatable = false)
    private String groupToken; // UUID used to group the generated tickets

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
