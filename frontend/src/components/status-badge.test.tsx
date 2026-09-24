import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it.each([
    ['ACTIVE', 'badge-active'],
    ['INACTIVE', 'badge-inactive'],
  ] as const)('applies %s status styling', (status, className) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(status === 'ACTIVE' ? 'Active' : 'Inactive')).toHaveClass('badge', className);
  });
});
