'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from './confirm-dialog';
import { StatusBadge } from './status-badge';
import { apiRequest } from '@/lib/api-client';
import type { Competency, Employee, EmploymentStatus, PagedResult, Position } from '@/lib/contracts';
import { employmentStatuses, positionLabels, positions, statusLabels } from '@/lib/contracts';

const PAGE_SIZE = 10;

export function EmployeesView() {
  const router = useRouter();
  const [result, setResult] = useState<PagedResult<Employee> | null>(null);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<Position | ''>('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [competencyId, setCompetencyId] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Employee | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (position) params.set('position', position);
    if (status) params.set('status', status);
    if (competencyId) params.set('competencyId', competencyId);
    try {
      setResult(await apiRequest<PagedResult<Employee>>(`/employees?${params}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load employees.');
    }
  }, [competencyId, page, position, search, status]);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    if (position) params.set('position', position);
    if (status) params.set('status', status);
    if (competencyId) params.set('competencyId', competencyId);
    void apiRequest<PagedResult<Employee>>(`/employees?${params}`)
      .then(setResult)
      .catch((reason: Error) => setError(reason.message));
  }, [competencyId, page, position, search, status]);
  useEffect(() => {
    void apiRequest<PagedResult<Competency>>('/competencies?page=1&limit=100')
      .then((data) => setCompetencies(data.items))
      .catch(() => undefined);
  }, []);

  async function removeEmployee() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<void>(`/employees/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete the employee.');
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  const from = result && result.meta.totalItems > 0 ? (result.meta.page - 1) * result.meta.limit + 1 : 0;
  const to = result ? Math.min(result.meta.page * result.meta.limit, result.meta.totalItems) : 0;

  return (
    <>
      <section className="card">
        <div className="toolbar">
          <div className="search"><span className="search-icon" aria-hidden="true">⌕</span><input className="input search-input" aria-label="Search employees" placeholder="Search name or email…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div>
          <select className="select toolbar-select" aria-label="Filter by position" value={position} onChange={(event) => { setPosition(event.target.value as Position | ''); setPage(1); }}><option value="">All positions</option>{positions.map((item) => <option key={item} value={item}>{positionLabels[item]}</option>)}</select>
          <select className="select toolbar-select" aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as EmploymentStatus | ''); setPage(1); }}><option value="">All statuses</option>{employmentStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select>
          <select className="select toolbar-select" aria-label="Filter by competency" value={competencyId} onChange={(event) => { setCompetencyId(event.target.value); setPage(1); }}><option value="">All competencies</option>{competencies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        </div>
        {error ? <div className="error-state" role="alert">{error}<br /><button className="button button-quiet" type="button" onClick={() => void load()}>Try again</button></div> : !result ? <div className="loading-state">Loading employees…</div> : result.items.length === 0 ? <div className="empty-state">No employees match these filters.</div> : (
          <div className="table-wrap responsive-table-wrap">
            <table className="table responsive-table employee-table">
              <thead><tr><th className="table-heading">Employee</th><th className="table-heading">Position</th><th className="table-heading">Status</th><th className="table-heading">Competencies</th><th className="table-heading">Hired</th><th className="table-heading"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{result.items.map((employee) => (
                <tr
                  className="table-row table-row-link"
                  key={employee.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/employees/${employee.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      router.push(`/employees/${employee.id}`);
                    }
                  }}
                >
                  <td className="table-cell" data-label="Employee"><div className="name-cell"><span className="mini-avatar">{employee.name.charAt(0).toUpperCase()}</span><div><strong>{employee.name}</strong><span className="name-subtitle">{employee.email}</span></div></div></td>
                  <td className="table-cell" data-label="Position">{positionLabels[employee.position]}</td>
                  <td className="table-cell" data-label="Status"><StatusBadge status={employee.status} /></td>
                  <td className="table-cell" data-label="Competencies"><div className="tag-list">{employee.competencies.slice(0, 2).map((item) => <span className="tag" key={item.id}>{item.name} · {item.grade}</span>)}{employee.competencies.length > 2 ? <span className="tag">+{employee.competencies.length - 2}</span> : null}</div></td>
                  <td className="table-cell" data-label="Hired">{formatDate(employee.hiredAt)}</td>
                  <td className="table-cell responsive-actions-cell"><div className="actions" onClick={(event) => event.stopPropagation()}><Link className="icon-button" href={`/employees/${employee.id}/edit`} aria-label={`Edit ${employee.name}`}><Pencil size={17} strokeWidth={2} aria-hidden="true" /></Link><button className="icon-button" type="button" onClick={() => setDeleting(employee)} aria-label={`Delete ${employee.name}`}><Trash2 size={17} strokeWidth={2} aria-hidden="true" /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {result ? <div className="table-footer"><span>Showing {from}–{to} of {result.meta.totalItems}</span><div className="pagination"><button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result.meta.page} of {Math.max(result.meta.totalPages, 1)}</span><button className="button button-secondary" type="button" disabled={page >= result.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}
      </section>
      {deleting ? <ConfirmDialog title="Delete employee?" message={`${deleting.name} will be removed from active records. This action cannot be undone from the application.`} pending={deletePending} onCancel={() => setDeleting(null)} onConfirm={() => void removeEmployee()} /> : null}
    </>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}
