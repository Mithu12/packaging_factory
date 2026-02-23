-- Create ecommerce sliders table
CREATE TABLE IF NOT EXISTS ecommerce_sliders (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    link_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add permissions for ecommerce sliders management
INSERT INTO permissions (name, display_name, description, module, action, resource)
VALUES 
    ('ecommerce.sliders.read', 'Read E-commerce Sliders', 'Can view ecommerce sliders', 'Ecommerce', 'read', 'sliders'),
    ('ecommerce.sliders.create', 'Create E-commerce Sliders', 'Can create ecommerce sliders', 'Ecommerce', 'create', 'sliders'),
    ('ecommerce.sliders.update', 'Update E-commerce Sliders', 'Can update ecommerce sliders', 'Ecommerce', 'update', 'sliders'),
    ('ecommerce.sliders.delete', 'Delete E-commerce Sliders', 'Can delete ecommerce sliders', 'Ecommerce', 'delete', 'sliders')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.module = 'Ecommerce'
ON CONFLICT DO NOTHING;
