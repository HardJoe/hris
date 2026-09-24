package com.compnet.hris.auth;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {
    private static final int LIMIT = 5;
    private static final long WINDOW_SECONDS = 60;
    private final Map<String, AttemptWindow> attempts = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public LoginRateLimitFilter(ObjectMapper objectMapper) { this(objectMapper, Clock.systemUTC()); }
    LoginRateLimitFilter(ObjectMapper objectMapper, Clock clock) {
        this.objectMapper = objectMapper; this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !"/api/v1/auth/login".equals(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long now = clock.instant().getEpochSecond();
        AttemptWindow window = attempts.compute(request.getRemoteAddr(), (key, current) ->
                current == null || now - current.startedAt >= WINDOW_SECONDS
                        ? new AttemptWindow(now, 1) : new AttemptWindow(current.startedAt, current.count + 1));
        if (window.count > LIMIT) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(Math.max(1, WINDOW_SECONDS - (now - window.startedAt))));
            objectMapper.writeValue(response.getOutputStream(), Map.of("error", Map.of(
                    "statusCode", 429, "code", "TooManyRequestsException",
                    "message", "Too many login attempts", "timestamp", Instant.now(clock),
                    "path", request.getRequestURI())));
            return;
        }
        filterChain.doFilter(request, response);
    }

    private record AttemptWindow(long startedAt, int count) {}
}
