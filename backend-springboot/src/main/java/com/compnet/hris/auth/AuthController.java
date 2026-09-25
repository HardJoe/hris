package com.compnet.hris.auth;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Obtain a bearer token for protected HRIS endpoints.")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) { this.service = service; }
    @PostMapping("/login")
    @Operation(summary = "Log in", description = "Validates an active user email and password, then returns a JWT bearer token.")
    AuthService.LoginResult login(@Valid @RequestBody LoginRequest input) {
        return service.login(input);
    }
}
