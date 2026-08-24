export interface Vec2 {
  x: number;
  y: number;
}

export type Unit = "mm" | "cm" | "m" | "ft";

export const UNIT_METERS: Record<Unit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  ft: 0.3048
};

export const PIXELS_PER_METER = 80;

export function metersToUnit(meters: number, unit: Unit): number {
  return meters / UNIT_METERS[unit];
}

export function unitToMeters(value: number, unit: Unit): number {
  return value * UNIT_METERS[unit];
}

export function formatLength(meters: number, unit: Unit): string {
  const v = metersToUnit(meters, unit);
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${unit}`;
}
