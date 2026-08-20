import { useMemo, useState, type FormEvent } from 'react';

export function LoginPage({
  onLogin,
  onRegister,
}: {
  onLogin: (nickname: string, password: string) => Promise<void>;
  onRegister: (nickname: string, password: string) => Promise<void>;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const title = useMemo(() => (mode === 'login' ? 'Entrar' : 'Criar conta'), [mode]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'login') await onLogin(nickname, password);
      else await onRegister(nickname, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-screen">
      <div className="auth-mark">
        <p className="eyebrow">Protocolo</p>
        <h1>Memento Mori</h1>
        <p className="lede">Treino, registro, logbook e progressão. Sem ruído.</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <div className="segmented">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Criar conta</button>
        </div>
        <h2>{title}</h2>
        <label>
          Nickname
          <input autoComplete="username" value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="ex: vitor" />
        </label>
        <label>
          Senha
          <input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••" />
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button className="primary" disabled={busy} type="submit">{busy ? 'Aguarde…' : title}</button>
      </form>
    </section>
  );
}
