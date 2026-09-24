package com.compnet.hris.common;

import java.util.List;
import org.springframework.data.domain.Page;

public record PageResult<T>(List<T> items, PageMeta meta) {
    public static <T> PageResult<T> from(Page<T> page) {
        return new PageResult<>(page.getContent(), new PageMeta(page.getNumber() + 1,
                page.getSize(), page.getTotalElements(), page.getTotalPages()));
    }

    public record PageMeta(int page, int limit, long totalItems, int totalPages) {}
}
