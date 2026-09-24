package com.compnet.hris.auth;

import com.compnet.hris.config.HrisProperties;
import com.compnet.hris.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final HrisProperties properties;
    private final String dummyHash;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
            HrisProperties properties) {
        this.users = users; this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder; this.properties = properties;
        this.dummyHash = passwordEncoder.encode("not-a-real-user-password");
    }

    public LoginResult login(LoginRequest input) {
        var user = users.findByEmailIgnoreCase(input.email().trim());
        String hash = user.map(value -> value.getPasswordHash()).orElse(dummyHash);
        boolean matches = passwordEncoder.matches(input.password(), hash);
        if (user.isEmpty() || !user.get().isActive() || !matches)
            throw new BadCredentialsException("Invalid email or password");

        Instant issuedAt = Instant.now();
        Duration lifetime = parseLifetime(properties.jwt().expiresIn());
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(properties.jwt().issuer())
                .audience(java.util.List.of(properties.jwt().audience()))
                .subject(user.get().getId().toString()).issuedAt(issuedAt).expiresAt(issuedAt.plus(lifetime))
                .claim("email", user.get().getEmail()).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new LoginResult(token, "Bearer", properties.jwt().expiresIn());
    }

    static Duration parseLifetime(String value) {
        if (value == null || !value.matches("\\d+[smhd]"))
            throw new IllegalArgumentException("JWT_EXPIRES_IN must use s, m, h, or d");
        long amount = Long.parseLong(value.substring(0, value.length() - 1));
        return switch (value.charAt(value.length() - 1)) {
            case 's' -> Duration.ofSeconds(amount); case 'm' -> Duration.ofMinutes(amount);
            case 'h' -> Duration.ofHours(amount); case 'd' -> Duration.ofDays(amount);
            default -> throw new IllegalArgumentException("Unsupported token lifetime");
        };
    }

    public record LoginResult(String accessToken, String tokenType, String expiresIn) {}
}
