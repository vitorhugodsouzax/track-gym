import { useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { useAuth } from './hooks/useAuth';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { PersonalPlanPage } from './pages/PersonalPlanPage';
import { PlansPage } from './pages/PlansPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkoutPage } from './pages/WorkoutPage';
import './styles.css';

export function App() {
  const auth = useAuth();
  const [page, setPage] = useState('Fichas');

  if (auth.loading) {
    return (
      <main className="splash">
        <p className="eyebrow">Memento Mori</p>
        <h1>Carregando</h1>
      </main>
    );
  }

  if (!auth.user) {
    return (
      <main>
        <LoginPage onLogin={auth.login} onRegister={auth.register} />
      </main>
    );
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Memento Mori</p>
          <strong>{auth.user.nickname}</strong>
        </div>
      </header>
      <main>
        {page === 'Treino' && <WorkoutPage onNeedPlan={() => setPage('Fichas')} onFinished={() => setPage('Histórico')} />}
        {page === 'Fichas' && (
          <PlansPage
            onUseVitor={() => setPage('Treino')}
            onOpenPersonal={() => setPage('Ficha pessoal')}
          />
        )}
        {page === 'Ficha pessoal' && <PersonalPlanPage onTrain={() => setPage('Treino')} onBack={() => setPage('Fichas')} />}
        {page === 'Histórico' && <HistoryPage />}
        {page === 'Configurações' && <SettingsPage nickname={auth.user.nickname} onLogout={auth.logout} />}
      </main>
      <BottomNav page={page} onChange={setPage} />
    </>
  );
}
