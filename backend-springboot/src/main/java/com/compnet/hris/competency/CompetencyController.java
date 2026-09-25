package com.compnet.hris.competency;

import com.compnet.hris.common.PageResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/competencies")
@Tag(name = "Competencies", description = "Competency master data.")
@SecurityRequirement(name = "bearerAuth")
public class CompetencyController {
    private final CompetencyService service;
    public CompetencyController(CompetencyService service) { this.service = service; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a competency")
    CompetencyDto.View create(@Valid @RequestBody CompetencyDto.Create input) { return service.create(input); }

    @GetMapping
    @Operation(summary = "List competencies")
    PageResult<CompetencyDto.View> findAll(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) @Size(max = 150) String search) {
        return service.findAll(page, limit, search);
    }

    @GetMapping("/{id}") @Operation(summary = "Get a competency")
    CompetencyDto.View findOne(@PathVariable UUID id) { return service.findOne(id); }
    @PatchMapping("/{id}") @Operation(summary = "Update a competency")
    CompetencyDto.View update(@PathVariable UUID id,
            @Valid @RequestBody CompetencyDto.Update input) { return service.update(id, input); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Operation(summary = "Delete a competency")
    void remove(@PathVariable UUID id) { service.remove(id); }
}
