import { DumbbellIcon, HomeIcon, PersonIcon, TrendIcon } from './Icons';

const ITEMS = [
  { id: 'Fichas', label: 'Início', Icon: HomeIcon },
  { id: 'Treino', label: 'Treino', Icon: DumbbellIcon },
  { id: 'Histórico', label: 'Histórico', Icon: TrendIcon },
  { id: 'Configurações', label: 'Perfil', Icon: PersonIcon },
] as const;

export function BottomNav({ page, onChange }: { page: string; onChange: (page: string) => void }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map(({ id, label, Icon }) => {
        const active = page === id || (id === 'Fichas' && page === 'Ficha pessoal');
        return (
          <button className={active ? 'active' : ''} key={id} onClick={() => onChange(id)}>
            <Icon />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
