import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EmployeesView } from './employees-view';

vi.mock('next/link', () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));

const employee = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Ayu Pratama',
  gender: 'FEMALE',
  dateOfBirth: '1995-08-17',
  email: 'ayu@example.com',
  position: 'MID_PROGRAMMER',
  status: 'ACTIVE',
  hiredAt: '2026-09-01',
  competencies: [],
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

afterEach(() => vi.restoreAllMocks());

describe('EmployeesView integration', () => {
  it('renders API data and sends a debounced search query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/competencies?')) {
        return new Response(JSON.stringify({ data: { items: [], meta: { page: 1, limit: 100, totalItems: 0, totalPages: 0 } } }));
      }
      return new Response(JSON.stringify({ data: { items: [employee], meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 } } }));
    });
    const user = userEvent.setup();
    render(<EmployeesView />);

    expect(await screen.findByText('Ayu Pratama')).toBeInTheDocument();
    expect(screen.getAllByText('Mid-level Programmer')).toHaveLength(2);
    await user.type(screen.getByLabelText('Search employees'), 'Ayu');

    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url).includes('search=Ayu'))).toBe(true));
  });
});
