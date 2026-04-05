package com.example.xpandbackend.dto.request;

import lombok.Data;

@Data
public class RegisterUserRequest {
    private String email;
    private String password;
    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String country;
    private String city;
}
