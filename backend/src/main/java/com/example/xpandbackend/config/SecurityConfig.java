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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

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
                // OAuth2 needs a session briefly to store the state parameter;
                // we keep JWT stateless for all API calls but allow sessions for the
                // OAuth2 redirect handshake (IF_REQUIRED creates one only when needed).
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .authorizeHttpRequests(auth -> auth
                        // Public auth endpoints (login, register, forgot-password, verify)
                        .requestMatchers("/api/auth/**").permitAll()
                        // OAuth2 redirect endpoints handled by Spring Security
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        // Public read-only endpoints
                        .requestMatchers(HttpMethod.GET, "/api/skills/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/jobs/**").permitAll()
                        // Role-protected endpoints
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/company/**").hasRole("COMPANY")
                        .requestMatchers("/api/user/**").hasRole("USER")
                        .anyRequest().authenticated()
                )
                // JWT filter runs before the standard auth filter for API calls
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                // OAuth2 login configuration
                .oauth2Login(oauth2 -> oauth2
                        .loginPage(frontendUrl.replaceAll("/+$", "") + "/login")
                        .successHandler(oAuth2LoginSuccessHandler)
                        // Strip any trailing slash before appending the path
                        .failureUrl(frontendUrl.replaceAll("/+$", "") + "/login?error=oauth_failed")
                );

        return http.build();
    }

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
