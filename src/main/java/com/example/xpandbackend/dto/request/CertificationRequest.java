package com.example.xpandbackend.dto.request;
import lombok.Data;
import java.time.LocalDate;
@Data
public class CertificationRequest {
    private String name;
    private String issuingOrganization;
    private LocalDate issueDate;
    private LocalDate expirationDate;
}
