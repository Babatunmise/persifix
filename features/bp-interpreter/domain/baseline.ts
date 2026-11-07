import type { Baseline } from "./types";

export function calculateBaseline(readings: { systolic: number; diastolic: number; taken_at: string }[]): Baseline | null {
  if (!readings || readings.length < 3) {
    return null; // Not enough data to establish a baseline
  }

  // Get the last 14 readings
  const recent = readings.slice(0, 14);
  
  const distinctDays = new Set(recent.map(r => r.taken_at.split('T')[0])).size;

  const sumSys = recent.reduce((acc, r) => acc + r.systolic, 0);
  const sumDia = recent.reduce((acc, r) => acc + r.diastolic, 0);

  return {
    sys: Math.round(sumSys / recent.length),
    dia: Math.round(sumDia / recent.length),
    distinctDays,
    sessions: recent.length,
  };
}