/** Aligns with payroll: basic monthly ÷ (8 × 30 days). */
export const STANDARD_MONTHLY_WORK_HOURS = 8 * 30;

export function monthlyFromHourly(hourly: number): number {
  return Math.round(hourly * STANDARD_MONTHLY_WORK_HOURS * 100) / 100;
}

export function hourlyFromMonthly(monthly: number): number {
  return Math.round((monthly / STANDARD_MONTHLY_WORK_HOURS) * 10000) / 10000;
}
