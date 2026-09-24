package com.compnet.hris.competency;

import com.compnet.hris.common.PageResult;
import com.compnet.hris.common.ResourceNotFoundException;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CompetencyService {
    private final CompetencyRepository repository;
    public CompetencyService(CompetencyRepository repository) { this.repository = repository; }

    @Transactional
    public CompetencyDto.View create(CompetencyDto.Create input) {
        return CompetencyDto.View.from(repository.save(new Competency(normalize(input.name()))));
    }

    public PageResult<CompetencyDto.View> findAll(int page, int limit, String search) {
        var pageable = PageRequest.of(page - 1, limit, Sort.by("name").ascending());
        var result = search == null || search.isBlank() ? repository.findAll(pageable)
                : repository.findByNameContainingIgnoreCase(search.trim(), pageable);
        return PageResult.from(result.map(CompetencyDto.View::from));
    }

    public CompetencyDto.View findOne(UUID id) { return CompetencyDto.View.from(get(id)); }

    @Transactional
    public CompetencyDto.View update(UUID id, CompetencyDto.Update input) {
        Competency competency = get(id);
        if (input.name() != null) competency.rename(normalize(input.name()));
        return CompetencyDto.View.from(repository.save(competency));
    }

    @Transactional
    public void remove(UUID id) { repository.delete(get(id)); }

    Competency get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Competency not found"));
    }

    private String normalize(String value) { return value.trim().replaceAll("\\s+", " "); }
}
