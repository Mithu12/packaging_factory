import { test, expect, APIRequestContext, Page } from '@playwright/test';

const RUN_ID = Date.now();
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3002/api';

// API-based login: hits the backend directly so we don't depend on the UI redirect timing.
// The auth cookie is set on the request context which is shared with `page`.
async function apiLogin(page: Page) {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { username: 'admin', password: 'admin123' },
  });
  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
}
const PRIMARY_NAMES = {
  RM: 'Raw Materials',
  RRM: 'Ready Raw Materials',
  FG: 'Ready Goods',
} as const;

interface CategoryRow {
  id: number;
  name: string;
}

async function fetchPrimaryCategories(request: APIRequestContext): Promise<Record<string, number>> {
  const res = await request.get(`${API_BASE}/categories?limit=100`);
  expect(res.ok(), `GET /api/categories failed: ${res.status()}`).toBeTruthy();
  const body = await res.json();
  // Backend wraps in { success, data: { categories: [...] }, message }
  const rows: CategoryRow[] =
    Array.isArray(body) ? body
    : Array.isArray(body.categories) ? body.categories
    : Array.isArray(body.data) ? body.data
    : Array.isArray(body.data?.categories) ? body.data.categories
    : [];
  const byName: Record<string, number> = {};
  for (const row of rows) byName[row.name] = row.id;
  expect(byName[PRIMARY_NAMES.RM], 'Raw Materials category should be seeded').toBeDefined();
  expect(byName[PRIMARY_NAMES.RRM], 'Ready Raw Materials category should be seeded').toBeDefined();
  expect(byName[PRIMARY_NAMES.FG], 'Ready Goods category should be seeded').toBeDefined();
  return byName;
}

interface CreatedProduct {
  id: number;
  sku: string;
}

