-- V147: Add the VAT Payable Liabilities account used by the sales VAT split.
--
-- factoryAccountsIntegrationService.createRevenueRecognitionVoucher looks up an
-- active Liabilities account whose name matches "VAT Payable" and credits the
-- VAT portion of each shipment voucher to it (Sales Revenue gets the net).
-- Without this account the service falls back to crediting Sales Revenue at
-- gross — this migration ensures the split posts correctly.
--
-- "Tax Payable" (code 2100, V52) is intentionally kept distinct: it's a
-- generic catch-all for other taxes (withholding, income tax, etc.).

INSERT INTO chart_of_accounts (code, name, type, category, notes, status)
SELECT '2150', 'VAT Payable', 'Posting', 'Liabilities',
       'Sales VAT collected from customers, payable to the government.',
       'Active'
WHERE NOT EXISTS (
    SELECT 1 FROM chart_of_accounts
     WHERE category = 'Liabilities'
       AND status = 'Active'
       AND name ILIKE 'VAT Payable'
);
