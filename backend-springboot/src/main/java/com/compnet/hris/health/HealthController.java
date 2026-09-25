package com.compnet.hris.health;

import java.util.Map;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
@Tag(name = "Health", description = "Unauthenticated liveness and database-readiness checks.")
public class HealthController {
    private final JdbcTemplate jdbcTemplate;
    public HealthController(JdbcTemplate jdbcTemplate) { this.jdbcTemplate = jdbcTemplate; }
    @GetMapping("/live") @Operation(summary = "Check process liveness")
    Map<String, String> live() { return Map.of("status", "ok"); }
    @GetMapping("/ready") @Operation(summary = "Check database readiness")
    Map<String, String> ready() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "ready");
    }
}
