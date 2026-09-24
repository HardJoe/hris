'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api-client';
import type { DashboardSummary, Position } from '@/lib/contracts';
import { positionLabels, positions } from '@/lib/contracts';

export function DashboardView() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void apiRequest<DashboardSummary>('/dashboard/summary').then(setData).catch((reason: Error) => setError(reason.message));
  }, []);

  if (error) return <div className="card error-state" role="alert">{error}</div>;
  if (!data) return <div className="card skeleton" aria-label="Loading dashboard" />;

  const headline: Array<{ label: string; value: number; note: string }> = [
    { label: 'Current employees', value: data.totalEmployees, note: 'Active workforce' },
    { label: 'Recent hires', value: data.newEmployees.lastOneMonth, note: 'Last month' },
    { label: 'Recent hires', value: data.newEmployees.lastThreeMonths, note: 'Last three months' },
    { label: 'Competencies', value: data.employeesByCompetency.length, note: 'Competency records' },
  ];

  return (
    <>
      <div className="stats-grid">
        {headline.map((item) => (
          <article className="card stat" key={item.label}>
            <div className="stat-label">{item.label}</div>
            <div className="stat-value">{item.value}</div>
            <div className="stat-note">{item.note}</div>
          </article>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header"><h2 className="card-title">Employees by position</h2><p className="card-description">Distribution across programming levels</p></div>
          <ul className="metric-list">
            {positions.map((position: Position) => (
              <li className="metric-row" key={position}>
                <span className="metric-name"><span className="metric-dot" />{positionLabels[position]}</span>
                <span className="metric-count">{data.employeesByPosition[position]}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="card">
          <div className="card-header"><h2 className="card-title">Employees by competency</h2><p className="card-description">Active employees assigned to each competency</p></div>
          {data.employeesByCompetency.length ? (
            <ul className="metric-list">
              {data.employeesByCompetency.map((item) => (
                <li className="metric-row" key={item.competencyId}><span className="metric-name"><span className="metric-dot" />{item.name}</span><span className="metric-count">{item.count}</span></li>
              ))}
            </ul>
          ) : <div className="empty-state">No competencies have been created yet.</div>}
        </section>
        <section className="card col-span-full">
          <div className="card-header"><h2 className="card-title">Recent hires</h2><p className="card-description">Active employees by hire date</p></div>
          <ul className="metric-list">
            <li className="metric-row"><span className="metric-name"><span className="metric-dot" />Last month</span><span className="metric-count">{data.newEmployees.lastOneMonth}</span></li>
            <li className="metric-row"><span className="metric-name"><span className="metric-dot" />Last three months</span><span className="metric-count">{data.newEmployees.lastThreeMonths}</span></li>
          </ul>
        </section>
      </div>
    </>
  );
}
