import type { PoolClient } from 'pg';

const HRM_CODE_MAX_LEN = 20;

/**
 * Build an uppercase A–Z / 0–9 base code from a human-readable label (name or title).
 * Leaves room for numeric suffixes when ensuring uniqueness.
 */
export function baseCodeFromLabel(label: string, fallbackPrefix: 'DEPT' | 'DESG'): string {
  const trimmed = label.trim();
  const alphanumericChunks = trimmed
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);

  const direct = alphanumericChunks.join('').toUpperCase();
  const maxBase = HRM_CODE_MAX_LEN - 4;
  let base = direct.slice(0, maxBase);

  if (base.length < 2) {
    const initials = alphanumericChunks
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase();
    base = initials.slice(0, maxBase);
  }

  if (base.length < 2) {
    const tail = Date.now().toString().slice(-6);
    base = `${fallbackPrefix}${tail}`.slice(0, maxBase);
  }

  return base.slice(0, HRM_CODE_MAX_LEN);
}

async function pickUniqueCode(
  exists: (code: string) => Promise<boolean>,
  base: string
): Promise<string> {
  for (let n = 0; n < 10000; n++) {
    const suffix = n === 0 ? '' : String(n);
    const maxBaseLen = HRM_CODE_MAX_LEN - suffix.length;
    const candidateBase = suffix ? base.slice(0, maxBaseLen) : base.slice(0, HRM_CODE_MAX_LEN);
    const candidate = (candidateBase + suffix).slice(0, HRM_CODE_MAX_LEN);

    if (!(await exists(candidate))) {
      return candidate;
    }
  }
  throw new Error('Could not generate unique code');
}

export async function ensureUniqueDepartmentCode(client: PoolClient, base: string): Promise<string> {
  return pickUniqueCode(async (code) => {
    const check = await client.query('SELECT id FROM departments WHERE code = $1', [code]);
    return check.rows.length > 0;
  }, base);
}

export async function ensureUniqueDesignationCode(client: PoolClient, base: string): Promise<string> {
  return pickUniqueCode(async (code) => {
    const check = await client.query('SELECT id FROM designations WHERE code = $1', [code]);
    return check.rows.length > 0;
  }, base);
}
