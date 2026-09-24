import type { Metadata } from 'next';
import { CompetenciesView } from '@/components/competencies-view';

export const metadata: Metadata = { title: 'Competencies' };
export default function CompetenciesPage() { return <CompetenciesView />; }
