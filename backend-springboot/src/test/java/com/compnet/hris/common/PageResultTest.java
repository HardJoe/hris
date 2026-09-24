package com.compnet.hris.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

class PageResultTest {
    @Test
    void convertsSpringZeroBasedPageToContractMetadata() {
        var page = new PageImpl<>(List.of("item"), PageRequest.of(1, 2), 5);
        var result = PageResult.from(page);
        assertThat(result.items()).containsExactly("item");
        assertThat(result.meta()).isEqualTo(new PageResult.PageMeta(2, 2, 5, 3));
    }
}
