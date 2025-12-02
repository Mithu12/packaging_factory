/**
 * Generates a SKU (Stock Keeping Unit) from a product name
 * @param productName - The product name to generate SKU from
 * @param categoryPrefix - Optional category prefix to add to SKU
 * @param brandPrefix - Optional brand prefix to add to SKU
 * @returns Generated SKU string
 */
export function generateSKU(
  productName: string,
  categoryPrefix?: string,
  brandPrefix?: string
): string {
  if (!productName || productName.trim() === '') {
    return '';
  }

  // Clean the product name: remove special characters, convert to uppercase, replace spaces with hyphens
  let sku = productName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Limit SKU length to reasonable size (max 20 characters for the main part)
  if (sku.length > 20) {
    // Try to keep meaningful parts by splitting on hyphens and taking first few parts
    const parts = sku.split('-');
    let truncatedSku = '';
    let currentLength = 0;
    
    for (const part of parts) {
      if (currentLength + part.length + 1 <= 20) { // +1 for hyphen
        truncatedSku += (truncatedSku ? '-' : '') + part;
        currentLength = truncatedSku.length;
      } else {
        break;
      }
    }
    sku = truncatedSku;
  }

  // Add prefixes if provided
  const prefixes: string[] = [];
  
  if (categoryPrefix && categoryPrefix.trim()) {
    const cleanCategoryPrefix = categoryPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCategoryPrefix) {
      prefixes.push(cleanCategoryPrefix.substring(0, 3)); // Limit to 3 chars
    }
  }
  
  if (brandPrefix && brandPrefix.trim()) {
    const cleanBrandPrefix = brandPrefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanBrandPrefix) {
      prefixes.push(cleanBrandPrefix.substring(0, 3)); // Limit to 3 chars
    }
  }

  // Combine prefixes with main SKU
  if (prefixes.length > 0) {
    sku = prefixes.join('-') + '-' + sku;
  }

  // Add a timestamp suffix to ensure uniqueness (last 4 digits of timestamp)
  const timestamp = Date.now().toString().slice(-4);
  sku = sku + '-' + timestamp;

  return sku;
}

/**
 * Generates a simple SKU from product name without prefixes or timestamp
 * @param productName - The product name to generate SKU from
 * @returns Simple generated SKU string
 */
export function generateSimpleSKU(productName: string): string {
  if (!productName || productName.trim() === '') {
    return '';
  }

  // Clean the product name: remove special characters, convert to uppercase, replace spaces with hyphens
  let sku = productName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Limit SKU length to reasonable size
  if (sku.length > 15) {
    // Try to keep meaningful parts by splitting on hyphens and taking first few parts
    const parts = sku.split('-');
    let truncatedSku = '';
    let currentLength = 0;
    
    for (const part of parts) {
      if (currentLength + part.length + 1 <= 15) { // +1 for hyphen
        truncatedSku += (truncatedSku ? '-' : '') + part;
        currentLength = truncatedSku.length;
      } else {
        break;
      }
    }
    sku = truncatedSku;
  }

  return sku;
}