async function createProduct(
  request: APIRequestContext,
  payload: {
    name: string;
    sku: string;
    category_id: number;
    cost_price: number;
    selling_price?: number;
  }
): Promise<CreatedProduct> {
  const res = await request.post(`${API_BASE}/products`, {
    data: {
      name: payload.name,
      sku: payload.sku,
      category_id: payload.category_id,
      unit_of_measure: 'pcs',
      cost_price: payload.cost_price,
      selling_price: payload.selling_price ?? payload.cost_price,
      current_stock: 0,
      min_stock_level: 0,
      status: 'active',
    },
  });
  expect(res.ok(), `Create ${payload.sku} failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  // Backend wraps in { success, data: <product>, message }
  const product = body.data ?? body.product ?? body;
  return { id: product.id, sku: product.sku };
}

async function deleteProduct(request: APIRequestContext, id: number): Promise<void> {
  await request.delete(`${API_BASE}/products/${id}`).catch(() => undefined);
}

test.describe('Product hierarchy (RM / RRM / FG)', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page);
  });

  test('creates a product per type and verifies the inventory list renders all three categories', async ({ page }) => {
    const categories = await fetchPrimaryCategories(page.request);

    const rm = await createProduct(page.request, {
      name: `E2E RM ${RUN_ID}`,
      sku: `E2E-RM-${RUN_ID}`,
      category_id: categories[PRIMARY_NAMES.RM],
      cost_price: 5,
    });
    const rrm = await createProduct(page.request, {
      name: `E2E RRM ${RUN_ID}`,
      sku: `E2E-RRM-${RUN_ID}`,
      category_id: categories[PRIMARY_NAMES.RRM],
      cost_price: 12,
    });
    const fg = await createProduct(page.request, {
      name: `E2E FG ${RUN_ID}`,
      sku: `E2E-FG-${RUN_ID}`,
      category_id: categories[PRIMARY_NAMES.FG],
      cost_price: 30,
      selling_price: 50,
    });

    try {
      // Verify all three exist via API (search by SKU substring).
      for (const created of [rm, rrm, fg]) {
        const res = await page.request.get(`${API_BASE}/products?search=${encodeURIComponent(created.sku)}&limit=10`);
        expect(res.ok(), `lookup ${created.sku}: ${res.status()}`).toBeTruthy();
        const body = await res.json();
        const products = body.data?.products ?? body.products ?? body.data ?? [];
        expect(products.some((p: { id: number }) => p.id === created.id), `${created.sku} missing from search`).toBeTruthy();
      }

      // Smoke test: inventory products page loads without error.
      await page.goto('/inventory/products');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="products-page"]')).toBeVisible();
    } finally {
      await deleteProduct(page.request, rm.id);
      await deleteProduct(page.request, rrm.id);
      await deleteProduct(page.request, fg.id);
    }
  });

  test('AddProductForm dropdown offers all three primary categories', async ({ page }) => {
    await page.goto('/inventory/products');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="add-product-button"]');
    await expect(page.locator('[data-testid="add-product-modal"]')).toBeVisible();

    await page.click('[data-testid="add-product-category"]');
    // displayPrimaryCategoryLabel renames the plural canonical names to singular for display.
    await expect(page.locator('[role="option"]', { hasText: /^Raw Material$/ })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: /^Ready Raw Material$/ })).toBeVisible();
    await expect(page.locator('[role="option"]', { hasText: /^Ready Goods$/ })).toBeVisible();

    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
  });
});

test.describe('BOM type validation', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page);
  });

  test('enforces parent / component type rules', async ({ page }) => {
    const categories = await fetchPrimaryCategories(page.request);
    const id = `${RUN_ID}-bom`;

    const rm = await createProduct(page.request, { name: `E2E BOM RM ${id}`, sku: `E2E-BOM-RM-${id}`, category_id: categories[PRIMARY_NAMES.RM], cost_price: 2 });
    const rrm = await createProduct(page.request, { name: `E2E BOM RRM ${id}`, sku: `E2E-BOM-RRM-${id}`, category_id: categories[PRIMARY_NAMES.RRM], cost_price: 8 });
    const fg = await createProduct(page.request, { name: `E2E BOM FG ${id}`, sku: `E2E-BOM-FG-${id}`, category_id: categories[PRIMARY_NAMES.FG], cost_price: 25, selling_price: 40 });
    const fg2 = await createProduct(page.request, { name: `E2E BOM FG2 ${id}`, sku: `E2E-BOM-FG2-${id}`, category_id: categories[PRIMARY_NAMES.FG], cost_price: 25, selling_price: 40 });

    const createdBomIds: number[] = [];
    const tryCreateBom = async (parentId: number, components: Array<{ id: number; qty?: number }>, version: string) => {
      return page.request.post(`${API_BASE}/factory/boms`, {
        data: {
          parent_product_id: parentId,
          version,
          effective_date: new Date().toISOString().slice(0, 10),
          notes: 'e2e',
          components: components.map((c) => ({
            component_product_id: c.id,
            quantity_required: c.qty ?? 1,
            unit_of_measure: 'pcs',
            is_optional: false,
            scrap_factor: 0,
          })),
        },
      });
    };

    try {
      // Positive: FG parent + (RM, RRM) components.
      let res = await tryCreateBom(fg.id, [{ id: rm.id, qty: 2 }, { id: rrm.id, qty: 1 }], 'V1');
      expect(res.ok(), `FG+RM+RRM BOM should succeed: ${res.status()} ${await res.text()}`).toBeTruthy();
      const fgBom = (await res.json()).bom ?? (await res.json());
      if (fgBom?.id) createdBomIds.push(fgBom.id);

      // Positive: RRM parent + RM only.
      res = await tryCreateBom(rrm.id, [{ id: rm.id, qty: 3 }], 'V1');
      expect(res.ok(), `RRM+RM BOM should succeed: ${res.status()} ${await res.text()}`).toBeTruthy();
      const rrmBom = (await res.json()).bom ?? (await res.json());
      if (rrmBom?.id) createdBomIds.push(rrmBom.id);

      // Negative: RM as parent.
      res = await tryCreateBom(rm.id, [{ id: rm.id }], 'V1');
      expect(res.status(), 'RM-as-parent should be rejected').toBe(400);
      expect((await res.text()).toLowerCase()).toContain('raw material');

      // Negative: RRM parent with FG component.
      res = await tryCreateBom(rrm.id, [{ id: fg.id }], 'V2');
      expect(res.status(), 'RRM with FG component should be rejected').toBe(400);

      // Negative: FG parent with another FG component.
      res = await tryCreateBom(fg.id, [{ id: fg2.id }], 'V2');
      expect(res.status(), 'FG with FG component should be rejected').toBe(400);
    } finally {
      for (const bomId of createdBomIds) {
        await page.request.delete(`${API_BASE}/factory/boms/${bomId}`).catch(() => undefined);
      }
      await deleteProduct(page.request, rm.id);
      await deleteProduct(page.request, rrm.id);
      await deleteProduct(page.request, fg.id);
      await deleteProduct(page.request, fg2.id);
    }
  });
});

test.describe('Work order target restriction', () => {
  test.beforeEach(async ({ page }) => {
    await apiLogin(page);
  });

  test('rejects work orders targeting a Raw Material', async ({ page }) => {
    const categories = await fetchPrimaryCategories(page.request);
    const id = `${RUN_ID}-wo`;

    const rm = await createProduct(page.request, { name: `E2E WO RM ${id}`, sku: `E2E-WO-RM-${id}`, category_id: categories[PRIMARY_NAMES.RM], cost_price: 2 });

    try {
      const res = await page.request.post(`${API_BASE}/factory/work-orders`, {
        data: {
          product_id: rm.id,
          quantity: 10,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 'medium',
          estimated_hours: 1,
        },
      });
      expect(res.status(), 'work order targeting RM should be rejected').toBe(400);
      expect((await res.text()).toLowerCase()).toContain('raw material');
    } finally {
      await deleteProduct(page.request, rm.id);
    }
  });
});
