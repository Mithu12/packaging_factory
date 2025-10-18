-- Migration V58: Add Head Of Department Role
-- Description: Creates the 'Head Of Department' role for users who can manage departments

-- Insert Head Of Department role
INSERT INTO roles (name, display_name, description, is_active, created_at, updated_at)
VALUES ('head_of_department',
        'Head Of Department',
        'Department heads responsible for managing specific departments and their employees',
        true,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;
