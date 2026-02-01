# Business User Guide: Setting Up Inventory Accounting

This guide explains how to set up your accounting system to track inventory, sales, and expenses for each of your Distribution Centers (DC) or Retail Stores.

---

## Phase 1: Create Your Accounts
First, you need to create the "folders" where your financial data will be stored.

1.  **Go to Menu:** `Accounts` -> `Chart of Accounts`
2.  **Click Button:** `Add Account` (top right)
3.  **Create these essential accounts:**

| Account Name | Account Group | Purpose |
| :--- | :--- | :--- |
| **Inventory Stock** | Assets | Tracks the total value of products sitting in your warehouses. |
| **Accounts Receivable** | Assets | Tracks money that customers owe you (for credit sales). |
| **Sales Revenue** | Revenue | Tracks all the money you’ve earned from selling products. |
| **Cost of Goods Sold (COGS)** | Expenses | Tracks how much you spent on the products you just sold. |
| **Cash in Hand** / **Bank** | Assets | Tracks the actual money you receive from customers. |

---

## Phase 2: Create "Cost Centers" for Tracking
Cost Centers allow you to see the financial performance of specific locations.

1.  **Go to Menu:** `Accounts` -> `Cost Centers`
2.  **Click Button:** `Add Cost Center`
3.  **Action:** Create one for each location (e.g., "New York Warehouse", "Dhaka Branch").
    *   *Tip:* Use the same name as your Distribution Center to keep it simple.

---

## Phase 3: Connect Accounts to your Locations
Now, tell the system which Cost Center belongs to which Distribution Center.

1.  **Go to Menu:** `Inventory` -> `Distribution Management`
2.  **Find your Center** in the list.
3.  **Click Actions (Three Dots):** Select `Edit Center`.
4.  **Find Field:** `Accounting Cost Center` (in the dropdown).
5.  **Select:** Choose the Cost Center you created in Phase 2.
6.  **Click:** `Update Distribution Center`.

---

## Why did we do this?
Once this connection is made, the system will do the following automatically:

*   **DC-Wise Income:** When you sell a product from "Dhaka Branch", the income is tagged to the "Dhaka Cost Center."
*   **DC-Wise Expense:** When you record an expense (like rent or electricity) for a specific warehouse, you can tag its Cost Center.
*   **Profit Tracking:** You can now open the **Income Statement** and filter by **Cost Center** to see if a specific warehouse or store is making a profit or a loss!
