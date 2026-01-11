# Accounts Module Complete Guide

## Overview
The Accounts Module is the core financial engine of the ERP system. It handles everything from defining the Chart of Accounts to recording transactions via vouchers and generating comprehensive financial reports. The module is designed with a hierarchical structure, approval workflows, and multi-dimensional tracking using Cost Centers.

---

## Menu Options & Navigation
The following sections are available within the Accounts module:

1.  **Chart of Accounts**: The foundational list of all accounts used by the organization.
2.  **Account Groups**: A hierarchical way to categorize accounts for reporting purposes.
3.  **Vouchers**:
    *   **Receipt Vouchers**: For recording incoming funds.
    *   **Payment Vouchers**: For recording outgoing funds.
    *   **Journal Vouchers**: For non-cash adjustments (depreciation, accruals, etc.).
    *   **Balance Transfer**: For moving funds between internal cash and bank accounts.
4.  **Ledgers**:
    *   **General Ledger**: Detailed transaction history for any specific account.
    *   **Cost Center Ledger**: Transaction history filtered by specific departments, projects, or locations.
5.  **Cost Centers**: Management of multi-dimensional tracking units (Departments, Projects, etc.).
6.  **Financial Reports**:
    *   **Balance Sheet**: Real-time snapshot of the organization's financial position (Assets, Liabilities, Equity).
    *   **Income Statement**: Comprehensive Profit & Loss report for a specific period.

---

## Detailed Component & Functionality Breakdown

### 1. Chart of Accounts
**Purpose**: Defines the structure of the financial system.
*   **Hierarchical View**: Accounts are displayed in a tree structure showing parent-child relationships.
*   **Account Types**:
    *   **Control Accounts**: Parent accounts that aggregate balances from child accounts (cannot be posted to directly).
    *   **Posting Accounts**: Terminal nodes where actual transactions are recorded.
*   **Categories**: Assets, Liabilities, Equity, Revenue, and Expenses.
*   **Functionality**:
    *   Add/Edit account heads.
    *   Define initial opening balances.
    *   Toggle account status (Active/Inactive).
    *   Search and filter by account code or name.

### 2. Account Groups
**Purpose**: Organizes the Chart of Accounts into logical groups for summarized reporting.
*   **Functionality**:
    *   Create multi-level group hierarchies.
    *   Map account groups to primary financial categories.
    *   Manage group status and parent-child linkages.

### 3. Vouchers (Receipt, Payment, Journal, Balance Transfer)
**Purpose**: The primary method for recording financial transactions. All vouchers share a unified interface and workflow.
*   **Unified Interface**:
    *   Header information (Date, Voucher No, Description/Narration).
    *   Line-item entry (Account selection, Debit/Credit amounts, Cost Center tagging).
    *   Automatic balance validation (Total Debits must equal Total Credits).
*   **Workflows**:
    *   **Draft**: Initial stage where details can be edited.
    *   **Pending Approval**: Submitted for review.
    *   **Posted**: Finalized and reflected in the ledgers (cannot be edited).
    *   **Void**: Cancelled transactions while maintaining an audit trail.
*   **Specific Types**:
    *   **Receipt**: Records counterparty, payment method, and amount received.
    *   **Payment**: Records counterparty, payment method, and amount paid.
    *   **Journal**: Used for adjustments; allows disabling counterparty requirements.
    *   **Balance Transfer**: Simplifies internal transfers with specific cash/bank account selection.

### 4. Ledgers
#### General Ledger
**Purpose**: Audit trail for individual accounts.
*   **Features**:
    *   Date range filtering.
    *   Opening and Closing balance calculation.
    *   Direct links to source vouchers.
    *   Downloadable reports (Excel/PDF).

#### Cost Center Ledger
**Purpose**: Tracks financial performance by department, project, or location.
*   **Features**:
    *   Filtering by individual Cost Center.
    *   Summary of all transactions tagged to the selected center.

### 5. Cost Centers
**Purpose**: Manages the dimensions for expense and revenue tracking.
*   **Types**: Departments (e.g., HR, IT), Projects (e.g., Construction Site A), Locations (e.g., Warehouse 1).
*   **Approvals**: Ability to assign specific users as approvers for transactions tagged to a particular cost center.
*   **Functionality**:
    *   Define cost center status and types.
    *   View real-time performance indicators for each center.

### 6. Financial Reports
#### Balance Sheet
**Purpose**: Snapshot of financial health.
*   **Views**: Consolidated (Group-level) or Entity-level details.
*   **Features**: Multi-currency support (BDT, USD, EUR) and date-specific snapshots.

#### Income Statement
**Purpose**: Measures profitability.
*   **Features**: Summarizes Revenue vs Expenses, calculates Gross and Net Profit, and supports time-period comparisons.

---

## Technical Implementation Notes
*   **State Management**: Uses React standard hooks (`useState`, `useMemo`, `useEffect`) for local page state.
*   **API Integration**: Powered by a dedicated `AccountsApiService` and sub-services for Vouchers, Cost Centers, and Groups.
*   **UI Components**: Built using a custom UI library (Radix-based components) for tables, modals, and form elements.
*   **RBAC**: Role-Based Access Control is integrated to restrict access to sensitive financial reports and approval actions.
