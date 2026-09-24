package com.compnet.hris.health;

import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/health")
public class HealthController {
    private final JdbcTemplate jdbcTemplate;
    public HealthController(JdbcTemplate jdbcTemplate) { this.jdbcTemplate = jdbcTemplate; }
    @GetMapping("/live") Map<String, String> live() { return Map.of("status", "ok"); }
    @GetMapping("/ready") Map<String, String> ready() {
        jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "ready");
    }
}
