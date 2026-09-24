package com.compnet.hris.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.compnet.hris.config.HrisProperties;
import com.compnet.hris.user.User;
import com.compnet.hris.user.UserRepository;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.util.ReflectionTestUtils;

class AuthServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final JwtEncoder encoder = mock(JwtEncoder.class);
    private AuthService service;

    @BeforeEach
    void setUp() {
        when(passwords.encode(any())).thenReturn("dummy-hash");
        var properties = new HrisProperties(
                new HrisProperties.Jwt("a-secret-that-is-definitely-over-32-characters", "15m", "hris-api", "hris-web"),
                new HrisProperties.Upload(Path.of("uploads"), 5_242_880), List.of("http://localhost:3001"),
                new HrisProperties.BootstrapAdmin("", ""));
        service = new AuthService(users, passwords, encoder, properties);
    }

    @Test
    void createsTokenForActiveUserWithMatchingPassword() {
        User user = new User("admin@example.com", "real-hash");
        ReflectionTestUtils.setField(user, "id", java.util.UUID.randomUUID());
        when(users.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.of(user));
        when(passwords.matches("secret", "real-hash")).thenReturn(true);
        Jwt jwt = new Jwt("signed-token", Instant.now(), Instant.now().plusSeconds(900),
                java.util.Map.of("alg", "HS256"), java.util.Map.of("sub", user.getId().toString()));
        when(encoder.encode(any(JwtEncoderParameters.class))).thenReturn(jwt);

        var result = service.login(new LoginRequest(" admin@example.com ", "secret"));

        assertThat(result.accessToken()).isEqualTo("signed-token");
        assertThat(result.tokenType()).isEqualTo("Bearer");
        assertThat(result.expiresIn()).isEqualTo("15m");
    }

    @Test
    void rejectsUnknownInactiveAndWrongPasswordUsers() {
        when(users.findByEmailIgnoreCase("missing@example.com")).thenReturn(Optional.empty());
        when(passwords.matches("secret", "dummy-hash")).thenReturn(false);
        assertThatThrownBy(() -> service.login(new LoginRequest("missing@example.com", "secret")))
                .isInstanceOf(BadCredentialsException.class);

        User inactive = new User("inactive@example.com", "hash");
        inactive.setActive(false);
        when(users.findByEmailIgnoreCase("inactive@example.com")).thenReturn(Optional.of(inactive));
        when(passwords.matches("secret", "hash")).thenReturn(true);
        assertThatThrownBy(() -> service.login(new LoginRequest("inactive@example.com", "secret")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void parsesSupportedTokenLifetimesAndRejectsInvalidValues() {
        assertThat(AuthService.parseLifetime("30s")).isEqualTo(Duration.ofSeconds(30));
        assertThat(AuthService.parseLifetime("15m")).isEqualTo(Duration.ofMinutes(15));
        assertThat(AuthService.parseLifetime("2h")).isEqualTo(Duration.ofHours(2));
        assertThat(AuthService.parseLifetime("1d")).isEqualTo(Duration.ofDays(1));
        assertThatThrownBy(() -> AuthService.parseLifetime("PT15M")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> AuthService.parseLifetime(null)).isInstanceOf(IllegalArgumentException.class);
    }
}
