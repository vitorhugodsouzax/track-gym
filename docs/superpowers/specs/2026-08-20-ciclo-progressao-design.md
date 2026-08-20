# Ciclo de progressão contínuo — Treino + Histórico

Data: 2026-08-20
Status: aprovado em conversa, aguardando plano de implementação

## 1. Contexto e objetivo

O app já implementa o ciclo básico do Memento Mori Protocol (Treino → Registro → Logbook), mas duas peças centrais descritas no spec original nunca chegaram a ser construídas:

- A tela de Treino não mostra a última sessão do exercício nem prepara a carga da próxima sessão automaticamente (spec seções 9 e 30).
- Top Set e Back Off não são calculados em lugar nenhum do código — hoje o card apenas repete a carga de trabalho para esses tipos de série.
- Logbook e Progressão são duas telas separadas que leem essencialmente os mesmos dados (`GET /api/logbook`) e mostram versões parecidas da mesma informação, sem se conectar ao momento em que a carga é decidida (dentro do próprio treino).

Este documento define como fechar essas lacunas como uma experiência única e contínua: **o usuário treina, recebe feedback na hora, e na próxima vez que abre o exercício a carga já vem pronta e explicada — sem precisar visitar outra tela para saber o que fazer.**

## 2. Escopo

**Dentro do escopo:**
- Reescrita das regras de progressão da Working Set (critério objetivo por reps, sem formulário subjetivo).
- Cálculo de Top Set e Back Off, em tempo real, durante o treino.
- Feedback visual imediato dentro do treino quando a meta é batida.
- Preenchimento automático da carga de trabalho na próxima sessão, com explicação.
- Fusão de Logbook + Progressão em uma única tela "Histórico", organizada por exercício, com visão alternativa por sessão.
- Resumo pós-treino detalhado por exercício.
- Navegação ajustada (5 → 4 itens).

**Fora do escopo desta entrega** (ficam no backlog técnico já discutido anteriormente): validação de payload nas rotas, testes de integração, rate limiting, PWA/offline, paginação do histórico, remoção física das colunas de critério subjetivo do schema.

## 3. Regras de negócio (fonte de verdade)

### Feeders — inalterado
- 3 feeders: 50%, 70%, 90%
- 2 feeders: 70%, 90%
- 1 feeder: 85%
- Calculado a partir da carga de trabalho informada, arredondado ao incremento do equipamento. Nenhuma mudança de lógica — só passa a coexistir na tela com os cálculos novos abaixo.

### Working Set — critério de progressão (reescrita do `progressionEngine`)
- Cada Working Set tem um **alvo de reps** = `max(repRangeMax, repRangeMin + 2)`.
  - Exemplo: WS fixa "8" (min=max=8) → alvo 10.
  - Exemplo: WS aberta "8–12" → alvo 12.
- A progressão é avaliada por **exercício**, olhando **todas** as séries do tipo `WORKING` daquele exercício na sessão.
- **Libera progressão** somente se `completedReps` de **todas** as WS ≥ seu respectivo alvo, na mesma sessão.
- Quando libera: `nextWorkingWeight = actualWeight da última WS realizada × 1,05`, arredondado ao incremento. Sem distinção por tipo de equipamento aqui (a distinção fica só no Top Set — ver abaixo).
- Quando não libera: a carga sugerida para a próxima sessão é mantida igual à última carga real utilizada.
- **Progresso parcial ("quase lá")**: se pelo menos uma WS teve `completedReps` maior que a mesma WS (mesma posição) na sessão anterior, mas sem bater o alvo em todas, sinalizar isso separadamente (usado no Histórico, seção 6). Não altera a carga, é só reforço visual.
- **Removido:** os campos de critério subjetivo (Controle da carga, RIR, Feeling, Reps limpas) deixam de ser exigidos e de aparecer na tela. As colunas correspondentes no schema (`loadControlled`, `repsInReserve`, `feeling`, `repsClean`) continuam existindo por ora (nullable, sem uso) — remoção física é tarefa técnica separada, fora desta entrega.

