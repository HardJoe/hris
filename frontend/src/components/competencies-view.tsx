'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { apiRequest } from '@/lib/api-client';
import type { Competency, PagedResult } from '@/lib/contracts';

const PAGE_SIZE = 10;

export function CompetenciesView() {
  const [result, setResult] = useState<PagedResult<Competency> | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Competency | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Competency | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [searchInput]);
  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) }); if (search) params.set('search', search);
    try { setError(''); setResult(await apiRequest<PagedResult<Competency>>(`/competencies?${params}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load competencies.'); }
  }, [page, search]);
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (search) params.set('search', search);
    void apiRequest<PagedResult<Competency>>(`/competencies?${params}`)
      .then(setResult)
      .catch((reason: Error) => setError(reason.message));
  }, [page, search]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing) return; setPending(true); setError('');
    const name = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    try {
      await apiRequest<Competency>(editing === 'new' ? '/competencies' : `/competencies/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PATCH', body: JSON.stringify({ name }) });
      setEditing(null); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save the competency.'); }
    finally { setPending(false); }
  }

  async function remove() {
    if (!deleting) return; setPending(true); setError('');
    try { await apiRequest<void>(`/competencies/${deleting.id}`, { method: 'DELETE' }); setDeleting(null); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete the competency.'); setDeleting(null); }
    finally { setPending(false); }
  }

  return (
    <>
      <header className="page-header"><div><h1 className="page-title">Competencies</h1><p className="page-description">Maintain the skills available for employee assignments.</p></div><button className="button button-primary" type="button" onClick={() => setEditing('new')}>+ Add competency</button></header>
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      <section className="card">
        <div className="toolbar"><div className="search"><span className="search-icon" aria-hidden="true">⌕</span><input className="input search-input" aria-label="Search competencies" placeholder="Search competencies…" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} /></div></div>
        {!result ? <div className="loading-state">Loading competencies…</div> : result.items.length === 0 ? <div className="empty-state">No competencies found.</div> : <div className="table-wrap"><table className="table"><thead><tr><th>Competency</th><th>Created</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{result.items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{formatTimestamp(item.createdAt)}</td><td>{formatTimestamp(item.updatedAt)}</td><td><div className="actions"><button className="icon-button" type="button" onClick={() => setEditing(item)} aria-label={`Edit ${item.name}`}>✎</button><button className="icon-button" type="button" onClick={() => setDeleting(item)} aria-label={`Delete ${item.name}`}>×</button></div></td></tr>)}</tbody></table></div>}
        {result ? <div className="table-footer"><span>{result.meta.totalItems} competencies</span><div className="pagination"><button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {result.meta.page} of {Math.max(result.meta.totalPages, 1)}</span><button className="button button-secondary" type="button" disabled={page >= result.meta.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></div></div> : null}
      </section>
      {editing ? <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setEditing(null)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="competency-title"><div className="modal-header"><h2 className="modal-title" id="competency-title">{editing === 'new' ? 'Add competency' : 'Edit competency'}</h2><p className="modal-description">Use a clear, recognizable skill name.</p></div><form className="modal-body" onSubmit={save}><label className="field"><span className="label">Competency name <span className="required">*</span></span><input className="input" name="name" defaultValue={editing === 'new' ? '' : editing.name} required minLength={2} maxLength={100} autoFocus /></label><div className="modal-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(null)} disabled={pending}>Cancel</button><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</button></div></form></section></div> : null}
      {deleting ? <ConfirmDialog title="Delete competency?" message={`${deleting.name} can only be deleted when it is not assigned to an employee.`} pending={pending} onCancel={() => setDeleting(null)} onConfirm={() => void remove()} /> : null}
    </>
  );
}

function formatTimestamp(value: string): string { return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(value)); }
