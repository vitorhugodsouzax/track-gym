# Ciclo de Progressão Contínuo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o ciclo Treino → Histórico do Memento Mori Protocol: calcular Top Set/Back Off em tempo real durante o treino, preencher automaticamente a carga da próxima sessão com explicação, e fundir Logbook + Progressão numa única tela "Histórico" organizada por exercício.

**Architecture:** Motor de cálculo puro (`progressionEngine`, `topSetCalculator`, `backOffCalculator`) isolado da UI, replicado em versão leve no frontend para feedback em tempo real (mesmo padrão já usado pelo `feederCalculator`). Backend agrega "última performance" por exercício numa única resposta (evita N+1). Frontend consome isso para auto-preencher a carga e mostrar os badges de progresso.

**Tech Stack:** Fastify + Prisma/Postgres (backend), React + Vite + TypeScript (frontend), Vitest para testes unitários dos dois lados.

**Spec:** `docs/superpowers/specs/2026-08-20-ciclo-progressao-design.md`

## Global Constraints

- Todo arredondamento de peso passa por `roundToIncrement` — nunca `Math.round` solto num cálculo de carga.
- Feeders: 3 = 50/70/90%, 2 = 70/90%, 1 = 85% — **inalterado**, não mexer.
- Alvo de reps de uma Working Set = `max(repRangeMax, repRangeMin + 2)`.
- Progressão da WS libera só se **todas** as WS do exercício baterem o alvo na mesma sessão; quando libera, `nextWorkingWeight = actualWeight da última WS × 1,05` (5% flat, sem distinção por equipamento).
- Top Set = `actualWeight da última WS × 1,05` (livre) ou `× 1,10` (máquina).
- Back Off = `actualWeight da última WS × 0,90` — base é sempre a WS, nunca o Top Set, mesmo quando o Top Set vem antes na ordem.
- Critério subjetivo (Controle da carga / RIR / Feeling / Reps limpas) não é mais coletado nem exigido em nenhum lugar do fluxo.

---

## Phase A — Motor de cálculo (backend)

### Task 1: Reescrever `progressionEngine.ts`

**Files:**
- Modify: `backend/src/engines/progressionEngine.ts`
- Modify: `backend/tests/progressionEngine.test.ts`

**Interfaces:**
- Produces: `WorkingSetPerformance { order: number; repRangeMin: number; repRangeMax: number; completedReps: number; actualWeight: number }`, `ProgressionResult { shouldProgress: boolean; nextWorkingWeight: number; percentage: number | null; reason: string }`, `repTarget(repRangeMin: number, repRangeMax: number): number`, `evaluateProgression(workingSets: WorkingSetPerformance[], increment: number): ProgressionResult`, `evaluateRepsTrend(currentSets: WorkingSetPerformance[], previousSets: WorkingSetPerformance[]): 'improved' | 'same'`.

- [ ] **Step 1: Escrever os testes (vão falhar — o arquivo antigo tem uma API diferente)**

Substituir todo o conteúdo de `backend/tests/progressionEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluateProgression, evaluateRepsTrend, repTarget } from '../src/engines/progressionEngine.js';

describe('repTarget', () => {
  it('soma 2 reps quando o range é fixo', () => expect(repTarget(8, 8)).toBe(10));
  it('usa o topo do range quando ele é aberto e maior que min+2', () => expect(repTarget(8, 12)).toBe(12));
  it('usa o topo do range mesmo quando min+2 é menor que o topo', () => expect(repTarget(10, 15)).toBe(15));
});

describe('evaluateProgression', () => {
  it('progride 5% quando todas as working sets batem o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
      { order: 2, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: true, nextWorkingWeight: 105, percentage: 5 });
  });

  it('mantém a carga quando qualquer working set não bate o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
      { order: 2, repRangeMin: 8, repRangeMax: 8, completedReps: 9, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: false, nextWorkingWeight: 100, percentage: null });
  });

  it('usa o topo do range aberto como alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 12, completedReps: 12, actualWeight: 40 },
    ], 1);
    expect(result.shouldProgress).toBe(true);
  });

  it('baseia a próxima carga na última working set realizada', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 90 },
      { order: 2, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
    ], 2.5);
    expect(result.nextWorkingWeight).toBe(105);
  });

  it('lança erro quando nenhuma working set é fornecida', () => {
    expect(() => evaluateProgression([], 2.5)).toThrow();
  });
});

describe('evaluateRepsTrend', () => {
  it('reporta melhora quando alguma série bate mais reps que a sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 9, actualWeight: 100 }];
    const previous = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 8, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, previous)).toBe('improved');
  });

  it('reporta "same" quando nenhuma série melhorou', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 8, actualWeight: 100 }];
    const previous = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 8, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, previous)).toBe('same');
  });

  it('reporta "same" quando não há sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, [])).toBe('same');
  });
});
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm run test --workspace=backend`
Expected: FAIL — `evaluateProgression`/`evaluateRepsTrend`/`repTarget` ainda usam a assinatura antiga.

- [ ] **Step 3: Reescrever a implementação**

Substituir todo o conteúdo de `backend/src/engines/progressionEngine.ts`:

```ts
import { roundToIncrement } from '../calculators/roundingCalculator.js';

export interface WorkingSetPerformance {
  order: number;
  repRangeMin: number;
  repRangeMax: number;
  completedReps: number;
  actualWeight: number;
}

export interface ProgressionResult {
  shouldProgress: boolean;
  nextWorkingWeight: number;
  percentage: number | null;
  reason: string;
}

export function repTarget(repRangeMin: number, repRangeMax: number): number {
  return Math.max(repRangeMax, repRangeMin + 2);
}

export function evaluateProgression(workingSets: WorkingSetPerformance[], increment: number): ProgressionResult {
  if (workingSets.length === 0) throw new Error('At least one working set is required to evaluate progression.');
  const sorted = [...workingSets].sort((a, b) => a.order - b.order);
  const lastSet = sorted[sorted.length - 1];
  const allMet = sorted.every((set) => set.completedReps >= repTarget(set.repRangeMin, set.repRangeMax));
  if (!allMet) {
    return {
      shouldProgress: false,
      nextWorkingWeight: lastSet.actualWeight,
      percentage: null,
      reason: 'Carga mantida: nem todas as Working Sets bateram a meta de reps.',
    };
  }
  return {
    shouldProgress: true,
    nextWorkingWeight: roundToIncrement(lastSet.actualWeight * 1.05, increment),
    percentage: 5,
    reason: 'Progressão liberada: todas as Working Sets bateram a meta de reps (rep range + 2, ou o topo do range).',
  };
}

export function evaluateRepsTrend(currentSets: WorkingSetPerformance[], previousSets: WorkingSetPerformance[]): 'improved' | 'same' {
  if (previousSets.length === 0) return 'same';
  const improved = currentSets.some((current) => {
    const previous = previousSets.find((set) => set.order === current.order);
    return previous !== undefined && current.completedReps > previous.completedReps;
  });
  return improved ? 'improved' : 'same';
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm run test --workspace=backend`
Expected: PASS (todos os testes de `progressionEngine.test.ts`)

- [ ] **Step 5: Commit**

```bash
git add backend/src/engines/progressionEngine.ts backend/tests/progressionEngine.test.ts
git commit -m "refactor: progression engine now uses objective rep targets instead of subjective criteria"
```

---

### Task 2: Criar `topSetCalculator.ts`

**Files:**
- Create: `backend/src/calculators/topSetCalculator.ts`
- Create: `backend/tests/topSetCalculator.test.ts`

**Interfaces:**
- Consumes: `roundToIncrement` de `backend/src/calculators/roundingCalculator.ts`.
- Produces: `EquipmentType = 'FREE_WEIGHT' | 'MACHINE'`, `calculateTopSet(lastWorkingSetWeight: number, equipmentType: EquipmentType, increment: number): number`.

- [ ] **Step 1: Escrever o teste**

Criar `backend/tests/topSetCalculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateTopSet } from '../src/calculators/topSetCalculator.js';

describe('calculateTopSet', () => {
  it('soma 5% para exercício livre', () => expect(calculateTopSet(100, 'FREE_WEIGHT', 1)).toBe(105));
  it('soma 10% para máquina', () => expect(calculateTopSet(100, 'MACHINE', 1)).toBe(110));
  it('arredonda ao incremento do equipamento', () => expect(calculateTopSet(100, 'FREE_WEIGHT', 2.5)).toBe(105));
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test --workspace=backend`
Expected: FAIL com "Cannot find module '../src/calculators/topSetCalculator.js'"