### Top Set (novo — não existe hoje)
- Só é exibido/calculado se a ficha do exercício tiver uma série `TOP_SET`.
- Base = carga realmente utilizada (`actualWeight`) na **última Working Set** do exercício.
- Livre: `base × 1,05`
- Máquina: `base × 1,10`
- Arredondado ao incremento. Sempre a última série do exercício quando presente.
- **Calculado em tempo real**: assim que a última WS recebe uma carga realizada, o valor planejado do Top Set atualiza na tela sem precisar de ação extra do usuário.

### Back Off (novo — não existe hoje)
- Só é exibido/calculado se a ficha do exercício tiver uma série `BACK_OFF`.
- Base = carga realmente utilizada na **última Working Set** do exercício — **nunca** no Top Set, mesmo em exercícios onde o Top Set vem antes do Back Off na ordem (ex.: Sumo Deadlift: WS → Top Set → Back Off).
- `= base × 0,90`, arredondado ao incremento.
- Calculado em tempo real, mesma lógica de gatilho do Top Set.

### Rest Pause — inalterado
- Mesma carga da Working Set, levada à falha. Sem fórmula de porcentagem. Timer de 20s já implementado, mantém.

## 4. Modelo de dados — impacto

- `ProgressionResult`: mantém `shouldProgress` / `nextWorkingWeight` / `percentage` / `reason`. `percentage` passa a ser sempre `5` quando `shouldProgress = true`, ou `null` quando mantém.
- Nenhuma migration é estritamente necessária para Top Set/Back Off — a base de cálculo (última WS) é derivável da própria lista de séries (`order` + `type`) que já existe em `ExerciseSetTemplate`/`WorkoutSet`. É lógica de cálculo, não de schema.
- Os campos de critério subjetivo em `WorkoutSet` permanecem no schema, mas o frontend para de enviá-los e o backend para de exigi-los.
- Necessário um novo formato de resposta que traga, por exercício, um resumo de desempenho anterior (última sessão + progressão vigente) — hoje isso exigiria uma chamada por exercício (`/api/exercises/:id/last-session`), o que não escala para um treino com 7 exercícios. Esse resumo passa a vir embutido na mesma resposta que já busca o dia de treino.
- Para o Histórico "por exercício", é necessária uma consulta agregada por exercício (carga atual, status de progressão, pontos para a mini-tendência) — hoje só existe a listagem crua de sessões completas.

## 5. Experiência — Tela de Treino

Formulário de critérios subjetivos é removido por completo. Cada Working Set passa a pedir só carga realizada + reps realizadas — menos toques, mesma decisão.

```
T BAR ROW
Última: 50 kg × 8 × 8

▲ Progrediu 5% — bateu 10 reps em todas as WS
Carga de trabalho
[ 52,5 kg ]

Feeder 1   26 kg   3–5
Feeder 2   37 kg   3–5
Feeder 3   47 kg   3–5

WS 1       52,5 kg   8
Realizado: [    ] kg   Reps: [   ]

WS 2       52,5 kg   8
Realizado: [    ] kg   Reps: [   ]   🔥 na meta

Back Off   47 kg   8–12   ← recalcula sozinho ao preencher a WS2
Realizado: [    ] kg   Reps: [   ]
```

- Exercício sem histórico: campo de carga de trabalho começa vazio, sem faixa de aviso, sem "última sessão" — comportamento atual, sem mudança.
- A carga sugerida no campo é só o valor inicial — continua livremente editável, e todo o resto (Feeders, Top Set, Back Off) recalcula a partir do que estiver de fato no campo, não do valor sugerido original.

## 6. Experiência — feedback em tempo real

Dois níveis de feedback, propositalmente discretos (sem confete, sem badge colecionável — mantendo o espírito "sem gamificação exagerada" do protocolo):

- **Por série:** quando uma WS individual bate seu alvo de reps, um selo pequeno aparece ao lado daquela linha ("🔥 na meta"). Não implica nada ainda sobre a próxima sessão — é só reconhecimento imediato.
- **Por exercício:** só quando **todas** as WS do exercício batem o alvo na sessão atual, o badge no topo do card ("▲ Progrediu 5%...") aparece **ainda durante o treino**, não só na próxima vez que o exercício for aberto. O usuário sai da academia já sabendo o que vai acontecer da próxima vez.
- **Progresso parcial:** se alguma WS melhorou em relação à sessão anterior sem bater o alvo em todas, mostrar uma nota neutra ("🔸 +1 rep vs. última vez") em vez de nada — sem prometer progressão que não vai acontecer.

