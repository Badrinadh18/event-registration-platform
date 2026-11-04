package com.eventplatform.dto.response;

import com.eventplatform.model.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
@AllArgsConstructor
public class UserAdminDtoResponse {
    private UUID userId;
    private String name;
    private String email;
    private Set<Role> roles;
    private boolean isVerified;
}