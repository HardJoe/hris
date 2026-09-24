package com.compnet.hris.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import tools.jackson.databind.json.JsonMapper;
import jakarta.servlet.FilterChain;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class LoginRateLimitFilterTest {
    @Test
    void allowsFiveAttemptsThenReturnsContractError() throws Exception {
        var filter = new LoginRateLimitFilter(JsonMapper.builder().findAndAddModules().build(),
                Clock.fixed(Instant.parse("2026-09-24T00:00:00Z"), ZoneOffset.UTC));
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/login");
        request.setRemoteAddr("127.0.0.1");
        for (int index = 0; index < 5; index++) filter.doFilter(request, new MockHttpServletResponse(), chain);

        MockHttpServletResponse rejected = new MockHttpServletResponse();
        filter.doFilter(request, rejected, chain);

        assertThat(rejected.getStatus()).isEqualTo(429);
        assertThat(rejected.getHeader("Retry-After")).isEqualTo("60");
        assertThat(rejected.getContentAsString()).contains("TooManyRequestsException");
    }

    @Test
    void ignoresNonLoginRequests() throws Exception {
        var filter = new LoginRateLimitFilter(JsonMapper.builder().build(), Clock.systemUTC());
        FilterChain chain = mock(FilterChain.class);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/employees");
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, chain);
        verify(chain).doFilter(request, response);
    }
}
