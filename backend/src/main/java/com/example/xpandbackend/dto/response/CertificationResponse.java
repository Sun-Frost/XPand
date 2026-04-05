package com.example.xpandbackend.dto.response;
import lombok.Data;
import java.time.LocalDate;
@Data
public class CertificationResponse {
    private Integer id;
    private String name;
    private String issuingOrganization;
    private LocalDate issueDate;
    private LocalDate expirationDate;
}
