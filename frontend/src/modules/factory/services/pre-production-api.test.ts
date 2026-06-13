import { describe, it, expect } from 'vitest';
import {
  filterPreProductionFinished,
  PreProductionProductOption,
} from './pre-production-api';

const product = (
  id: number,
  subcategory_name: string | null
): PreProductionProductOption => ({
  id,
  sku: `SKU-${id}`,
  name: `Product ${id}`,
  subcategory_name,
});

describe('filterPreProductionFinished', () => {
  it('returns only products tagged with the matching sub-category', () => {
    const products = [
      product(1, 'Printing'),
      product(2, 'Media'),
      product(3, null),
    ];
    const result = filterPreProductionFinished(products, 'printing');
    expect(result.matchesSubcategory).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual([1]);
  });

  it('matches sub-category names case-insensitively and ignores whitespace', () => {
    const products = [product(1, ' printing '), product(2, null)];
    const result = filterPreProductionFinished(products, 'printing');
    expect(result.matchesSubcategory).toBe(true);
    expect(result.products.map((p) => p.id)).toEqual([1]);
  });

  it('falls back to products not claimed by a sibling production type', () => {
    const products = [
      product(1, 'Media'),
      product(2, null),
      product(3, 'Pre-Production (Corrugation)'),
    ];
    const result = filterPreProductionFinished(products, 'printing');
    expect(result.matchesSubcategory).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual([2, 3]);
  });

  it('includes products tagged with an unrelated sub-category in the fallback', () => {
    const products = [product(1, 'Pre-Production (Corrugation)')];
    const result = filterPreProductionFinished(products, 'corrugation_media');
    expect(result.matchesSubcategory).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual([1]);
  });

  it('shows everything rather than an empty list when all products belong to sibling types', () => {
    const products = [product(1, 'Media'), product(2, 'Liner')];
    const result = filterPreProductionFinished(products, 'printing');
    expect(result.matchesSubcategory).toBe(false);
    expect(result.products.map((p) => p.id)).toEqual([1, 2]);
  });

  it('returns an empty result for an empty product list', () => {
    const result = filterPreProductionFinished([], 'printing');
    expect(result.matchesSubcategory).toBe(false);
    expect(result.products).toEqual([]);
  });
});
