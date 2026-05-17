package com.example.xpandbackend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Intercepts every HTTP request and populates the Spring Security context
 * when a valid Bearer JWT is present in the {@code Authorization} header.
 *
 * <p>The filter extracts {@code email}, {@code role}, and {@code id} from the token
 * and sets an {@link AuthenticatedUser} as the authentication principal. Controllers
 * then receive this principal via {@code @AuthenticationPrincipal}.
 * Requests without a valid token pass through unauthenticated and are handled by
 * the security rules configured in {@link com.example.xpandbackend.config.SecurityConfig}.
 * </p>
 */
@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                String email  = jwtUtil.extractEmail(token);
                String role   = jwtUtil.extractRole(token);
                Integer id    = jwtUtil.extractId(token);

                var auth = new UsernamePasswordAuthenticationToken(
                        new AuthenticatedUser(id, email, role),
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}