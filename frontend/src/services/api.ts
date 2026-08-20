import type { AuthUser, Exercise, ExerciseHistoryEntry, HistoryDayGroup, PlansPayload, WorkoutPlan, WorkoutSessionRecord } from '../types/api';

const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const TOKEN_KEY = 'memento.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function clearCache() {
  cache.clear();
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isGet = !init?.method || init.method.toUpperCase() === 'GET';
  
  if (isGet) {
    const cached = cache.get(path);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
  } else {
    // Clear cache on any mutation (POST, PUT, DELETE) so data stays fresh
    cache.clear();
  }

  const token = getToken();
  const headers = new Headers(init?.headers);
  if (!headers.has('content-type') && init?.body) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  
  if (response.status === 401) {
    setToken(null);
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Não foi possível concluir a operação.' }));
    throw new Error(body.message ?? 'Não foi possível concluir a operação.');
  }
  if (response.status === 204) return undefined as T;
  
  const data = await response.json() as T;
  if (isGet) {
    cache.set(path, { data, expires: Date.now() + CACHE_TTL });
  }
  return data;
}

export async function getWorkouts(): Promise<WorkoutPlan[]> {
  return request('/api/workouts');
}

export async function register(nickname: string, password: string) {
  const result = await request<{ token: string; user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nickname, password }),
  });
  setToken(result.token);
  return result.user;
}

export async function login(nickname: string, password: string) {
  const result = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ nickname, password }),
  });
  setToken(result.token);
  return result.user;
}

export async function getMe() {
  return request<{ user: AuthUser }>('/api/auth/me');
}

export async function logout() {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } finally {
    setToken(null);
  }
}

export async function getPlans() {
  return request<PlansPayload>('/api/plans');
}

export async function useVitorWorkouts() {
  return request<{ selectedPlanId: string; plan: WorkoutPlan }>('/api/plans/use-vitor', { method: 'POST' });
}

export async function openPersonalPlan(name?: string) {
  return request<WorkoutPlan>('/api/plans/personal', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function addPersonalDay(planId: string, name?: string) {
  return request(`/api/plans/${planId}/days`, { method: 'POST', body: JSON.stringify({ name }) });
}

export async function deletePersonalDay(planId: string, dayId: string) {
  return request(`/api/plans/${planId}/days/${dayId}`, { method: 'DELETE' });
}

export async function addPersonalExercise(planId: string, dayId: string, body: {
  name: string;
  equipmentType: Exercise['equipmentType'];
  increment?: number;
  sets: Array<{ type: Exercise['setTemplates'][number]['type']; repRangeMin: number; repRangeMax: number }>;
}) {
  return request(`/api/plans/${planId}/days/${dayId}/exercises`, { method: 'POST', body: JSON.stringify(body) });
}

export async function deletePersonalExercise(planId: string, exerciseId: string) {
  return request(`/api/plans/${planId}/exercises/${exerciseId}`, { method: 'DELETE' });
}

export async function completeSession(workoutDayId: string, exercises: unknown[]) {
  return request<WorkoutSessionRecord>('/api/sessions', { method: 'POST', body: JSON.stringify({ workoutDayId, exercises }) });
}

export async function getLogbook() {
  return request<WorkoutSessionRecord[]>('/api/logbook');
}

export async function getHistoryExercises() {
  return request<HistoryDayGroup[]>('/api/history/exercises');
}

export async function getExerciseHistory(exerciseTemplateId: string) {
  return request<ExerciseHistoryEntry[]>(`/api/exercises/${exerciseTemplateId}/history`);
}
