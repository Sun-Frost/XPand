package com.example.xpandbackend.security;

import com.example.xpandbackend.dto.response.AuthResponse;
import com.example.xpandbackend.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Invoked by Spring Security after a successful Google OAuth2 login.
 *
 * Flow:
 *  1. Extract email, Google ID, and name from the OAuth2User principal.
 *  2. Delegate to AuthService to create/update the User record and generate a JWT.
 *  3. Redirect to the frontend /oauth-callback route with the JWT as a query param.
 *     The frontend stores the token and navigates to the dashboard.
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request,
                                        HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // Google provides these standard OIDC attributes
        String email      = oAuth2User.getAttribute("email");
        String providerId = oAuth2User.getAttribute("sub");   // Google's unique user id
        String firstName  = oAuth2User.getAttribute("given_name");
        String lastName   = oAuth2User.getAttribute("family_name");

        // Strip any trailing slash so we never produce double-slash redirect URLs
        String baseUrl = frontendUrl.replaceAll("/+$", "");

        // Required debug logs — helps diagnose OAuth issues
        System.out.println("[OAuth2SuccessHandler] Google login success: email=" + email
                + " | providerId=" + providerId
                + " | firstName=" + firstName
                + " | lastName=" + lastName);

        if (email == null || email.isBlank()) {
            System.err.println("[OAuth2SuccessHandler] ERROR: Google did not return an email address.");
            getRedirectStrategy().sendRedirect(request, response,
                    baseUrl + "/login?error=oauth_failed");
            return;
        }

        try {
            // Provision/update user and get JWT
            AuthResponse authResponse = authService.loginOrRegisterOAuthUser(
                    email, providerId, firstName, lastName);

            System.out.println("[OAuth2SuccessHandler] JWT issued for userId=" + authResponse.getId()
                    + " role=" + authResponse.getRole());

            // Redirect to frontend callback page — it will read the token from the URL
            String redirectUrl = baseUrl + "/oauth-callback"
                    + "?token=" + authResponse.getToken()
                    + "&role="  + authResponse.getRole().toLowerCase()
                    + "&id="    + authResponse.getId();

            System.out.println("[OAuth2SuccessHandler] Redirecting to: " + redirectUrl.substring(0, redirectUrl.indexOf("?token=") + 8) + "...");
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);

        } catch (Exception ex) {
            System.err.println("[OAuth2SuccessHandler] Failed to provision OAuth user for email="
                    + email + ": " + ex.getMessage());
            getRedirectStrategy().sendRedirect(request, response,
                    baseUrl + "/login?error=oauth_failed");
        }
    }
}
