package com.compnet.hris.employee;

import com.compnet.hris.common.EmploymentStatus;
import com.compnet.hris.common.PageResult;
import com.compnet.hris.common.Position;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/employees")
@Tag(name = "Employees", description = "Employee master data, competency assignments, and certificates.")
@SecurityRequirement(name = "bearerAuth")
public class EmployeeController {
    private final EmployeeService service;
    public EmployeeController(EmployeeService service) { this.service = service; }

    @PostMapping @ResponseStatus(HttpStatus.CREATED) @Operation(summary = "Create an employee")
    EmployeeDto.View create(@Valid @RequestBody EmployeeDto.Create input) { return service.create(input); }

    @GetMapping @Operation(summary = "List employees")
    PageResult<EmployeeDto.View> findAll(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit,
            @RequestParam(required = false) @Size(max = 150) String search,
            @RequestParam(required = false) Position position,
            @RequestParam(required = false) EmploymentStatus status,
            @RequestParam(required = false) UUID competencyId) {
        return service.findAll(page, limit, search, position, status, competencyId);
    }

    @GetMapping("/{id}") @Operation(summary = "Get an employee")
    EmployeeDto.View findOne(@PathVariable UUID id) { return service.findOne(id); }
    @PatchMapping("/{id}") @Operation(summary = "Partially update an employee")
    EmployeeDto.View update(@PathVariable UUID id,
            @Valid @RequestBody EmployeeDto.Update input) { return service.update(id, input); }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Operation(summary = "Soft-delete an employee")
    void remove(@PathVariable UUID id) { service.remove(id); }

    @PutMapping("/{employeeId}/competencies/{competencyId}")
    @Operation(summary = "Assign or update an employee competency")
    EmployeeDto.View assign(@PathVariable UUID employeeId, @PathVariable UUID competencyId,
            @Valid @RequestBody EmployeeDto.GradeUpdate input) {
        return service.assign(employeeId, competencyId, input.grade());
    }

    @DeleteMapping("/{employeeId}/competencies/{competencyId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove an employee competency")
    void unassign(@PathVariable UUID employeeId, @PathVariable UUID competencyId) {
        service.unassign(employeeId, competencyId);
    }

    @PostMapping(value = "/{employeeId}/competencies/{competencyId}/certificate",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload or replace a competency certificate")
    EmployeeDto.View upload(@PathVariable UUID employeeId, @PathVariable UUID competencyId,
            @RequestPart("certificate") MultipartFile certificate) {
        return service.upload(employeeId, competencyId, certificate);
    }

    @GetMapping("/{employeeId}/competencies/{competencyId}/certificate")
    @Operation(summary = "Download a competency certificate", responses = @ApiResponse(responseCode = "200",
            description = "Certificate file", content = @Content(mediaType = "application/octet-stream",
                    schema = @Schema(type = "string", format = "binary"))))
    ResponseEntity<org.springframework.core.io.Resource> download(@PathVariable UUID employeeId,
            @PathVariable UUID competencyId) {
        var value = service.download(employeeId, competencyId);
        ContentDisposition disposition = ContentDisposition.attachment()
                .filename(value.originalName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(value.mimeType()))
                .contentLength(value.size()).header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(value.resource());
    }
}
