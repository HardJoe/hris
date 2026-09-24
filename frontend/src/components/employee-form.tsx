'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import type { Competency, CompetencyAssignmentInput, Employee, EmployeeInput, Grade, PagedResult } from '@/lib/contracts';
import { employmentStatuses, genderLabels, genders, grades, positionLabels, positions, statusLabels } from '@/lib/contracts';

interface EditableAssignment extends CompetencyAssignmentInput { file?: File }

const emptyInput: Omit<EmployeeInput, 'competencies'> = {
  name: '', gender: 'MALE', dateOfBirth: '', email: '', position: 'JUNIOR_PROGRAMMER', status: 'ACTIVE', hiredAt: '',
};

export function EmployeeForm({ employeeId }: { employeeId?: string }) {
  const router = useRouter();
  const [values, setValues] = useState(emptyInput);
  const [assignments, setAssignments] = useState<EditableAssignment[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(Boolean(employeeId));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const requests: [Promise<PagedResult<Competency>>, Promise<Employee> | null] = [
      apiRequest<PagedResult<Competency>>('/competencies?page=1&limit=100'),
      employeeId ? apiRequest<Employee>(`/employees/${employeeId}`) : null,
    ];
    void Promise.all([requests[0], requests[1]])
      .then(([competencyResult, employee]) => {
        setCompetencies(competencyResult.items);
        if (employee) {
          setValues({ name: employee.name, gender: employee.gender, dateOfBirth: employee.dateOfBirth, email: employee.email, position: employee.position, status: employee.status, hiredAt: employee.hiredAt });
          setAssignments(employee.competencies.map((item) => ({ competencyId: item.id, grade: item.grade })));
        }
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const availableCompetencies = useMemo(() => competencies.filter((item) => !assignments.some((assignment) => assignment.competencyId === item.id)), [assignments, competencies]);

  function updateValue<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addAssignment() {
    const first = availableCompetencies[0];
    if (first) setAssignments((current) => [...current, { competencyId: first.id, grade: 'C' }]);
  }

  function updateAssignment(index: number, patch: Partial<EditableAssignment>) {
    setAssignments((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const input: EmployeeInput = { ...values, name: values.name.trim(), email: values.email.trim(), competencies: assignments.map(({ competencyId, grade }) => ({ competencyId, grade })) };
      const employee = await apiRequest<Employee>(employeeId ? `/employees/${employeeId}` : '/employees', { method: employeeId ? 'PATCH' : 'POST', body: JSON.stringify(input) });
      const failedUploads: string[] = [];
      for (const assignment of assignments) {
        if (!assignment.file) continue;
        const form = new FormData();
        form.set('certificate', assignment.file);
        try { await apiRequest<Employee>(`/employees/${employee.id}/competencies/${assignment.competencyId}/certificate`, { method: 'POST', body: form }); }
        catch { failedUploads.push(competencies.find((item) => item.id === assignment.competencyId)?.name ?? 'certificate'); }
      }
      if (failedUploads.length) {
        setError(`Employee saved, but these certificates could not be uploaded: ${failedUploads.join(', ')}.`);
        setPending(false);
        return;
      }
      router.push(`/employees/${employee.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the employee.');
      setPending(false);
    }
  }

  if (loading) return <div className="card loading-state">Loading employee…</div>;

  return (
    <form className="card form-card" onSubmit={submit}>
      <section className="form-section">
        <h2 className="form-title">Personal information</h2><p className="section-help">Basic information used to identify the employee.</p>
        {error ? <div className="notice notice-error" role="alert">{error}</div> : null}
        <div className="form-grid">
          <label className="field field-full"><span className="label">Full name <span className="required">*</span></span><input className="input" name="name" required minLength={2} maxLength={120} value={values.name} onChange={(event) => updateValue('name', event.target.value)} autoFocus /></label>
          <label className="field"><span className="label">Email address <span className="required">*</span></span><input className="input" name="email" type="email" required maxLength={254} value={values.email} onChange={(event) => updateValue('email', event.target.value)} /></label>
          <label className="field"><span className="label">Gender <span className="required">*</span></span><select className="select" value={values.gender} onChange={(event) => updateValue('gender', event.target.value as EmployeeInput['gender'])}>{genders.map((item) => <option key={item} value={item}>{genderLabels[item]}</option>)}</select></label>
          <label className="field"><span className="label">Date of birth <span className="required">*</span></span><input className="input" type="date" required max={today()} value={values.dateOfBirth} onChange={(event) => updateValue('dateOfBirth', event.target.value)} /></label>
          <label className="field"><span className="label">Hire date <span className="required">*</span></span><input className="input" type="date" required max={today()} value={values.hiredAt} onChange={(event) => updateValue('hiredAt', event.target.value)} /></label>
        </div>
      </section>
      <section className="form-section">
        <h2 className="form-title">Employment</h2><p className="section-help">The employee’s current position and working status.</p>
        <div className="form-grid">
          <label className="field"><span className="label">Position <span className="required">*</span></span><select className="select" value={values.position} onChange={(event) => updateValue('position', event.target.value as EmployeeInput['position'])}>{positions.map((item) => <option key={item} value={item}>{positionLabels[item]}</option>)}</select></label>
          <label className="field"><span className="label">Status <span className="required">*</span></span><select className="select" value={values.status} onChange={(event) => updateValue('status', event.target.value as EmployeeInput['status'])}>{employmentStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
        </div>
      </section>
      <section className="form-section">
        <h2 className="form-title">Competencies</h2><p className="section-help">Assign skills, proficiency grades, and optional PDF/JPEG/PNG certificates up to 5 MiB.</p>
        {assignments.length === 0 ? <div className="empty-inline">No competencies assigned.</div> : assignments.map((assignment, index) => (
          <div className="assignment-row" key={`${assignment.competencyId}-${index}`}>
            <label className="field"><span className="label">Competency</span><select className="select" value={assignment.competencyId} onChange={(event) => updateAssignment(index, { competencyId: event.target.value })}>{competencies.filter((item) => item.id === assignment.competencyId || !assignments.some((other, otherIndex) => otherIndex !== index && other.competencyId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input className="input" aria-label={`Certificate for assignment ${index + 1}`} type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => updateAssignment(index, { file: event.target.files?.[0] })} /></label>
            <label className="field"><span className="label">Grade</span><select className="select" value={assignment.grade} onChange={(event) => updateAssignment(index, { grade: event.target.value as Grade })}>{grades.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <button className="button button-danger" type="button" onClick={() => setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove assignment ${index + 1}`}>Remove</button>
          </div>
        ))}
        <button className="button button-secondary mt-3.5" type="button" onClick={addAssignment} disabled={!availableCompetencies.length}>+ Add competency</button>
      </section>
      <div className="form-actions"><Link className="button button-secondary" href={employeeId ? `/employees/${employeeId}` : '/employees'}>Cancel</Link><button className="button button-primary" type="submit" disabled={pending}>{pending ? 'Saving…' : employeeId ? 'Save changes' : 'Create employee'}</button></div>
    </form>
  );
}

function today(): string { return new Date().toISOString().slice(0, 10); }
