package com.compnet.hris.competency;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.compnet.hris.common.ResourceNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;

class CompetencyServiceTest {
    private final CompetencyRepository repository = mock(CompetencyRepository.class);
    private final CompetencyService service = new CompetencyService(repository);

    @Test
    void createsAndNormalizesCompetency() {
        when(repository.save(any())).thenAnswer(invocation -> {
            Competency value = invocation.getArgument(0);
            ReflectionTestUtils.setField(value, "id", UUID.randomUUID());
            return value;
        });
        var result = service.create(new CompetencyDto.Create("  Spring   Boot "));
        assertThat(result.name()).isEqualTo("Spring Boot");
    }

    @Test
    void pagesAllOrSearchedCompetencies() {
        Competency value = competency("ReactJS");
        when(repository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(value)));
        when(repository.findByNameContainingIgnoreCase(any(), any())).thenReturn(new PageImpl<>(List.of(value)));
        assertThat(service.findAll(1, 20, null).items()).hasSize(1);
        assertThat(service.findAll(1, 20, " react ").items()).extracting(CompetencyDto.View::name).containsExactly("ReactJS");
    }

    @Test
    void findsUpdatesDeletesAndRejectsMissingCompetency() {
        UUID id = UUID.randomUUID();
        Competency value = competency("Node.js");
        when(repository.findById(id)).thenReturn(Optional.of(value));
        when(repository.save(value)).thenReturn(value);
        assertThat(service.findOne(id).name()).isEqualTo("Node.js");
        assertThat(service.update(id, new CompetencyDto.Update("Node JS")).name()).isEqualTo("Node JS");
        assertThat(service.update(id, new CompetencyDto.Update(null)).name()).isEqualTo("Node JS");
        service.remove(id);
        verify(repository).delete(value);
        when(repository.findById(UUID.randomUUID())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.findOne(UUID.randomUUID())).isInstanceOf(ResourceNotFoundException.class);
    }

    private Competency competency(String name) {
        Competency value = new Competency(name);
        ReflectionTestUtils.setField(value, "id", UUID.randomUUID());
        return value;
    }
}
