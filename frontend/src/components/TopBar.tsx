import type { ReactNode } from 'react';
import { ChevronLeftIcon } from './Icons';

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="detail-topbar">
      <button aria-label="Voltar" className="icon-button" onClick={onBack}>
        <ChevronLeftIcon />
      </button>
      <h2>{title}</h2>
      <div className="detail-topbar-right">{right}</div>
    </header>
  );
}
