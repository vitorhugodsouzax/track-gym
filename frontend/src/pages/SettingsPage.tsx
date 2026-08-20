export function SettingsPage({ nickname, onLogout }: { nickname: string; onLogout: () => void }) {
  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Conta</p>
        <h1>Configurações</h1>
        <p>Sessão simples. Incrementos de equipamento entram no card de cada exercício.</p>
      </header>
      <article className="log-card">
        <p className="muted">Nickname</p>
        <strong className="nickname">{nickname}</strong>
      </article>
      <button className="ghost" onClick={onLogout}>Sair</button>
    </section>
  );
}
