import { test, expect, Page } from '@playwright/test';
import { login } from './utils/login-helper';

// The frontend proxies nothing — API assertions go straight at the backend.
// Cookies (authToken) are shared between the page and page.request, and
// cookies ignore ports, so the login performed through the UI authenticates
// these calls too.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api';

async function api(page: Page, method: 'get' | 'post', path: string, data?: unknown) {
    const response = await page.request[method](`${API_URL}${path}`, data ? { data } : undefined);
    expect(response.ok(), `${method.toUpperCase()} ${path} returned ${response.status()}`).toBeTruthy();
    const body = await response.json();
    return body.data;
}

async function getStock(page: Page, productId: number): Promise<number> {
    const product = await api(page, 'get', `/products/${productId}`);
    return parseFloat(product.current_stock);
}

test.describe('Wastage Management', () => {
    const RUN_ID = Date.now();
    const MATERIAL_NAME = `E2E Wastage Material ${RUN_ID}`;
    const COST_PRICE = 50;
    const INITIAL_STOCK = 100;

    test('standalone wastage: record deducts stock, approve keeps it, reject restores it', async ({ page }) => {
        await login(page);

        // --- SETUP: create a stocked material via API (master data seeder
        // guarantees at least one category and supplier exists) ---
        const categoriesData = await api(page, 'get', '/categories?limit=1');
        const categoryId = (categoriesData.categories || categoriesData)[0].id;
        const suppliersData = await api(page, 'get', '/suppliers?limit=1');
        const supplierId = (suppliersData.suppliers || suppliersData)[0].id;

        const material = await api(page, 'post', '/products', {
            sku: `E2E-WST-${RUN_ID}`,
            name: MATERIAL_NAME,
            category_id: categoryId,
            unit_of_measure: 'kg',
            cost_price: COST_PRICE,
            selling_price: COST_PRICE + 10,
            current_stock: INITIAL_STOCK,
            min_stock_level: 0,
            supplier_id: supplierId,
            barcode: `E2EWST${RUN_ID}`,
        });
        const materialId = material.id;
        expect(await getStock(page, materialId)).toBe(INITIAL_STOCK);

        await page.goto('/factory/wastage');
        await page.waitForLoadState('networkidle');

        // --- RECORD #1 (will be approved) ---
        await page.getByTestId('record-wastage-button').click();
        await page.getByTestId('wastage-material-search').fill(MATERIAL_NAME);
        await page.getByTestId('wastage-material-select').click();
        await page.getByRole('option', { name: new RegExp(MATERIAL_NAME) }).click();
        await page.getByTestId('wastage-quantity').fill('10');
        await page.getByTestId('wastage-reason').fill('E2E storage damage');
        await page.getByTestId('wastage-submit').click();
        await expect(page.locator('.toast', { hasText: 'Wastage recorded successfully' })).toBeVisible();

        // Stock deducted at recording time
        expect(await getStock(page, materialId)).toBe(INITIAL_STOCK - 10);

        // Record visible as pending, with cost = unit cost x quantity
        const listData = await api(page, 'get', `/factory/wastage?search=${encodeURIComponent(MATERIAL_NAME)}`);
        expect(listData.wastage_records).toHaveLength(1);
        const recorded = listData.wastage_records[0];
        expect(recorded.status).toBe('pending');
        expect(parseFloat(recorded.cost)).toBe(10 * COST_PRICE);

        // --- APPROVE #1 ---
        const pendingRow = page
            .locator('tr', { hasText: MATERIAL_NAME })
            .filter({ hasText: 'PENDING' })
            .first();
        await pendingRow.getByRole('button').click();
        await page.getByRole('button', { name: 'Approve' }).click();
        await expect(page.locator('.toast', { hasText: 'Wastage approved successfully' })).toBeVisible();

        // Approval posts the write-off; stock stays deducted
        expect(await getStock(page, materialId)).toBe(INITIAL_STOCK - 10);
        const approvedData = await api(page, 'get', `/factory/wastage?search=${encodeURIComponent(MATERIAL_NAME)}&status=approved`);
        expect(approvedData.wastage_records).toHaveLength(1);

        // --- RECORD #2 (will be rejected) ---
        await page.getByTestId('record-wastage-button').click();
        await page.getByTestId('wastage-material-search').fill(MATERIAL_NAME);
        await page.getByTestId('wastage-material-select').click();
        await page.getByRole('option', { name: new RegExp(MATERIAL_NAME) }).click();
        await page.getByTestId('wastage-quantity').fill('5');
        await page.getByTestId('wastage-reason').fill('E2E mis-recorded wastage');
        await page.getByTestId('wastage-submit').click();
        await expect(page.locator('.toast', { hasText: 'Wastage recorded successfully' })).toBeVisible();

        expect(await getStock(page, materialId)).toBe(INITIAL_STOCK - 15);

        // --- REJECT #2 ---
        const pendingRow2 = page
            .locator('tr', { hasText: MATERIAL_NAME })
            .filter({ hasText: 'PENDING' })
            .first();
        await pendingRow2.getByRole('button').click();
        await page.getByRole('button', { name: 'Reject' }).click();
        await expect(page.locator('.toast', { hasText: 'Wastage rejected successfully' })).toBeVisible();

        // Rejection restores the stock the recording deducted
        expect(await getStock(page, materialId)).toBe(INITIAL_STOCK - 10);
        const rejectedData = await api(page, 'get', `/factory/wastage?search=${encodeURIComponent(MATERIAL_NAME)}&status=rejected`);
        expect(rejectedData.wastage_records).toHaveLength(1);
    });

    test('recording wastage beyond available stock is refused', async ({ page }) => {
        await login(page);

        const categoriesData = await api(page, 'get', '/categories?limit=1');
        const categoryId = (categoriesData.categories || categoriesData)[0].id;
        const suppliersData = await api(page, 'get', '/suppliers?limit=1');
        const supplierId = (suppliersData.suppliers || suppliersData)[0].id;

        const material = await api(page, 'post', '/products', {
            sku: `E2E-WSTLOW-${RUN_ID}`,
            name: `E2E Low Stock Material ${RUN_ID}`,
            category_id: categoryId,
            unit_of_measure: 'kg',
            cost_price: COST_PRICE,
            selling_price: COST_PRICE + 10,
            current_stock: 3,
            min_stock_level: 0,
            supplier_id: supplierId,
            barcode: `E2EWSTLOW${RUN_ID}`,
        });

        const response = await page.request.post(`${API_URL}/factory/wastage`, {
            data: {
                material_id: String(material.id),
                quantity: 10,
                wastage_reason: 'E2E over-stock wastage',
            },
        });
        expect(response.status()).toBe(400);

        // Stock untouched after the refused attempt
        expect(await getStock(page, material.id)).toBe(3);
    });
});