- [ ] **Step 3: Implementar**

Criar `backend/src/calculators/topSetCalculator.ts`:

```ts
import { roundToIncrement } from './roundingCalculator.js';

export type EquipmentType = 'FREE_WEIGHT' | 'MACHINE';

export function calculateTopSet(lastWorkingSetWeight: number, equipmentType: EquipmentType, increment: number): number {
  const percentage = equipmentType === 'MACHINE' ? 1.10 : 1.05;
  return roundToIncrement(lastWorkingSetWeight * percentage, increment);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test --workspace=backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/calculators/topSetCalculator.ts backend/tests/topSetCalculator.test.ts
git commit -m "feat: add Top Set calculator (5% free weight, 10% machine)"
```

---

### Task 3: Criar `backOffCalculator.ts`

**Files:**
- Create: `backend/src/calculators/backOffCalculator.ts`
- Create: `backend/tests/backOffCalculator.test.ts`

**Interfaces:**
- Consumes: `roundToIncrement`.
- Produces: `calculateBackOff(lastWorkingSetWeight: number, increment: number): number`.

- [ ] **Step 1: Escrever o teste**

Criar `backend/tests/backOffCalculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateBackOff } from '../src/calculators/backOffCalculator.js';

describe('calculateBackOff', () => {
  it('usa 90% da última working set', () => expect(calculateBackOff(100, 1)).toBe(90));
  it('arredonda ao incremento do equipamento', () => expect(calculateBackOff(53, 2.5)).toBe(47.5));
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test --workspace=backend`
Expected: FAIL com "Cannot find module '../src/calculators/backOffCalculator.js'"

- [ ] **Step 3: Implementar**

Criar `backend/src/calculators/backOffCalculator.ts`:

```ts
import { roundToIncrement } from './roundingCalculator.js';

export function calculateBackOff(lastWorkingSetWeight: number, increment: number): number {
  return roundToIncrement(lastWorkingSetWeight * 0.9, increment);
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test --workspace=backend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/calculators/backOffCalculator.ts backend/tests/backOffCalculator.test.ts
git commit -m "feat: add Back Off calculator (90% of last working set)"
```

---

## Phase B — Backend: dados e rotas

### Task 4: Repositório de performance recente por exercício

**Files:**
- Create: `backend/src/repositories/performanceHistory.ts`

**Interfaces:**
- Consumes: `prisma` de `backend/src/db.ts`.
- Produces: `PerformanceSet`, `PerformanceRecord`, `getRecentCompletedExercises(exerciseTemplateId: string, userId: string | undefined, take: number): Promise<PerformanceRecord[]>`, `getLatestCompletedExercisesBatch(exerciseTemplateIds: string[], userId: string | undefined): Promise<Map<string, PerformanceRecord>>`.

Este arquivo não tem teste automatizado nesta entrega — depende de um Postgres real e testes de integração de rota ficaram fora de escopo (ver spec, seção 12). Verificação é manual, rodando o servidor de dev contra o Postgres local.

- [ ] **Step 1: Criar o arquivo**

Criar `backend/src/repositories/performanceHistory.ts`:

```ts
import { Prisma, type SetType } from '@prisma/client';
import { prisma } from '../db.js';

const performanceInclude = {
  sets: { orderBy: { order: 'asc' as const } },
  progression: true,
  session: { select: { performedAt: true } },
} satisfies Prisma.WorkoutExerciseInclude;

type PerformanceExercise = Prisma.WorkoutExerciseGetPayload<{ include: typeof performanceInclude }>;

export interface PerformanceSet {
  type: SetType;
  order: number;
  actualWeight: number | null;
  plannedWeight: number | null;
  completedReps: number | null;
  repRangeMin: number;
  repRangeMax: number;
}

export interface PerformanceRecord {
  sessionId: string;
  performedAt: Date;
  equipmentType: PerformanceExercise['equipmentType'];
  increment: number;
  sets: PerformanceSet[];
  progression: {
    shouldProgress: boolean;
    nextWorkingWeight: number;
    percentage: number | null;
    reason: string;
  } | null;
}

function toRecord(exercise: PerformanceExercise): PerformanceRecord {
  return {
    sessionId: exercise.sessionId,
    performedAt: exercise.session.performedAt,
    equipmentType: exercise.equipmentType,
    increment: Number(exercise.increment),
    sets: exercise.sets.map((set) => ({
      type: set.type,
      order: set.order,
      actualWeight: set.actualWeight === null ? null : Number(set.actualWeight),
      plannedWeight: set.plannedWeight === null ? null : Number(set.plannedWeight),
      completedReps: set.completedReps,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
    })),
    progression: exercise.progression
      ? {
          shouldProgress: exercise.progression.shouldProgress,
          nextWorkingWeight: Number(exercise.progression.nextWorkingWeight),
          percentage: exercise.progression.percentage === null ? null : Number(exercise.progression.percentage),
          reason: exercise.progression.reason,
        }
      : null,
  };
}

export async function getRecentCompletedExercises(
  exerciseTemplateId: string,
  userId: string | undefined,
  take: number,
): Promise<PerformanceRecord[]> {
  const exercises = await prisma.workoutExercise.findMany({
    where: { exerciseTemplateId, session: { status: 'COMPLETED', userId } },
    orderBy: { session: { performedAt: 'desc' } },
    take,
    include: performanceInclude,
  });
  return exercises.map(toRecord);
}

export async function getLatestCompletedExercisesBatch(
  exerciseTemplateIds: string[],
  userId: string | undefined,
): Promise<Map<string, PerformanceRecord>> {
  if (exerciseTemplateIds.length === 0) return new Map();
  const exercises = await prisma.workoutExercise.findMany({
    where: { exerciseTemplateId: { in: exerciseTemplateIds }, session: { status: 'COMPLETED', userId } },
    orderBy: { session: { performedAt: 'desc' } },
    include: performanceInclude,
  });
  const result = new Map<string, PerformanceRecord>();
  for (const exercise of exercises) {
    if (!exercise.exerciseTemplateId || result.has(exercise.exerciseTemplateId)) continue;
    result.set(exercise.exerciseTemplateId, toRecord(exercise));
  }
  return result;
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run build --workspace=backend` (garante que o TypeScript compila contra o schema Prisma real)
Expected: build sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add backend/src/repositories/performanceHistory.ts
git commit -m "feat: add performanceHistory repository for last-performance lookups"
```

---

### Task 5: Anexar `lastPerformance` na resposta de `/api/workouts`

**Files:**
- Modify: `backend/src/routes/workoutRoutes.ts`

**Interfaces:**
- Consumes: `getLatestCompletedExercisesBatch` (Task 4).

- [ ] **Step 1: Editar o handler**

Em `backend/src/routes/workoutRoutes.ts`, adicionar o import e reescrever o handler `GET /api/workouts`:

```ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { planInclude } from '../repositories/planQuery.js';
import { getLatestCompletedExercisesBatch } from '../repositories/performanceHistory.js';

