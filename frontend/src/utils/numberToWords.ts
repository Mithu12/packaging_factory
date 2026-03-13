/**
 * Converts a number to words for Taka (Bangladeshi currency).
 * Supports up to crores/lakhs. Decimals are truncated to whole Taka.
 * Example: 65000 -> "Sixty Five Thousand Taka Only"
 */
export function numberToWordsTaka(amount: number): string {
  const whole = Math.floor(Math.abs(amount));
  if (whole === 0) return "Zero Taka Only";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function toWords(n: number): string {
    if (n === 0) return "";
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) {
      const t = Math.floor(n / 10);
      const o = n % 10;
      return tens[t] + (o > 0 ? " " + ones[o] : "");
    }
    if (n < 1000) {
      const h = Math.floor(n / 100);
      const r = n % 100;
      return ones[h] + " Hundred" + (r > 0 ? " " + toWords(r) : "");
    }
    if (n < 100000) {
      const th = Math.floor(n / 1000);
      const r = n % 1000;
      return toWords(th) + " Thousand" + (r > 0 ? " " + toWords(r) : "");
    }
    if (n < 10000000) {
      const l = Math.floor(n / 100000);
      const r = n % 100000;
      return toWords(l) + " Lakh" + (l > 1 ? "s" : "") + (r > 0 ? " " + toWords(r) : "");
    }
    const c = Math.floor(n / 10000000);
    const r = n % 10000000;
    return toWords(c) + " Crore" + (c > 1 ? "s" : "") + (r > 0 ? " " + toWords(r) : "");
  }

  return toWords(whole) + " Taka Only";
}
