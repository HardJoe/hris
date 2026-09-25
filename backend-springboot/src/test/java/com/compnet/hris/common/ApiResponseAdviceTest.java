package com.compnet.hris.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.net.URI;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;

class ApiResponseAdviceTest {
    private final ApiResponseAdvice advice = new ApiResponseAdvice();

    @Test
    void wrapsJsonButLeavesFilesAndNoContentUnchanged() {
        MethodParameter parameter = mock(MethodParameter.class);
        when(parameter.getParameterType()).thenReturn((Class) String.class);
        assertThat(advice.supports(parameter, (Class) HttpMessageConverter.class)).isTrue();
        ServerHttpResponse response = mock(ServerHttpResponse.class);
        Object wrapped = advice.beforeBodyWrite("hello", parameter, MediaType.APPLICATION_JSON,
                (Class) HttpMessageConverter.class, mock(ServerHttpRequest.class), response);
        assertThat(wrapped).isEqualTo(new ApiEnvelope<>("hello"));

        var error = new GlobalExceptionHandler.ErrorEnvelope(new GlobalExceptionHandler.ErrorBody(
                400, "BadRequestException", "bad", java.time.Instant.now(), "/test"));
        assertThat(advice.beforeBodyWrite(error, parameter, MediaType.APPLICATION_JSON,
                (Class) HttpMessageConverter.class, mock(ServerHttpRequest.class), response)).isSameAs(error);

        assertThat(advice.beforeBodyWrite("file", parameter, MediaType.APPLICATION_PDF,
                (Class) HttpMessageConverter.class, mock(ServerHttpRequest.class), response)).isEqualTo("file");
    }

    @Test
    void doesNotSupportVoidBytesOrAlreadyWrappedValues() {
        MethodParameter parameter = mock(MethodParameter.class);
        when(parameter.getParameterType()).thenReturn((Class) void.class, (Class) byte[].class, (Class) ApiEnvelope.class);
        assertThat(advice.supports(parameter, (Class) HttpMessageConverter.class)).isFalse();
        assertThat(advice.supports(parameter, (Class) HttpMessageConverter.class)).isFalse();
        assertThat(advice.supports(parameter, (Class) HttpMessageConverter.class)).isFalse();
    }

    @Test
    void leavesSwaggerConfigurationUnwrapped() {
        MethodParameter parameter = mock(MethodParameter.class);
        when(parameter.getParameterType()).thenReturn((Class) java.util.Map.class);
        ServerHttpRequest request = mock(ServerHttpRequest.class);
        when(request.getURI()).thenReturn(URI.create("http://localhost/docs/openapi.json/swagger-config"));
        var config = java.util.Map.of("url", "/docs/openapi.json");

        assertThat(advice.beforeBodyWrite(config, parameter, MediaType.APPLICATION_JSON,
                (Class) HttpMessageConverter.class, request, mock(ServerHttpResponse.class))).isSameAs(config);
    }
}