export async function workoutRoutes(app: FastifyInstance) {
  app.get('/api/workouts', async (request) => {
    const selectedPlanId = request.user?.selectedPlanId;
    if (!selectedPlanId) return [];
    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id: selectedPlanId,
        OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId: request.user?.id }],
      },
      include: planInclude,
    });
    if (!plan) return [];
    const exerciseIds = plan.workoutDays.flatMap((day) => day.exercises.map((exercise) => exercise.id));
    const performances = await getLatestCompletedExercisesBatch(exerciseIds, request.user?.id);
    return [{
      ...plan,
      workoutDays: plan.workoutDays.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
          ...exercise,
          lastPerformance: performances.get(exercise.id) ?? null,
        })),
      })),
    }];
  });

  app.get<{ Params: { dayId: string } }>('/api/workout-days/:dayId', async (request, reply) => {
    const day = await prisma.workoutDay.findFirst({
      where: {
        id: request.params.dayId,
        plan: { OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId: request.user?.id }] },
      },
      include: { exercises: { orderBy: { order: 'asc' }, include: { setTemplates: { orderBy: { order: 'asc' } } } } },
    });
    if (!day) return reply.code(404).send({ message: 'Ficha não encontrada.' });
    return day;
  });
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run dev --workspace=backend` e depois `curl -H "authorization: Bearer <token>" http://localhost:3000/api/workouts`
Expected: cada exercício no JSON de resposta tem um campo `lastPerformance` (`null` se nunca foi treinado antes).

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/workoutRoutes.ts
git commit -m "feat: include lastPerformance per exercise in GET /api/workouts"
```

---

### Task 6: Atualizar `sessionRoutes.ts` — nova progressão, trend, remoção de critério subjetivo

**Files:**
- Modify: `backend/src/routes/sessionRoutes.ts`

**Interfaces:**
- Consumes: `evaluateProgression`, `evaluateRepsTrend` (Task 1), `getRecentCompletedExercises` (Task 4).
- Produces: resposta de `POST /api/sessions` passa a incluir `progression` e `trend` por exercício.

- [ ] **Step 1: Reescrever o arquivo**

Substituir todo o conteúdo de `backend/src/routes/sessionRoutes.ts` (a rota `last-session` sai daqui — vai para `historyRoutes.ts` na Task 7, com formato melhor):

```ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { evaluateProgression, evaluateRepsTrend, type WorkingSetPerformance } from '../engines/progressionEngine.js';
import { getRecentCompletedExercises } from '../repositories/performanceHistory.js';

type SetType = 'WARMUP' | 'FEEDER' | 'WORKING' | 'TOP_SET' | 'BACK_OFF' | 'REST_PAUSE';

type CompletedSet = {
  type: SetType;
  order: number;
  plannedWeight?: number;
  actualWeight?: number;
  repRangeMin: number;
  repRangeMax: number;
  completedReps?: number;
  notes?: string;
};

type CompletedExercise = {
  exerciseTemplateId?: string;
  nameSnapshot: string;
  order: number;
  equipmentType: 'FREE_WEIGHT' | 'MACHINE';
  workingWeight?: number;
  increment: number;
  sets: CompletedSet[];
};

function toPerformance(set: CompletedSet): WorkingSetPerformance {
  return {
    order: set.order,
    repRangeMin: set.repRangeMin,
    repRangeMax: set.repRangeMax,
    completedReps: set.completedReps ?? 0,
    actualWeight: set.actualWeight ?? 0,
  };
}

export async function sessionRoutes(app: FastifyInstance) {
  app.post<{ Body: { workoutDayId: string; exercises: CompletedExercise[] } }>('/api/sessions', async (request, reply) => {
    const userId = request.user?.id;

    const trendByOrder = new Map<number, 'improved' | 'same'>();
    for (const exercise of request.body.exercises) {
      if (!exercise.exerciseTemplateId) continue;
      const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
      if (workingSets.length === 0) continue;
      const [previous] = await getRecentCompletedExercises(exercise.exerciseTemplateId, userId, 1);
      const previousWorking = (previous?.sets ?? [])
        .filter((set) => set.type === 'WORKING')
        .map((set) => ({ order: set.order, repRangeMin: set.repRangeMin, repRangeMax: set.repRangeMax, completedReps: set.completedReps ?? 0, actualWeight: set.actualWeight ?? 0 }));
      trendByOrder.set(exercise.order, evaluateRepsTrend(workingSets.map(toPerformance), previousWorking));
    }

    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: request.body.workoutDayId,
        userId,
        status: 'COMPLETED',
        exercises: {
          create: request.body.exercises.map((exercise) => {
            const workingSets = exercise.sets.filter((set) => set.type === 'WORKING');
            const canEvaluate = workingSets.length > 0 && workingSets.every((set) => set.actualWeight !== undefined && set.completedReps !== undefined);
            const progression = canEvaluate ? evaluateProgression(workingSets.map(toPerformance), exercise.increment) : undefined;
            return {
              exerciseTemplateId: exercise.exerciseTemplateId,
              nameSnapshot: exercise.nameSnapshot,
              order: exercise.order,
              equipmentType: exercise.equipmentType,
              workingWeight: exercise.workingWeight,
              increment: exercise.increment,
              sets: { create: exercise.sets },
              progression: progression
                ? { create: { shouldProgress: progression.shouldProgress, nextWorkingWeight: progression.nextWorkingWeight, percentage: progression.percentage, reason: progression.reason } }
                : undefined,
            };
          }),
        },
      },
      include: { workoutDay: true, exercises: { include: { sets: true, progression: true } } },
    });

    const withTrend = {
      ...session,
      exercises: session.exercises.map((exercise) => ({ ...exercise, trend: trendByOrder.get(exercise.order) ?? null })),
    };
    return reply.code(201).send(withTrend);
  });

  app.get('/api/logbook', async (request) => prisma.workoutSession.findMany({
    where: { status: 'COMPLETED', userId: request.user?.id }, orderBy: { performedAt: 'desc' },
    include: { workoutDay: true, exercises: { orderBy: { order: 'asc' }, include: { sets: { orderBy: { order: 'asc' } }, progression: true } } },
  }));
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run test --workspace=backend` (garante que nada mais quebrou)
Expected: PASS.

Run: `npm run dev --workspace=backend`, completar uma sessão via `POST /api/sessions` com um corpo de teste, conferir que a resposta tem `exercises[].progression` e `exercises[].trend`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/sessionRoutes.ts
git commit -m "feat: compute objective progression and session-over-session trend on session completion"
```

---

### Task 7: Rotas de Histórico

**Files:**
- Create: `backend/src/routes/historyRoutes.ts`
- Modify: `backend/src/server.ts`

**Interfaces:**
- Consumes: `getRecentCompletedExercises` (Task 4), `planInclude` de `backend/src/repositories/planQuery.ts`.
- Produces: `GET /api/history/exercises`, `GET /api/exercises/:exerciseId/history` (substitui `GET /api/exercises/:exerciseId/last-session`, que não tinha nenhum consumidor no frontend).

- [ ] **Step 1: Criar o arquivo de rotas**

Criar `backend/src/routes/historyRoutes.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { planInclude } from '../repositories/planQuery.js';
import { getRecentCompletedExercises, type PerformanceRecord } from '../repositories/performanceHistory.js';

function buildSummary(exerciseTemplateId: string, name: string, recent: PerformanceRecord[]) {
  if (recent.length === 0) {
    return { exerciseTemplateId, name, currentWeight: null, status: 'none' as const, statusDetail: null, trendPoints: [] as number[] };
  }
  const [latest, previous] = recent;
  const latestWorking = latest.sets.filter((set) => set.type === 'WORKING');
  const currentWeight = latestWorking[latestWorking.length - 1]?.actualWeight ?? null;

  let status: 'progressed' | 'partial' | 'maintained' = 'maintained';
  let statusDetail: string | null = null;
  if (latest.progression?.shouldProgress) {
    status = 'progressed';
    statusDetail = `+${latest.progression.percentage}% garantido na próxima sessão`;
  } else if (previous) {
    const previousWorking = previous.sets.filter((set) => set.type === 'WORKING');
    const improved = latestWorking.some((set) => {
      const match = previousWorking.find((prev) => prev.order === set.order);
      return match !== undefined && (set.completedReps ?? 0) > (match.completedReps ?? 0);
    });
    if (improved) {
      status = 'partial';
      statusDetail = '+1 rep vs. última vez';
    }
  }

  const trendPoints = [...recent].reverse().map((record) => {
    const working = record.sets.filter((set) => set.type === 'WORKING');
    return working[working.length - 1]?.actualWeight ?? 0;
  });

  return { exerciseTemplateId, name, currentWeight, status, statusDetail, trendPoints };
}

export async function historyRoutes(app: FastifyInstance) {
  app.get('/api/history/exercises', async (request) => {
    const userId = request.user?.id;
    const plans = await prisma.workoutPlan.findMany({
      where: { OR: [{ kind: 'VITOR' }, { kind: 'PERSONAL', userId }] },
      include: planInclude,
    });
    const groups = [];
    for (const plan of plans) {
      for (const day of plan.workoutDays) {
        const exercises = [];
        for (const exercise of day.exercises) {
          const recent = await getRecentCompletedExercises(exercise.id, userId, 6);
          exercises.push(buildSummary(exercise.id, exercise.name, recent));
        }
        groups.push({ workoutDayName: day.name, exercises });
      }
    }
    return groups;
  });

  app.get<{ Params: { exerciseId: string } }>('/api/exercises/:exerciseId/history', async (request) => {
    const records = await getRecentCompletedExercises(request.params.exerciseId, request.user?.id, 20);
    return records.map((record) => ({ performedAt: record.performedAt, sets: record.sets }));
  });
}
```

