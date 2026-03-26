/**
 * Preview for department/designation codes. Keep rules aligned with
 * backend `baseCodeFromLabel` in `backend/src/modules/hrm/utils/hrmCodeUtils.ts`.
 */
const HRM_CODE_MAX_LEN = 20;

export function suggestCodeFromLabel(label: string, fallbackPrefix: 'DEPT' | 'DESG'): string {
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
