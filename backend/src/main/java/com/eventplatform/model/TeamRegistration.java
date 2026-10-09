package com.eventplatform.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.List;
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
    private User leadUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(nullable = false)
    private Event event;

    @Column(nullable = false)
    private Integer memberCount;

    @Column(nullable = false, unique = true, updatable = false)
    private String groupToken; // UUID used to group the generated tickets


    // Store the emails of the team members to issue tickets later
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "team_member_emails", joinColumns = @JoinColumn(name = "team_registration_id"))
    @Column(name = "email", nullable = false)
    private List<String> memberEmails;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