- [ ] **Step 2: Registrar a rota em `server.ts`**

Editar `backend/src/server.ts`:

```ts
import Fastify from 'fastify';
import { authPlugin } from './auth/plugin.js';
import { authRoutes } from './routes/authRoutes.js';
import { planRoutes } from './routes/planRoutes.js';
import { workoutRoutes } from './routes/workoutRoutes.js';
import { sessionRoutes } from './routes/sessionRoutes.js';
import { historyRoutes } from './routes/historyRoutes.js';

export function buildServer() {
  const app = Fastify({ logger: true });
  app.get('/health', async () => ({ status: 'ok' }));
  authPlugin(app);
  app.register(authRoutes);
  app.register(planRoutes);
  app.register(workoutRoutes);
  app.register(sessionRoutes);
  app.register(historyRoutes);
  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = buildServer();
  void app.listen({ port: 3000, host: '0.0.0.0' });
}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run dev --workspace=backend`, então:
- `curl -H "authorization: Bearer <token>" http://localhost:3000/api/history/exercises`
- `curl -H "authorization: Bearer <token>" http://localhost:3000/api/exercises/<id>/history`

Expected: ambos retornam JSON no formato descrito acima, sem erro 500.

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/historyRoutes.ts backend/src/server.ts
git commit -m "feat: add history routes for per-exercise progress aggregation"
```

---

## Phase C — Utilitários de cálculo (frontend)

### Task 8: Configurar Vitest no frontend

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`

O frontend hoje não tem nenhuma dependência de teste. As Tasks 9–12 precisam rodar testes unitários das funções puras novas — sem framework de teste isso não é possível.

- [ ] **Step 1: Adicionar a dependência e o script**

Editar `frontend/package.json`, adicionando `vitest` em `devDependencies` e um script `test`:

```json
{
  "name": "@memento-mori/frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@vitejs/plugin-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "vite": "latest"
  },
  "devDependencies": {
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "typescript": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 2: Criar a config do Vitest**

Criar `frontend/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node' } });
```

(`environment: 'node'` é suficiente — as funções testadas são cálculo puro, sem DOM. Testar componentes React fica fora desta entrega.)

- [ ] **Step 3: Instalar e verificar**

Run: `npm install --workspace=frontend`
Run: `npm run test --workspace=frontend`
Expected: "No test files found" (ainda não existe nenhum `*.test.ts` — normal neste ponto).

- [ ] **Step 4: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts package-lock.json
git commit -m "chore: add vitest to the frontend workspace"
```

---

### Task 9: `roundingCalculator.ts` no frontend

**Files:**
- Create: `frontend/src/utils/roundingCalculator.ts`
- Create: `frontend/src/utils/roundingCalculator.test.ts`

**Interfaces:**
- Produces: `roundToIncrement(weight: number, increment: number): number`.

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/utils/roundingCalculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { roundToIncrement } from './roundingCalculator';

describe('roundToIncrement', () => {
  it('arredonda para o incremento válido mais próximo', () => expect(roundToIncrement(102.5, 5)).toBe(105));
  it('preserva um incremento exato', () => expect(roundToIncrement(47.5, 2.5)).toBe(47.5));
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test --workspace=frontend`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `frontend/src/utils/roundingCalculator.ts`:

```ts
export function roundToIncrement(weight: number, increment: number): number {
  const rounded = Math.round(weight / increment + 1e-9) * increment;
  return Number(rounded.toFixed(10));
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test --workspace=frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/roundingCalculator.ts frontend/src/utils/roundingCalculator.test.ts
git commit -m "feat: add epsilon-safe roundToIncrement to the frontend"
```

---

### Task 10: `topSetCalculator.ts` e `backOffCalculator.ts` no frontend

**Files:**
- Create: `frontend/src/utils/topSetCalculator.ts`
- Create: `frontend/src/utils/topSetCalculator.test.ts`
- Create: `frontend/src/utils/backOffCalculator.ts`
- Create: `frontend/src/utils/backOffCalculator.test.ts`

**Interfaces:**
- Consumes: `roundToIncrement` (Task 9).
- Produces: `calculateTopSet(lastWorkingSetWeight: number, equipmentType: 'FREE_WEIGHT' | 'MACHINE', increment: number): number`, `calculateBackOff(lastWorkingSetWeight: number, increment: number): number`.

- [ ] **Step 1: Escrever os testes**

Criar `frontend/src/utils/topSetCalculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateTopSet } from './topSetCalculator';

describe('calculateTopSet', () => {
  it('soma 5% para exercício livre', () => expect(calculateTopSet(100, 'FREE_WEIGHT', 1)).toBe(105));
  it('soma 10% para máquina', () => expect(calculateTopSet(100, 'MACHINE', 1)).toBe(110));
});
```

Criar `frontend/src/utils/backOffCalculator.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { calculateBackOff } from './backOffCalculator';

describe('calculateBackOff', () => {
  it('usa 90% da última working set', () => expect(calculateBackOff(100, 1)).toBe(90));
  it('arredonda ao incremento do equipamento', () => expect(calculateBackOff(53, 2.5)).toBe(47.5));
});
```

- [ ] **Step 2: Rodar e confirmar que falham**

Run: `npm run test --workspace=frontend`
Expected: FAIL — módulos não existem.

- [ ] **Step 3: Implementar**

Criar `frontend/src/utils/topSetCalculator.ts`:

```ts
import { roundToIncrement } from './roundingCalculator';

export type EquipmentType = 'FREE_WEIGHT' | 'MACHINE';

export function calculateTopSet(lastWorkingSetWeight: number, equipmentType: EquipmentType, increment: number): number {
  const percentage = equipmentType === 'MACHINE' ? 1.10 : 1.05;
  return roundToIncrement(lastWorkingSetWeight * percentage, increment);
}
```

Criar `frontend/src/utils/backOffCalculator.ts`:

```ts
import { roundToIncrement } from './roundingCalculator';

export function calculateBackOff(lastWorkingSetWeight: number, increment: number): number {
  return roundToIncrement(lastWorkingSetWeight * 0.9, increment);
}
```

- [ ] **Step 4: Rodar e confirmar que passam**

Run: `npm run test --workspace=frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/topSetCalculator.ts frontend/src/utils/topSetCalculator.test.ts frontend/src/utils/backOffCalculator.ts frontend/src/utils/backOffCalculator.test.ts
git commit -m "feat: add Top Set and Back Off calculators to the frontend for live preview"
```

---

### Task 11: `progression.ts` no frontend (avaliação ao vivo, durante o treino)

**Files:**
- Create: `frontend/src/utils/progression.ts`
- Create: `frontend/src/utils/progression.test.ts`

**Interfaces:**
- Consumes: `roundToIncrement` (Task 9).
- Produces: `WorkingSetPerformance`, `ProgressionPreview`, `repTarget(repRangeMin: number, repRangeMax: number): number`, `evaluateProgression(workingSets: WorkingSetPerformance[], increment: number): ProgressionPreview`, `evaluateRepsTrend(currentSets: WorkingSetPerformance[], previousSets: WorkingSetPerformance[]): 'improved' | 'same'`.

- [ ] **Step 1: Escrever o teste**

Criar `frontend/src/utils/progression.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { evaluateProgression, evaluateRepsTrend, repTarget } from './progression';

describe('repTarget', () => {
  it('soma 2 reps quando o range é fixo', () => expect(repTarget(8, 8)).toBe(10));
  it('usa o topo do range quando ele é aberto', () => expect(repTarget(8, 12)).toBe(12));
});

describe('evaluateProgression', () => {
  it('progride 5% quando todas as working sets batem o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
      { order: 2, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: true, nextWorkingWeight: 105, percentage: 5 });
  });

  it('mantém a carga quando qualquer working set não bate o alvo', () => {
    const result = evaluateProgression([
      { order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 7, actualWeight: 100 },
    ], 2.5);
    expect(result).toMatchObject({ shouldProgress: false, nextWorkingWeight: 100, percentage: null });
  });
});

