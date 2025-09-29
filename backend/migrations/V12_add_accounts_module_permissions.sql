BEGIN;

UPDATE public.permissions
SET name = 'chart_of_accounts.create',
    display_name = 'Create Chart of Accounts',
    description = 'Create chart of accounts',
    resource = 'chart_of_accounts'
WHERE name = 'accounts.create';

UPDATE public.permissions
SET name = 'chart_of_accounts.read',
    display_name = 'View Chart of Accounts',
    description = 'View chart of accounts',
    resource = 'chart_of_accounts'
WHERE name = 'accounts.read';

UPDATE public.permissions
SET name = 'chart_of_accounts.update',
    display_name = 'Update Chart of Accounts',
    description = 'Update chart of accounts',
    resource = 'chart_of_accounts'
WHERE name = 'accounts.update';

UPDATE public.permissions
SET name = 'chart_of_accounts.delete',
    display_name = 'Delete Chart of Accounts',
    description = 'Delete chart of accounts',
    resource = 'chart_of_accounts'
WHERE name = 'accounts.delete';

COMMIT;


BEGIN;

-- 1) Account Groups (CRUD)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2256,'account_groups.create','Create Account Group','Create account groups','Finance','create','account_groups',CURRENT_TIMESTAMP),
(2257,'account_groups.read','View Account Groups','View account groups','Finance','read','account_groups',CURRENT_TIMESTAMP),
(2258,'account_groups.update','Update Account Groups','Edit account groups','Finance','update','account_groups',CURRENT_TIMESTAMP),
(2259,'account_groups.delete','Delete Account Groups','Remove account groups','Finance','delete','account_groups',CURRENT_TIMESTAMP);

-- 2) Cost Centers (granular actions to complement existing cost_centers.manage)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2260,'cost_centers.create','Create Cost Center','Create cost centers','Finance','create','cost_centers',CURRENT_TIMESTAMP),
(2261,'cost_centers.read','View Cost Centers','View cost centers','Finance','read','cost_centers',CURRENT_TIMESTAMP),
(2262,'cost_centers.update','Update Cost Centers','Edit cost centers','Finance','update','cost_centers',CURRENT_TIMESTAMP),
(2263,'cost_centers.delete','Delete Cost Centers','Remove cost centers','Finance','delete','cost_centers',CURRENT_TIMESTAMP);

-- 3) Payment Vouchers (CRUD + approve/reject)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2264,'payment_vouchers.create','Create Payment Voucher','Create payment vouchers','Finance','create','payment_vouchers',CURRENT_TIMESTAMP),
(2265,'payment_vouchers.read','View Payment Vouchers','View payment vouchers','Finance','read','payment_vouchers',CURRENT_TIMESTAMP),
(2266,'payment_vouchers.update','Update Payment Vouchers','Edit payment vouchers','Finance','update','payment_vouchers',CURRENT_TIMESTAMP),
(2267,'payment_vouchers.delete','Delete Payment Vouchers','Remove payment vouchers','Finance','delete','payment_vouchers',CURRENT_TIMESTAMP),
(2268,'payment_vouchers.approve','Approve Payment Voucher','Approve payment vouchers','Finance','approve','payment_vouchers',CURRENT_TIMESTAMP),
(2269,'payment_vouchers.reject','Reject Payment Voucher','Reject payment vouchers','Finance','reject','payment_vouchers',CURRENT_TIMESTAMP);

-- 4) Receipt Vouchers (CRUD + approve/reject)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2270,'receipt_vouchers.create','Create Receipt Voucher','Create receipt vouchers','Finance','create','receipt_vouchers',CURRENT_TIMESTAMP),
(2271,'receipt_vouchers.read','View Receipt Vouchers','View receipt vouchers','Finance','read','receipt_vouchers',CURRENT_TIMESTAMP),
(2272,'receipt_vouchers.update','Update Receipt Vouchers','Edit receipt vouchers','Finance','update','receipt_vouchers',CURRENT_TIMESTAMP),
(2273,'receipt_vouchers.delete','Delete Receipt Vouchers','Remove receipt vouchers','Finance','delete','receipt_vouchers',CURRENT_TIMESTAMP),
(2274,'receipt_vouchers.approve','Approve Receipt Voucher','Approve receipt vouchers','Finance','approve','receipt_vouchers',CURRENT_TIMESTAMP),
(2275,'receipt_vouchers.reject','Reject Receipt Voucher','Reject receipt vouchers','Finance','reject','receipt_vouchers',CURRENT_TIMESTAMP);

-- 5) Journal Vouchers (CRUD + approve/reject)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2276,'journal_vouchers.create','Create Journal Voucher','Create journal vouchers','Finance','create','journal_vouchers',CURRENT_TIMESTAMP),
(2277,'journal_vouchers.read','View Journal Vouchers','View journal vouchers','Finance','read','journal_vouchers',CURRENT_TIMESTAMP),
(2278,'journal_vouchers.update','Update Journal Vouchers','Edit journal vouchers','Finance','update','journal_vouchers',CURRENT_TIMESTAMP),
(2279,'journal_vouchers.delete','Delete Journal Vouchers','Remove journal vouchers','Finance','delete','journal_vouchers',CURRENT_TIMESTAMP),
(2280,'journal_vouchers.approve','Approve Journal Voucher','Approve journal vouchers','Finance','approve','journal_vouchers',CURRENT_TIMESTAMP),
(2281,'journal_vouchers.reject','Reject Journal Voucher','Reject journal vouchers','Finance','reject','journal_vouchers',CURRENT_TIMESTAMP);

-- 6) Balance Transfers (CRUD + approve)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2282,'balance_transfers.create','Create Balance Transfer','Create balance transfer','Finance','create','balance_transfers',CURRENT_TIMESTAMP),
(2283,'balance_transfers.read','View Balance Transfers','View balance transfers','Finance','read','balance_transfers',CURRENT_TIMESTAMP),
(2284,'balance_transfers.update','Update Balance Transfers','Edit balance transfers','Finance','update','balance_transfers',CURRENT_TIMESTAMP),
(2285,'balance_transfers.delete','Delete Balance Transfers','Remove balance transfers','Finance','delete','balance_transfers',CURRENT_TIMESTAMP),
(2286,'balance_transfers.approve','Approve Balance Transfer','Approve balance transfers','Finance','approve','balance_transfers',CURRENT_TIMESTAMP);

-- 7) Reports (read-only)
INSERT INTO public.permissions (id,name,display_name,description,module,action,resource,created_at) VALUES
(2287,'general_ledger.read','View General Ledger','Access the general ledger report','Finance','read','general_ledger',CURRENT_TIMESTAMP),
(2288,'cost_center_ledger.read','View Cost Center Ledger','Access the cost center ledger report','Finance','read','cost_center_ledger',CURRENT_TIMESTAMP),
(2289,'income_statement.read','View Income Statement','Access the income statement','Finance','read','income_statement',CURRENT_TIMESTAMP),
(2290,'balance_sheet.read','View Balance Sheet','Access the balance sheet','Finance','read','balance_sheet',CURRENT_TIMESTAMP);

COMMIT;
