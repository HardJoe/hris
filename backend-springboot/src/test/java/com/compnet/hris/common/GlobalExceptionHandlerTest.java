package com.compnet.hris.common;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

class GlobalExceptionHandlerTest {
    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private final MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/test");

    @Test
    void mapsExpectedApplicationErrors() {
        assertThat(handler.notFound(new ResourceNotFoundException("missing"), request).getStatusCode().value()).isEqualTo(404);
        assertThat(handler.unauthorized(new BadCredentialsException("bad"), request).getStatusCode().value()).isEqualTo(401);
        var oversized = handler.badRequest(new MaxUploadSizeExceededException(5), request);
        assertThat(oversized.getBody().error().message()).isEqualTo("Certificate exceeds the configured size limit");
    }

    @Test
    void sanitizesUniqueAndForeignKeyConflicts() {
        var duplicate = handler.conflict(new DataIntegrityViolationException("duplicate", new RuntimeException("23505")), request);
        assertThat(duplicate.getBody().error().code()).isEqualTo("DUPLICATE_RESOURCE");
        var foreignKey = handler.conflict(new DataIntegrityViolationException("fk", new RuntimeException("foreign key 23503")), request);
        assertThat(foreignKey.getBody().error().code()).isEqualTo("RESOURCE_IN_USE");
    }

    @Test
    void hidesUnexpectedFailureDetails() {
        var response = handler.unexpected(new RuntimeException("database password"), request);
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().error().message()).isEqualTo("An unexpected error occurred");
        assertThat(response.getBody().error().path()).isEqualTo("/api/v1/test");
    }
}
