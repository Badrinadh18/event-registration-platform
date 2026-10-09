package com.eventplatform.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TicketResponse {
    private String eventName;
    private String venue;
    private LocalDateTime eventDate;
    private String attendeeName;
    private String attendeeEmail;
    private String ticketToken;
    private String status;
    private String metadata;
}