## 7. Experiência — Histórico (fusão Logbook + Progressão)

Substitui as duas abas atuais por uma, organizada por exercício por padrão, com alternância para visão por sessão:

```
HISTÓRICO
[ Por exercício ]  Por sessão

🔍 Buscar exercício...

TREINO 1
┌─────────────────────────────┐
│ T BAR ROW              52,5 │
│ ▲ +5% garantido próx. sessão │
│ ╱╲╱‾‾╱  (mini tendência)     │
├─────────────────────────────┤
│ SUPINO INCLINADO         50 │
│ 🔸 +1 rep vs. última vez     │
├─────────────────────────────┤
│ DESENVOLVIMENTO           40 │
│ Mantendo                     │
└─────────────────────────────┘
```

- **Por exercício** (padrão): agrupado por treino (TREINO 1, 2...), cada exercício mostra carga atual, status (progressão garantida / quase lá / mantendo) e uma mini-tendência (um único sparkline por exercício — não um dashboard). Toque abre o histórico completo daquele exercício (mesma visão que já existe hoje no Logbook por exercício: data, carga, reps).
- **Por sessão**: mantém a visão atual do Logbook — cards por data, com todos os exercícios daquele dia. Útil para lembrar "o que eu fiz numa data específica".
- Busca por exercício no topo, atendendo ao que a seção 28 do spec original já pedia e nunca foi implementado.

## 8. Experiência — Resumo pós-treino

Hoje o resumo é uma única frase genérica. Passa a detalhar por exercício (isso também já estava pedido na seção 30 do spec original):

```
TREINO CONCLUÍDO
7 exercícios

T Bar Row         ▲ +5% na próxima
Remada baixa      Mantendo
Supino inclinado  🔸 +1 rep
...

[ Ver no Histórico ]
```

O botão leva direto para a aba Histórico (visão por exercício), fechando o ciclo: treinou → viu o resultado na hora → confirma a tendência.

## 9. Navegação

Menu inferior passa de 5 para 4 itens: **Treino · Fichas · Histórico · Ajustes**.

## 10. Casos de borda

- Sessão `IN_PROGRESS` (não concluída) não conta como "última sessão" para fins de auto-fill nem de avaliação de progressão — só sessões `COMPLETED`, mesmo comportamento já existente hoje.
- Exercício de ficha pessoal editado/excluído entre sessões: o histórico permanece via snapshot (`nameSnapshot`), mas o vínculo de auto-fill quebra se o `exerciseTemplateId` mudar — comportamento aceito, consequência natural do modelo de snapshot já existente.
- Exercício com múltiplas Working Sets: progressão avalia todas; a base de cálculo de Top Set/Back Off é sempre a **última** WS realizada, nunca uma média ou a primeira.
- Usuário edita manualmente a carga sugerida: o resto da tela (Feeders, Top Set, Back Off) sempre recalcula a partir do valor atual do campo, nunca do valor sugerido original.

## 11. Testes a cobrir

- `progressionEngine`: novo critério objetivo por múltiplas WS; cálculo do alvo (fixo+2 vs. topo do range); caso "quase lá".
- Novo `topSetCalculator` / `backOffCalculator`: livre vs. máquina, arredondamento, base = última WS realizada, inclusive no caso Top Set antes de Back Off (Sumo Deadlift).
- Componentes de UI: exibição condicional dos badges (nenhum histórico / progrediu / mantendo / quase lá), recálculo em tempo real ao digitar a WS.

## 12. Fora de escopo desta fase

Os itens técnicos já levantados anteriormente (validação de payload, testes de integração de rotas, rate limiting em auth, PWA/offline, paginação do histórico, remoção física das colunas de critério subjetivo) permanecem no backlog e não fazem parte desta entrega — o foco aqui é exclusivamente produto/experiência, conforme definido no início desta conversa.
