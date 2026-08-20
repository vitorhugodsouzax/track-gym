export const SET_LABELS = {
  WARMUP: 'Aquecimento',
  FEEDER: 'Feeder',
  WORKING: 'Working Set',
  TOP_SET: 'Top Set',
  BACK_OFF: 'Back Off',
  REST_PAUSE: 'Rest Pause',
} as const;

export function formatRange(min: number, max: number) {
  return min === max ? `${min}` : `${min}–${max}`;
}
