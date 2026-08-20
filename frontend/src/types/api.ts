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

export interface Exercise {
  id: string;
  name: string;
  order: number;
  equipmentType: EquipmentType;
  increment: number;
  setTemplates: SetTemplate[];
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
