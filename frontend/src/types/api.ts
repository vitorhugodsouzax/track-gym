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
