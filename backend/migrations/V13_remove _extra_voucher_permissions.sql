-- Update sequence again to reflect possible new permission
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM public.permissions), true);


DELETE
FROM Permissions
WHERE name in (
               'payment_vouchers.create',
               'payment_vouchers.read',
               'payment_vouchers.update',
               'payment_vouchers.delete',
               'payment_vouchers.approve',
               'payment_vouchers.reject',

               'receipt_vouchers.create',
               'receipt_vouchers.read',
               'receipt_vouchers.update',
               'receipt_vouchers.delete',
               'receipt_vouchers.approve',
               'receipt_vouchers.reject',

               'balance_transfers.create',
                'balance_transfers.read',
                'balance_transfers.update',
                'balance_transfers.delete',
                'balance_transfers.approve',

               'journal_vouchers.create',
               'journal_vouchers.read',
               'journal_vouchers.update',
               'journal_vouchers.delete',
               'journal_vouchers.approve',
               'journal_vouchers.reject'
    );

    -- 4) Receipt Vouchers (CRUD + approve/reject)
INSERT INTO public.permissions (name,display_name,description,module,action,resource,created_at) VALUES
('vouchers.create','Create Voucher','Create vouchers','Finance','create','vouchers',CURRENT_TIMESTAMP),
('vouchers.read','View Vouchers','View vouchers','Finance','read','vouchers',CURRENT_TIMESTAMP),
('vouchers.update','Update Vouchers','Edit vouchers','Finance','update','vouchers',CURRENT_TIMESTAMP),
('vouchers.delete','Delete Vouchers','Remove vouchers','Finance','delete','vouchers',CURRENT_TIMESTAMP),
('vouchers.approve','Approve Voucher','Approve vouchers','Finance','approve','vouchers',CURRENT_TIMESTAMP),
('vouchers.reject','Reject Voucher','Reject vouchers','Finance','reject','vouchers',CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Grant accounts permissions to admin role (ID 1)
INSERT INTO public.role_permissions (role_id, permission_id, granted_at)
SELECT 1, p.id, CURRENT_TIMESTAMP
FROM public.permissions p
WHERE p.module = 'Finance'
ON CONFLICT (role_id, permission_id) DO NOTHING;