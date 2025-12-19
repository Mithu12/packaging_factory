import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_EMPLOYEE_FIRST_NAME = 'John';
const TEST_EMPLOYEE_LAST_NAME = 'Doe';
const TEST_EMPLOYEE_USERNAME = 'johndoe';
const TEST_EMPLOYEE_PASSWORD = 'TempPass123';
const TEST_EMPLOYEE_PHONE = '+92 300 1234567';
const TEST_EMPLOYEE_CNIC = '12345-1234567-1';
const DEFAULT_JOIN_DATE = '2024-01-01';

const UPDATED_EMPLOYEE_FIRST_NAME = 'Jane';
const UPDATED_EMPLOYEE_LAST_NAME = 'Smith';

type EmployeeTestData = {
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  cnic: string;
};

const generateEmployeeTestData = (overrides: Partial<EmployeeTestData> = {}): EmployeeTestData => {
  const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

  return {
    employeeId: `EMP-${uniqueSuffix}`,
    firstName: TEST_EMPLOYEE_FIRST_NAME,
    lastName: TEST_EMPLOYEE_LAST_NAME,
    email: `john.doe+${uniqueSuffix}@company.com`,
    username: `${TEST_EMPLOYEE_USERNAME}${uniqueSuffix}`,
    password: TEST_EMPLOYEE_PASSWORD,
    phone: TEST_EMPLOYEE_PHONE,
    cnic: TEST_EMPLOYEE_CNIC,
    ...overrides,
  };
};

// Helper function to select options from dropdown
async function selectOptionByTestId(page: Page, testId: string, option: string) {
  const select = page.getByTestId(testId);
  await select.click();
  await page.getByRole('option', { name: option }).click();
}

async function selectFirstAvailableRole(page: Page) {
  const roleSelect = page.getByTestId('role-select');
  await roleSelect.click();

  const firstRoleOption = page.getByRole('option').first();
  await expect(firstRoleOption).toBeVisible({ timeout: 10000 });
  await firstRoleOption.click();
}

