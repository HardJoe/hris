package com.compnet.hris.auth;

import com.compnet.hris.config.HrisProperties;
import com.compnet.hris.user.User;
import com.compnet.hris.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final HrisProperties properties;

    public AdminBootstrap(UserRepository users, PasswordEncoder passwordEncoder, HrisProperties properties) {
        this.users = users; this.passwordEncoder = passwordEncoder; this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        String email = properties.bootstrapAdmin().email();
        String password = properties.bootstrapAdmin().password();
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            log.info("Admin seed skipped: bootstrap credentials are not configured");
            return;
        }
        if (password.length() < 12) throw new IllegalStateException("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters");
        users.findByEmailIgnoreCase(email.trim()).orElseGet(() -> {
            log.info("Creating bootstrap administrator");
            return users.save(new User(email.trim().toLowerCase(), passwordEncoder.encode(password)));
        });
    }
}
