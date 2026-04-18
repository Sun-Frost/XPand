package com.example.xpandbackend.dto.request;

import lombok.Data;

@Data
public class VerifyCodeRequest {
    /** The email address that received the code — used to look up the account. */
    private String email;

    /** The 6-digit numeric code the user typed from their email. */
    private String code;
}
