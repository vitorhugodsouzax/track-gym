const ITEMS = [
  { id: 'Treino', label: 'Treino' },
  { id: 'Fichas', label: 'Fichas' },
  { id: 'Logbook', label: 'Logbook' },
  { id: 'Progressão', label: 'Progressão' },
  { id: 'Configurações', label: 'Ajustes' },
] as const;

export function BottomNav({ page, onChange }: { page: string; onChange: (page: string) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <button className={page === item.id || (item.id === 'Fichas' && page === 'Ficha pessoal') ? 'active' : ''} key={item.id} onClick={() => onChange(item.id)}>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
