'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ConfirmDialog } from './confirm-dialog';
import { apiRequest, downloadFile } from '@/lib/api-client';
import type { Employee } from '@/lib/contracts';
import { genderLabels, positionLabels, statusLabels } from '@/lib/contracts';

export function EmployeeDetail({ employeeId }: { employeeId: string }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingId, setUploadingId] = useState('');

  const load = useCallback(async () => {
    try { setEmployee(await apiRequest<Employee>(`/employees/${employeeId}`)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load the employee.'); }
  }, [employeeId]);

  useEffect(() => {
    void apiRequest<Employee>(`/employees/${employeeId}`)
      .then(setEmployee)
      .catch((reason: Error) => setError(reason.message));
  }, [employeeId]);

  async function upload(competencyId: string, file: File | undefined) {
    if (!file) return;
    setError(''); setSuccess(''); setUploadingId(competencyId);
    const form = new FormData(); form.set('certificate', file);
    try {
      await apiRequest<Employee>(`/employees/${employeeId}/competencies/${competencyId}/certificate`, { method: 'POST', body: form });
      setSuccess('Certificate uploaded successfully.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload the certificate.'); }
    finally { setUploadingId(''); }
  }

  async function download(competencyId: string) {
    setError('');
    try { await downloadFile(`/employees/${employeeId}/competencies/${competencyId}/certificate`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to download the certificate.'); }
  }

  if (error && !employee) return <div className="card error-state" role="alert">{error}</div>;
  if (!employee) return <div className="card loading-state">Loading employee…</div>;

  return (
    <>
      {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
      {success ? <div className="notice notice-success" role="status">{success}</div> : null}
      <div className="detail-grid">
        <section className="card detail-card">
          <h2 className="detail-title">Profile information</h2>
          <dl className="details">
            <div><dt className="detail-term">Full name</dt><dd className="detail-description">{employee.name}</dd></div>
            <div><dt className="detail-term">Email address</dt><dd className="detail-description">{employee.email}</dd></div>
            <div><dt className="detail-term">Gender</dt><dd className="detail-description">{genderLabels[employee.gender]}</dd></div>
            <div><dt className="detail-term">Date of birth</dt><dd className="detail-description">{formatDate(employee.dateOfBirth)}</dd></div>
            <div><dt className="detail-term">Position</dt><dd className="detail-description">{positionLabels[employee.position]}</dd></div>
            <div><dt className="detail-term">Hire date</dt><dd className="detail-description">{formatDate(employee.hiredAt)}</dd></div>
          </dl>
        </section>
        <aside className="card detail-card">
          <h2 className="detail-title">Employment</h2>
          <dl className="details details-single">
            <div><dt className="detail-term">Status</dt><dd className="detail-description"><span className={`badge badge-${employee.status.toLowerCase()}`}>{statusLabels[employee.status]}</span></dd></div>
            <div><dt className="detail-term">Record created</dt><dd className="detail-description">{formatTimestamp(employee.createdAt)}</dd></div>
            <div><dt className="detail-term">Last updated</dt><dd className="detail-description">{formatTimestamp(employee.updatedAt)}</dd></div>
          </dl>
        </aside>
      </div>
      <section className="card competency-card">
        <div className="card-header"><h2 className="card-title">Competencies and certificates</h2><p className="card-description">Upload replaces the current certificate for an assignment.</p></div>
        {employee.competencies.length === 0 ? <div className="empty-state">No competencies assigned.</div> : employee.competencies.map((item) => (
          <div className="competency-item" key={item.id}>
            <div className="competency-item-info"><span className="badge badge-grade">{item.grade}</span><div><strong>{item.name}</strong><div className="certificate">{item.certificate.available ? `${item.certificate.originalName} · ${formatBytes(item.certificate.size)}` : 'No certificate uploaded'}</div></div></div>
            <div className="header-actions">
              {item.certificate.available ? <button className="button button-secondary" type="button" onClick={() => void download(item.id)}>Download</button> : null}
              <label className={`button button-secondary ${uploadingId ? 'cursor-not-allowed' : 'cursor-pointer'}`}>{uploadingId === item.id ? 'Uploading…' : item.certificate.available ? 'Replace' : 'Upload'}<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png" disabled={Boolean(uploadingId)} onChange={(event) => void upload(item.id, event.target.files?.[0])} /></label>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

export function EmployeeDetailActions({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function remove() {
    setPending(true);
    try { await apiRequest<void>(`/employees/${employeeId}`, { method: 'DELETE' }); router.replace('/employees'); router.refresh(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to delete the employee.'); setPending(false); setOpen(false); }
  }
  return <><div className="header-actions"><Link className="button button-secondary" href="/employees">Back</Link><Link className="button button-primary" href={`/employees/${employeeId}/edit`}>Edit</Link><button className="button button-danger" type="button" onClick={() => setOpen(true)}>Delete</button></div>{error ? <span className="notice notice-error" role="alert">{error}</span> : null}{open ? <ConfirmDialog title="Delete employee?" message="The employee will be removed from active records. This action cannot be undone from the application." pending={pending} onCancel={() => setOpen(false)} onConfirm={() => void remove()} /> : null}</>;
}

function formatDate(value: string): string { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)); }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function formatBytes(value: number | null): string { if (value === null) return ''; return value < 1024 * 1024 ? `${Math.ceil(value / 1024)} KiB` : `${(value / 1024 / 1024).toFixed(1)} MiB`; }
