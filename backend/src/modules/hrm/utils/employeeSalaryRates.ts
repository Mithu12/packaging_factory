/**
 * Standard month equivalent for hourly ↔ monthly conversion.
 * Matches ProcessPayroll.mediator (basic monthly ÷ (8 × 22)).
 */
export const STANDARD_MONTHLY_WORK_HOURS = 8 * 22;

export type RateInput = {
  hourly_rate?: number | null;
  monthly_rate?: number | null;
};

/**
 * When monthly is present it is the source of truth for hourly.
 * Otherwise derive monthly from hourly.
 */
export function normalizeEmployeeRates(input: RateInput): { hourly_rate?: number; monthly_rate?: number } {
  const hRaw = input.hourly_rate;
  const mRaw = input.monthly_rate;
  const hasH = hRaw !== undefined && hRaw !== null && !Number.isNaN(Number(hRaw));
  const hasM = mRaw !== undefined && mRaw !== null && !Number.isNaN(Number(mRaw));

  if (hasM) {
    const monthly = Number(mRaw);
    const hourly = monthly / STANDARD_MONTHLY_WORK_HOURS;
    return {
      monthly_rate: Math.round(monthly * 100) / 100,
      hourly_rate: Math.round(hourly * 10000) / 10000,
    };
  }
  if (hasH) {
    const hourly = Number(hRaw);
    const monthly = hourly * STANDARD_MONTHLY_WORK_HOURS;
    return {
      hourly_rate: Math.round(hourly * 10000) / 10000,
      monthly_rate: Math.round(monthly * 100) / 100,
    };
  }
  return {};
}