describe('evaluateRepsTrend', () => {
  it('reporta melhora quando alguma série bate mais reps que a sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 9, actualWeight: 100 }];
    const previous = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 8, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, previous)).toBe('improved');
  });

  it('reporta "same" quando não há sessão anterior', () => {
    const current = [{ order: 1, repRangeMin: 8, repRangeMax: 8, completedReps: 10, actualWeight: 100 }];
    expect(evaluateRepsTrend(current, [])).toBe('same');
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test --workspace=frontend`
Expected: FAIL — módulo não existe.

- [ ] **Step 3: Implementar**

Criar `frontend/src/utils/progression.ts`:

```ts
import { roundToIncrement } from './roundingCalculator';

export interface WorkingSetPerformance {
  order: number;
  repRangeMin: number;
  repRangeMax: number;
  completedReps: number;
  actualWeight: number;
}

export interface ProgressionPreview {
  shouldProgress: boolean;
  nextWorkingWeight: number;
  percentage: number | null;
  reason: string;
}

export function repTarget(repRangeMin: number, repRangeMax: number): number {
  return Math.max(repRangeMax, repRangeMin + 2);
}

export function evaluateProgression(workingSets: WorkingSetPerformance[], increment: number): ProgressionPreview {
  const sorted = [...workingSets].sort((a, b) => a.order - b.order);
  const lastSet = sorted[sorted.length - 1];
  const allMet = sorted.every((set) => set.completedReps >= repTarget(set.repRangeMin, set.repRangeMax));
  if (!allMet) {
    return {
      shouldProgress: false,
      nextWorkingWeight: lastSet.actualWeight,
      percentage: null,
      reason: 'Carga mantida: nem todas as Working Sets bateram a meta de reps.',
    };
  }
  return {
    shouldProgress: true,
    nextWorkingWeight: roundToIncrement(lastSet.actualWeight * 1.05, increment),
    percentage: 5,
    reason: 'Progressão liberada: todas as Working Sets bateram a meta de reps.',
  };
}

export function evaluateRepsTrend(currentSets: WorkingSetPerformance[], previousSets: WorkingSetPerformance[]): 'improved' | 'same' {
  if (previousSets.length === 0) return 'same';
  const improved = currentSets.some((current) => {
    const previous = previousSets.find((set) => set.order === current.order);
    return previous !== undefined && current.completedReps > previous.completedReps;
  });
  return improved ? 'improved' : 'same';
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test --workspace=frontend`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/progression.ts frontend/src/utils/progression.test.ts
git commit -m "feat: add live progression and reps-trend preview calculators to the frontend"
```

---

## Phase D — Tipos e cliente de API (frontend)

### Task 12: Estender `types/api.ts`

**Files:**
- Modify: `frontend/src/types/api.ts`

**Interfaces:**
- Produces: `PerformanceSet`, `ProgressionResult`, `LastPerformance`, `WorkoutSetRecord`, `WorkoutExerciseRecord`, `WorkoutSessionRecord`, `ExerciseHistoryEntry`, `ExerciseStatus`, `HistoryExerciseSummary`, `HistoryDayGroup`. `Exercise` ganha o campo opcional `lastPerformance`.

- [ ] **Step 1: Reescrever o arquivo**

Substituir todo o conteúdo de `frontend/src/types/api.ts`:

```ts
export type SetType = 'WARMUP' | 'FEEDER' | 'WORKING' | 'TOP_SET' | 'BACK_OFF' | 'REST_PAUSE';
export type EquipmentType = 'FREE_WEIGHT' | 'MACHINE';

export interface SetTemplate {
  id: string;
  type: SetType;
  order: number;
  repRangeMin: number;
  repRangeMax: number;
  percentage: number | null;
}

export interface ProgressionResult {
  shouldProgress: boolean;
  nextWorkingWeight: number;
  percentage: number | null;
  reason: string;
}

export interface PerformanceSet {
  type: SetType;
  order: number;
  actualWeight: number | null;
  plannedWeight: number | null;
  completedReps: number | null;
  repRangeMin: number;
  repRangeMax: number;
}

export interface LastPerformance {
  performedAt: string;
  sets: PerformanceSet[];
  progression: ProgressionResult | null;
}

export interface Exercise {
  id: string;
  name: string;
  order: number;
  equipmentType: EquipmentType;
  increment: number;
  setTemplates: SetTemplate[];
  lastPerformance?: LastPerformance | null;
}

export interface WorkoutDay {
  id: string;
  name: string;
  order: number;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  kind: 'VITOR' | 'PERSONAL';
  workoutDays: WorkoutDay[];
}

export interface AuthUser {
  id: string;
  nickname: string;
  selectedPlanId: string | null;
}

export interface PlansPayload {
  selectedPlanId: string | null;
  vitor: WorkoutPlan | null;
  personal: WorkoutPlan | null;
}

export interface WorkoutSetRecord {
  id: string;
  type: SetType;
  order: number;
  plannedWeight: number | null;
  actualWeight: number | null;
  repRangeMin: number;
  repRangeMax: number;
  completedReps: number | null;
  notes: string | null;
}

export interface WorkoutExerciseRecord {
  id: string;
  nameSnapshot: string;
  order: number;
  equipmentType: EquipmentType;
  sets: WorkoutSetRecord[];
  progression: ProgressionResult | null;
  trend?: 'improved' | 'same' | null;
}

export interface WorkoutSessionRecord {
  id: string;
  performedAt: string;
  workoutDay: { id: string; name: string };
  exercises: WorkoutExerciseRecord[];
}

export interface ExerciseHistoryEntry {
  performedAt: string;
  sets: WorkoutSetRecord[];
}

export type ExerciseStatus = 'progressed' | 'partial' | 'maintained' | 'none';

export interface HistoryExerciseSummary {
  exerciseTemplateId: string;
  name: string;
  currentWeight: number | null;
  status: ExerciseStatus;
  statusDetail: string | null;
  trendPoints: number[];
}

export interface HistoryDayGroup {
  workoutDayName: string;
  exercises: HistoryExerciseSummary[];
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run build --workspace=frontend`
Expected: falha nesse ponto ainda é esperada até a Task 13/14 ajustarem `services/api.ts` — se falhar só por causa de `api.ts`/páginas antigas usando os tipos antigos, está correto; se falhar por erro de sintaxe no próprio `types/api.ts`, corrigir antes de prosseguir.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat: add typed models for performance history and session records"
```

---

### Task 13: Tipar `services/api.ts` e adicionar os novos endpoints

**Files:**
- Modify: `frontend/src/services/api.ts`

**Interfaces:**
- Consumes: tipos da Task 12.
- Produces: `getLogbook(): Promise<WorkoutSessionRecord[]>`, `completeSession(...): Promise<WorkoutSessionRecord>`, `getHistoryExercises(): Promise<HistoryDayGroup[]>`, `getExerciseHistory(exerciseTemplateId: string): Promise<ExerciseHistoryEntry[]>`.

- [ ] **Step 1: Editar o arquivo**

Em `frontend/src/services/api.ts`, atualizar o import do topo e as funções indicadas (o resto do arquivo permanece igual):

```ts
import type { AuthUser, Exercise, ExerciseHistoryEntry, HistoryDayGroup, PlansPayload, WorkoutPlan, WorkoutSessionRecord } from '../types/api';
```

Substituir a função `completeSession`:

```ts
export async function completeSession(workoutDayId: string, exercises: unknown[]) {
  return request<WorkoutSessionRecord>('/api/sessions', { method: 'POST', body: JSON.stringify({ workoutDayId, exercises }) });
}
```

Substituir a função `getLogbook`:

```ts
export async function getLogbook() {
  return request<WorkoutSessionRecord[]>('/api/logbook');
}
```

Adicionar ao final do arquivo:

```ts
export async function getHistoryExercises() {
  return request<HistoryDayGroup[]>('/api/history/exercises');
}

export async function getExerciseHistory(exerciseTemplateId: string) {
  return request<ExerciseHistoryEntry[]>(`/api/exercises/${exerciseTemplateId}/history`);
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run build --workspace=frontend`
Expected: os únicos erros restantes devem vir de `ExerciseCard.tsx`, `LogbookPage.tsx`, `ProgressionPage.tsx` e `WorkoutPage.tsx` (ainda não atualizados) — resolvidos nas próximas tasks.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/api.ts
git commit -m "feat: type logbook/session responses and add history API client functions"
```

---

## Phase E — Interface

### Task 14: Reescrever `ExerciseCard.tsx`

**Files:**
- Modify: `frontend/src/components/ExerciseCard.tsx`

**Interfaces:**
- Consumes: `calculateFeeders` (existente), `calculateTopSet`/`calculateBackOff` (Task 10), `evaluateProgression`/`evaluateRepsTrend`/`repTarget` (Task 11), `Exercise`/`LastPerformance` (Task 12).

Remove o formulário de critério subjetivo (Controle da carga / RIR / Feeling / Reps limpas). Adiciona: linha "Última sessão", badge de progressão (histórica ou ao vivo, o que estiver disponível), cálculo em tempo real de Top Set/Back Off a partir da carga realmente digitada na última Working Set, e um selo por série quando ela bate a meta de reps.

- [ ] **Step 1: Reescrever o arquivo**

Substituir todo o conteúdo de `frontend/src/components/ExerciseCard.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Exercise, LastPerformance, SetTemplate } from '../types/api';
import { calculateFeeders } from '../utils/feederCalculator';
import { calculateTopSet } from '../utils/topSetCalculator';
import { calculateBackOff } from '../utils/backOffCalculator';
import { evaluateProgression, evaluateRepsTrend, repTarget, type WorkingSetPerformance } from '../utils/progression';
import { formatRange, SET_LABELS } from '../utils/labels';

function setLabel(template: SetTemplate, feederNumber: number, workingNumber: number) {
  if (template.type === 'FEEDER') return `Feeder ${feederNumber}`;
  if (template.type === 'WORKING') return `WS ${workingNumber}`;
  return SET_LABELS[template.type];
}

function suggestedWorkingWeight(lastPerformance?: LastPerformance | null): number | undefined {
  if (!lastPerformance) return undefined;
  if (lastPerformance.progression) return lastPerformance.progression.nextWorkingWeight;
  const workingSets = lastPerformance.sets.filter((set) => set.type === 'WORKING');
  const last = workingSets[workingSets.length - 1];
  return last?.actualWeight ?? last?.plannedWeight ?? undefined;
}

function formatLastWorking(lastPerformance?: LastPerformance | null): string | null {
  if (!lastPerformance) return null;
  const workingSets = lastPerformance.sets.filter((set) => set.type === 'WORKING');
  if (workingSets.length === 0) return null;
  const weight = workingSets[0].actualWeight ?? workingSets[0].plannedWeight;
  const reps = workingSets.map((set) => set.completedReps ?? '—').join(' × ');
  return `${weight ?? '—'} kg × ${reps}`;
}

export interface ExerciseDraft {
  exerciseTemplateId: string;
  nameSnapshot: string;
  order: number;
  equipmentType: Exercise['equipmentType'];
  workingWeight?: number;
  increment: number;
  sets: Array<Record<string, unknown>>;
}

export function ExerciseCard({ exercise, onChange }: { exercise: Exercise; onChange?: (draft: ExerciseDraft) => void }) {
  const initialWeight = useMemo(() => suggestedWorkingWeight(exercise.lastPerformance), [exercise]);
  const [workingWeight, setWorkingWeight] = useState(initialWeight !== undefined ? String(initialWeight) : '');
  const feederCount = useMemo(() => exercise.setTemplates.filter((set) => set.type === 'FEEDER').length, [exercise]);
  const feeders = workingWeight ? calculateFeeders(Number(workingWeight), feederCount, Number(exercise.increment)) : [];
  const [values, setValues] = useState<Record<number, Record<string, unknown>>>({});
  const [restSeconds, setRestSeconds] = useState(0);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => setRestSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const update = (index: number, value: Record<string, unknown>) =>
    setValues((current) => ({ ...current, [index]: { ...current[index], ...value } }));

  useEffect(() => {
    onChange?.({
      exerciseTemplateId: exercise.id,
      nameSnapshot: exercise.name,
      order: exercise.order,
      equipmentType: exercise.equipmentType,
      workingWeight: workingWeight ? Number(workingWeight) : undefined,
      increment: Number(exercise.increment),
      sets: exercise.setTemplates.map((set, index) => ({
        type: set.type,
        order: set.order,
        repRangeMin: set.repRangeMin,
        repRangeMax: set.repRangeMax,
        ...values[index],
      })),
    });
  }, [exercise, workingWeight, values, onChange]);

  const workingIndexes = exercise.setTemplates
    .map((set, index) => ({ set, index }))
    .filter(({ set }) => set.type === 'WORKING')
    .map(({ index }) => index);
  const lastWorkingIndex = workingIndexes[workingIndexes.length - 1];
  const lastWorkingActual = lastWorkingIndex !== undefined ? Number(values[lastWorkingIndex]?.actualWeight) : NaN;
  const topSetBackOffBasis = lastWorkingActual > 0 ? lastWorkingActual : (workingWeight ? Number(workingWeight) : undefined);
  const topSetWeight = topSetBackOffBasis !== undefined ? calculateTopSet(topSetBackOffBasis, exercise.equipmentType, Number(exercise.increment)) : undefined;
  const backOffWeight = topSetBackOffBasis !== undefined ? calculateBackOff(topSetBackOffBasis, Number(exercise.increment)) : undefined;

  const completedWorkingSets: WorkingSetPerformance[] = workingIndexes
    .map((index) => ({ set: exercise.setTemplates[index], input: values[index] }))
    .filter(({ input }) => input?.completedReps !== undefined && input?.actualWeight !== undefined)
    .map(({ set, input }) => ({
      order: set.order,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
      completedReps: Number(input!.completedReps),
      actualWeight: Number(input!.actualWeight),
    }));

  const liveProgression = completedWorkingSets.length > 0 && completedWorkingSets.length === workingIndexes.length
    ? evaluateProgression(completedWorkingSets, Number(exercise.increment))
    : undefined;
  const activeProgression = liveProgression ?? exercise.lastPerformance?.progression ?? undefined;

  const previousWorkingSets: WorkingSetPerformance[] = (exercise.lastPerformance?.sets ?? [])
    .filter((set) => set.type === 'WORKING')
    .map((set) => ({
      order: set.order,
      repRangeMin: set.repRangeMin,
      repRangeMax: set.repRangeMax,
      completedReps: set.completedReps ?? 0,
      actualWeight: set.actualWeight ?? 0,
    }));
  const showPartialProgress = !activeProgression?.shouldProgress
    && completedWorkingSets.length > 0
    && evaluateRepsTrend(completedWorkingSets, previousWorkingSets) === 'improved';

  const lastWorkingText = formatLastWorking(exercise.lastPerformance);

  return (
    <article className="exercise-card">
      <header>
        <span>{String(exercise.order).padStart(2, '0')}</span>
        <div>
          <h2>{exercise.name}</h2>
          <small>Amplitude total · {exercise.equipmentType === 'MACHINE' ? 'Máquina' : 'Livre'}</small>
        </div>
      </header>
      {lastWorkingText && <p className="muted">Última: {lastWorkingText}</p>}
      {activeProgression?.shouldProgress && <p className="accent">{activeProgression.reason}</p>}
      {showPartialProgress && <p className="muted">🔸 +1 rep vs. última vez</p>}
      <label className="weight-field">
        Carga de trabalho
        <input inputMode="decimal" value={workingWeight} onChange={(event) => setWorkingWeight(event.target.value)} placeholder="kg" />
      </label>
      {exercise.setTemplates.map((set, index) => {
        const feederIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'FEEDER').length;
        const workingIndex = exercise.setTemplates.slice(0, index).filter((item) => item.type === 'WORKING').length;
        const planned = set.type === 'FEEDER'
          ? (feeders[feederIndex]?.weight ?? '—')
          : set.type === 'WARMUP'
            ? 'manual'
            : set.type === 'TOP_SET'
              ? (topSetWeight ?? '—')
              : set.type === 'BACK_OFF'
                ? (backOffWeight ?? '—')
                : workingWeight || '—';
        const hitTarget = set.type === 'WORKING' && Number(values[index]?.completedReps) >= repTarget(set.repRangeMin, set.repRangeMax);
        return (
          <div className="set-block" key={set.id}>
            <div className="set-topline">
              <strong>{setLabel(set, feederIndex + 1, workingIndex + 1)}</strong>
              <span>{planned} kg × {formatRange(set.repRangeMin, set.repRangeMax)}</span>
              {hitTarget && <span className="hit-target">🔥 na meta</span>}
            </div>
            {(set.type === 'WARMUP' || set.type === 'WORKING' || set.type === 'TOP_SET' || set.type === 'BACK_OFF' || set.type === 'REST_PAUSE') && (
              <div className="set-fields">
                <input aria-label={`Carga realizada ${set.order}`} inputMode="decimal" placeholder="kg feito" onChange={(event) => update(index, { actualWeight: Number(event.target.value) })} />
                {(set.type === 'WORKING' || set.type === 'REST_PAUSE') && (
                  <input aria-label={`Reps realizadas ${set.order}`} inputMode="numeric" placeholder="reps" onChange={(event) => update(index, { completedReps: Number(event.target.value) })} />
                )}
                {set.type === 'REST_PAUSE' && (
                  <button type="button" onClick={() => setRestSeconds(20)}>{restSeconds > 0 ? `${restSeconds}s` : 'Timer 20s'}</button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </article>
  );
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run dev --workspace=frontend` (com o backend rodando também), abrir um exercício com histórico e um sem histórico. Digitar reps que batam a meta numa Working Set e confirmar que aparece "🔥 na meta"; completar todas as WS do exercício e confirmar que o badge de progressão aparece no topo do card; preencher a carga realizada da última WS e confirmar que Top Set/Back Off recalculam; digitar reps maiores que a sessão anterior sem bater a meta completa e confirmar que aparece "🔸 +1 rep vs. última vez".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ExerciseCard.tsx
git commit -m "feat: real-time Top Set/Back Off, last session context, and live progression feedback in ExerciseCard"
```

---

### Task 15: Resumo pós-treino em `WorkoutPage.tsx`

**Files:**
- Modify: `frontend/src/pages/WorkoutPage.tsx`

**Interfaces:**
- Consumes: `WorkoutSessionRecord` (Task 12), `completeSession` (Task 13).
- Produces: `WorkoutPage` passa a receber `onFinished: () => void` além de `onNeedPlan`.

- [ ] **Step 1: Reescrever o arquivo**

Substituir todo o conteúdo de `frontend/src/pages/WorkoutPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { ExerciseCard, type ExerciseDraft } from '../components/ExerciseCard';
import { completeSession, getWorkouts } from '../services/api';
import type { WorkoutDay, WorkoutPlan, WorkoutSessionRecord } from '../types/api';

function exerciseStatusLabel(exercise: WorkoutSessionRecord['exercises'][number]) {
  if (exercise.progression?.shouldProgress) return `▲ +${exercise.progression.percentage}% na próxima`;
  if (exercise.trend === 'improved') return '🔸 +1 rep vs. última vez';
  return 'Mantendo';
}

export function WorkoutPage({ onNeedPlan, onFinished }: { onNeedPlan: () => void; onFinished: () => void }) {
  const [plan, setPlan] = useState<WorkoutPlan>();
  const [selected, setSelected] = useState<WorkoutDay>();
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, ExerciseDraft>>({});
  const [summary, setSummary] = useState<WorkoutSessionRecord>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getWorkouts()
      .then((plans) => {
        const next = plans[0];
        setPlan(next);
        setSelected(next?.workoutDays[0]);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const subtitle = useMemo(() => plan?.kind === 'VITOR' ? 'Workouts Vitor' : plan?.name ?? 'Treino', [plan]);

  if (error) return <section className="stack"><h1>Treino</h1><p className="alert" role="alert">{error}</p></section>;

  if (summary) {
    return (
      <section className="stack">
        <header className="page-hero">
          <p className="eyebrow">Treino concluído</p>
          <h1>{summary.exercises.length} exercícios</h1>
        </header>
        {summary.exercises.map((exercise) => (
          <div className="summary-row" key={exercise.id}>
            <strong>{exercise.nameSnapshot}</strong>
            <span className={exercise.progression?.shouldProgress ? 'accent' : ''}>{exerciseStatusLabel(exercise)}</span>
          </div>
        ))}
        <button className="primary" onClick={onFinished}>Ver no Histórico</button>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="stack">
        <header className="page-hero">
          <p className="eyebrow">Sessão</p>
          <h1>Nenhuma ficha ativa</h1>
          <p>Escolha os workouts do Vitor ou crie a sua ficha pessoal para começar.</p>
        </header>
        <button className="primary" onClick={onNeedPlan}>Ir para fichas</button>
      </section>
    );
  }

  async function finish() {
    if (!selected) return;
    setBusy(true);
    try {
      const session = await completeSession(selected.id, Object.values(drafts));
      setSummary(session);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar o treino.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">{subtitle}</p>
        <h1>{selected?.name ?? 'Treino'}</h1>
        <p>Informe a carga de trabalho. O app calcula Feeders, Top Set e Back Off quando existirem na ficha.</p>
      </header>
      <nav className="day-tabs">
        {plan.workoutDays.map((day) => (
          <button className={selected?.id === day.id ? 'active' : ''} key={day.id} onClick={() => setSelected(day)}>
            {day.name.replace('TREINO ', '')}
          </button>
        ))}
      </nav>
      {selected?.exercises.map((exercise) => (
        <ExerciseCard
          exercise={exercise}
          key={exercise.id}
          onChange={(draft) => setDrafts((current) => ({ ...current, [draft.exerciseTemplateId]: draft }))}
        />
      ))}
      {selected && (
        <button className="primary finish" disabled={busy} onClick={finish}>
          {busy ? 'Salvando…' : 'Marcar treino como concluído'}
        </button>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Verificação manual**

Run: `npm run dev --workspace=frontend`, completar um treino e confirmar que a tela de resumo aparece com o status certo por exercício.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/WorkoutPage.tsx
git commit -m "feat: show per-exercise summary after finishing a workout"
```

---

### Task 16: Componente `Sparkline`

**Files:**
- Create: `frontend/src/components/Sparkline.tsx`

**Interfaces:**
- Produces: `Sparkline({ values }: { values: number[] })`.

- [ ] **Step 1: Criar o componente**

Criar `frontend/src/components/Sparkline.tsx`:

```tsx
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 64;
  const height = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg className="sparkline" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
```

- [ ] **Step 2: Verificação manual**

Componente será exercitado visualmente na Task 18 (`HistoryPage`) — sem verificação isolada necessária aqui.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Sparkline.tsx
git commit -m "feat: add minimal inline SVG sparkline component"
```

---

### Task 17: Estilos novos em `styles.css`

**Files:**
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Adicionar as classes**

No final de `frontend/src/styles.css`, adicionar:

```css
.hit-target { color: var(--accent); font-size: 0.75rem; white-space: nowrap; }

.summary-row, .history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
}
.summary-row { background: none; border: 0; padding: 8px 0; border-bottom: 1px solid var(--line); border-radius: 0; }

.sparkline { color: var(--accent); display: block; margin-top: 4px; }

.history-search {
  width: 100%;
}
```

- [ ] **Step 2: Verificação manual**

Rodar `npm run dev --workspace=frontend` e conferir visualmente as telas de resumo pós-treino e Histórico (Task 15 e 18) depois de implementadas.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles.css
git commit -m "style: add classes for post-workout summary and history rows"
```

---

### Task 18: `HistoryPage.tsx` (fusão de Logbook + Progressão)

**Files:**
- Create: `frontend/src/pages/HistoryPage.tsx`
- Delete: `frontend/src/pages/LogbookPage.tsx`
- Delete: `frontend/src/pages/ProgressionPage.tsx`

**Interfaces:**
- Consumes: `getHistoryExercises`, `getExerciseHistory`, `getLogbook` (Task 13), `Sparkline` (Task 16), `HistoryDayGroup`/`ExerciseHistoryEntry`/`WorkoutSessionRecord` (Task 12).

- [ ] **Step 1: Criar `HistoryPage.tsx`**

Criar `frontend/src/pages/HistoryPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { getExerciseHistory, getHistoryExercises, getLogbook } from '../services/api';
import type { ExerciseHistoryEntry, ExerciseStatus, HistoryDayGroup, WorkoutSessionRecord } from '../types/api';
import { formatRange, SET_LABELS } from '../utils/labels';
import { Sparkline } from '../components/Sparkline';

type ViewMode = 'exercise' | 'session';

function statusLabel(status: ExerciseStatus, detail: string | null) {
  if (status === 'progressed') return `▲ ${detail ?? 'Progressão garantida'}`;
  if (status === 'partial') return `🔸 ${detail ?? '+1 rep vs. última vez'}`;
  if (status === 'maintained') return 'Mantendo';
  return 'Sem histórico ainda';
}

export function HistoryPage() {
  const [mode, setMode] = useState<ViewMode>('exercise');
  const [groups, setGroups] = useState<HistoryDayGroup[]>([]);
  const [sessions, setSessions] = useState<WorkoutSessionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [openExercise, setOpenExercise] = useState<{ id: string; name: string }>();
  const [detail, setDetail] = useState<ExerciseHistoryEntry[]>([]);

  useEffect(() => {
    getHistoryExercises().then(setGroups).catch(() => setGroups([]));
    getLogbook().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (!openExercise) return;
    getExerciseHistory(openExercise.id).then(setDetail).catch(() => setDetail([]));
  }, [openExercise]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;
    const needle = query.trim().toLowerCase();
    return groups
      .map((group) => ({ ...group, exercises: group.exercises.filter((exercise) => exercise.name.toLowerCase().includes(needle)) }))
      .filter((group) => group.exercises.length > 0);
  }, [groups, query]);

  if (openExercise) {
    return (
      <section className="stack">
        <button className="ghost" onClick={() => setOpenExercise(undefined)}>← Voltar</button>
        <header className="page-hero">
          <p className="eyebrow">Evolução</p>
          <h1>{openExercise.name}</h1>
        </header>
        {detail.length === 0 && <p className="muted">Sem sessões registradas ainda.</p>}
        {detail.map((entry) => (
          <article className="log-card" key={entry.performedAt}>
            <small>{new Date(entry.performedAt).toLocaleDateString('pt-BR')}</small>
            {entry.sets.map((set) => (
              <p key={`${set.type}-${set.order}`}>
                {SET_LABELS[set.type]}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
              </p>
            ))}
          </article>
        ))}
      </section>
    );
  }

  return (
    <section className="stack">
      <header className="page-hero">
        <p className="eyebrow">Evolução</p>
        <h1>Histórico</h1>
      </header>
      <div className="segmented">
        <button className={mode === 'exercise' ? 'active' : ''} onClick={() => setMode('exercise')}>Por exercício</button>
        <button className={mode === 'session' ? 'active' : ''} onClick={() => setMode('session')}>Por sessão</button>
      </div>
      {mode === 'exercise' ? (
        <>
          <input className="history-search" placeholder="Buscar exercício..." value={query} onChange={(event) => setQuery(event.target.value)} />
          {filteredGroups.length === 0 && <p className="muted">Nenhum treino concluído ainda.</p>}
          {filteredGroups.map((group) => (
            <div key={group.workoutDayName}>
              <h2>{group.workoutDayName}</h2>
              {group.exercises.map((exercise) => (
                <button
                  className="history-row"
                  key={exercise.exerciseTemplateId}
                  onClick={() => setOpenExercise({ id: exercise.exerciseTemplateId, name: exercise.name })}
                >
                  <div>
                    <strong>{exercise.name}</strong>
                    <p className="muted">{statusLabel(exercise.status, exercise.statusDetail)}</p>
                  </div>
                  <span>
                    {exercise.currentWeight ?? '—'} kg
                    <Sparkline values={exercise.trendPoints} />
                  </span>
                </button>
              ))}
            </div>
          ))}
        </>
      ) : (
        sessions.length === 0 ? <p className="muted">Nenhum treino concluído ainda.</p> : sessions.map((session) => (
          <article className="log-card" key={session.id}>
            <header>
              <h2>{session.workoutDay.name}</h2>
              <small>{new Date(session.performedAt).toLocaleDateString('pt-BR')}</small>
            </header>
            {session.exercises.map((exercise) => (
              <div className="log-exercise" key={exercise.id}>
                <strong>{exercise.nameSnapshot}</strong>
                {exercise.sets.map((set) => (
                  <p key={set.id}>
                    {SET_LABELS[set.type]}: {set.actualWeight ?? set.plannedWeight ?? '—'} kg × {set.completedReps ?? formatRange(set.repRangeMin, set.repRangeMax)}
                  </p>
                ))}
              </div>
            ))}
          </article>
        ))
      )}
    </section>
  );
}
```

- [ ] **Step 2: Remover as páginas antigas**

Run: `rm frontend/src/pages/LogbookPage.tsx frontend/src/pages/ProgressionPage.tsx`

(Serão referenciadas ainda em `App.tsx` até a Task 19 — normal ter um erro de build entre este passo e o próximo commit; ambos fazem parte do mesmo commit lógico.)

- [ ] **Step 3: Commit**

Este commit só deve acontecer depois da Task 19 (App.tsx), já que remover as páginas antigas sem atualizar `App.tsx` deixa o build quebrado. Deixe os arquivos deletados no working tree e prossiga direto para a Task 19 antes de commitar.

---

### Task 19: Atualizar `BottomNav.tsx` e `App.tsx`

**Files:**
- Modify: `frontend/src/components/BottomNav.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `HistoryPage` (Task 18).

- [ ] **Step 1: Atualizar `BottomNav.tsx`**

Substituir todo o conteúdo de `frontend/src/components/BottomNav.tsx`:

```tsx
const ITEMS = [
  { id: 'Treino', label: 'Treino' },
  { id: 'Fichas', label: 'Fichas' },
  { id: 'Histórico', label: 'Histórico' },
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
```

- [ ] **Step 2: Atualizar `App.tsx`**

Substituir todo o conteúdo de `frontend/src/App.tsx`:

```tsx
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
        {page === 'Ficha pessoal' && <PersonalPlanPage onTrain={() => setPage('Treino')} />}
        {page === 'Histórico' && <HistoryPage />}
        {page === 'Configurações' && <SettingsPage nickname={auth.user.nickname} onLogout={auth.logout} />}
      </main>
      <BottomNav page={page} onChange={setPage} />
    </>
  );
}
```

- [ ] **Step 3: Verificação manual**

Run: `npm run build --workspace=frontend`
Expected: build limpo, sem erros de tipo (confirma que `LogbookPage`/`ProgressionPage` não são mais referenciados em lugar nenhum).

Run: `npm run dev --workspace=frontend` e navegar por todas as 4 abas do menu inferior, confirmando que Histórico abre, alterna entre "Por exercício"/"Por sessão", busca funciona, e tocar num exercício abre o detalhe.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/HistoryPage.tsx frontend/src/components/BottomNav.tsx frontend/src/App.tsx
git rm frontend/src/pages/LogbookPage.tsx frontend/src/pages/ProgressionPage.tsx
git commit -m "feat: merge Logbook and Progressão into a single per-exercise History tab"
```

---

## Verificação final

- [ ] **Rodar toda a suíte de testes**

Run: `npm run test --workspace=backend && npm run test --workspace=frontend`
Expected: PASS em ambos.

- [ ] **Rodar os builds de produção**

Run: `npm run build --workspace=backend && npm run build --workspace=frontend`
Expected: PASS em ambos, sem erros de tipo.

- [ ] **Passo manual no app real**

Com Postgres local rodando e `npm run dev` nos dois workspaces: escolher a ficha do Vitor, treinar um exercício com Top Set e um com Back Off, bater a meta de reps em todas as WS de pelo menos um exercício, finalizar o treino, conferir o resumo, abrir o Histórico e confirmar que o exercício aparece com "▲ progressão garantida" e que reabrir esse mesmo exercício na aba Treino já vem com a carga nova preenchida e a explicação visível.
