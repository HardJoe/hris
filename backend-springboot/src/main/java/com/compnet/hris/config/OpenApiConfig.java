package com.compnet.hris.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    @Bean
    OpenAPI hrisOpenApi() {
        String scheme = "bearerAuth";
        return new OpenAPI().info(new Info().title("HRIS API")
                        .description("Shared API contract for the Node.js and Spring Boot implementations. "
                                + "Successful JSON responses are wrapped in a `data` object; errors are wrapped in `error`.")
                        .version("1.0.0"))
                .components(new Components().addSecuritySchemes(scheme,
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")));
    }
}
