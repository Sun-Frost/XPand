package com.example.xpandbackend.dto.response;
import lombok.AllArgsConstructor;
import lombok.Data;
@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String role;
    private Integer id;
    private String email;
}
