-- Migration V74: Add Distribution Center to Users
-- Description: Add distribution_center_id to users table to link sales persons to their branch

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS distribution_center_id INTEGER REFERENCES distribution_centers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_distribution_center_id 
ON users(distribution_center_id);

COMMENT ON COLUMN users.distribution_center_id IS 'Distribution center/Branch assigned to this user. Used for auto-selecting branch in POS.';