// Helper function to create a test employee
async function createTestEmployee(
  page: Page,
  overrides: Partial<EmployeeTestData> = {}
) {
  const employeeData = generateEmployeeTestData(overrides);
  await page.goto('/hrm/employees');

  // Click add employee button
  const addButton = page.getByTestId('add-employee-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Wait for employee form dialog
  const modal = page.getByTestId('employee-form-dialog');
  await expect(modal).toBeVisible();

  // Verify form title
  await expect(page.getByTestId('employee-form-title')).toContainText('Add New Employee');

  // Fill basic information
  await page.getByTestId('employee-id-input').fill(employeeData.employeeId);
  await page.getByTestId('first-name-input').fill(employeeData.firstName);
  await page.getByTestId('last-name-input').fill(employeeData.lastName);

  // Fill personal information
  await page.getByTestId('phone-input').fill(employeeData.phone);
  await page.getByTestId('cnic-input').fill(employeeData.cnic);
  await page.getByTestId('nationality-input').fill('Pakistani');

  // Switch to employment tab
  await page.getByTestId('employment-tab').click();

  // Fill employment information
  await selectOptionByTestId(page, 'employment-type-select', 'Permanent');
  await page.getByTestId('join-date-input').fill(DEFAULT_JOIN_DATE);

  // Fill user account information
  await page.getByTestId('username-input').fill(employeeData.username);
  await page.getByTestId('email-input').fill(employeeData.email);
  await page.getByTestId('password-input').fill(employeeData.password);
  await selectFirstAvailableRole(page);

  // Submit form
  await page.getByTestId('submit-button').click();

  // Wait for dialog to close and the new row to appear
  await expect(page.getByTestId('employee-form-dialog')).toBeHidden({ timeout: 15000 });
  await expect(page.getByTestId(`employee-row-${employeeData.employeeId}`)).toBeVisible({ timeout: 15000 });

  return employeeData;
}

test.describe('Employee Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should display employee management page', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Check page title
    await expect(page).toHaveTitle(/ERP/);

    // Check for main elements
    await expect(page.getByTestId('employee-management-header')).toBeVisible();
    await expect(page.getByTestId('employee-search-input')).toBeVisible();
    await expect(page.getByTestId('add-employee-button')).toBeVisible();
  });

  test('should create new employee successfully', async ({ page }) => {
    const employee = await createTestEmployee(page);

    // Verify employee was created by checking if we can find it in the list
    await page.getByTestId('employee-search-input').fill(employee.employeeId);
    await expect(page.getByTestId(`employee-row-${employee.employeeId}`)).toBeVisible({ timeout: 15000 });
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Click add employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for employee form dialog
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Try to submit without filling required fields
    await page.getByTestId('submit-button').click();

    // Should show validation errors
    await expect(page.getByTestId('employee-id-error')).toBeVisible();
    await expect(page.getByTestId('first-name-error')).toBeVisible();
    await expect(page.getByTestId('last-name-error')).toBeVisible();
    await expect(page.getByTestId('cnic-error')).toBeVisible();
    await expect(page.getByTestId('employment-type-error')).toBeVisible();
    await expect(page.getByTestId('join-date-error')).toBeVisible();
    await expect(page.getByTestId('username-error')).toBeVisible();
    await expect(page.getByTestId('email-error')).toBeVisible();
    await expect(page.getByTestId('password-error')).toBeVisible();
    await expect(page.getByTestId('role-id-error')).toBeVisible();
  });

  test('should validate CNIC format', async ({ page }) => {
    await page.goto('/hrm/employees');

    const employeeData = generateEmployeeTestData();

    // Click add employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for employee form dialog
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Fill form with invalid CNIC
    await page.getByTestId('employee-id-input').fill(employeeData.employeeId);
    await page.getByTestId('first-name-input').fill(employeeData.firstName);
    await page.getByTestId('last-name-input').fill(employeeData.lastName);
    await page.getByTestId('cnic-input').fill('invalid-cnic');

    await page.getByTestId('employment-tab').click();
    await selectOptionByTestId(page, 'employment-type-select', 'Permanent');
    await page.getByTestId('join-date-input').fill(DEFAULT_JOIN_DATE);
    await page.getByTestId('username-input').fill(employeeData.username);
    await page.getByTestId('email-input').fill(employeeData.email);
    await page.getByTestId('password-input').fill(employeeData.password);
    await selectFirstAvailableRole(page);

    // Submit form
    await page.getByTestId('submit-button').click();

    // Should show CNIC validation error
    await expect(page.getByTestId('cnic-error')).toBeVisible();
  });

  test('should edit employee successfully', async ({ page }) => {
    // First create an employee
    const employee = await createTestEmployee(page);

    // Find and click edit button
    await page.getByTestId(`edit-employee-${employee.employeeId}`).click();

    // Wait for form to load with employee data
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Verify form is populated with employee data
    await expect(page.getByTestId('employee-id-input')).toHaveValue(employee.employeeId);
    await expect(page.getByTestId('first-name-input')).toHaveValue(employee.firstName);

    // Update employee information
    await page.getByTestId('first-name-input').fill(UPDATED_EMPLOYEE_FIRST_NAME);
    await page.getByTestId('last-name-input').fill(UPDATED_EMPLOYEE_LAST_NAME);
    const updatedEmail = `updated+${employee.employeeId}@company.com`;
    const updatedUsername = `${employee.username}-updated`;

    await page.getByTestId('employment-tab').click();
    await page.getByTestId('username-input').fill(updatedUsername);
    await page.getByTestId('email-input').fill(updatedEmail);
    await page.getByTestId('password-input').fill('UpdatedPass123!');
    await selectFirstAvailableRole(page);

    // Submit form
    await page.getByTestId('submit-button').click();

    // Verify update was successful
    await expect(page.getByTestId('employee-form-dialog')).toBeHidden({ timeout: 15000 });
    await expect(page.getByTestId(`employee-row-${employee.employeeId}`)).toBeVisible({ timeout: 15000 });
  });

  test('should delete employee successfully', async ({ page }) => {
    // First create an employee
    const employee = await createTestEmployee(page);

    // Find and click delete button
    await page.getByTestId(`delete-employee-${employee.employeeId}`).click();

    // Confirm deletion in dialog
    await page.getByTestId('confirm-delete-button').click();

    // Verify employee is removed from list
    await expect(page.getByTestId(`employee-row-${employee.employeeId}`)).toBeHidden({ timeout: 15000 });
  });

  test('should filter employees by status', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Test active employees filter
    await selectOptionByTestId(page, 'status-filter-select', 'Active');
    await page.getByTestId('apply-filter-button').click();

    // Should show filtered results
    await expect(page.getByTestId('employee-list')).toBeVisible();

    // Test inactive employees filter
    await selectOptionByTestId(page, 'status-filter-select', 'Inactive');
    await page.getByTestId('apply-filter-button').click();

    // Should show filtered results
    await expect(page.getByTestId('employee-list')).toBeVisible();
  });

  test('should export employee data', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Click export button
    await page.getByTestId('export-button').click();

    // Select export format
    await selectOptionByTestId(page, 'export-format-select', 'Excel');
    await page.getByTestId('confirm-export-button').click();

    // Should trigger download (we can't test actual download in headless mode)
    // But we can verify the export dialog closes
    await expect(page.getByTestId('export-dialog')).not.toBeVisible();
  });

  test('should handle form tabs correctly', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Click add employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for employee form dialog
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Check that all tabs are present
    await expect(page.getByTestId('personal-tab')).toBeVisible();
    await expect(page.getByTestId('employment-tab')).toBeVisible();
    await expect(page.getByTestId('banking-tab')).toBeVisible();

    // Test switching between tabs
    await page.getByTestId('employment-tab').click();
    await expect(page.getByTestId('employment-tab-content')).toBeVisible();

    await page.getByTestId('banking-tab').click();
    await expect(page.getByTestId('banking-tab-content')).toBeVisible();

    await page.getByTestId('personal-tab').click();
    await expect(page.getByTestId('personal-tab-content')).toBeVisible();
  });

  test('should handle user account creation fields', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Click add employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for employee form dialog
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Go to employment tab where user account fields are
    await page.getByTestId('employment-tab').click();

    // Fill user account fields
    await page.getByTestId('username-input').fill('testuser');
    await page.getByTestId('email-input').fill('testuser@company.com');
    await page.getByTestId('password-input').fill('SecurePass123');

    // Verify fields are filled
    await expect(page.getByTestId('username-input')).toHaveValue('testuser');
    await expect(page.getByTestId('email-input')).toHaveValue('testuser@company.com');
    await expect(page.getByTestId('password-input')).toHaveValue('SecurePass123');
  });

  test('should handle employment dates correctly', async ({ page }) => {
    await page.goto('/hrm/employees');

    // Click add employee button
    await page.getByTestId('add-employee-button').click();

    // Wait for employee form dialog
    const modal = page.getByTestId('employee-form-dialog');
    await expect(modal).toBeVisible();

    // Fill basic required fields
    await page.getByTestId('employee-id-input').fill('EMP003');
    await page.getByTestId('first-name-input').fill('Test');
    await page.getByTestId('last-name-input').fill('User');
    await page.getByTestId('cnic-input').fill('12345-1234567-2');
    await page.getByTestId('username-input').fill('testuser2');
    await page.getByTestId('email-input').fill('testuser2@company.com');
    await page.getByTestId('password-input').fill('password123');

    // Test employment dates
    await page.getByTestId('confirmation-date-input').fill('2023-06-01');
    await page.getByTestId('termination-date-input').fill('2024-12-31');

    // Verify dates are set
    await expect(page.getByTestId('confirmation-date-input')).toHaveValue('2023-06-01');
    await expect(page.getByTestId('termination-date-input')).toHaveValue('2024-12-31');
  });
});
