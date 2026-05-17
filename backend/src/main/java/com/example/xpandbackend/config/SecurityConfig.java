package com.example.xpandbackend.config;

import com.example.xpandbackend.security.JwtFilter;
import com.example.xpandbackend.security.OAuth2LoginSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Spring Security configuration for the XPand backend.
 *
 * <h3>Authentication strategy</h3>
 * All API endpoints are protected by stateless JWT authentication via {@link JwtFilter}.
 * Sessions are created only for the OAuth2 redirect handshake (Spring Security needs a
 * short-lived session to store the CSRF state parameter during the Google login flow).
 * Once the OAuth callback completes a JWT is issued and the session is discarded.
 *
 * <h3>Authorization rules</h3>
 * <ul>
 *   <li>{@code /api/auth/**} — public (login, register, verify, reset password)</li>
 *   <li>{@code /oauth2/**}, {@code /login/oauth2/**} — public (Google OAuth redirects)</li>
 *   <li>{@code GET /api/skills/**}, {@code GET /api/jobs/**} — public read access</li>
 *   <li>{@code /api/admin/**} — requires {@code ROLE_ADMIN}</li>
 *   <li>{@code /api/company/**} — requires {@code ROLE_COMPANY}</li>
 *   <li>{@code /api/user/**} — requires {@code ROLE_USER}</li>
 *   <li>All other endpoints — require any authenticated principal</li>
 * </ul>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/skills/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/jobs/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/company/**").hasRole("COMPANY")
                        .requestMatchers("/api/user/**").hasRole("USER")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .oauth2Login(oauth2 -> oauth2
                        .loginPage(frontendUrl.replaceAll("/+$", "") + "/login")
                        .successHandler(oAuth2LoginSuccessHandler)
                        .failureUrl(frontendUrl.replaceAll("/+$", "") + "/login?error=oauth_failed")
                );

        return http.build();
    }

    /**
     * Permits all origins, methods, and headers to support local development and
     * cross-origin requests from the React frontend. Credentials (cookies) are allowed
     * for the OAuth session cookie during the login redirect.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}