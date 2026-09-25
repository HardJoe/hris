package com.compnet.hris.auth;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.compnet.hris.config.HrisProperties;
import com.compnet.hris.user.UserRepository;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

class AdminBootstrapTest {
    private final UserRepository users = mock(UserRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);

    @Test
    void skipsWhenCredentialsAreAbsent() {
        bootstrap("", "").run(new DefaultApplicationArguments());
        verify(users, never()).save(any());
    }

    @Test
    void createsMissingAdministratorAndSynchronizesExistingPassword() {
        when(users.findByEmailIgnoreCase("admin@example.com")).thenReturn(Optional.empty());
        when(passwords.encode("long-enough-password")).thenReturn("hash");
        bootstrap(" Admin@Example.com ", "long-enough-password").run(new DefaultApplicationArguments());
        verify(users).save(any());

        var existing = new com.compnet.hris.user.User("existing@example.com", "old-hash");
        when(users.findByEmailIgnoreCase("existing@example.com")).thenReturn(Optional.of(existing));
        when(passwords.matches("long-enough-password", "old-hash")).thenReturn(false);
        bootstrap("existing@example.com", "long-enough-password").run(new DefaultApplicationArguments());
        verify(passwords).matches("long-enough-password", "old-hash");
        verify(users).save(existing);
    }

    @Test
    void rejectsWeakBootstrapPassword() {
        assertThatThrownBy(() -> bootstrap("admin@example.com", "short").run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class);
    }

    private AdminBootstrap bootstrap(String email, String password) {
        var properties = new HrisProperties(
                new HrisProperties.Jwt("a-secret-that-is-definitely-over-32-characters", "15m", "issuer", "audience"),
                new HrisProperties.Upload(Path.of("uploads"), 5_242_880), List.of(),
                new HrisProperties.BootstrapAdmin(email, password));
        return new AdminBootstrap(users, passwords, properties);
    }
}
