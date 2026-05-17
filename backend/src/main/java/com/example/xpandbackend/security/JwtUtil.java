package com.example.xpandbackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Creates and validates HMAC-SHA256 signed JWTs.
 *
 * <p>Each token contains three custom claims in addition to the standard subject (email):
 * <ul>
 *   <li>{@code role} — {@code USER}, {@code COMPANY}, or {@code ADMIN}</li>
 *   <li>{@code id}   — the entity's primary key</li>
 * </ul>
 * The secret and expiration duration are read from {@code application.properties}
 * ({@code jwt.secret} and {@code jwt.expiration} in milliseconds).
 * </p>
 */
@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes());
    }

    /** Generates a signed JWT for the given identity. */
    public String generateToken(String email, String role, Integer id) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("role", role);
        claims.put("id", id);
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(email)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractEmail(String token) {
        return getClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return (String) getClaims(token).get("role");
    }

    public Integer extractId(String token) {
        Object id = getClaims(token).get("id");
        if (id instanceof Integer) return (Integer) id;
        return ((Number) id).intValue();
    }

    /** Returns {@code true} if the token is well-formed, validly signed, and not expired. */
    public boolean isTokenValid(String token) {
        try {
            getClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}