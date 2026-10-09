package com.eventplatform.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.util.List;

@Data
public class TeamRegisterRequest {
    @NotNull(message = "Member count is required")
    @Min(value = 2, message = "Team registration requires at least 1 members")
    private Integer memberCount;

    @NotEmpty(message = "Member Emails required")
    @Size(min = 1, message = "You must provide at least one team member email")
    private List<@Email(message = "Invalid email format") String> memberEmails;
}
