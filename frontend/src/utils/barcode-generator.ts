/**
 * Barcode generation utilities
 */

/**
 * Generate a random barcode (EAN-13 format)
 * EAN-13 barcodes are 13 digits long
 */
export function generateBarcode(): string {
  // Generate 12 random digits
  let barcode = '';
  for (let i = 0; i < 12; i++) {
    barcode += Math.floor(Math.random() * 10).toString();
  }
  
  // Calculate check digit using EAN-13 algorithm
  const checkDigit = calculateEAN13CheckDigit(barcode);
  return barcode + checkDigit;
}

/**
 * Generate a barcode based on product SKU
 * Uses SKU as base and adds padding/check digit
 */
export function generateBarcodeFromSKU(sku: string): string {
  if (!sku) {
    return generateBarcode();
  }
  
  // Clean SKU (remove non-numeric characters)
  const cleanSKU = sku.replace(/\D/g, '');
  
  // If SKU is too short, pad with zeros
  let paddedSKU = cleanSKU.padStart(8, '0');
  
  // If SKU is too long, truncate to 8 digits
  if (paddedSKU.length > 8) {
    paddedSKU = paddedSKU.substring(0, 8);
  }
  
  // Add prefix (e.g., "200" for internal products)
  const prefix = "200";
  const base = prefix + paddedSKU;
  
  // Calculate check digit
  const checkDigit = calculateEAN13CheckDigit(base);
  return base + checkDigit;
}

/**
 * Calculate EAN-13 check digit
 */
function calculateEAN13CheckDigit(barcode: string): string {
  let sum = 0;
  
  for (let i = 0; i < barcode.length; i++) {
    const digit = parseInt(barcode[i]);
    // Odd positions (1-based) are multiplied by 1, even by 3
    const multiplier = (i + 1) % 2 === 0 ? 3 : 1;
    sum += digit * multiplier;
  }
  
  const remainder = sum % 10;
  return remainder === 0 ? '0' : (10 - remainder).toString();
}

/**
 * Validate barcode format (EAN-13)
 */
export function validateBarcode(barcode: string): boolean {
  if (!barcode || barcode.length !== 13) {
    return false;
  }
  
  // Check if all characters are digits
  if (!/^\d{13}$/.test(barcode)) {
    return false;
  }
  
  // Validate check digit
  const base = barcode.substring(0, 12);
  const checkDigit = barcode.substring(12, 13);
  const calculatedCheckDigit = calculateEAN13CheckDigit(base);
  
  return checkDigit === calculatedCheckDigit;
}

/**
 * Format barcode for display (add spaces for readability)
 */
export function formatBarcode(barcode: string): string {
  if (barcode.length !== 13) {
    return barcode;
  }
  
  return `${barcode.substring(0, 1)} ${barcode.substring(1, 7)} ${barcode.substring(7, 13)}`;
}
